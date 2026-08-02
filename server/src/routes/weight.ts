import { Router } from "express";
import { db } from "../db";

export const weightRouter = Router();

interface WeightLog {
  id: number;
  date: string;
  weight_kg: number;
  memo: string | null;
  created_at: string;
}

weightRouter.get("/", (req, res) => {
  const { from, to } = req.query as { from?: string; to?: string };
  let rows: WeightLog[];
  if (from && to) {
    rows = db
      .prepare("SELECT * FROM weight_logs WHERE date BETWEEN ? AND ? ORDER BY date ASC")
      .all(from, to) as unknown as WeightLog[];
  } else {
    rows = db.prepare("SELECT * FROM weight_logs ORDER BY date ASC").all() as unknown as WeightLog[];
  }
  res.json(rows);
});

weightRouter.post("/", (req, res) => {
  const { date, weight_kg, memo } = req.body as { date?: string; weight_kg?: number; memo?: string };
  if (!date || typeof weight_kg !== "number") {
    return res.status(400).json({ error: "date와 weight_kg는 필수입니다." });
  }
  db.prepare(
    `INSERT INTO weight_logs (date, weight_kg, memo) VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET weight_kg = excluded.weight_kg, memo = excluded.memo`
  ).run(date, weight_kg, memo ?? null);
  const row = db.prepare("SELECT * FROM weight_logs WHERE date = ?").get(date);
  res.json(row);
});

weightRouter.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM weight_logs WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

weightRouter.get("/summary", (_req, res) => {
  const profile = db.prepare("SELECT start_weight_kg, goal_weight_kg FROM user_profile WHERE id = 1").get() as {
    start_weight_kg: number;
    goal_weight_kg: number;
  };
  const rows = db.prepare("SELECT date, weight_kg FROM weight_logs ORDER BY date ASC").all() as {
    date: string;
    weight_kg: number;
  }[];

  const latest = rows.length ? rows[rows.length - 1].weight_kg : profile.start_weight_kg;
  const totalToLose = profile.start_weight_kg - profile.goal_weight_kg;
  const lostSoFar = profile.start_weight_kg - latest;
  const progressPct = totalToLose > 0 ? Math.max(0, Math.min(100, (lostSoFar / totalToLose) * 100)) : 0;

  let weeklyDelta: number | null = null;
  if (rows.length >= 2) {
    const lastDate = new Date(rows[rows.length - 1].date);
    const sevenDaysAgo = new Date(lastDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const priorRow = [...rows].reverse().find((r) => new Date(r.date) <= sevenDaysAgo);
    if (priorRow) {
      weeklyDelta = Number((latest - priorRow.weight_kg).toFixed(2));
    }
  }

  res.json({
    start_weight_kg: profile.start_weight_kg,
    goal_weight_kg: profile.goal_weight_kg,
    latest_weight_kg: latest,
    progress_pct: Number(progressPct.toFixed(1)),
    weekly_delta_kg: weeklyDelta,
  });
});
