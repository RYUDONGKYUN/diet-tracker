export type Phase = "cutting" | "maintenance";

export interface Profile {
  id: number;
  height_cm: number;
  start_weight_kg: number;
  goal_weight_kg: number;
  start_skeletal_muscle_kg: number | null;
  goal_skeletal_muscle_kg: number | null;
  start_body_fat_pct: number | null;
  start_visceral_fat_level: number | null;
  phase: Phase;
  cutting_kcal: number;
  cutting_protein_min: number;
  cutting_protein_max: number;
  maintenance_kcal: number;
  maintenance_protein_min: number;
  maintenance_protein_max: number;
  fat_pct_of_kcal: number;
  screen_golf_expiry: string | null;
  gym_expiry: string | null;
  updated_at: string;
}

export interface Targets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface RecommendResponse {
  date: string;
  targets: Targets;
  consumed: { kcal: number; carbs: number; protein: number; fat: number };
  remaining: { kcal: number; carbs: number; protein: number; fat: number };
  suggestions: { nutrient: "protein" | "carbs" | "fat"; gap: number; message: string }[];
}

export interface WeightLog {
  id: number;
  date: string;
  weight_kg: number;
  memo: string | null;
  created_at: string;
}

export interface WeightSummary {
  start_weight_kg: number;
  goal_weight_kg: number;
  latest_weight_kg: number;
  progress_pct: number;
  weekly_delta_kg: number | null;
}

export type MealSlot = "breakfast" | "lunch" | "snack" | "dinner" | "late_night";

export interface MealItem {
  id: number;
  date: string;
  slot: MealSlot;
  food_name: string;
  calories: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  photo_path: string | null;
  source: "manual" | "gemini" | "url";
  created_at: string;
  updated_at: string;
}

export interface MealsByDate {
  date: string;
  by_slot: Record<MealSlot, MealItem[]>;
  totals: { calories: number; carbs_g: number; protein_g: number; fat_g: number };
}

export interface BodyPhoto {
  id: number;
  date: string;
  photo_path: string;
  angle: string | null;
  memo: string | null;
  created_at: string;
}

export type ExerciseType = "weight" | "running" | "screen_golf" | "boxing" | "other";

export interface WeeklyReview {
  id: number;
  week_start: string;
  avg_sleep: number | null;
  condition_note: string | null;
  weight_delta: number | null;
  next_week_kcal_target: number | null;
  next_week_note: string | null;
  created_at: string;
}

export interface ExerciseLog {
  id: number;
  date: string;
  type: ExerciseType;
  custom_label: string | null;
  duration_min: number | null;
  intensity: string | null;
  memo: string | null;
  created_at: string;
}
