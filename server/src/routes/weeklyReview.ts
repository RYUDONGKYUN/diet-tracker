import { Router } from "express";
import { db } from "../db";

export const weeklyReviewRouter = Router();

weeklyReviewRouter.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM weekly_reviews ORDER BY week_start DESC").all();
  res.json(rows);
});

interface WeeklyReviewBody {
  week_start?: string;
  avg_sleep?: number | null;
  condition_note?: string | null;
  weight_delta?: number | null;
  next_week_kcal_target?: number | null;
  next_week_note?: string | null;
}

weeklyReviewRouter.post("/", (req, res) => {
  const { week_start, avg_sleep, condition_note, weight_delta, next_week_kcal_target, next_week_note } =
    req.body as WeeklyReviewBody;
  if (!week_start) return res.status(400).json({ error: "week_start는 필수입니다." });

  db.prepare(
    `INSERT INTO weekly_reviews (week_start, avg_sleep, condition_note, weight_delta, next_week_kcal_target, next_week_note)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(week_start) DO UPDATE SET
       avg_sleep = excluded.avg_sleep,
       condition_note = excluded.condition_note,
       weight_delta = excluded.weight_delta,
       next_week_kcal_target = excluded.next_week_kcal_target,
       next_week_note = excluded.next_week_note`
  ).run(
    week_start,
    avg_sleep ?? null,
    condition_note ?? null,
    weight_delta ?? null,
    next_week_kcal_target ?? null,
    next_week_note ?? null
  );

  const row = db.prepare("SELECT * FROM weekly_reviews WHERE week_start = ?").get(week_start);
  res.status(201).json(row);
});
