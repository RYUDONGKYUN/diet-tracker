import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-box">
        <h1>체지방 감량 트래커</h1>
        <p>비밀번호를 입력해 주세요.</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoFocus
            />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button type="submit" className="btn primary" style={{ width: "100%" }} disabled={busy}>
            {busy ? "확인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
