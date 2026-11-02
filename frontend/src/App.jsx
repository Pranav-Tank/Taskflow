import { useEffect, useState } from "react";
import { useAuth, Login } from "./auth.jsx";
import { useRoute } from "./hooks.js";
import { navigate, label } from "./api.js";
import Dashboard from "./pages/Dashboard.jsx";
import Projects, { ProjectDetail } from "./pages/Projects.jsx";
import Tasks, { TaskDetail } from "./pages/Tasks.jsx";
import Users from "./pages/Users.jsx";
import { ErrorMessage } from "./components.jsx";
export default function App() {
  const auth = useAuth();
  const route = useRoute();
  const [toast, setToast] = useState("");
  const [logoutError, setLogoutError] = useState("");
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  if (auth.loading)
    return (
      <main className="boot" role="status">
        Opening Taskflow…
      </main>
    );
  if (!auth.user)
    return (
      <>
        <Login />
        {auth.error && (
          <div className="connection-error">
            <ErrorMessage message={auth.error} />
            <button className="secondary" onClick={auth.refresh}>
              Retry connection
            </button>
          </div>
        )}
      </>
    );
  const { user } = auth;
  const path = route.pathname;
  let content;
  if (path === "/dashboard") content = <Dashboard />;
  else if (path === "/projects") content = <Projects notify={setToast} />;
  else if (/^\/projects\/[\w-]+$/.test(path))
    content = (
      <ProjectDetail key={path} id={path.split("/")[2]} notify={setToast} />
    );
  else if (path === "/tasks")
    content = (
      <Tasks
        key={route.path}
        initialProject={route.params.get("projectId") || ""}
        notify={setToast}
      />
    );
  else if (/^\/tasks\/[\w-]+$/.test(path))
    content = (
      <TaskDetail key={path} id={path.split("/")[2]} notify={setToast} />
    );
  else if (path === "/users" && user.role === "ADMIN")
    content = <Users notify={setToast} />;
  else
    content = (
      <section className="empty">
        <h1>Page unavailable</h1>
        <p>This page does not exist or is outside your role.</p>
        <button onClick={() => navigate("/dashboard")}>
          Return to overview
        </button>
      </section>
    );
  const links = [
    ["/dashboard", "◫", "Overview"],
    ["/projects", "▦", "Projects"],
    ["/tasks", "☑", "Tasks"],
    ...(user.role === "ADMIN" ? [["/users", "◉", "People"]] : []),
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#/dashboard">
          <span className="brand-mark">t</span>taskflow
          <span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {links.map(([href, icon, text]) => (
            <a
              key={href}
              href={"#" + href}
              aria-current={path.startsWith(href) ? "page" : undefined}
              className={path.startsWith(href) ? "active" : ""}
            >
              <span className="nav-icon">{icon}</span>
              {text}
              {path.startsWith(href) && <i />}
            </a>
          ))}
        </nav>
        <div className="sidebar-note">
          <span>
            One team.
            <br />A shared direction.
          </span>
          <small>Your view is tailored to your role and project access.</small>
        </div>
        <div className="profile">
          <span className="avatar">{user.name.slice(0, 1)}</span>
          <div>
            <b>{user.name}</b>
            <small>{label(user.role)}</small>
          </div>
          <button
            aria-label="Sign out"
            title="Sign out"
            onClick={async () => {
              try {
                await auth.logout();
                setLogoutError("");
              } catch (error) {
                setLogoutError(error.message);
              }
            }}
          >
            ↪
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            Workspace <span className="muted">/</span>{" "}
            <b>
              {path.startsWith("/projects")
                ? "Projects"
                : path.startsWith("/tasks")
                  ? "Tasks"
                  : path === "/users"
                    ? "People"
                    : "Overview"}
            </b>
          </span>
          <span className="topbar-right">
            <span className="status-dot" />
            {label(user.role)} workspace
          </span>
        </header>
        <main className="content">
          <ErrorMessage message={logoutError} />
          {content}
        </main>
        <footer className="app-footer">
          Taskflow · A little clarity goes a long way.
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          ✓ {toast}
        </div>
      )}
    </div>
  );
}
