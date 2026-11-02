import { useState } from "react";
import { useAuth } from "../auth.jsx";
import { useResource } from "../hooks.js";
import { api, query, label, date, navigate } from "../api.js";
import {
  Badge,
  State,
  Empty,
  Pager,
  Modal,
  RemoteSelect,
  ErrorMessage,
} from "../components.jsx";
const statuses = ["TODO", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "BLOCKED"];
const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export function TaskForm({ task, initialProject = "", onClose, onSaved }) {
  const { user } = useAuth();
  const employee = user.role === "EMPLOYEE";
  const [form, setForm] = useState({
    projectId: task?.project_id || initialProject,
    title: task?.title || "",
    description: task?.description || "",
    status: task?.status || "TODO",
    priority: task?.priority || "MEDIUM",
    assigneeId: task?.assignee_id || "",
    dueDate: task?.due_date?.slice(0, 10) || "",
    blockedReason: task?.blocked_reason || "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const project = useResource(
    form.projectId && !employee ? "/projects/" + form.projectId : null,
  );
  const field = (name, value) => setForm((old) => ({ ...old, [name]: value }));
  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const body = employee
        ? {
            status: form.status,
            blockedReason:
              form.status === "BLOCKED" ? form.blockedReason : null,
          }
        : {
            ...form,
            assigneeId: form.assigneeId || null,
            dueDate: form.dueDate || null,
          };
      if (task) delete body.projectId;
      const result = await api("/tasks" + (task ? "/" + task.id : ""), {
        method: task ? "PATCH" : "POST",
        body,
      });
      onSaved(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const cannotReopen =
    task?.status === "COMPLETED" && !["ADMIN", "MANAGER"].includes(user.role);
  return (
    <Modal title={task ? "Edit task" : "Create task"} onClose={onClose}>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          {!employee && (
            <>
              {!task && (
                <RemoteSelect
                  kind="projects"
                  labelText="Project"
                  required
                  value={form.projectId}
                  onChange={(value) => {
                    field("projectId", value);
                    field("assigneeId", "");
                  }}
                />
              )}
              <label>
                Task title
                <input
                  required
                  minLength={3}
                  maxLength={200}
                  value={form.title}
                  onChange={(e) => field("title", e.target.value)}
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
              <div className="form-grid">
                <label>
                  Assign to
                  <select
                    value={form.assigneeId}
                    required={user.role === "TEAM_LEAD"}
                    onChange={(e) => field("assigneeId", e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {project.data?.data.members
                      .filter((member) => member.active)
                      .map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} · {label(member.role)}
                        </option>
                      ))}
                  </select>
                  {project.error && (
                    <small className="field-error">{project.error}</small>
                  )}
                </label>
                <label>
                  Due date
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => field("dueDate", e.target.value)}
                  />
                </label>
              </div>
            </>
          )}
          <div className="form-grid">
            <label>
              Status
              <select
                value={form.status}
                onChange={(e) => field("status", e.target.value)}
              >
                {statuses.map((value) => (
                  <option
                    key={value}
                    value={value}
                    disabled={cannotReopen && value !== "COMPLETED"}
                  >
                    {label(value)}
                  </option>
                ))}
              </select>
            </label>
            {!employee && (
              <label>
                Priority
                <select
                  value={form.priority}
                  onChange={(e) => field("priority", e.target.value)}
                >
                  {priorities.map((value) => (
                    <option key={value} value={value}>
                      {label(value)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {form.status === "BLOCKED" && (
            <label>
              Why is this task blocked?
              <textarea
                required
                maxLength={1000}
                rows={3}
                value={form.blockedReason}
                onChange={(e) => field("blockedReason", e.target.value)}
                placeholder="Describe the dependency or issue…"
              />
            </label>
          )}
          {cannotReopen && (
            <p className="muted">
              A project Manager or Admin must reopen this task.
            </p>
          )}
          <ErrorMessage message={error} />
          <div className="form-actions">
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button disabled={busy || (!employee && project.loading)}>
              {busy ? "Saving…" : "Save task"}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
export default function Tasks({ initialProject = "", notify }) {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    search: "",
    projectId: initialProject,
    assigneeId: "",
    status: "",
    priority: "",
    dueFrom: "",
    dueTo: "",
    overdue: false,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const resource = useResource(
    "/tasks?" + query({ ...applied, page, limit: 20 }),
  );
  const field = (name, value) =>
    setFilters((old) => ({ ...old, [name]: value }));
  function apply(e) {
    e.preventDefault();
    setPage(1);
    setApplied({ ...filters });
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TURN PLANS INTO PROGRESS</p>
          <h1>Tasks, in focus.</h1>
          <p className="muted">
            Find what matters. Keep every next step in sight.
          </p>
        </div>
        {user.role !== "EMPLOYEE" && (
          <button onClick={() => setOpen(true)}>+ New task</button>
        )}
      </div>
      <form className="panel filters-panel" onSubmit={apply}>
        <div className="filter-main">
          <label className="grow">
            Search across tasks, projects and people
            <input
              maxLength={150}
              placeholder="Try a title, description, project or employee name…"
              value={filters.search}
              onChange={(e) => field("search", e.target.value)}
            />
          </label>
          <button type="submit">Apply filters</button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              const cleared = {
                search: "",
                projectId: "",
                assigneeId: "",
                status: "",
                priority: "",
                dueFrom: "",
                dueTo: "",
                overdue: false,
                sortBy: "createdAt",
                sortOrder: "desc",
              };
              setFilters(cleared);
              setApplied(cleared);
              setPage(1);
            }}
          >
            Reset
          </button>
        </div>
        <details open={!!initialProject}>
          <summary>
            More filters{" "}
            <span className="muted">
              Project · assignee · status · priority · dates
            </span>
          </summary>
          <div className="filters-grid">
            <RemoteSelect
              kind="projects"
              labelText="Project"
              value={filters.projectId}
              onChange={(value) => field("projectId", value)}
            />
            <RemoteSelect
              labelText="Assignee"
              value={filters.assigneeId}
              onChange={(value) => field("assigneeId", value)}
            />
            <label>
              Status
              <select
                value={filters.status}
                onChange={(e) => field("status", e.target.value)}
              >
                <option value="">All statuses</option>
                {statuses.map((value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select
                value={filters.priority}
                onChange={(e) => field("priority", e.target.value)}
              >
                <option value="">All priorities</option>
                {priorities.map((value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Due from
              <input
                type="date"
                value={filters.dueFrom}
                onChange={(e) => field("dueFrom", e.target.value)}
              />
            </label>
            <label>
              Due to
              <input
                type="date"
                min={filters.dueFrom || undefined}
                value={filters.dueTo}
                onChange={(e) => field("dueTo", e.target.value)}
              />
            </label>
          </div>
        </details>
        <div className="filter-bottom">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={filters.overdue}
              onChange={(e) => field("overdue", e.target.checked)}
            />
            Overdue tasks only
          </label>
          <div className="inline-controls">
            <label>
              Sort by
              <select
                value={filters.sortBy}
                onChange={(e) => field("sortBy", e.target.value)}
              >
                {[
                  ["createdAt", "Created date"],
                  ["updatedAt", "Updated date"],
                  ["dueDate", "Due date"],
                  ["title", "Title"],
                  ["priority", "Priority"],
                  ["status", "Status"],
                ].map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Order
              <select
                value={filters.sortOrder}
                onChange={(e) => field("sortOrder", e.target.value)}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </label>
          </div>
        </div>
      </form>
      <section className="panel">
        <State resource={resource}>
          {resource.data?.data.length ? (
            <div className="table-wrap">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Task / project</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Assignee</th>
                    <th>Due date</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {resource.data.data.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <button
                          className="text-button title-link"
                          onClick={() => navigate("/tasks/" + task.id)}
                        >
                          {task.title}
                        </button>
                        <small className="block muted">
                          {task.project_name}
                        </small>
                      </td>
                      <td>
                        <Badge value={task.status} />
                      </td>
                      <td>
                        <Badge value={task.priority} />
                      </td>
                      <td>
                        {task.assignee_name || (
                          <span className="muted">Unassigned</span>
                        )}
                      </td>
                      <td
                        className={
                          task.due_date &&
                          task.due_date <
                            new Date().toISOString().slice(0, 10) &&
                          task.status !== "COMPLETED"
                            ? "text-danger"
                            : ""
                        }
                      >
                        {date(task.due_date)}
                      </td>
                      <td>
                        <button
                          className="text-button"
                          aria-label={"Open " + task.title}
                          onClick={() => navigate("/tasks/" + task.id)}
                        >
                          ↗
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No tasks match your filters" />
          )}
          <Pager meta={resource.data?.meta} onChange={setPage} />
        </State>
      </section>
      {open && (
        <TaskForm
          initialProject={applied.projectId}
          onClose={() => setOpen(false)}
          onSaved={(task) => {
            setOpen(false);
            notify("Task created");
            navigate("/tasks/" + task.id);
          }}
        />
      )}
    </>
  );
}
export function TaskDetail({ id, notify }) {
  const { user } = useAuth();
  const resource = useResource("/tasks/" + id);
  const task = resource.data?.data;
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState("");
  const [commentPage, setCommentPage] = useState(1);
  const [activityPage, setActivityPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const comments = useResource(
    "/tasks/" + id + "/comments?page=" + commentPage + "&limit=10",
  );
  const activity = useResource(
    "/tasks/" + id + "/activity?page=" + activityPage + "&limit=10",
  );
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/tasks/" + id + "/comments", {
        method: "POST",
        body: { body: comment },
      });
      setComment("");
      setCommentPage(1);
      comments.refresh();
      activity.refresh();
      notify("Comment added");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!confirm("Delete this task? Its history will be retained.")) return;
    try {
      await api("/tasks/" + id, { method: "DELETE" });
      notify("Task deleted");
      navigate("/tasks");
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <>
      <button className="back-button" onClick={() => navigate("/tasks")}>
        ← All tasks
      </button>
      <State resource={resource}>
        {task && (
          <>
            <div className="page-heading">
              <div>
                <div className="actions">
                  <Badge value={task.status} />
                  <Badge value={task.priority} />
                </div>
                <h1>{task.title}</h1>
                <button
                  className="text-button"
                  onClick={() => navigate("/projects/" + task.project_id)}
                >
                  {task.project_name} ↗
                </button>
              </div>
              <div className="actions">
                <button onClick={() => setEditing(true)}>
                  {user.role === "EMPLOYEE" ? "Update status" : "Edit task"}
                </button>
                {["ADMIN", "MANAGER"].includes(user.role) && (
                  <button className="danger" onClick={remove}>
                    Delete task
                  </button>
                )}
              </div>
            </div>
            <ErrorMessage message={error} />
            <div className="detail-layout">
              <section className="panel">
                <h2>Description</h2>
                <p className="description">
                  {task.description || "No description added."}
                </p>
                {task.status === "BLOCKED" && (
                  <div className="blocked-note">
                    <b>Blocked reason</b>
                    <p>{task.blocked_reason}</p>
                  </div>
                )}
              </section>
              <aside className="panel">
                <h2>Task details</h2>
                <dl>
                  <dt>Assignee</dt>
                  <dd>{task.assignee_name || "Unassigned"}</dd>
                  <dt>Due date</dt>
                  <dd>{date(task.due_date)}</dd>
                  <dt>Created</dt>
                  <dd>{date(task.created_at)}</dd>
                  <dt>Completed</dt>
                  <dd>
                    {task.completed_at
                      ? date(task.completed_at)
                      : "Not completed"}
                  </dd>
                </dl>
              </aside>
            </div>
            <div className="two-columns">
              <section className="panel">
                <h2>Conversation</h2>
                <form onSubmit={submit}>
                  <label className="sr-only" htmlFor="comment">
                    Add a comment
                  </label>
                  <textarea
                    id="comment"
                    required
                    maxLength={4000}
                    rows={3}
                    placeholder="Share an update or ask a question…"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <button disabled={busy}>
                    {busy ? "Posting…" : "Post comment"}
                  </button>
                </form>
                <State resource={comments}>
                  <div className="conversation">
                    {comments.data?.data.map((item) => (
                      <article key={item.id}>
                        <div className="section-heading">
                          <b>{item.author_name}</b>
                          <small className="muted">
                            {date(item.created_at)}
                          </small>
                        </div>
                        <p>{item.body}</p>
                      </article>
                    ))}
                  </div>
                  {!comments.data?.data.length && (
                    <p className="muted">Start the conversation.</p>
                  )}
                  <Pager meta={comments.data?.meta} onChange={setCommentPage} />
                </State>
              </section>
              <section className="panel">
                <h2>Activity history</h2>
                <State resource={activity}>
                  <ol className="timeline">
                    {activity.data?.data.map((item) => (
                      <li key={item.id}>
                        <div>
                          <b>{label(item.action)}</b>
                          <small className="block muted">
                            {item.author_name} · {date(item.created_at)}
                          </small>
                          {item.metadata.from && (
                            <p>
                              {label(item.metadata.from)} →{" "}
                              {label(item.metadata.to)}
                            </p>
                          )}
                          {item.metadata.reason && (
                            <p>{item.metadata.reason}</p>
                          )}
                          {item.metadata.fields && (
                            <small className="muted">
                              Changed: {item.metadata.fields.join(", ")}
                            </small>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                  <Pager
                    meta={activity.data?.meta}
                    onChange={setActivityPage}
                  />
                </State>
              </section>
            </div>
            {editing && (
              <TaskForm
                task={task}
                onClose={() => setEditing(false)}
                onSaved={() => {
                  setEditing(false);
                  resource.refresh();
                  activity.refresh();
                  notify("Task updated");
                }}
              />
            )}
          </>
        )}
      </State>
    </>
  );
}
