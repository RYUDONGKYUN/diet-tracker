import path from "node:path";
import fs from "node:fs";
import { Router } from "express";
import { db } from "../db";
import { uploadMealPhoto, relativeUploadPath } from "../lib/upload";
import { analyzeFoodImage } from "../lib/gemini";

export const mealsRouter = Router();

const SLOTS = ["breakfast", "lunch", "snack", "dinner", "late_night"] as const;

interface MealItem {
  id: number;
  date: string;
  slot: string;
  food_name: string;
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  photo_path: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

mealsRouter.get("/marked-dates", (req, res) => {
  const { year, month } = req.query as { year?: string; month?: string };
  if (!year || !month) return res.status(400).json({ error: "year와 month가 필요합니다." });
  const prefix = `${year}-${month.padStart(2, "0")}`;
  const rows = db
    .prepare("SELECT DISTINCT date FROM meal_items WHERE date LIKE ?")
    .all(`${prefix}%`) as { date: string }[];
  res.json(rows.map((r) => r.date));
});

mealsRouter.get("/", (req, res) => {
  const { date } = req.query as { date?: string };
  if (!date) return res.status(400).json({ error: "date 쿼리 파라미터가 필요합니다." });
  const items = db
    .prepare("SELECT * FROM meal_items WHERE date = ? ORDER BY id ASC")
    .all(date) as unknown as MealItem[];

  const bySlot: Record<string, MealItem[]> = {};
  for (const slot of SLOTS) bySlot[slot] = [];
  for (const item of items) bySlot[item.slot]?.push(item);

  const totals = items.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      carbs_g: acc.carbs_g + i.carbs_g,
      protein_g: acc.protein_g + i.protein_g,
      fat_g: acc.fat_g + i.fat_g,
    }),
    { calories: 0, carbs_g: 0, protein_g: 0, fat_g: 0 }
  );

  res.json({ date, by_slot: bySlot, totals });
});

mealsRouter.post("/", uploadMealPhoto.single("photo"), (req, res) => {
  const { date, slot, food_name, calories, carbs_g, protein_g, fat_g, source, photo_url } = req.body as Record<
    string,
    string
  >;
  if (!date || !slot || !SLOTS.includes(slot as (typeof SLOTS)[number])) {
    return res.status(400).json({ error: "date와 올바른 slot이 필요합니다." });
  }
  const photoPath = req.file
    ? relativeUploadPath("meals", req.file.filename)
    : photo_url
    ? photo_url
    : null;

  const result = db
    .prepare(
      `INSERT INTO meal_items (date, slot, food_name, calories, carbs_g, protein_g, fat_g, photo_path, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      date,
      slot,
      food_name || "새 음식",
      Number(calories) || 0,
      Number(carbs_g) || 0,
      Number(protein_g) || 0,
      Number(fat_g) || 0,
      photoPath,
      source || "manual"
    );

  const row = db.prepare("SELECT * FROM meal_items WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(row);
});

mealsRouter.patch("/:id", uploadMealPhoto.single("photo"), (req, res) => {
  const existing = db.prepare("SELECT * FROM meal_items WHERE id = ?").get(req.params.id) as
    | MealItem
    | undefined;
  if (!existing) return res.status(404).json({ error: "항목을 찾을 수 없습니다." });

  const body = req.body as Record<string, string>;
  const fields: Record<string, unknown> = {};
  for (const key of ["food_name", "calories", "carbs_g", "protein_g", "fat_g", "source"]) {
    if (body[key] !== undefined) {
      fields[key] = ["calories", "carbs_g", "protein_g", "fat_g"].includes(key) ? Number(body[key]) : body[key];
    }
  }
  if (req.file) {
    fields.photo_path = relativeUploadPath("meals", req.file.filename);
  } else if (body.photo_url) {
    fields.photo_path = body.photo_url;
  }

  if (Object.keys(fields).length === 0) {
    return res.json(existing);
  }

  const setClause = Object.keys(fields)
    .map((k) => `${k} = ?`)
    .join(", ");
  db.prepare(`UPDATE meal_items SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(
    ...(Object.values(fields) as (string | number | null)[]),
    req.params.id
  );
  const row = db.prepare("SELECT * FROM meal_items WHERE id = ?").get(req.params.id);
  res.json(row);
});

mealsRouter.delete("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM meal_items WHERE id = ?").get(req.params.id) as
    | MealItem
    | undefined;
  if (existing?.photo_path?.startsWith("/uploads/")) {
    const filePath = path.join(__dirname, "..", "..", existing.photo_path);
    fs.rm(filePath, { force: true }, () => undefined);
  }
  db.prepare("DELETE FROM meal_items WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

mealsRouter.post("/:id/analyze", async (req, res) => {
  const item = db.prepare("SELECT * FROM meal_items WHERE id = ?").get(req.params.id) as unknown as MealItem | undefined;
  if (!item) return res.status(404).json({ error: "항목을 찾을 수 없습니다." });
  if (!item.photo_path) return res.status(400).json({ error: "분석할 사진이 없습니다." });

  try {
    let buffer: Buffer;
    let mimeType = "image/jpeg";
    if (item.photo_path.startsWith("http")) {
      const resp = await fetch(item.photo_path);
      if (!resp.ok) throw new Error("사진 URL을 불러올 수 없습니다.");
      mimeType = resp.headers.get("content-type") || mimeType;
      buffer = Buffer.from(await resp.arrayBuffer());
    } else {
      const filePath = path.join(__dirname, "..", "..", item.photo_path);
      buffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      if (ext === ".png") mimeType = "image/png";
      else if (ext === ".webp") mimeType = "image/webp";
    }

    const analysis = await analyzeFoodImage(buffer, mimeType);
    db.prepare(
      `UPDATE meal_items SET food_name = ?, calories = ?, carbs_g = ?, protein_g = ?, fat_g = ?, source = 'gemini', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(analysis.food_name, analysis.calories, analysis.carbs_g, analysis.protein_g, analysis.fat_g, req.params.id);

    const row = db.prepare("SELECT * FROM meal_items WHERE id = ?").get(req.params.id);
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "분석 중 오류가 발생했습니다." });
  }
});
