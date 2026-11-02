import { useState } from "react";
import { useAuth } from "../auth.jsx";
import { useResource } from "../hooks.js";
import { api, query, label, navigate, number } from "../api.js";
import {
  State,
  Empty,
  Badge,
  Pager,
  Modal,
  RemoteSelect,
  ErrorMessage,
  Progress,
} from "../components.jsx";
const statuses = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"];
export function ProjectForm({ project, onClose, onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: project?.name || "",
    description: project?.description || "",
    status: project?.status || "PLANNING",
    managerId: project?.manager_id || "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const field = (name, value) => setForm((old) => ({ ...old, [name]: value }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = { ...form };
      if (user.role !== "ADMIN") delete body.managerId;
      await api("/projects" + (project ? "/" + project.id : ""), {
        method: project ? "PATCH" : "POST",
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
    <Modal
      title={project ? "Edit project" : "Create project"}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label>
            Project name
            <input
              required
              minLength={3}
              maxLength={160}
              value={form.name}
              onChange={(e) => field("name", e.target.value)}
            />
          </label>
          <label>
            Description
            <textarea
              rows={4}
              maxLength={10000}
              value={form.description}
              onChange={(e) => field("description", e.target.value)}
            />
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(e) => field("status", e.target.value)}
            >
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {label(value)}
                </option>
              ))}
            </select>
          </label>
          {user.role === "ADMIN" && (
            <RemoteSelect
              labelText="Project manager"
              role="MANAGER"
              required
              value={form.managerId}
              initialLabel={project?.manager_name}
              onChange={(value) => field("managerId", value)}
            />
          )}
          <ErrorMessage message={error} />
          <div className="form-actions">
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button disabled={busy}>{busy ? "Saving…" : "Save project"}</button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
export default function Projects({ notify }) {
  const { user } = useAuth();
  const canManage = ["ADMIN", "MANAGER"].includes(user.role);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const resource = useResource(
    "/projects?" + query({ search, status, page, limit: 12 }),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A PLACE FOR EVERY INITIATIVE</p>
          <h1>Your projects</h1>
          <p className="muted">Plan the work. Connect the team. Keep moving.</p>
        </div>
        {canManage && (
          <button onClick={() => setOpen(true)}>+ New project</button>
        )}
      </div>
      <div className="toolbar">
        <input
          aria-label="Search projects"
          placeholder="Search project names…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Project status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {label(value)}
            </option>
          ))}
        </select>
      </div>
      <State resource={resource}>
        {resource.data?.data.length ? (
          <div className="project-grid">
            {resource.data.data.map((project, i) => (
              <button
                className="project-card"
                key={project.id}
                onClick={() => navigate("/projects/" + project.id)}
              >
                <div className="section-heading">
                  <span className={"project-icon tone-" + (i % 4)}>
                    {project.name.slice(0, 1)}
                  </span>
                  <Badge value={project.status} />
                </div>
                <h2>{project.name}</h2>
                <p>{project.description}</p>
                <div className="project-card-progress">
                  <span>Task progress</span>
                  <b>
                    {number(project.completed_tasks)} /{" "}
                    {number(project.task_count)}
                  </b>
                </div>
                <Progress
                  value={
                    project.task_count
                      ? (100 * project.completed_tasks) / project.task_count
                      : 0
                  }
                />
                <footer>
                  <span className="avatar small">
                    {project.manager_name?.slice(0, 1)}
                  </span>
                  <span>{project.manager_name}</span>
                  <span className="card-arrow">↗</span>
                </footer>
              </button>
            ))}
          </div>
        ) : (
          <Empty title="No matching projects" />
        )}
        <Pager meta={resource.data?.meta} onChange={setPage} />
      </State>
      {open && (
        <ProjectForm
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            resource.refresh();
            notify("Project created");
          }}
        />
      )}
    </>
  );
}
export function ProjectDetail({ id, notify }) {
  const { user } = useAuth();
  const resource = useResource("/projects/" + id);
  const project = resource.data?.data;
  const canManage = ["ADMIN", "MANAGER"].includes(user.role);
  const [edit, setEdit] = useState(false);
  const [member, setMember] = useState("");
  const [lead, setLead] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function addMember(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/projects/" + id + "/members", {
        method: "PUT",
        body: { userId: member, teamLeadId: lead || null },
      });
      setMember("");
      resource.refresh();
      notify("Membership saved");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function removeMember(person) {
    if (!confirm("Remove " + person.name + " from this project?")) return;
    setError("");
    try {
      await api("/projects/" + id + "/members", {
        method: "DELETE",
        body: { userId: person.id },
      });
      resource.refresh();
      notify("Member removed");
    } catch (err) {
      setError(err.message);
    }
  }
  async function removeProject() {
    if (!confirm("Delete this project and hide its tasks?")) return;
    try {
      await api("/projects/" + id, { method: "DELETE" });
      notify("Project deleted");
      navigate("/projects");
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <>
      <button className="back-button" onClick={() => navigate("/projects")}>
        ← All projects
      </button>
      <State resource={resource}>
        {project && (
          <>
            <div className="page-heading">
              <div>
                <Badge value={project.status} />
                <h1>{project.name}</h1>
                <p className="muted">Managed by {project.manager_name}</p>
              </div>
              <div className="actions">
                {canManage && (
                  <button className="secondary" onClick={() => setEdit(true)}>
                    Edit project
                  </button>
                )}
                {user.role === "ADMIN" && (
                  <button className="danger" onClick={removeProject}>
                    Delete project
                  </button>
                )}
                <button onClick={() => navigate("/tasks?projectId=" + id)}>
                  View tasks →
                </button>
              </div>
            </div>
            <section className="panel">
              <h2>About this project</h2>
              <p className="description">
                {project.description || "No description added."}
              </p>
              <div className="mini-stats">
                <div>
                  <strong>{number(project.summary.total)}</strong>
                  <span>Visible tasks</span>
                </div>
                <div>
                  <strong>{number(project.summary.completed)}</strong>
                  <span>Completed</span>
                </div>
                <div>
                  <strong>{number(project.summary.overdue)}</strong>
                  <span>Overdue</span>
                </div>
              </div>
            </section>
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Project team</h2>
                  <p className="muted">
                    {canManage
                      ? "Manage membership and project-level reporting lines."
                      : "People visible within your team scope."}
                  </p>
                </div>
                <span>{project.members.length} members</span>
              </div>
              <ErrorMessage message={error} />
              {canManage && (
                <form className="member-form" onSubmit={addMember}>
                  <RemoteSelect
                    labelText="Add or update member"
                    required
                    value={member}
                    onChange={setMember}
                  />
                  <label>
                    Reports to
                    <select
                      value={lead}
                      onChange={(e) => setLead(e.target.value)}
                    >
                      <option value="">No team lead</option>
                      {project.members
                        .filter((m) => m.role === "TEAM_LEAD" && m.active)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button disabled={busy}>
                    {busy ? "Saving…" : "Save member"}
                  </button>
                </form>
              )}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th>Role</th>
                      <th>Reports to</th>
                      <th>Account</th>
                      {canManage && <th />}
                    </tr>
                  </thead>
                  <tbody>
                    {project.members.map((person) => (
                      <tr key={person.id}>
                        <td>
                          <b>{person.name}</b>
                          <small className="block muted">{person.email}</small>
                        </td>
                        <td>
                          <Badge value={person.role} />
                        </td>
                        <td>{person.team_lead_name || "—"}</td>
                        <td>{person.active ? "Active" : "Inactive"}</td>
                        {canManage && (
                          <td>
                            <button
                              className="text-button text-danger"
                              onClick={() => removeMember(person)}
                            >
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            {edit && (
              <ProjectForm
                project={project}
                onClose={() => setEdit(false)}
                onSaved={() => {
                  setEdit(false);
                  resource.refresh();
                  notify("Project updated");
                }}
              />
            )}
          </>
        )}
      </State>
    </>
  );
}
