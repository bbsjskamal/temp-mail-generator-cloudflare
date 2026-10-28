import express from "express";
import { registerMailApiRoutes } from "../server/mailRoutes";

const app = express();
const allowedOrigins = new Set(
  (process.env.FRONTEND_ORIGINS || "https://temp-mail-generator-cloudflare.pages.dev")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));
registerMailApiRoutes(app);

export default app;
