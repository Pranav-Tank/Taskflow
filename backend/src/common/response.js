export const success = (res, data, status = 200) =>
  res.status(status).json({
    success: true,
    data,
  });
export const paginated = (res, result) =>
  res.json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
export const noContent = (res) => res.status(204).end();
export const failure = (res, status, message, details = []) =>
  res.status(status).json({
    success: false,
    error: {
      message,
      details,
    },
  });
