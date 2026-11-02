BEGIN;
CREATE TYPE user_role AS ENUM ('ADMIN','MANAGER','TEAM_LEAD','EMPLOYEE');
CREATE TYPE project_status AS ENUM ('PLANNING','ACTIVE','ON_HOLD','COMPLETED');
CREATE TYPE task_status AS ENUM ('TODO','IN_PROGRESS','IN_REVIEW','COMPLETED','BLOCKED');
CREATE TYPE task_priority AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');

CREATE TABLE users (
 id uuid PRIMARY KEY, name varchar(100) NOT NULL, email varchar(254) NOT NULL UNIQUE CHECK(email=lower(email)),
 password_hash text NOT NULL, role user_role NOT NULL DEFAULT 'EMPLOYEE', active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE projects (
 id uuid PRIMARY KEY, name varchar(160) NOT NULL, description text NOT NULL DEFAULT '',
 status project_status NOT NULL DEFAULT 'PLANNING', manager_id uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE TABLE project_members (
 project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id), team_lead_id uuid,
 joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(project_id,user_id),
 FOREIGN KEY(project_id,team_lead_id) REFERENCES project_members(project_id,user_id) DEFERRABLE INITIALLY IMMEDIATE,
 CHECK (team_lead_id IS NULL OR team_lead_id<>user_id)
);
CREATE TABLE tasks (
 id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES projects(id), title varchar(200) NOT NULL,
 description text NOT NULL DEFAULT '', status task_status NOT NULL DEFAULT 'TODO',
 priority task_priority NOT NULL DEFAULT 'MEDIUM', assignee_id uuid, due_date date,
 blocked_reason varchar(1000), completed_at timestamptz, created_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz,
 FOREIGN KEY(project_id,assignee_id) REFERENCES project_members(project_id,user_id),
 CHECK(status<>'BLOCKED' OR (blocked_reason IS NOT NULL AND length(trim(blocked_reason))>0)),
 CHECK((status='COMPLETED')=(completed_at IS NOT NULL))
);
CREATE TABLE comments (
 id uuid PRIMARY KEY, task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES users(id), body varchar(4000) NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE activity_logs (
 id uuid PRIMARY KEY, task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
 actor_id uuid NOT NULL REFERENCES users(id), action varchar(60) NOT NULL,
 metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projects_manager ON projects(manager_id) WHERE deleted_at IS NULL;
CREATE INDEX members_user_project ON project_members(user_id,project_id);
CREATE INDEX members_team ON project_members(project_id,team_lead_id,user_id);
CREATE INDEX tasks_project_status_due ON tasks(project_id,status,due_date,id) WHERE deleted_at IS NULL;
CREATE INDEX tasks_assignee_status ON tasks(assignee_id,status,due_date) WHERE deleted_at IS NULL;
CREATE INDEX tasks_priority_due ON tasks(priority,due_date,id) WHERE deleted_at IS NULL;
CREATE INDEX tasks_overdue ON tasks(due_date) WHERE deleted_at IS NULL AND status<>'COMPLETED';
CREATE INDEX comments_task_date ON comments(task_id,created_at DESC,id);
CREATE INDEX activity_task_date ON activity_logs(task_id,created_at DESC,id);
CREATE INDEX users_name ON users(name);


COMMIT;
