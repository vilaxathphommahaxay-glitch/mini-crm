# Mini CRM

A small CRM for shops and service businesses: contacts, companies, a deal pipeline (Kanban), activities with due dates, and a dashboard.

> **Status:** early development — see [PLAN.md](PLAN.md) for scope and progress.

## Tech stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2, Alembic, Pydantic v2
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, React Router, TanStack Query
- **Database:** SQLite for local development, PostgreSQL in Docker

## Project structure

```
backend/    FastAPI app (app/), tests (tests/)
frontend/   React + Vite app
docs/       screenshots and other docs
PLAN.md     scope, data model, API and phase plan
```

## Local development

Requirements: Python 3.12+, Node.js 22+.

```bash
cp .env.example .env
```

### Backend (http://localhost:8000, API docs at `/api/docs`)

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

### Frontend (http://localhost:5173)

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to the backend on port 8000, so start the backend first.

## Checks

```bash
# backend
cd backend
pytest
ruff check . && ruff format --check .

# frontend
cd frontend
npm run lint
npm run format:check
npm run build
```
