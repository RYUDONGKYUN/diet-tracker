import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { MealItem, MealsByDate, MealSlot } from "../types";
import { todayStr } from "../lib/date";
import Calendar from "../components/Calendar";
import MealItemModal from "../components/MealItemModal";

const SLOTS: { key: MealSlot; label: string }[] = [
  { key: "breakfast", label: "아침" },
  { key: "lunch", label: "점심" },
  { key: "snack", label: "간식" },
  { key: "dinner", label: "저녁" },
  { key: "late_night", label: "야식" },
];

export default function CalendarPage() {
  const [selected, setSelected] = useState(todayStr());
  const [meals, setMeals] = useState<MealsByDate | null>(null);
  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set());
  const [modalState, setModalState] = useState<{ slot: MealSlot; item: MealItem | null } | null>(null);

  function loadMeals() {
    api.get<MealsByDate>(`/api/meals?date=${selected}`).then(setMeals);
  }

  useEffect(loadMeals, [selected]);

  useEffect(() => {
    const [year, month] = selected.split("-");
    api.get<string[]>(`/api/meals/marked-dates?year=${year}&month=${month}`).then((dates) => {
      setMarkedDates(new Set(dates));
    });
  }, [selected.slice(0, 7)]);

  function closeModal(refresh: boolean) {
    setModalState(null);
    if (refresh) loadMeals();
  }

  return (
    <div>
      <div className="card">
        <Calendar selected={selected} onSelect={setSelected} markedDates={markedDates} />
      </div>

      {meals && (
        <div className="card">
          <h2>{selected} 총합</h2>
          <div className="kpi-grid">
            <div className="kpi-tile">
              <div className="label">칼로리</div>
              <div className="value">{Math.round(meals.totals.calories)}</div>
            </div>
            <div className="kpi-tile">
              <div className="label">탄수화물</div>
              <div className="value">{Math.round(meals.totals.carbs_g)}g</div>
            </div>
            <div className="kpi-tile">
              <div className="label">단백질</div>
              <div className="value">{Math.round(meals.totals.protein_g)}g</div>
            </div>
            <div className="kpi-tile">
              <div className="label">지방</div>
              <div className="value">{Math.round(meals.totals.fat_g)}g</div>
            </div>
          </div>
        </div>
      )}

      {meals &&
        SLOTS.map((slot) => (
          <div className="card slot-section" key={slot.key}>
            <div className="slot-title">
              <span>{slot.label}</span>
              <button className="btn" onClick={() => setModalState({ slot: slot.key, item: null })}>
                + 추가
              </button>
            </div>
            {meals.by_slot[slot.key].length === 0 ? (
              <div className="muted">기록 없음</div>
            ) : (
              meals.by_slot[slot.key].map((item) => (
                <div
                  className="meal-item"
                  key={item.id}
                  onClick={() => setModalState({ slot: slot.key, item })}
                >
                  {item.photo_path && <img src={item.photo_path} alt={item.food_name} />}
                  <div className="info">
                    <div className="name">{item.food_name}</div>
                    <div className="macro">
                      {Math.round(item.calories)}kcal · 탄{Math.round(item.carbs_g)} 단
                      {Math.round(item.protein_g)} 지{Math.round(item.fat_g)}
                    </div>
                  </div>
                  {item.source === "gemini" && <span className="pill">AI</span>}
                </div>
              ))
            )}
          </div>
        ))}

      {modalState && (
        <MealItemModal
          date={selected}
          slot={modalState.slot}
          item={modalState.item}
          onClose={() => closeModal(false)}
          onSaved={() => closeModal(true)}
        />
      )}
    </div>
  );
}
