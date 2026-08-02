import { Router, Request, Response, NextFunction } from "express";

export const authRouter = Router();

declare module "express-session" {
  interface SessionData {
    authenticated?: boolean;
  }
}

authRouter.post("/login", (req, res) => {
  const { password } = req.body as { password?: string };
  const appPassword = process.env.APP_PASSWORD || "";
  if (!appPassword) {
    return res.status(500).json({ error: "서버에 APP_PASSWORD가 설정되어 있지 않습니다." });
  }
  if (password !== appPassword) {
    return res.status(401).json({ error: "비밀번호가 올바르지 않습니다." });
  }
  req.session.authenticated = true;
  res.json({ ok: true });
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

authRouter.get("/status", (req, res) => {
  res.json({ authenticated: Boolean(req.session.authenticated) });
});

authRouter.get("/config", (_req, res) => {
  res.json({ gemini_configured: Boolean(process.env.GEMINI_API_KEY) });
});

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session.authenticated) return next();
  res.status(401).json({ error: "로그인이 필요합니다." });
}
