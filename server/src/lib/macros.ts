export interface Profile {
  height_cm: number;
  start_weight_kg: number;
  goal_weight_kg: number;
  phase: "cutting" | "maintenance";
  cutting_kcal: number;
  cutting_protein_min: number;
  cutting_protein_max: number;
  maintenance_kcal: number;
  maintenance_protein_min: number;
  maintenance_protein_max: number;
  fat_pct_of_kcal: number;
}

export interface Targets {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function computeTargets(profile: Profile): Targets {
  const kcal = profile.phase === "cutting" ? profile.cutting_kcal : profile.maintenance_kcal;
  const proteinMin = profile.phase === "cutting" ? profile.cutting_protein_min : profile.maintenance_protein_min;
  const proteinMax = profile.phase === "cutting" ? profile.cutting_protein_max : profile.maintenance_protein_max;
  const protein = Math.round((proteinMin + proteinMax) / 2);
  const fat = Math.round((kcal * profile.fat_pct_of_kcal) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat };
}

export interface FoodDensity {
  name: string;
  unit: string;
  gramsPerUnit: number;
  kcalPer100g: number;
  carbsPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
}

export const FOOD_DB: FoodDensity[] = [
  { name: "닭가슴살", unit: "g", gramsPerUnit: 1, kcalPer100g: 110, carbsPer100g: 0, proteinPer100g: 23, fatPer100g: 1 },
  { name: "두부(부침)", unit: "g", gramsPerUnit: 1, kcalPer100g: 76, carbsPer100g: 2, proteinPer100g: 8, fatPer100g: 4 },
  { name: "계란", unit: "개", gramsPerUnit: 50, kcalPer100g: 140, carbsPer100g: 1, proteinPer100g: 12, fatPer100g: 10 },
  { name: "그릭요거트", unit: "g", gramsPerUnit: 1, kcalPer100g: 59, carbsPer100g: 3.6, proteinPer100g: 10, fatPer100g: 0.4 },
  { name: "연어", unit: "g", gramsPerUnit: 1, kcalPer100g: 200, carbsPer100g: 0, proteinPer100g: 20, fatPer100g: 13 },
  { name: "소고기 안심", unit: "g", gramsPerUnit: 1, kcalPer100g: 143, carbsPer100g: 0, proteinPer100g: 21, fatPer100g: 6 },
  { name: "현미밥", unit: "공기", gramsPerUnit: 210, kcalPer100g: 143, carbsPer100g: 32, proteinPer100g: 2.5, fatPer100g: 0.5 },
  { name: "고구마", unit: "g", gramsPerUnit: 1, kcalPer100g: 129, carbsPer100g: 30, proteinPer100g: 1.5, fatPer100g: 0.2 },
  { name: "바나나", unit: "개", gramsPerUnit: 120, kcalPer100g: 88, carbsPer100g: 22.5, proteinPer100g: 1.1, fatPer100g: 0.3 },
  { name: "오트밀", unit: "g", gramsPerUnit: 1, kcalPer100g: 375, carbsPer100g: 60, proteinPer100g: 11.5, fatPer100g: 6.5 },
  { name: "아몬드", unit: "g", gramsPerUnit: 1, kcalPer100g: 580, carbsPer100g: 20, proteinPer100g: 21, fatPer100g: 50 },
  { name: "올리브오일", unit: "큰술", gramsPerUnit: 13, kcalPer100g: 884, carbsPer100g: 0, proteinPer100g: 0, fatPer100g: 100 },
  { name: "사과", unit: "개", gramsPerUnit: 200, kcalPer100g: 52, carbsPer100g: 13.5, proteinPer100g: 0.3, fatPer100g: 0.2 },
];

type Nutrient = "protein" | "carbs" | "fat";

function densityFor(food: FoodDensity, nutrient: Nutrient): number {
  if (nutrient === "protein") return food.proteinPer100g;
  if (nutrient === "carbs") return food.carbsPer100g;
  return food.fatPer100g;
}

function suggestFoodsForGap(nutrient: Nutrient, gramsNeeded: number, count = 2): string[] {
  const candidates = FOOD_DB.filter((f) => densityFor(f, nutrient) >= 8).sort(
    (a, b) => densityFor(b, nutrient) - densityFor(a, nutrient)
  );
  const picks = candidates.slice(0, count);
  return picks.map((food) => {
    const gramsTotal = (gramsNeeded / densityFor(food, nutrient)) * 100;
    if (food.unit === "g") {
      return `${food.name} ${Math.round(gramsTotal)}g`;
    }
    const units = Math.max(1, Math.round(gramsTotal / food.gramsPerUnit));
    return `${food.name} ${units}${food.unit}`;
  });
}

export interface Suggestion {
  nutrient: Nutrient;
  gap: number;
  message: string;
}

export function buildSuggestions(remaining: { protein: number; carbs: number; fat: number }): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const labels: Record<Nutrient, string> = { protein: "단백질", carbs: "탄수화물", fat: "지방" };

  (["protein", "carbs", "fat"] as Nutrient[]).forEach((nutrient) => {
    const gap = Math.round(remaining[nutrient]);
    if (gap < 8) return;
    const options = suggestFoodsForGap(nutrient, gap);
    suggestions.push({
      nutrient,
      gap,
      message: `${labels[nutrient]} ${gap}g 부족 → ${options.join(" 또는 ")} 추천`,
    });
  });

  return suggestions;
}
