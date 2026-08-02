import { Router } from "express";
import { db } from "../db";
import { computeTargets, buildSuggestions, Profile } from "../lib/macros";

export const recommendRouter = Router();

recommendRouter.get("/", (req, res) => {
  const { date } = req.query as { date?: string };
  const targetDate = date || new Date().toISOString().slice(0, 10);

  const profile = db.prepare("SELECT * FROM user_profile WHERE id = 1").get() as unknown as Profile;
  const targets = computeTargets(profile);

  const items = db.prepare("SELECT * FROM meal_items WHERE date = ?").all(targetDate) as {
    calories: number;
    carbs_g: number;
    protein_g: number;
    fat_g: number;
  }[];

  const consumed = items.reduce(
    (acc, i) => ({
      kcal: acc.kcal + i.calories,
      carbs: acc.carbs + i.carbs_g,
      protein: acc.protein + i.protein_g,
      fat: acc.fat + i.fat_g,
    }),
    { kcal: 0, carbs: 0, protein: 0, fat: 0 }
  );

  const remaining = {
    kcal: Math.max(0, targets.kcal - consumed.kcal),
    carbs: Math.max(0, targets.carbs - consumed.carbs),
    protein: Math.max(0, targets.protein - consumed.protein),
    fat: Math.max(0, targets.fat - consumed.fat),
  };

  const suggestions = buildSuggestions(remaining);

  res.json({ date: targetDate, targets, consumed, remaining, suggestions });
});
