# PLAN.md — Mini CRM สำหรับธุรกิจขนาดเล็ก

## 1. เป้าหมาย
ระบบ CRM ขนาดเล็กสำหรับร้านค้าหรือธุรกิจบริการ ใช้เก็บข้อมูลลูกค้า ติดตามดีล และเตือนงานที่ต้องตามต่อ
ใช้เป็นโปรเจกต์ในพอร์ตโฟลิโอ จึงต้องมีโค้ดสะอาด มี test มี README และรันได้ด้วยคำสั่งเดียว (`docker compose up`)

ผู้ใช้ระบบ:
- **Admin**: จัดการผู้ใช้ เห็นและแก้ข้อมูลทั้งหมด โอนข้อมูลให้ staff คนอื่นได้
- **Staff (พนักงานขาย)**: จัดการลูกค้า บริษัท ดีล และงานที่ตัวเองเป็นเจ้าของเท่านั้น

## 2. ข้อตัดสินใจหลัก
ตัดสินใจไว้ล่วงหน้าเพื่อไม่ต้องเดาระหว่างเขียนโค้ด ถ้าจะเปลี่ยนให้แก้ที่นี่ก่อน

| เรื่อง | ตัดสินใจ | เหตุผล |
|---|---|---|
| ภาษา UI | อังกฤษ | คนอ่านพอร์ตโฟลิโอเข้าใจง่าย ข้อมูลลูกค้าเป็นภาษาลาว/ไทยได้ตามปกติ |
| Timezone | เก็บเวลาเป็น UTC, คำนวณ "วันนี้/เลยกำหนด/รายเดือน" ตาม `APP_TIMEZONE` (ค่าเริ่มต้น `Asia/Vientiane`) | กันงานเลยกำหนดผิดวันช่วงเที่ยงคืน |
| สกุลเงิน | `LAK` (ค่าเริ่มต้น), `THB`, `USD` — ไม่แปลงค่าเงิน | ยอดรวมทุกที่ต้อง **แยกตามสกุลเงิน** ห้ามบวกข้ามสกุล |
| เงินใน API | ส่งเป็น string เช่น `"1500000.00"` | กันปัญหาทศนิยมของ float |
| Tags | ตาราง `tags` + `contact_tags` (many-to-many) | กรองได้เหมือนกันทั้ง SQLite และ PostgreSQL ไม่ต้องพึ่ง JSON query |
| Database | SQLite ตอนพัฒนา/test, PostgreSQL ใน Docker — **ห้ามใช้ฟีเจอร์เฉพาะของ DB ตัวใดตัวหนึ่ง** | รันได้ทั้งสองแบบ และ Phase สุดท้ายรัน test บน PostgreSQL ด้วย |
| สิทธิ์ข้อมูลคนอื่น | Staff เรียกข้อมูลที่ไม่ใช่ของตัวเอง → ได้ `404` (ไม่ใช่ 403) | ไม่บอกว่าข้อมูลนั้นมีอยู่จริง |
| Token | JWT access token อายุ 8 ชม. ไม่มี refresh token, เก็บใน localStorage | พอสำหรับ MVP — ระบุเป็นข้อจำกัดใน README |
| การลบ | ลบจริง (hard delete) ยกเว้น user ใช้ปิดการใช้งาน (`is_active`) | ระบบเล็ก ไม่ต้องมี soft delete |

## 3. Tech stack
- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2, Alembic, Pydantic v2 + pydantic-settings
- **Auth**: PyJWT + `bcrypt` (ใช้ไลบรารี bcrypt ตรง ๆ ไม่ใช้ passlib เพราะเข้ากับ bcrypt เวอร์ชันใหม่ไม่ได้)
- **Database**: SQLite (dev/test), PostgreSQL 16 (Docker)
- **Frontend**: React + Vite + TypeScript, Tailwind CSS, React Router, TanStack Query, React Hook Form + Zod (ฟอร์มและ validation)
- **Kanban**: @dnd-kit — **กราฟ**: Recharts
- **Test**: pytest + httpx (backend), Vitest + Testing Library (frontend เฉพาะส่วนสำคัญ ดู Phase 6–8)
- **Lint/format**: ruff (backend), oxlint + Prettier (frontend — oxlint มากับเทมเพลต Vite ปัจจุบัน)
- **รันทั้งระบบ**: Docker Compose (postgres + backend + frontend ผ่าน nginx)
- Package: `pip` + `requirements.txt` / `requirements-dev.txt`, frontend ใช้ `npm`

Port: backend `8000`, frontend dev `5173` (Vite proxy `/api` → backend ไม่ต้องตั้ง CORS), Docker เปิดที่ `http://localhost:8080`

## 4. Features เวอร์ชันแรก (MVP)
1. **Auth**: login / logout, เปลี่ยนรหัสผ่านตัวเอง, สิทธิ์ Admin กับ Staff
2. **Users** (admin): เพิ่ม แก้ชื่อ/role, รีเซ็ตรหัสผ่าน, ปิด/เปิดการใช้งาน
3. **Contacts**: เพิ่ม แก้ ลบ ค้นหา (ชื่อ, อีเมล, เบอร์, ชื่อบริษัท) กรองตาม tag, บริษัท, เจ้าของ
4. **Companies**: บริษัท/ร้านของลูกค้า (contact หนึ่งคนอยู่ได้ไม่เกินหนึ่งบริษัท)
5. **Deals**: มูลค่า สกุลเงิน ขั้นใน pipeline วันคาดว่าจะปิด
6. **Pipeline (Kanban)**: ลากการ์ดข้ามคอลัมน์และเรียงลำดับในคอลัมน์
7. **Activities**: บันทึกการโทร การประชุม โน้ต และงานที่มีวันกำหนดส่ง ติ๊กว่าเสร็จได้
8. **Dashboard**: ยอดดีลแต่ละขั้น ยอดปิดการขายรายเดือน งานวันนี้และงานเลยกำหนด
9. **Import / Export CSV** สำหรับ contacts

### ไม่ทำในเวอร์ชันแรก
ส่งอีเมล/SMS อัตโนมัติ, เชื่อม Facebook/WhatsApp, multi-tenant, แอปมือถือ, แปลงค่าเงิน,
refresh token / ลืมรหัสผ่านทางอีเมล, แนบไฟล์, audit log, sync แบบ real-time, UI หลายภาษา, rate limiting

## 5. Data model
ทุกตารางมี `id` (int PK), `created_at`, `updated_at` (timezone-aware, UTC)

```
users         name, email (unique, เก็บตัวพิมพ์เล็ก), password_hash,
              role (admin|staff), is_active (default true)

companies     name*, phone, address, website, notes, owner_id* → users

contacts      first_name*, last_name, email, phone, notes,
              company_id → companies (nullable), owner_id* → users

tags          name* (unique, ตัดช่องว่าง + ตัวพิมพ์เล็ก)
contact_tags  contact_id → contacts, tag_id → tags   (PK คู่, ลบ contact แล้วลบแถวนี้ตาม)

deals         title*, value* Numeric(18,2) ≥ 0, currency* (LAK|THB|USD, default LAK),
              stage* (lead|qualified|proposal|negotiation|won|lost, default lead),
              position* (int, ลำดับในคอลัมน์),
              contact_id* → contacts, company_id → companies (nullable),
              owner_id* → users, expected_close_date (date), closed_at (datetime)

activities    type* (call|meeting|note|task), subject*, description,
              due_date (date, nullable), done (default false), completed_at (datetime),
              contact_id → contacts (nullable), deal_id → deals (nullable), owner_id* → users
```
`*` = ห้ามว่าง
Index: `owner_id` ทุกตาราง, `contacts.email`, `deals(stage, position)`, `activities(due_date, done)`

## 6. กติกาทางธุรกิจ

**สิทธิ์ (ownership)**
- Staff เห็น/แก้/ลบได้เฉพาะแถวที่ `owner_id` = ตัวเอง ทุก list ถูกกรองให้อัตโนมัติ (ส่ง `owner_id` คนอื่นมาก็ไม่มีผล)
- Staff สร้างข้อมูลใหม่ → `owner_id` = ตัวเองเสมอ, ส่ง `owner_id` คนอื่นมา → `403`
- Admin เห็นทั้งหมด และกำหนด/เปลี่ยน `owner_id` เป็น user ที่ active คนไหนก็ได้ (ค่าเริ่มต้น = ตัวเอง)
- การอ้างอิง `contact_id` / `company_id` / `deal_id` ต้องเป็นข้อมูลที่ผู้ใช้คนนั้นเข้าถึงได้ ไม่งั้น → `422`

**Users**
- ไม่มีการลบ user ใช้ `is_active=false` แทน — user ที่ถูกปิดจะ login ไม่ได้ และ token เดิมใช้ไม่ได้ทันที (เช็ค `is_active` ทุก request)
- Admin ปิดการใช้งานหรือลด role ตัวเองไม่ได้ (กันไม่ให้ระบบไม่เหลือ admin)

**Deals**
- เปลี่ยน `stage` / `position` ได้ทาง `PATCH /deals/{id}/move` เท่านั้น (`PATCH /deals/{id}` แก้ field อื่น)
- ย้ายเข้า `won` หรือ `lost` → ตั้ง `closed_at` = ตอนนี้, ย้ายออกไปขั้นที่ยังไม่ปิด → `closed_at` = null
- ไม่ส่ง `company_id` ตอนสร้าง → ใช้บริษัทของ contact (ถ้ามี)
- ดีลใหม่และดีลที่ย้ายข้ามคอลัมน์โดยไม่ระบุตำแหน่ง → ไปอยู่ท้ายคอลัมน์
- การ move ทำใน transaction เดียว แล้วเรียง `position` ของคอลัมน์ปลายทางใหม่เป็น 0..n-1

**Activities**
- ส่ง `deal_id` มาแต่ไม่ส่ง `contact_id` → ใช้ contact ของดีลนั้น (จะได้ขึ้นใน timeline ของ contact)
- `done` เปลี่ยนเป็น true → ตั้ง `completed_at`, เปลี่ยนกลับ → null
- "งาน" (หน้า Tasks, ตัวนับบน dashboard) = activity ที่มี `due_date` และ `done=false` ไม่ว่าเป็น type ไหน
- วันที่อิง `APP_TIMEZONE`: **overdue** `due_date < วันนี้`, **today** `= วันนี้`, **upcoming** วันนี้ < `due_date` ≤ วันนี้ + 7 วัน

**การลบ**
| ลบ | ถ้ายังมีข้อมูลผูกอยู่ |
|---|---|
| company | มี contact หรือ deal ผูกอยู่ → ปฏิเสธ `409` พร้อมบอกจำนวน |
| contact | มี deal ผูกอยู่ → ปฏิเสธ `409`; activities ของ contact ถูกลบตาม |
| deal | activities ของดีลยังอยู่ แต่ `deal_id` = null (ประวัติยังอยู่ใน timeline ของ contact) |

## 7. API
**รูปแบบกลาง** (ทำครั้งเดียวใน Phase 2 แล้วทุก endpoint ใช้ร่วมกัน)
- prefix `/api`, JSON, header `Authorization: Bearer <token>`
- Pagination: `?page=1&size=20` (size สูงสุด 100) → `{ "items": [...], "total": 57, "page": 1, "size": 20 }`
- Error (รวม validation 422 ของ FastAPI ด้วย):
  `{ "error": { "code": "not_found", "message": "Contact not found", "details": [] } }`
- Status code: `200` / `201` สร้าง / `204` ลบ / `401` ไม่ได้ login / `403` ไม่มีสิทธิ์ / `404` / `409` ขัดกฎ / `422` ข้อมูลไม่ถูกต้อง
- วันที่ ISO 8601, เงินเป็น string
- ลำดับเริ่มต้น: list ทั่วไปเรียง `updated_at` ใหม่สุดก่อน, activities ที่มี due เรียง `due_date` เก่าสุดก่อน

**Endpoints**
```
GET    /health

POST   /auth/login                 body { email, password } → { access_token, token_type, user }
GET    /auth/me
POST   /auth/change-password       body { current_password, new_password }

GET    /users                      (admin)
POST   /users                      (admin)
PATCH  /users/{id}                 (admin) name, role, is_active, password

GET    /tags                       tag ที่ใช้อยู่ในข้อมูลที่ผู้ใช้เห็น (สำหรับ dropdown กรอง)

GET    /contacts?search=&tag=&company_id=&owner_id=&page=&size=
POST   /contacts                   GET | PATCH | DELETE /contacts/{id}
POST   /contacts/import            multipart CSV (ดูหัวข้อ 9)
GET    /contacts/export?<filter เดียวกับ list>   ไม่แบ่งหน้า

GET    /companies?search=&owner_id=&page=&size=
POST   /companies                  GET | PATCH | DELETE /companies/{id}

GET    /deals?stage=&contact_id=&company_id=&owner_id=&page=&size=
POST   /deals                      GET | PATCH | DELETE /deals/{id}
GET    /deals/board?owner_id=      6 คอลัมน์ ไม่แบ่งหน้า: { stage, count, totals: [{currency, amount}], deals: [...] }
                                   คอลัมน์ won/lost แสดงเฉพาะที่ปิดภายใน 90 วัน
PATCH  /deals/{id}/move            body { stage, before_id }   before_id = null → ไปท้ายคอลัมน์

GET    /activities?contact_id=&deal_id=&type=&due=overdue|today|upcoming&done=&owner_id=&page=&size=
POST   /activities                 GET | PATCH | DELETE /activities/{id}

GET    /dashboard/summary?owner_id=
       → pipeline:     ต่อ stage { count, totals ต่อสกุลเงิน }
         won_by_month: 12 เดือนล่าสุด (รวมเดือนนี้) ยอด won ต่อสกุลเงิน อิง closed_at
         tasks:        { overdue, today, upcoming } + รายการ overdue สูงสุด 10 รายการ
```
หมายเหตุ: move ใช้ `before_id` แทนเลข position เพราะ staff เห็นแค่ดีลของตัวเอง เลขตำแหน่งบนจอจึงไม่ตรงกับตำแหน่งจริงในคอลัมน์

## 8. หน้าจอ
- `/login`
- `/` Dashboard — การ์ดสรุป (งานวันนี้, เลยกำหนด, ดีลที่เปิดอยู่), กราฟยอด won รายเดือน, รายการงานเลยกำหนด
- `/contacts` ตาราง + ค้นหา + กรอง + import/export
  `/contacts/:id` รายละเอียด, timeline กิจกรรม (เพิ่มได้จากหน้านี้), ดีลที่เกี่ยวข้อง
- `/companies` ตาราง + ค้นหา, `/companies/:id` รายละเอียด + contacts + deals ของบริษัท
- `/pipeline` Kanban 6 คอลัมน์ หัวคอลัมน์แสดงจำนวนและยอดรวมต่อสกุลเงิน, admin กรองตามเจ้าของได้
- `/tasks` แท็บ วันนี้ / เลยกำหนด / กำลังจะถึง ติ๊กเสร็จได้จากรายการเลย
- `/users` (admin เท่านั้น, staff ไม่เห็นเมนูนี้)
- `/settings` เปลี่ยนรหัสผ่าน
- หน้า 404

ทุกหน้าต้องมี: สถานะ loading / ว่าง / error, toast แจ้งผลบันทึก, ยืนยันก่อนลบ, ใช้บนจอ desktop และ tablet ได้
แสดงเงินมีตัวคั่นหลักพัน (LAK ไม่มีทศนิยม), วันที่รูปแบบ `DD/MM/YYYY`
token หมดอายุหรือได้ `401` → ล้าง token แล้วกลับไปหน้า login

## 9. CSV สำหรับ contacts
- คอลัมน์: `first_name,last_name,email,phone,company,tags,notes` — tags คั่นด้วย `;`
- Encoding UTF-8 (รับไฟล์ที่มี BOM ได้), export ใส่ BOM เพื่อให้ Excel แสดงภาษาลาว/ไทยถูก
- จำกัดไฟล์ 1 MB / 1,000 แถว
- `company` จับคู่ด้วยชื่อ (ไม่สนตัวพิมพ์เล็ก/ใหญ่) กับบริษัทที่ผู้ใช้เห็น ไม่เจอ → สร้างใหม่
- อีเมลซ้ำกับ contact ที่ผู้ใช้เห็นอยู่แล้ว หรือซ้ำกันในไฟล์ → ข้ามแถวนั้น
- แถวที่ผิดไม่ทำให้ทั้งไฟล์ล้ม: นำเข้าแถวที่ถูก แล้วตอบ `{ created, skipped, errors: [{ row, message }] }`
- เจ้าของของข้อมูลที่ import = ผู้ import

## 10. ลำดับการทำ
ทำทีละ Phase จบแต่ละ Phase ต้อง test ผ่าน lint ผ่าน และ commit

| Phase | งาน | ตรวจรับ |
|---|---|---|
| **0 – Setup** | โครง `backend/` `frontend/`, git, .gitignore, `.env.example`, ruff/oxlint/Prettier, `GET /api/health`, Vite + proxy, README เบื้องต้น | รัน backend และ frontend ได้ หน้าเว็บเรียก health ได้ |
| **1 – Database** | models ทั้งหมด, Alembic migration แรก, config จาก `.env`, ฟังก์ชัน hash รหัสผ่าน, seed script (admin 1, staff 2, ~10 companies, ~30 contacts, ~20 deals กระจายทุก stage, ~40 activities มีทั้ง overdue/today/upcoming) — seed รันซ้ำได้ มี `--reset` | DB ใหม่ → `alembic upgrade head` + seed ผ่าน |
| **2 – Auth & Users** | login, JWT, dependency `current_user` / `require_admin`, เช็ค `is_active`, change-password, Users API, รูปแบบ error และ pagination กลาง, test fixtures (client, user ตาม role) | test: login ถูก/ผิด, token หมดอายุ, user ถูกปิด, staff เรียก `/users` ได้ 403 |
| **3 – Contacts, Companies, Tags API** | CRUD, ค้นหา, กรอง, pagination, สิทธิ์ owner, กฎการลบ | test: staff A ไม่เห็นข้อมูล staff B (404), ค้นหา, ลบแล้วได้ 409 |
| **4 – Deals & Pipeline API** | CRUD, `/deals/board`, `/deals/{id}/move`, `closed_at` อัตโนมัติ | test: move ข้าม/ในคอลัมน์, closed_at ตั้งและล้างถูก, ยอดรวมแยกสกุลเงิน |
| **5 – Activities & Dashboard API** | CRUD, filter due ตาม timezone, `completed_at`, dashboard summary | test: overdue/today/upcoming โดยตรึงเวลา, ตัวเลข dashboard ตรงกับข้อมูล |
| **6 – Frontend พื้นฐาน** | layout, sidebar ตาม role, login, เก็บ token, route ที่ต้อง login, API client + จัดการ error/401, toast, หน้า 404, หน้า settings | Vitest: route guard พาไป login |
| **7 – Contacts & Companies UI** | ตาราง ค้นหา กรอง ฟอร์ม หน้ารายละเอียด timeline เพิ่ม activity | Vitest: validation ของฟอร์ม contact |
| **8 – Pipeline Kanban** | ลากวางข้าม/ในคอลัมน์, optimistic update + rollback เมื่อพลาด, ยอดรวมหัวคอลัมน์ | Vitest: logic คำนวณ `before_id` หลังลากวาง |
| **9 – Tasks & Dashboard UI** | หน้างาน 3 แท็บ, การ์ดสรุป, กราฟ, หน้า users (admin) | ตรวจด้วยมือด้วย seed data |
| **10 – Import/Export CSV** | backend + ปุ่มและหน้ารายงานผลใน frontend | test: ไฟล์ปกติ, ไฟล์มี BOM, แถวผิด, อีเมลซ้ำ |
| **11 – ส่งงาน** | Docker Compose (postgres + backend + frontend nginx), backend รัน migration อัตโนมัติและ seed เมื่อ DB ว่าง, รัน test บน PostgreSQL, README ฉบับเต็ม | ผ่าน Definition of done ทุกข้อ |

## 11. กติกาสำหรับ Claude Code
- อ่านไฟล์นี้ก่อนเริ่มทุกครั้ง ทำเฉพาะ Phase ที่สั่ง เสร็จแล้วหยุดรอ
- ก่อนเขียนโค้ดแต่ละ Phase ให้สรุปแผนสั้น ๆ ว่าจะสร้าง/แก้ไฟล์อะไร
- เจอจุดที่แผนไม่ชัดหรือขัดกันเอง ให้ถามก่อน ห้ามเดา
- ไม่เพิ่ม feature นอกแผนโดยไม่ถามก่อน
- เขียน test สำหรับ logic สำคัญของ backend, รัน test และ lint ให้ผ่านก่อน commit
- commit message แบบ Conventional Commits เช่น `feat(contacts): add search and pagination`
- เก็บค่า secret ใน `.env` และมี `.env.example` ห้าม commit `.env`
- ห้ามแก้ migration ที่ commit ไปแล้ว ให้สร้าง migration ใหม่
- ห้ามใช้ SQL หรือฟีเจอร์ที่ใช้ได้กับ DB ตัวเดียว
- จบแต่ละ Phase ให้อธิบายว่าโค้ดส่วนหลักทำงานอย่างไร บอกวิธีทดสอบด้วยมือ และติ๊กสถานะในหัวข้อ 13

## 12. Definition of done
- clone ใหม่ → `cp .env.example .env` → `docker compose up` → เปิด `http://localhost:8080` ใช้งานได้ทันทีพร้อมข้อมูลตัวอย่าง
- login เป็น admin และ staff (บัญชีตัวอย่างเขียนไว้ใน README) แล้วเห็นข้อมูลต่างกันถูกต้อง
- test backend ผ่านทั้งหมด ทั้งบน SQLite และ PostgreSQL, test frontend ผ่าน, lint ผ่าน
- ไม่มี secret อยู่ใน repo
- README มี: ภาพหน้าจอ, วิธีรันแบบ Docker และแบบ dev, บัญชีตัวอย่าง, โครงสร้างโปรเจกต์, ข้อตัดสินใจหลักและข้อจำกัด
  (ภาพหน้าจอ: Claude เตรียมโฟลเดอร์ `docs/screenshots/` และที่วางรูปใน README ไว้ ผู้ใช้ถ่ายเอง)

## 13. สถานะ
- [x] Phase 0 – Setup
- [x] Phase 1 – Database
- [ ] Phase 2 – Auth & Users
- [ ] Phase 3 – Contacts, Companies, Tags API
- [ ] Phase 4 – Deals & Pipeline API
- [ ] Phase 5 – Activities & Dashboard API
- [ ] Phase 6 – Frontend พื้นฐาน
- [ ] Phase 7 – Contacts & Companies UI
- [ ] Phase 8 – Pipeline Kanban
- [ ] Phase 9 – Tasks & Dashboard UI
- [ ] Phase 10 – Import/Export CSV
- [ ] Phase 11 – ส่งงาน
