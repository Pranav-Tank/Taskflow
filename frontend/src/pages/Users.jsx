import { useState } from "react";
import { useAuth } from "../auth.jsx";
import { useResource } from "../hooks.js";
import { api, query, label } from "../api.js";
import {
  State,
  Badge,
  Empty,
  Pager,
  Modal,
  ErrorMessage,
} from "../components.jsx";
const roles = ["ADMIN", "MANAGER", "TEAM_LEAD", "EMPLOYEE"];
function UserForm({ person, onClose, onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: person?.name || "",
    email: person?.email || "",
    role: person?.role || "EMPLOYEE",
    active: person?.active ?? true,
    password: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const field = (name, value) => setForm((old) => ({ ...old, [name]: value }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = { ...form };
      if (!body.password) delete body.password;
      await api("/users" + (person ? "/" + person.id : ""), {
        method: person ? "PATCH" : "POST",
        body,
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={person ? "Edit user" : "Create user"} onClose={onClose}>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label>
            Full name
            <input
              required
              minLength={2}
              maxLength={100}
              value={form.name}
              onChange={(e) => field("name", e.target.value)}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => field("email", e.target.value)}
            />
          </label>
          <div className="form-grid">
            <label>
              Role
              <select
                disabled={person?.id === user.id}
                value={form.role}
                onChange={(e) => field("role", e.target.value)}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {label(role)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {person ? "New password (optional)" : "Password"}
              <input
                type="password"
                autoComplete="new-password"
                required={!person}
                minLength={10}
                maxLength={128}
                value={form.password}
                onChange={(e) => field("password", e.target.value)}
              />
            </label>
          </div>
          {person && (
            <label className="checkbox">
              <input
                type="checkbox"
                disabled={person.id === user.id}
                checked={form.active}
                onChange={(e) => field("active", e.target.checked)}
              />
              Account is active
            </label>
          )}
          <ErrorMessage message={error} />
          <div className="form-actions">
            <button className="secondary" type="button" onClick={onClose}>
              Cancel
            </button>
            <button disabled={busy}>{busy ? "Saving…" : "Save user"}</button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
export default function Users({ notify }) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(undefined);
  const resource = useResource(
    "/users?" + query({ search, role, page, limit: 20 }),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PEOPLE MAKE THE DIFFERENCE</p>
          <h1>Your people</h1>
          <p className="muted">
            Manage access and keep the right people connected.
          </p>
        </div>
        <button onClick={() => setEditing(null)}>+ New user</button>
      </div>
      <section className="panel">
        <div className="toolbar">
          <input
            aria-label="Search users"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            aria-label="Filter user role"
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All roles</option>
            {roles.map((value) => (
              <option key={value} value={value}>
                {label(value)}
              </option>
            ))}
          </select>
        </div>
        <State resource={resource}>
          {resource.data?.data.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Account</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {resource.data.data.map((person) => (
                    <tr key={person.id}>
                      <td>
                        <b>{person.name}</b>
                      </td>
                      <td>{person.email}</td>
                      <td>
                        <Badge value={person.role} />
                      </td>
                      <td>
                        <span
                          className={person.active ? "account-active" : "muted"}
                        >
                          {person.active ? "● Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <button
                          className="text-button"
                          onClick={() => setEditing(person)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No matching people" />
          )}
          <Pager meta={resource.data?.meta} onChange={setPage} />
        </State>
      </section>
      {editing !== undefined && (
        <UserForm
          person={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            resource.refresh();
            notify("User saved");
          }}
        />
      )}
    </>
  );
}
