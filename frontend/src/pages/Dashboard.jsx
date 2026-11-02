import { useState } from "react";
import { useResource } from "../hooks.js";
import { number, label, navigate } from "../api.js";
import { State, Badge, Progress, Pager, Empty } from "../components.jsx";
export default function Dashboard() {
  const resource = useResource("/dashboard");
  const [page, setPage] = useState(1);
  const performance = useResource(
    "/reports/project-performance?page=" + page + "&limit=10",
  );
  const data = resource.data?.data;
  function chart(title, rows) {
    const max = Math.max(1, ...rows.map((row) => row.count));
    return (
      <section className="panel">
        <div className="section-heading">
          <h2>{title}</h2>
          <span className="muted">Tasks</span>
        </div>
        {rows.length ? (
          rows.map((row) => (
            <div className="bar-row" key={row.label}>
              <span>{label(row.label)}</span>
              <div className={"bar " + row.label.toLowerCase()}>
                <i style={{ width: (row.count / max) * 100 + "%" }} />
              </div>
              <b>{number(row.count)}</b>
            </div>
          ))
        ) : (
          <Empty title="No task data" />
        )}
      </section>
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">WORKSPACE OVERVIEW</p>
          <h1>See the bigger picture.</h1>
          <p className="muted">
            A live look at the work and teams within your scope.
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => {
            resource.refresh();
            performance.refresh();
          }}
        >
          ↻ Refresh
        </button>
      </div>
      <State resource={resource}>
        {data && (
          <>
            <div className="stats">
              {[
                [
                  "Total projects",
                  data.total_projects,
                  "Across your workspace",
                ],
                ["Active projects", data.active_projects, "Moving forward"],
                ["Total tasks", data.total_tasks, "In your authorized scope"],
                ["Completed", data.completed_tasks, "Milestones reached"],
                ["Pending", data.pending_tasks, "Work still in progress"],
                ["Overdue", data.overdue_tasks, "Needs a little attention"],
              ].map(([title, value, note]) => (
                <article
                  key={title}
                  className={"stat " + (title === "Overdue" ? "warning" : "")}
                >
                  <span>{title}</span>
                  <strong>{number(value)}</strong>
                  <small>{note}</small>
                </article>
              ))}
            </div>
            <div className="two-columns">
              {chart("Work by status", data.byStatus)}
              {chart("Work by priority", data.byPriority)}
            </div>
            <div className="two-columns">
              <section className="panel">
                <div className="section-heading">
                  <h2>Team distribution</h2>
                  <small className="muted">Top 10 · all tasks</small>
                </div>
                {data.distribution.map((row) => (
                  <div className="distribution" key={row.id || "none"}>
                    <span className="avatar">{row.name.slice(0, 1)}</span>
                    <span>{row.name}</span>
                    <b>{number(row.count)}</b>
                  </div>
                ))}
              </section>
              <section className="panel">
                <div className="section-heading">
                  <h2>Workload watch</h2>
                  <small className="muted">Top 5 active employees</small>
                </div>
                {data.workload.length ? (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Pending</th>
                          <th>Overdue</th>
                          <th>High / critical</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.workload.map((row) => (
                          <tr key={row.id}>
                            <td>{row.name}</td>
                            <td>{number(row.incomplete_tasks)}</td>
                            <td className="text-danger">
                              {number(row.overdue_tasks)}
                            </td>
                            <td>{number(row.high_priority_tasks)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty title="No incomplete employee tasks" />
                )}
              </section>
            </div>
          </>
        )}
      </State>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Project performance</h2>
            <p className="muted">Progress across projects you can access.</p>
          </div>
        </div>
        <State resource={performance}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Completed</th>
                  <th>Pending</th>
                  <th>Overdue</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {performance.data?.data.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => navigate("/projects/" + row.id)}
                      >
                        {row.name}
                      </button>
                    </td>
                    <td>
                      <Badge value={row.status} />
                    </td>
                    <td>{number(row.total_tasks)}</td>
                    <td>{number(row.completed_tasks)}</td>
                    <td>{number(row.pending_tasks)}</td>
                    <td>{number(row.overdue_tasks)}</td>
                    <td>
                      <div className="progress-cell">
                        <Progress value={row.completion_percentage} />
                        <span>{row.completion_percentage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager meta={performance.data?.meta} onChange={setPage} />
        </State>
      </section>
    </>
  );
}
