export async function api(path, options = {}) {
  const response = await fetch("/api" + path, {
    credentials: "include",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    ...(options.body === undefined
      ? {}
      : { body: JSON.stringify(options.body) }),
  });
  if (response.status === 204) return null;
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("Cannot reach the API. Check that the backend is running.");
  }
  if (!response.ok || result.success === false) {
    if (response.status === 401 && !path.startsWith("/auth/login"))
      window.dispatchEvent(new Event("taskflow:unauthorized"));
    throw new Error(
      result.error?.details?.length
        ? result.error.details.join("; ")
        : result.error?.message || "Request failed",
    );
  }
  return result;
}
export const query = (values) =>
  new URLSearchParams(
    Object.entries(values).filter(
      ([, value]) =>
        value !== "" &&
        value !== undefined &&
        value !== null &&
        value !== false,
    ),
  ).toString();
export const label = (text) =>
  String(text || "")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
export const number = (value) => Number(value || 0).toLocaleString();
export const date = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Not set";
export const navigate = (path) => {
  window.location.hash = path;
};
