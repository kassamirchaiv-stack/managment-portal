# School Management & Parent Portal

A full-stack demo portal for parents, students, teachers, and school principals. It demonstrates scoped student records, teacher grade/discipline entry, and approval workflows. It is a deployment-ready prototype foundation, **not yet a complete production student-information system**.

## Features

- Four roles: `ADMIN_PRINCIPAL`, `TEACHER`, `PARENT`, and `STUDENT`.
- Parent access is scoped to linked children. Student access is scoped to the signed-in student.
- Discipline records move through `DRAFT` → `PENDING_ADMIN_REVIEW` → `APPROVED_PUBLISHED`.
- Report cards move through `DRAFT` → `TEACHER_SUBMITTED` → `ADMIN_APPROVED`; only approved cards are returned to parent/student portals.
- Teacher roster, discipline, and report-card access is limited to students explicitly enrolled in courses assigned to that teacher.
- Students can submit profile-change requests for principal review.
- Demo activities and study resources are static frontend content, not school-managed records.

## Stack and structure

- **Backend:** Python 3.12, FastAPI, SQLAlchemy, Pydantic, Alembic, PostgreSQL for production and SQLite for local development.
- **Frontend:** React 19, Vite, Tailwind CSS, Axios, React Router, and Lucide icons.
- **Authentication:** bcrypt password hashes, signed JWT in an HttpOnly cookie, CSRF validation for cookie-authenticated mutations, and per-IP login rate limiting.

```text
backend/
  app/                 FastAPI app, SQLAlchemy models, routers, seed/bootstrap tools
  migrations/          Alembic migration history
  requirements.txt
front-end/
  src/api/              Axios client and CSRF header
  src/context/          Authentication state and session restoration
  src/components/       Shared UI components
  src/pages/            Role dashboards
render.yaml             Render API + managed PostgreSQL blueprint
```

Request schemas are defined near their routers; response shapes are still mostly assembled as dictionaries. A later maintainability pass should add typed response models consistently.

## Local development

### Backend

From PowerShell:

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
$env:DATABASE_URL = "sqlite:///school_system_local.db"
python -m alembic upgrade head
python -m app.seed_data
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API listens at `http://127.0.0.1:8000`, with local docs at `/docs` and a database-checking health endpoint at `/api/health`. These setup commands use a fresh `backend/school_system_local.db` so they do not try to migrate an existing development database. If you omit `DATABASE_URL`, the default is `backend/school_system_dev.db`. Environment variables can be copied from [backend/.env.example](../backend/.env.example) into the shell or deployment settings.

The seed script is for a disposable development database only. It creates known demo accounts using `password123`; do not seed or expose those credentials in production. The checked-in legacy demo database is not used by default because it has an obsolete schema and legacy SHA-256 password hashes; never point a production deployment at that file.

### Frontend

```powershell
cd front-end
npm ci
npm run dev
```

Vite serves the app at `http://localhost:5173`. The API base URL is `VITE_API_URL`, defaulting to `http://localhost:8000`.

The login page has one-click demo account helpers. The seeded usernames are `principal1`, `teacher1`, `teacher2`, `parent1`, `parent2`, `student1`, and `student2`; their common demo password is `password123`.

## Tests and quality checks

Run from the repository root:

```powershell
.\backend\venv\Scripts\python.exe -m pytest backend\app\test_routes.py -q
npm --prefix front-end run lint
npm --prefix front-end run build
```

Backend tests use an isolated SQLite database. They cover cookie authentication and CSRF, parent/student record visibility, teacher/course authorization, discipline state transitions, report-card approval visibility, and database health.

## Deploying the prototype

The root [render.yaml](../render.yaml) blueprint creates a PostgreSQL database and FastAPI service. Deploy it through Render, then:

1. Set the backend `FRONTEND_URL` to the exact HTTPS origin serving the frontend (origin only, no path).
2. Set frontend-host `VITE_API_URL` to the deployed API's HTTPS origin and rebuild/redeploy the frontend.
3. Keep `ENVIRONMENT=production`, use the generated `SECRET_KEY`, and do not enable `SEED_ON_STARTUP`.
4. Let the service pre-deploy step run `alembic upgrade head`.
5. Open a backend service shell and create the first principal with `python -m app.create_admin`. Use a unique 12+-character password; the command prompts without echoing it.

The API rejects SQLite, missing production origins/secrets, non-HTTPS browser origins, and production demo seeding. Production API docs are disabled. Cookie authentication expects HTTPS and the configured frontend origin. Do not place passwords or database credentials in source control.

For a database that predates Alembic, **do not** run the initial migration blindly. Back it up, confirm that its schema matches the baseline revision, and check for duplicate `(student_id, term, subject)` report cards before applying later revisions. Only then use `alembic stamp <baseline-revision>` followed by `alembic upgrade head`; otherwise, create a deliberate data/schema migration. New databases should use `alembic upgrade head`. The course-enrollment migration intentionally does not infer assignments from grade alone: populate and verify real course enrollments before granting teacher access.

## Known production gaps

- There is no user/guardian provisioning UI or school-wide account-import workflow. Only the first principal has a bootstrap CLI.
- There is a course-enrollment data model, but no course-catalog or enrollment administration UI yet.
- The login rate limiter is process-local unless `RATE_LIMIT_STORAGE_URI` is configured. Use shared storage or an edge-level control before running multiple API instances.
- Audit trails, operational monitoring, backup/restore drills, data retention controls, and institution-specific privacy/compliance review are still needed before loading real student data.
- Report/discipline activity is not delivered through real-time notifications; the principal dashboard fetches queues on page load.

The application should be piloted with synthetic data first. A school launch requires validating access rules against its actual class/guardian model and completing the institution's privacy, security, and operational reviews.
