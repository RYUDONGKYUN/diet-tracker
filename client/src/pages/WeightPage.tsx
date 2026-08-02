import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { api } from "../api/client";
import type { WeeklyReview, WeightLog, WeightSummary } from "../types";
import { todayStr, mostRecentMonday } from "../lib/date";

export default function WeightPage() {
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [summary, setSummary] = useState<WeightSummary | null>(null);
  const [date, setDate] = useState(todayStr());
  const [weight, setWeight] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [weekStart, setWeekStart] = useState(mostRecentMonday());
  const [avgSleep, setAvgSleep] = useState("");
  const [conditionNote, setConditionNote] = useState("");
  const [nextKcal, setNextKcal] = useState("");
  const [nextNote, setNextNote] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);

  function load() {
    api.get<WeightLog[]>("/api/weight").then(setLogs);
    api.get<WeightSummary>("/api/weight/summary").then(setSummary);
    api.get<WeeklyReview[]>("/api/weekly-reviews").then(setReviews);
  }

  useEffect(load, []);

  async function handleReviewSubmit() {
    setReviewError(null);
    try {
      await api.post("/api/weekly-reviews", {
        week_start: weekStart,
        avg_sleep: avgSleep ? Number(avgSleep) : undefined,
        condition_note: conditionNote || undefined,
        weight_delta: summary?.weekly_delta_kg ?? undefined,
        next_week_kcal_target: nextKcal ? Number(nextKcal) : undefined,
        next_week_note: nextNote || undefined,
      });
      setAvgSleep("");
      setConditionNote("");
      setNextKcal("");
      setNextNote("");
      load();
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "저장 실패");
    }
  }

  async function handleSubmit() {
    setError(null);
    const w = Number(weight);
    if (!w) {
      setError("체중을 입력해 주세요.");
      return;
    }
    try {
      await api.post("/api/weight", { date, weight_kg: w, memo: memo || undefined });
      setWeight("");
      setMemo("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    }
  }

  async function handleDelete(id: number) {
    await api.delete(`/api/weight/${id}`);
    load();
  }

  const chartData = logs.map((l) => ({ date: l.date.slice(5), weight: l.weight_kg }));

  return (
    <div>
      {summary && (
        <div className="card">
          <h2>진행률</h2>
          <div className="kpi-grid">
            <div className="kpi-tile">
              <div className="label">시작 체중</div>
              <div className="value">{summary.start_weight_kg}<span className="unit">kg</span></div>
            </div>
            <div className="kpi-tile">
              <div className="label">현재 체중</div>
              <div className="value">{summary.latest_weight_kg}<span className="unit">kg</span></div>
            </div>
            <div className="kpi-tile">
              <div className="label">목표 체중</div>
              <div className="value">{summary.goal_weight_kg}<span className="unit">kg</span></div>
            </div>
            <div className="kpi-tile">
              <div className="label">주간 변화</div>
              <div className="value">
                {summary.weekly_delta_kg === null ? "-" : `${summary.weekly_delta_kg > 0 ? "+" : ""}${summary.weekly_delta_kg}`}
                <span className="unit">kg</span>
              </div>
            </div>
          </div>
          <div className="macro-row" style={{ marginTop: 12 }}>
            <div className="macro-label">
              <span>목표 달성률</span>
              <span>{summary.progress_pct}%</span>
            </div>
            <div className="macro-bar-track">
              <div className="macro-bar-fill" style={{ width: `${summary.progress_pct}%` }} />
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2>체중 그래프</h2>
        {chartData.length === 0 ? (
          <div className="muted">아직 기록이 없습니다.</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 11 }} />
              <Tooltip />
              {summary && <ReferenceLine y={summary.goal_weight_kg} stroke="var(--accent)" strokeDasharray="4 4" />}
              <Line type="monotone" dataKey="weight" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h2>체중 입력</h2>
        <div className="row">
          <div className="field">
            <label>날짜</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>체중(kg)</label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="예: 78.5"
            />
          </div>
        </div>
        <div className="field">
          <label>메모 (선택)</label>
          <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="컨디션 등" />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button className="btn primary" onClick={handleSubmit}>
          저장
        </button>
      </div>

      <div className="card">
        <h2>기록 목록</h2>
        {[...logs].reverse().map((l) => (
          <div className="list-row" key={l.id}>
            <span>
              {l.date} · {l.weight_kg}kg {l.memo && <span className="muted"> ({l.memo})</span>}
            </span>
            <button className="btn danger" onClick={() => handleDelete(l.id)}>
              삭제
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>주간 리뷰</h2>
        <div className="row">
          <div className="field">
            <label>주 시작일(월요일)</label>
            <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
          </div>
          <div className="field">
            <label>평균 수면(시간)</label>
            <input type="number" step="0.5" value={avgSleep} onChange={(e) => setAvgSleep(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>이번 주 컨디션</label>
          <input value={conditionNote} onChange={(e) => setConditionNote(e.target.value)} placeholder="예: 피로감 있음" />
        </div>
        <div className="field">
          <label>다음 주 칼로리 목표 조정 (선택)</label>
          <input type="number" value={nextKcal} onChange={(e) => setNextKcal(e.target.value)} placeholder="비우면 기존 목표 유지" />
        </div>
        <div className="field">
          <label>다음 주 운동/메모</label>
          <input value={nextNote} onChange={(e) => setNextNote(e.target.value)} placeholder="예: 유산소 비중 늘리기" />
        </div>
        {reviewError && <div className="error-text">{reviewError}</div>}
        <button className="btn primary" onClick={handleReviewSubmit}>
          이번 주 리뷰 저장
        </button>

        {reviews.length > 0 && (
          <div style={{ marginTop: 16 }}>
            {reviews.map((r) => (
              <div className="list-row" key={r.id} style={{ display: "block" }}>
                <div>
                  <strong>{r.week_start} 주</strong>
                  {r.weight_delta !== null && (
                    <span className="muted"> · 체중 변화 {r.weight_delta > 0 ? "+" : ""}{r.weight_delta}kg</span>
                  )}
                  {r.avg_sleep !== null && <span className="muted"> · 평균 수면 {r.avg_sleep}시간</span>}
                </div>
                {r.condition_note && <div className="muted">컨디션: {r.condition_note}</div>}
                {r.next_week_kcal_target && <div className="muted">다음 주 목표: {r.next_week_kcal_target}kcal</div>}
                {r.next_week_note && <div className="muted">메모: {r.next_week_note}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
