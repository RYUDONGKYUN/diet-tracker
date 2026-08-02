import path from "node:path";
import fs from "node:fs";
import { Router } from "express";
import { db } from "../db";
import { uploadBodyPhoto, relativeUploadPath } from "../lib/upload";

export const bodyPhotosRouter = Router();

interface BodyPhoto {
  id: number;
  date: string;
  photo_path: string;
  angle: string | null;
  memo: string | null;
  created_at: string;
}

bodyPhotosRouter.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM body_photos ORDER BY date ASC, id ASC").all() as unknown as BodyPhoto[];
  res.json(rows);
});

bodyPhotosRouter.post("/", uploadBodyPhoto.single("photo"), (req, res) => {
  const { date, angle, memo } = req.body as { date?: string; angle?: string; memo?: string };
  if (!date || !req.file) return res.status(400).json({ error: "date와 photo 파일이 필요합니다." });

  const photoPath = relativeUploadPath("body", req.file.filename);
  const result = db
    .prepare(`INSERT INTO body_photos (date, photo_path, angle, memo) VALUES (?, ?, ?, ?)`)
    .run(date, photoPath, angle ?? null, memo ?? null);

  const row = db.prepare("SELECT * FROM body_photos WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(row);
});

bodyPhotosRouter.delete("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM body_photos WHERE id = ?").get(req.params.id) as
    | BodyPhoto
    | undefined;
  if (existing) {
    const filePath = path.join(__dirname, "..", "..", existing.photo_path);
    fs.rm(filePath, { force: true }, () => undefined);
  }
  db.prepare("DELETE FROM body_photos WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});
