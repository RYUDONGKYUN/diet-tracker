import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { ExerciseLog, ExerciseType } from "../types";
import { todayStr } from "../lib/date";

const TYPE_LABEL: Record<ExerciseType, string> = {
  weight: "웨이트",
  running: "러닝",
  screen_golf: "스크린골프",
  boxing: "복싱",
  other: "기타",
};

export default function ExercisePage() {
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [date, setDate] = useState(todayStr());
  const [type, setType] = useState<ExerciseType>("weight");
  const [customLabel, setCustomLabel] = useState("");
  const [duration, setDuration] = useState("");
  const [intensity, setIntensity] = useState("보통");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    api.get<ExerciseLog[]>("/api/exercise").then(setLogs);
  }

  useEffect(load, []);

  async function handleSubmit() {
    setError(null);
    try {
      await api.post("/api/exercise", {
        date,
        type,
        custom_label: type === "other" ? customLabel : undefined,
        duration_min: duration ? Number(duration) : undefined,
        intensity,
        memo: memo || undefined,
      });
      setCustomLabel("");
      setDuration("");
      setMemo("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    }
  }

  async function handleDelete(id: number) {
    await api.delete(`/api/exercise/${id}`);
    load();
  }

  return (
    <div>
      <div className="card">
        <h2>운동 기록 추가</h2>
        <div className="row">
          <div className="field">
            <label>날짜</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>종류</label>
            <select value={type} onChange={(e) => setType(e.target.value as ExerciseType)}>
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
        {type === "other" && (
          <div className="field">
            <label>운동 이름</label>
            <input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="예: 수영" />
          </div>
        )}
        <div className="row">
          <div className="field">
            <label>시간(분)</label>
            <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          <div className="field">
            <label>강도</label>
            <select value={intensity} onChange={(e) => setIntensity(e.target.value)}>
              <option value="가벼움">가벼움</option>
              <option value="보통">보통</option>
              <option value="높음">높음</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>메모 (선택)</label>
          <input value={memo} onChange={(e) => setMemo(e.target.value)} />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button className="btn primary" onClick={handleSubmit}>
          저장
        </button>
      </div>

      <div className="card">
        <h2>운동 기록 목록</h2>
        {logs.length === 0 ? (
          <div className="muted">아직 기록이 없습니다.</div>
        ) : (
          logs.map((l) => (
            <div className="list-row" key={l.id}>
              <span>
                {l.date} · {l.type === "other" ? l.custom_label : TYPE_LABEL[l.type]}
                {l.duration_min ? ` · ${l.duration_min}분` : ""}
                {l.intensity ? ` · ${l.intensity}` : ""}
                {l.memo && <span className="muted"> ({l.memo})</span>}
              </span>
              <button className="btn danger" onClick={() => handleDelete(l.id)}>
                삭제
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
