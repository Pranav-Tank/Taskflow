export const dateValue = (value) =>
  value == null
    ? null
    : value instanceof Date
      ? value
      : new Date(value + "T00:00:00.000Z");
export const dateString = (value) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : value;
