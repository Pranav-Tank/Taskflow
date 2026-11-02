import { useEffect, useRef, useState } from "react";
import { useResource } from "./hooks.js";
import { label, query } from "./api.js";
export function Badge({ value }) {
  return (
    <span className={"badge " + String(value).toLowerCase()}>
      {label(value)}
    </span>
  );
}
export function State({ resource, children }) {
  if (resource.loading)
    return (
      <div className="state" role="status">
        <span className="spinner" /> Loading workspace…
      </div>
    );
  if (resource.error)
    return (
      <div className="error" role="alert">
        {resource.error}{" "}
        <button onClick={resource.refresh} className="secondary">
          Try again
        </button>
      </div>
    );
  return children;
}
export function Empty({
  title = "Nothing here yet",
  text = "Try changing your filters or creating your first item.",
}) {
  return (
    <div className="empty">
      <div className="empty-symbol">◇</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function Pager({ meta, onChange }) {
  if (!meta) return null;
  const pages = Math.max(1, Math.ceil(meta.total / meta.limit));
  return (
    <div className="pager">
      <span>
        {meta.total.toLocaleString()} results · Page {meta.page} of {pages}
      </span>
      <div>
        <button
          className="secondary"
          disabled={meta.page <= 1}
          onClick={() => onChange(meta.page - 1)}
        >
          Previous
        </button>{" "}
        <button
          className="secondary"
          disabled={meta.page >= pages}
          onClick={() => onChange(meta.page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
export function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-label={title}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function RemoteSelect({
  kind = "users",
  role,
  value,
  onChange,
  required = false,
  initialLabel = "",
  labelText,
}) {
  const [search, setSearch] = useState("");
  const resource = useResource(
    "/" +
      (kind === "projects" ? "projects" : "users/options") +
      "?" +
      query({ search, role, limit: 100 }),
  );
  const options = resource.data?.data || [];
  const exists = options.some((item) => item.id === value);
  return (
    <label className="remote-select">
      {labelText}
      <input
        aria-label={"Find " + labelText}
        placeholder={
          "Find " + (kind === "projects" ? "project" : "person") + " by name"
        }
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <select
        required={required}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{required ? "Select an option" : "All / none"}</option>
        {value && !exists && (
          <option value={value}>{initialLabel || "Current selection"}</option>
        )}
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
            {item.role ? " · " + label(item.role) : ""}
          </option>
        ))}
      </select>
      {resource.error && (
        <small className="field-error">{resource.error}</small>
      )}
    </label>
  );
}
export function Progress({ value }) {
  return (
    <div className="progress">
      <span
        style={{ width: Math.max(0, Math.min(100, Number(value) || 0)) + "%" }}
      />
    </div>
  );
}
export function ErrorMessage({ message }) {
  return message ? (
    <div className="error" role="alert">
      {message}
    </div>
  ) : null;
}
