import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { BodyPhoto } from "../types";
import { todayStr } from "../lib/date";

export default function BodyPhotosPage() {
  const [photos, setPhotos] = useState<BodyPhoto[]>([]);
  const [date, setDate] = useState(todayStr());
  const [angle, setAngle] = useState("front");
  const [memo, setMemo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    api.get<BodyPhoto[]>("/api/body-photos").then(setPhotos);
  }

  useEffect(load, []);

  async function handleUpload() {
    setError(null);
    if (!file) {
      setError("사진을 선택해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("date", date);
      fd.append("angle", angle);
      if (memo) fd.append("memo", memo);
      fd.append("photo", file);
      await api.post("/api/body-photos", fd);
      setFile(null);
      setMemo("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("이 사진을 삭제할까요?")) return;
    await api.delete(`/api/body-photos/${id}`);
    load();
  }

  return (
    <div>
      <div className="card">
        <h2>눈바디 사진 추가</h2>
        <div className="row">
          <div className="field">
            <label>날짜</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>각도</label>
            <select value={angle} onChange={(e) => setAngle(e.target.value)}>
              <option value="front">정면</option>
              <option value="side">측면</option>
              <option value="back">후면</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>사진</label>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div className="field">
          <label>메모 (선택)</label>
          <input value={memo} onChange={(e) => setMemo(e.target.value)} />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button className="btn primary" onClick={handleUpload} disabled={saving}>
          {saving ? "업로드 중..." : "업로드"}
        </button>
      </div>

      <div className="card">
        <h2>눈바디 타임라인</h2>
        {photos.length === 0 ? (
          <div className="muted">아직 사진이 없습니다.</div>
        ) : (
          <div className="photo-grid">
            {photos.map((p) => (
              <figure key={p.id} onClick={() => handleDelete(p.id)} title="클릭하면 삭제">
                <img src={p.photo_path} alt={p.date} />
                <figcaption>
                  {p.date}
                  {p.angle && ` · ${p.angle}`}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
