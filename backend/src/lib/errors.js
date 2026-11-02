import { failure } from "../common/response.js";
export class AppError extends Error {
  constructor(message, status = 400, details = []) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
export function requireValue(
  value,
  message = "Resource not found",
  status = 404,
) {
  if (!value) throw new AppError(message, status);
  return value;
}
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let message = error.message;
  if (error.code === "23505") {
    status = 409;
    message = "A record with this value already exists";
  }
  if (error.code === "23503") {
    status = 409;
    message =
      "This record is still referenced; remove or reassign related records first";
  }
  if (error.code === "23514") {
    status = 400;
    message = "The update violates a data rule";
  }
  if (error.code === "P2002") {
    status = 409;
    message = "A record with this value already exists";
  }
  if (error.code === "P2003") {
    status = 409;
    message =
      "This record is still referenced; remove or reassign related records first";
  }
  if (error.code === "P2025") {
    status = 404;
    message = "Resource not found";
  }
  if (error.code === "P2004" || error.code === "P2011") {
    status = 400;
    message = "The update violates a data rule";
  }
  if (error.code === "P2010" && error.meta?.code === "23514") {
    status = 400;
    message = "The update violates a data rule";
  }
  if (error.code === "P2034") {
    status = 409;
    message = "Concurrent update conflict. Please retry.";
  }
  if (error.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON body";
  }
  if (status >= 500) {
    console.error(error);
    message = "The server could not complete this request";
  }
  failure(res, status, message, status >= 500 ? [] : error.details || []);
}
