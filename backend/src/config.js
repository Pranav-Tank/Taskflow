import "dotenv/config";
export const config = {
  port: Number(process.env.PORT || 5000),
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  production: process.env.NODE_ENV === "production",
};
export function checkConfig() {
  if (!config.databaseUrl)
    throw new Error("Set DATABASE_URL in backend/.env; see README.md");
  if (!config.jwtSecret || config.jwtSecret.length < 32)
    throw new Error("JWT_SECRET must contain at least 32 characters");
}
