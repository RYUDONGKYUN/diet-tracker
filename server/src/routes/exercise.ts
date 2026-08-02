import { Router } from "express";
import { db } from "../db";

export const exerciseRouter = Router();

exerciseRouter.get("/", (req, res) => {
  const { date, from, to } = req.query as { date?: string; from?: string; to?: string };
  let rows;
  if (date) {
    rows = db.prepare("SELECT * FROM exercise_logs WHERE date = ? ORDER BY id ASC").all(date);
  } else if (from && to) {
    rows = db
      .prepare("SELECT * FROM exercise_logs WHERE date BETWEEN ? AND ? ORDER BY date DESC, id ASC")
      .all(from, to);
  } else {
    rows = db.prepare("SELECT * FROM exercise_logs ORDER BY date DESC, id ASC LIMIT 200").all();
  }
  res.json(rows);
});

exerciseRouter.post("/", (req, res) => {
  const { date, type, custom_label, duration_min, intensity, memo } = req.body as {
    date?: string;
    type?: string;
    custom_label?: string;
    duration_min?: number;
    intensity?: string;
    memo?: string;
  };
  if (!date || !type) return res.status(400).json({ error: "date와 type은 필수입니다." });

  const result = db
    .prepare(
      `INSERT INTO exercise_logs (date, type, custom_label, duration_min, intensity, memo)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(date, type, custom_label ?? null, duration_min ?? null, intensity ?? null, memo ?? null);

  const row = db.prepare("SELECT * FROM exercise_logs WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(row);
});

exerciseRouter.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM exercise_logs WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});
