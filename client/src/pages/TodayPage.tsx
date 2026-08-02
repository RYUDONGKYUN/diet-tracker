import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Profile, RecommendResponse } from "../types";
import { todayStr, dDay } from "../lib/date";
import MacroBar from "../components/MacroBar";

export default function TodayPage() {
  const [data, setData] = useState<RecommendResponse | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const date = todayStr();
    Promise.all([
      api.get<RecommendResponse>(`/api/recommend?date=${date}`),
      api.get<{ profile: Profile }>("/api/profile"),
    ])
      .then(([rec, prof]) => {
        setData(rec);
        setProfile(prof.profile);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "불러오기 실패"));
  }, []);

  if (error) return <div className="card">{error}</div>;
  if (!data || !profile) return <div className="muted">불러오는 중...</div>;

  const ddayItems = [
    { label: "스크린골프", date: profile.screen_golf_expiry },
    { label: "헬스장", date: profile.gym_expiry },
  ].filter((d) => d.date);

  return (
    <div>
      <div className="card">
        <h2>{data.date} · {profile.phase === "cutting" ? "감량기" : "유지기"}</h2>
        <div className="kpi-grid">
          <div className="kpi-tile">
            <div className="label">목표 칼로리</div>
            <div className="value">
              {Math.round(data.consumed.kcal)}
              <span className="unit">/{data.targets.kcal}kcal</span>
            </div>
          </div>
          <div className="kpi-tile">
            <div className="label">남은 칼로리</div>
            <div className="value">{Math.round(data.remaining.kcal)}</div>
          </div>
          <div className="kpi-tile">
            <div className="label">단백질</div>
            <div className="value">
              {Math.round(data.consumed.protein)}
              <span className="unit">/{data.targets.protein}g</span>
            </div>
          </div>
          <div className="kpi-tile">
            <div className="label">남은 단백질</div>
            <div className="value">{Math.round(data.remaining.protein)}g</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>매크로 진행률</h2>
        <MacroBar label="탄수화물" consumed={data.consumed.carbs} target={data.targets.carbs} />
        <MacroBar label="단백질" consumed={data.consumed.protein} target={data.targets.protein} />
        <MacroBar label="지방" consumed={data.consumed.fat} target={data.targets.fat} />
      </div>

      <div className="card">
        <h2>오늘의 탄단지 추천</h2>
        {data.suggestions.length === 0 ? (
          <div className="muted">오늘 목표를 이미 충족했어요. 잘하고 있어요!</div>
        ) : (
          data.suggestions.map((s) => (
            <div className="suggestion-item" key={s.nutrient}>
              {s.message}
            </div>
          ))
        )}
      </div>

      {ddayItems.length > 0 && (
        <div className="card">
          <h2>정기권 D-day</h2>
          <div className="dday-strip">
            {ddayItems.map((d) => {
              const diff = dDay(d.date!);
              return (
                <span key={d.label} className={`dday-chip${diff <= 7 ? " soon" : ""}`}>
                  {d.label} D-{diff}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
