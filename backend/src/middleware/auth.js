import jwt from "jsonwebtoken";
import * as repository from "../modules/auth/auth.repository.js";
import { publicUser } from "../modules/auth/auth.mapper.js";
import { config } from "../config.js";
import { AppError } from "../lib/errors.js";
export { publicUser };
export async function authenticate(req, res, next) {
  try {
    const token =
      req.cookies?.taskflow_token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : null);
    if (!token) throw new Error("Missing token");
    const claims = jwt.verify(token, config.jwtSecret, {
      algorithms: ["HS256"],
      issuer: "taskflow",
      audience: "taskflow-web",
    });
    // Roles and activation are loaded from the DB on every request, never trusted from the client/JWT.
    const user = await repository.findActive(claims.sub);
    if (!user) throw new Error("Inactive user");
    req.user = publicUser(user);
    return next();
  } catch (error) {
    if (
      error.message === "Missing token" ||
      error.message === "Inactive user" ||
      ["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(
        error.name,
      )
    )
      return next(new AppError("Please sign in to continue", 401));
    return next(error);
  }
}
export const allow =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user.role)
      ? next()
      : next(new AppError("You do not have permission for this action", 403));
