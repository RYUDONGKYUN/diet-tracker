import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Profile, Targets } from "../types";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [targets, setTargets] = useState<Targets | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.get<{ profile: Profile; targets: Targets }>("/api/profile").then((res) => {
      setProfile(res.profile);
      setTargets(res.targets);
    });
  }

  useEffect(load, []);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    if (!profile) return;
    setProfile({ ...profile, [key]: value });
    setSaved(false);
  }

  async function handleSave() {
    if (!profile) return;
    setError(null);
    try {
      const res = await api.patch<{ profile: Profile; targets: Targets }>("/api/profile", {
        height_cm: profile.height_cm,
        start_weight_kg: profile.start_weight_kg,
        goal_weight_kg: profile.goal_weight_kg,
        start_skeletal_muscle_kg: profile.start_skeletal_muscle_kg,
        goal_skeletal_muscle_kg: profile.goal_skeletal_muscle_kg,
        phase: profile.phase,
        cutting_kcal: profile.cutting_kcal,
        cutting_protein_min: profile.cutting_protein_min,
        cutting_protein_max: profile.cutting_protein_max,
        maintenance_kcal: profile.maintenance_kcal,
        maintenance_protein_min: profile.maintenance_protein_min,
        maintenance_protein_max: profile.maintenance_protein_max,
        fat_pct_of_kcal: profile.fat_pct_of_kcal,
        screen_golf_expiry: profile.screen_golf_expiry,
        gym_expiry: profile.gym_expiry,
      });
      setProfile(res.profile);
      setTargets(res.targets);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    }
  }

  if (!profile || !targets) return <div className="muted">불러오는 중...</div>;

  return (
    <div>
      <div className="card">
        <h2>오늘의 목표 (자동 계산)</h2>
        <div className="kpi-grid">
          <div className="kpi-tile">
            <div className="label">칼로리</div>
            <div className="value">{targets.kcal}</div>
          </div>
          <div className="kpi-tile">
            <div className="label">단백질</div>
            <div className="value">{targets.protein}g</div>
          </div>
          <div className="kpi-tile">
            <div className="label">탄수화물</div>
            <div className="value">{targets.carbs}g</div>
          </div>
          <div className="kpi-tile">
            <div className="label">지방</div>
            <div className="value">{targets.fat}g</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>단계</h2>
        <div className="field">
          <label>현재 단계</label>
          <select value={profile.phase} onChange={(e) => update("phase", e.target.value as Profile["phase"])}>
            <option value="cutting">감량기</option>
            <option value="maintenance">유지기</option>
          </select>
        </div>
      </div>

      <div className="card">
        <h2>체중 / 골격근 목표</h2>
        <div className="row">
          <div className="field">
            <label>키(cm)</label>
            <input
              type="number"
              value={profile.height_cm}
              onChange={(e) => update("height_cm", Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>시작 체중(kg)</label>
            <input
              type="number"
              step="0.1"
              value={profile.start_weight_kg}
              onChange={(e) => update("start_weight_kg", Number(e.target.value))}
            />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>목표 체중(kg)</label>
            <input
              type="number"
              step="0.1"
              value={profile.goal_weight_kg}
              onChange={(e) => update("goal_weight_kg", Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>목표 골격근량(kg)</label>
            <input
              type="number"
              step="0.1"
              value={profile.goal_skeletal_muscle_kg ?? ""}
              onChange={(e) => update("goal_skeletal_muscle_kg", Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h2>감량기 목표</h2>
        <div className="row">
          <div className="field">
            <label>칼로리(kcal)</label>
            <input
              type="number"
              value={profile.cutting_kcal}
              onChange={(e) => update("cutting_kcal", Number(e.target.value))}
            />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>단백질 최소(g)</label>
            <input
              type="number"
              value={profile.cutting_protein_min}
              onChange={(e) => update("cutting_protein_min", Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>단백질 최대(g)</label>
            <input
              type="number"
              value={profile.cutting_protein_max}
              onChange={(e) => update("cutting_protein_max", Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h2>유지기 목표</h2>
        <div className="row">
          <div className="field">
            <label>칼로리(kcal)</label>
            <input
              type="number"
              value={profile.maintenance_kcal}
              onChange={(e) => update("maintenance_kcal", Number(e.target.value))}
            />
          </div>
        </div>
        <div className="row">
          <div className="field">
            <label>단백질 최소(g)</label>
            <input
              type="number"
              value={profile.maintenance_protein_min}
              onChange={(e) => update("maintenance_protein_min", Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>단백질 최대(g)</label>
            <input
              type="number"
              value={profile.maintenance_protein_max}
              onChange={(e) => update("maintenance_protein_max", Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h2>탄수화물 / 지방 비율</h2>
        <div className="field">
          <label>지방이 차지하는 칼로리 비율 (기본 25%)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={profile.fat_pct_of_kcal}
            onChange={(e) => update("fat_pct_of_kcal", Number(e.target.value))}
          />
          <div className="muted" style={{ marginTop: 4 }}>
            나머지 칼로리는 자동으로 탄수화물 목표로 계산됩니다.
          </div>
        </div>
      </div>

      <div className="card">
        <h2>정기권 만료일</h2>
        <div className="row">
          <div className="field">
            <label>스크린골프</label>
            <input
              type="date"
              value={profile.screen_golf_expiry ?? ""}
              onChange={(e) => update("screen_golf_expiry", e.target.value)}
            />
          </div>
          <div className="field">
            <label>헬스장</label>
            <input
              type="date"
              value={profile.gym_expiry ?? ""}
              onChange={(e) => update("gym_expiry", e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && <div className="error-text">{error}</div>}
      <button className="btn primary" onClick={handleSave} style={{ width: "100%" }}>
        {saved ? "저장됨" : "저장"}
      </button>
    </div>
  );
}
