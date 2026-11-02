export const pagination = ({ page = 1, limit = 20 }) => ({
  take: limit,
  skip: (page - 1) * limit,
});
export const pageResult = (data, total, { page = 1, limit = 20 }) => ({
  data,
  meta: {
    total,
    page,
    limit,
  },
});
export const literalSearch = (value) => value.replace(/[\\%_]/g, "\\$&");
export const today = () => {
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  return day;
};
