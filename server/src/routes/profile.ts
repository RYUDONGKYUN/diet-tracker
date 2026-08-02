import { Router } from "express";
import { db } from "../db";
import { computeTargets, Profile } from "../lib/macros";

export const profileRouter = Router();

function getProfile(): Profile & { id: number; updated_at: string } {
  return db.prepare("SELECT * FROM user_profile WHERE id = 1").get() as unknown as Profile & {
    id: number;
    updated_at: string;
  };
}

profileRouter.get("/", (_req, res) => {
  const profile = getProfile();
  res.json({ profile, targets: computeTargets(profile) });
});

const EDITABLE_FIELDS = [
  "height_cm",
  "start_weight_kg",
  "goal_weight_kg",
  "start_skeletal_muscle_kg",
  "goal_skeletal_muscle_kg",
  "start_body_fat_pct",
  "start_visceral_fat_level",
  "phase",
  "cutting_kcal",
  "cutting_protein_min",
  "cutting_protein_max",
  "maintenance_kcal",
  "maintenance_protein_min",
  "maintenance_protein_max",
  "fat_pct_of_kcal",
  "screen_golf_expiry",
  "gym_expiry",
] as const;

profileRouter.patch("/", (req, res) => {
  const body = req.body as Record<string, unknown>;
  const updates = EDITABLE_FIELDS.filter((f) => body[f] !== undefined);
  if (updates.length === 0) {
    return res.status(400).json({ error: "수정할 값이 없습니다." });
  }
  const setClause = updates.map((f) => `${f} = ?`).join(", ");
  const values = updates.map((f) => body[f]) as (string | number | null)[];
  db.prepare(`UPDATE user_profile SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = 1`).run(...values);
  const profile = getProfile();
  res.json({ profile, targets: computeTargets(profile) });
});
