import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { MealItem, MealSlot } from "../types";

interface Props {
  date: string;
  slot: MealSlot;
  item: MealItem | null;
  onClose: () => void;
  onSaved: () => void;
}

const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "아침",
  lunch: "점심",
  snack: "간식",
  dinner: "저녁",
  late_night: "야식",
};

export default function MealItemModal({ date, slot, item, onClose, onSaved }: Props) {
  const [itemId, setItemId] = useState<number | null>(item?.id ?? null);
  const [foodName, setFoodName] = useState(item?.food_name ?? "");
  const [calories, setCalories] = useState(item ? String(item.calories) : "");
  const [carbs, setCarbs] = useState(item ? String(item.carbs_g) : "");
  const [protein, setProtein] = useState(item ? String(item.protein_g) : "");
  const [fat, setFat] = useState(item ? String(item.fat_g) : "");
  const [photoUrl, setPhotoUrl] = useState(item?.photo_path?.startsWith("http") ? item.photo_path : "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewPath, setPreviewPath] = useState<string | null>(item?.photo_path ?? null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geminiConfigured, setGeminiConfigured] = useState(true);

  useEffect(() => {
    api
      .get<{ gemini_configured: boolean }>("/api/auth/config")
      .then((res) => setGeminiConfigured(res.gemini_configured))
      .catch(() => setGeminiConfigured(true));
  }, []);

  function buildFormData() {
    const fd = new FormData();
    fd.append("date", date);
    fd.append("slot", slot);
    fd.append("food_name", foodName || "새 음식");
    fd.append("calories", calories || "0");
    fd.append("carbs_g", carbs || "0");
    fd.append("protein_g", protein || "0");
    fd.append("fat_g", fat || "0");
    if (photoFile) fd.append("photo", photoFile);
    else if (photoUrl) fd.append("photo_url", photoUrl);
    return fd;
  }

  async function handleAnalyze() {
    setError(null);
    if (!photoFile && !photoUrl) {
      setError("분석하려면 사진을 첨부하거나 URL을 입력해 주세요.");
      return;
    }
    setAnalyzing(true);
    try {
      let currentId = itemId;
      if (!currentId) {
        const fd = buildFormData();
        fd.set("food_name", "분석 중");
        fd.set("source", "manual");
        const created = await api.post<MealItem>("/api/meals", fd);
        currentId = created.id;
        setItemId(created.id);
        setPreviewPath(created.photo_path);
      }
      const analyzed = await api.post<MealItem>(`/api/meals/${currentId}/analyze`);
      setFoodName(analyzed.food_name);
      setCalories(String(analyzed.calories));
      setCarbs(String(analyzed.carbs_g));
      setProtein(String(analyzed.protein_g));
      setFat(String(analyzed.fat_g));
      setPreviewPath(analyzed.photo_path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      if (itemId) {
        const fd = buildFormData();
        fd.append("source", "manual");
        await api.patch(`/api/meals/${itemId}`, fd);
      } else {
        const fd = buildFormData();
        fd.append("source", photoFile || photoUrl ? "manual" : "manual");
        await api.post("/api/meals", fd);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!itemId) return onClose();
    await api.delete(`/api/meals/${itemId}`);
    onSaved();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {date} · {SLOT_LABEL[slot]}
          </h3>
          <button className="btn" onClick={onClose}>
            닫기
          </button>
        </div>

        {previewPath && (
          <img
            src={previewPath}
            alt="음식 사진"
            style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 8, marginBottom: 12 }}
          />
        )}

        <div className="field">
          <label>사진 업로드</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setPhotoFile(f);
              if (f) setPreviewPath(URL.createObjectURL(f));
            }}
          />
        </div>
        <div className="field">
          <label>또는 외부 이미지 URL</label>
          <input
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <button
          className="btn"
          onClick={handleAnalyze}
          disabled={analyzing || !geminiConfigured}
          style={{ marginBottom: geminiConfigured ? 14 : 4 }}
        >
          {analyzing ? "분석 중..." : "AI로 음식 분석하기"}
        </button>
        {!geminiConfigured && (
          <div className="muted" style={{ marginBottom: 14 }}>
            서버에 GEMINI_API_KEY가 설정되지 않아 AI 자동 분석을 사용할 수 없습니다. 값을 직접 입력해 주세요.
          </div>
        )}

        <div className="field">
          <label>음식 이름</label>
          <input value={foodName} onChange={(e) => setFoodName(e.target.value)} placeholder="예: 제육볶음" />
        </div>
        <div className="row">
          <div className="field">
            <label>칼로리(kcal)</label>
            <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} />
          </div>
          <div className="field">
            <label>탄수화물(g)</label>
            <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>단백질(g)</label>
            <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} />
          </div>
          <div className="field">
            <label>지방(g)</label>
            <input type="number" value={fat} onChange={(e) => setFat(e.target.value)} />
          </div>
        </div>

        {error && <div className="error-text">{error}</div>}

        <div className="row" style={{ marginTop: 8 }}>
          {itemId && (
            <button className="btn danger" onClick={handleDelete}>
              삭제
            </button>
          )}
          <button className="btn primary" onClick={handleSave} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
