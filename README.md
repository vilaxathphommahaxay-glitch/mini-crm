# Mini CRM

[![CI](https://github.com/vilaxathphommahaxay-glitch/mini-crm/actions/workflows/ci.yml/badge.svg)](https://github.com/vilaxathphommahaxay-glitch/mini-crm/actions/workflows/ci.yml)

A small CRM for shops and service businesses: keep track of customers and their companies, move deals through a sales pipeline, and never miss a follow-up.

Built as a full-stack portfolio project — FastAPI + PostgreSQL on the back end, React + TypeScript on the front end, one command to run.

![Dashboard](docs/screenshots/dashboard.png)

| Pipeline (drag and drop) | Contact with deals and activity |
|---|---|
| ![Pipeline](docs/screenshots/pipeline.png) | ![Contact](docs/screenshots/contact-detail.png) |

## Features

- **Quick search (Ctrl+K / ⌘K)** — find any contact, company or deal from anywhere; arrow keys and Enter to open.
- **One tap to reach a customer** — *Call* and *WhatsApp* buttons on every contact; Lao numbers in local format (`020 …`) are converted for WhatsApp automatically.
- **Installable on phones** — “Add to Home screen” gives the app its own icon and opens it full screen.
- **Contacts and companies** — add a contact and a brand-new company in one form; search across name, email, phone and company; filter by tag and owner; filters live in the URL.
- **Deals and a Kanban pipeline** — every deal has its own page with an activity timeline; six stages, drag and drop between and within columns (or use the keyboard), live per-currency totals. Moving a deal to *Won* or *Lost* stamps the close date automatically.
- **Activities and tasks** — log calls, meetings and notes on a contact's or deal's timeline and schedule the follow-up in the same form; tasks show up under *Today*, *Overdue* and *Next 7 days*.
- **Dashboard** — tasks due, open deals, won revenue per month, pipeline value per stage, and *deals without a next step* so nothing gets forgotten.
- **CSV import/export** — Excel-friendly UTF-8 (Lao and Thai text included), row-by-row import report, duplicate detection.
- **Roles** — *Admin* sees and manages everything, including users; *Staff* only ever see the records they own.
- **For managers** — a team table (open pipeline, wins this month, overdue tasks per person) and a one-click *Transfer records* when someone leaves.
- **Multi-currency** — LAK (default), THB and USD. Totals are always shown per currency, never mixed.
- **Lao and English** — the whole interface, error messages and demo data are available in Lao (ພາສາລາວ) for people who don't read English. Switch with the EN / ລາວ buttons; see [Languages](#languages).

## Quick start (Docker)

Requirements: Docker with Compose.

```bash
cp .env.example .env        # optional — sensible defaults are built in
docker compose up --build
```

Open **http://localhost:8080** and sign in with one of the demo accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `admin123` |
| Staff | `somchai@example.com` | `staff123` |
| Staff | `keo@example.com` | `staff123` |

Log in as an admin and then as a staff member to see the difference in what each can access. The database is migrated and filled with sample data on first start; restarting keeps your data. To start over: `docker compose down -v`.

The interactive API documentation is at **http://localhost:8080/api/docs**.

### Backups

The `backup` service saves the database to `backups/` **automatically** — once when it starts and then every day — and keeps the last 14 days (`BACKUP_INTERVAL_SECONDS`, `BACKUP_KEEP_DAYS`). File names use UTC time. Copy the folder somewhere safe now and then (it is git-ignored).

```bash
./scripts/backup.sh                                   # an extra backup right now
./scripts/restore.sh backups/crm-20261014-120000.sql.gz   # asks you to type "restore" first
```

Run the scripts from Git Bash on Windows.

## Languages

The interface is fully translated into **Lao** and English: every screen, form, validation and server error message, the currency names (ກີບ, ບາດ, ໂດລາ), the chart's month names and the demo data.

- **Switching:** the `EN` / `ລາວ` buttons are on the login page, in the sidebar and under *Settings*. The choice is remembered per browser.
- **First visit:** follows the browser's language (a Lao browser starts in Lao).
- **Team default:** to start everyone in Lao no matter what their device is set to, put `APP_LOCALE=lo` in `.env` and run `docker compose up --build`. The demo data then uses Lao names too (`SEED_LANGUAGE`, defaults to `APP_LOCALE`).
- **Fonts:** Noto Sans Lao is bundled with the app, so Lao text looks the same on every device and works under the strict Content-Security-Policy.
- **Reviewing the Lao:** [docs/translation-review.md](docs/translation-review.md) lists every text next to its English, with the key words explained. The Lao was written by an AI assistant and should be checked by a native speaker before real use.
- **CSV files** keep English column names (`first_name`, `email`, …) in the first row so files stay compatible; the import dialog explains each one in Lao.

**Adding or changing text:** add the key to `frontend/src/i18n/en.ts` first, then to `lo.ts` — TypeScript refuses to build if a language is missing a key, and a unit test checks that `{placeholders}` match and that no Lao text is left in English. Server errors carry a `code`; the front end translates by code (`frontend/src/api/errorText.ts`), so the API's own English messages are only a fallback.

## Local development

Requirements: Python 3.12+ and Node.js 22+.

```bash
cp .env.example .env
```

**Backend** — http://localhost:8000 (API docs at `/api/docs`). Uses SQLite (`backend/crm.db`) by default.

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
alembic upgrade head          # create / update the database schema
python -m app.seed            # sample data (use --reset to wipe and reseed)
uvicorn app.main:app --reload
```

**Frontend** — http://localhost:5173. The dev server proxies `/api` to the backend, so start the backend first.

```bash
cd frontend
npm install
npm run dev
```

## Tests and checks

```bash
# backend (in backend/, venv active)
pytest                        # 109 tests on in-memory SQLite
ruff check . && ruff format --check .

# the same tests on PostgreSQL
docker run -d --name crm-test-db -e POSTGRES_USER=crm -e POSTGRES_PASSWORD=crm \
  -e POSTGRES_DB=crm_test -p 55432:5432 postgres:16-alpine
TEST_DATABASE_URL=postgresql+psycopg://crm:crm@localhost:55432/crm_test pytest

# frontend (in frontend/)
npm test                      # Vitest + Testing Library
npm run lint && npm run format:check && npm run build
```

**Browser tests** (`e2e/`) drive a real Chrome or Edge through the whole app — login and roles, search and filters, forms, drag and drop on the pipeline, dashboard numbers, CSV import/export and phone-width layouts. They expect a freshly seeded app:

```bash
docker compose down -v && docker compose up -d --build
cd e2e
npm install
npm test                      # E2E_BROWSER=chrome|msedge, BASE_URL=http://localhost:8080
npm run screenshots           # refresh docs/screenshots
```

**CI** (`.github/workflows/ci.yml`) runs all of the above on every push: backend lint and tests on SQLite and PostgreSQL plus `alembic check`, frontend lint/tests/build, then the browser tests against the Docker stack.

## Project structure

```
backend/
  app/
    main.py          FastAPI app and router registration
    models.py        SQLAlchemy models
    routers/         one module per resource (auth, users, contacts, companies, deals, …)
    schemas/         Pydantic request/response models
    access.py        ownership rules shared by every resource
    pipeline.py      deal ordering, closed_at and per-currency totals
    csv_io.py        CSV import/export
    clock.py         "now" and "today" in the app timezone (freezable in tests)
    seed.py          demo data (English or Lao)
  alembic/           database migrations
  tests/
frontend/
  src/
    api/             fetch client, types, TanStack Query hooks
    auth/            session provider and route guards
    components/      layout, shared UI, activity list, chart
    forms/           react-hook-form + zod forms
    i18n/            Lao and English text (en.ts is the source of truth)
    lib/             formatting, URL filters, Kanban logic
    pages/           one component per screen
e2e/                 browser tests (Playwright) against the running app
docker-compose.yml   postgres + backend + frontend (nginx)
PLAN.md              scope, data model, API and the phase-by-phase plan
```

## Design decisions

- **Ownership is enforced on the server, in one place.** Every query goes through `access.scope()`. A staff member asking for someone else's record gets `404`, not `403`, so the API doesn't reveal that the record exists.
- **Money is exact.** Amounts are `NUMERIC(18,2)` in the database and travel as strings (`"1500000.00"`). The front end formats and sums them as strings and BigInt cents, never floats.
- **Dates follow the business, not the server.** "Today", "overdue" and monthly revenue use `APP_TIMEZONE` (default `Asia/Vientiane`). Tests freeze the clock just after midnight to prove it.
- **Drag and drop sends `before_id`, not a position number.** Staff only see their own cards, so an on-screen index wouldn't match the real order. The server places the deal before the given card and renumbers the column in one transaction.
- **CSV export is safe to open in Excel.** It includes a BOM so Lao/Thai text displays correctly, and cells that would run as formulas (`=…`, `@…`) are escaped. Phone numbers like `+856…` are left alone.
- **One error shape everywhere:** `{"error": {"code", "message", "details"}}`. Forms map `details` back onto the matching field.
- **Sign-in is rate limited.** After 5 failed attempts for one email (or 20 from one address across emails) within 15 minutes, further attempts get `429` until the window passes.
- **Locked-down headers.** nginx sends a strict Content-Security-Policy for the app (scripts only from itself), `X-Frame-Options: DENY`, `nosniff` and a referrer policy, and hides its version.
- **Portable SQL.** The same code and tests run on SQLite and PostgreSQL; tags use a join table rather than JSON queries.

## Known limitations

- The access token (8 hours, no refresh token) is kept in `localStorage`. That's fine for a demo but would need hardening (httpOnly cookies, refresh tokens) for production.
- The sign-in rate limit is kept in memory, so it is per backend process; running several workers or servers would need a shared store such as Redis.
- Relation dropdowns (company, contact, owner) list the first 100 records — enough for a small business, but a search-as-you-type picker would be needed at scale.
- No currency conversion, email/SMS sending, file attachments or audit log (see *ไม่ทำในเวอร์ชันแรก* in [PLAN.md](PLAN.md)).
- The UI is available in Lao and English only, and has no dark mode.
