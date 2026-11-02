import jwt from "jsonwebtoken";
import { config } from "../../config.js";
export function issueToken(user) {
  return jwt.sign({}, config.jwtSecret, {
    algorithm: "HS256",
    subject: user.id,
    expiresIn: "8h",
    issuer: "taskflow",
    audience: "taskflow-web",
  });
}
export const cookieOptions = {
  httpOnly: true,
  sameSite: "strict",
  secure: config.production,
  path: "/",
  maxAge: 8 * 60 * 60 * 1000,
};
