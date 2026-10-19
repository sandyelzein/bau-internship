# BAU Internship Management System
**Beirut Arab University — Faculty of Sciences — Department of Mathematics and Computer Science**

---

## Tech Stack

| Layer      | Technology                         |
|------------|------------------------------------|
| Backend    | Node.js + Express                  |
| Frontend   | React + Vite                       |
| Database   | PostgreSQL                         |
| ORM        | Prisma                             |
| Auth       | JWT + bcrypt                       |
| File Upload| Multer (local disk)                |
| Email      | Nodemailer (Mailtrap / real SMTP)  |
| Excel Import | SheetJS (xlsx)                   |

---

## Project Structure

```
bau-internship/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Database schema
│   ├── src/
│   │   ├── controllers/           # Route handlers
│   │   │   ├── auth.controller.js
│   │   │   ├── student.controller.js
│   │   │   ├── internship.controller.js
│   │   │   ├── committee.controller.js
│   │   │   ├── document.controller.js
│   │   │   └── dashboard.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js  # JWT + RBAC
│   │   │   ├── upload.middleware.js# Multer config
│   │   │   └── error.middleware.js # Global error handler
│   │   ├── routes/                # Express routers
│   │   ├── services/
│   │   │   ├── email.service.js   # Nodemailer
│   │   │   └── import.service.js  # Excel UPSERT logic
│   │   ├── prisma/
│   │   │   └── seed.js            # Initial data seed
│   │   └── index.js               # Entry point
│   ├── uploads/                   # Stored PDF files (gitignored)
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── axios.js           # API client
    │   ├── context/
    │   │   └── AuthContext.jsx    # Auth state
    │   ├── components/common/
    │   │   ├── Navbar.jsx
    │   │   └── StatusBadge.jsx
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── student/
    │   │   │   ├── StudentDashboard.jsx
    │   │   │   ├── StudentProfile.jsx
    │   │   │   ├── InternshipRequest.jsx
    │   │   │   ├── MyRequests.jsx
    │   │   │   └── DocumentUpload.jsx
    │   │   └── committee/
    │   │       ├── CommitteeDashboard.jsx
    │   │       ├── StudentsList.jsx
    │   │       ├── StudentDetail.jsx
    │   │       ├── RequestsList.jsx
    │   │       ├── RequestDetail.jsx
    │   │       ├── MembersManagement.jsx
    │   │       ├── ImportStudents.jsx
    │   │       └── EmailLogs.jsx
    │   ├── styles/global.css
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    └── package.json
```

---

## Prerequisites

Make sure you have installed:
- **Node.js** v18 or higher → https://nodejs.org
- **PostgreSQL** v14 or higher → https://www.postgresql.org/download
- **npm** v9 or higher (comes with Node.js)

---

## Step-by-Step Setup

### Step 1 — Clone / Place the project

Place the `bau-internship` folder somewhere on your machine, e.g.:
```
C:\Projects\bau-internship      (Windows)
~/projects/bau-internship        (Mac/Linux)
```

---

### Step 2 — Start the Local PostgreSQL Database

Install Docker Desktop, then from the project root run:
```bash
docker compose up -d db
```

This starts PostgreSQL 16 on localhost and stores its data in a persistent Docker volume. The credentials are for local development only. If you already have PostgreSQL installed, create a database named `bau_internship` and set `DATABASE_URL` in `backend/.env` to match your local credentials instead.

---

### Step 3 — Configure the Backend

```bash
cd bau-internship/backend
cp .env.example .env
```

Open `.env` and fill in:

```env
# Database — replace with your PostgreSQL password
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/bau_internship"

# JWT — choose any long random string
JWT_SECRET=replace_this_with_a_long_random_secret_string

# Email — get free credentials at https://mailtrap.io
MAILTRAP_USER=your_mailtrap_user
MAILTRAP_PASS=your_mailtrap_pass
```

---

### Step 4 — Install Backend Dependencies

```bash
cd bau-internship/backend
npm install
```

---

### Step 5 — Run Database Migrations

```bash
npx prisma migrate dev
```

This applies the migrations already committed in `backend/prisma/migrations` and creates the tables in PostgreSQL.
For a production database, run `npm run db:deploy` from `backend` during deployment to apply committed migrations safely.

---

### Step 6 — Seed Initial Data

```bash
npm run db:seed
```

This creates:
- **Admin account**: `admin@bau.edu.lb` / `Admin@BAU2024`
- **Committee member**: `dr.khalil@bau.edu.lb` / `Member@BAU2024`
- **Supervisor account**: `mahmoud.skafi@bau.edu.lb` / `Supervisor@BAU2026`
- **One approved sample internship** assigned to the supervisor account
- **3 sample students** (pre-imported, no accounts yet)

---

### Step 7 — Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

---

### Step 8 — Run the Application

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd bau-internship/backend
npm run dev
# → Running on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd bau-internship/frontend
npm run dev
# → Running on http://localhost:5173
```

Open your browser at: **http://localhost:5173**

---

## Test Accounts

| Role          | Email                            | Password         |
|---------------|----------------------------------|------------------|
| Admin         | admin@bau.edu.lb                 | Admin@BAU2024    |
| Committee     | dr.khalil@bau.edu.lb             | Member@BAU2024   |
| Supervisor    | mahmoud.skafi@bau.edu.lb         | Supervisor@BAU2026 |
| Student*      | Register using Student ID below  | —                |

**Sample Student IDs for registration:**

| Student ID  | Email (must match exactly)                       |
|-------------|--------------------------------------------------|
| 202012345   | sara.hassan@students.bau.edu.lb                  |
| 202054321   | omar.nasser@students.bau.edu.lb                  |
| 202067890   | lina.fares@students.bau.edu.lb                   |

To register as a student:
1. Go to http://localhost:5173/register
2. Enter the Student ID and matching email
3. Set a password (min. 8 chars)

---

## API Reference

### Auth
| Method | Endpoint             | Access    | Description              |
|--------|----------------------|-----------|--------------------------|
| POST   | /api/auth/login      | Public    | Login (all roles)        |
| POST   | /api/auth/register   | Public    | Student registration     |
| GET    | /api/auth/me         | Any auth  | Get current user profile |

### Students
| Method | Endpoint                    | Access      | Description            |
|--------|-----------------------------|-------------|------------------------|
| GET    | /api/students/profile       | Student     | Own profile            |
| GET    | /api/students               | Committee   | List all (with filters)|
| GET    | /api/students/:id           | Committee   | Student detail         |
| PATCH  | /api/students/:id           | Committee   | Update student fields, including GPA |

### Internship Requests
| Method | Endpoint                          | Access    | Description             |
|--------|-----------------------------------|-----------|-------------------------|
| POST   | /api/internships/requests         | Student   | Submit new request      |
| GET    | /api/internships/requests/my      | Student   | Own requests            |
| GET    | /api/internships/requests         | Committee | All requests (filtered) |
| GET    | /api/internships/requests/:id     | Both      | Request detail          |
| PATCH  | /api/internships/requests/:id/review | Committee | Approve/Reject       |
| PATCH  | /api/internships/:id/status       | Committee | Update internship status|

### Documents / My Internships
| Method | Endpoint                          | Access    | Description             |
|--------|-----------------------------------|-----------|-------------------------|
| POST   | /api/documents/upload             | Student   | Upload PDF for a completed internship |
| GET    | /api/documents/my                 | Student   | Own documents           |
| GET    | /api/documents/my-internships     | Student   | Internships, statuses, and documents |
| DELETE | /api/documents/:id                | Student   | Delete own document     |
| GET    | /api/documents/student/:id        | Committee | Student's documents     |
| POST   | /api/documents/:id/review         | Admin     | Mark a completion certificate reviewed |

### Committee (Admin)
| Method | Endpoint                   | Access | Description              |
|--------|----------------------------|--------|--------------------------|
| GET    | /api/committee/members     | Admin  | List members             |
| POST   | /api/committee/members     | Admin  | Add member               |
| PATCH  | /api/committee/members/:id | Admin  | Edit member              |
| DELETE | /api/committee/members/:id | Admin  | Deactivate member        |
| POST   | /api/committee/import      | Admin  | Import students (Excel)  |
| GET    | /api/committee/email-logs  | Committee | View email logs       |
| POST   | /api/committee/email-test  | Admin  | Send a manual email      |

Admins must open and review the uploaded completion certificate, then mark it as reviewed
on the internship request page before the internship can be marked complete.

The daily certificate reminder checks approved internships that are still in progress,
have passed their end date, and have no completion certificate. A successful reminder is
recorded to prevent duplicate daily messages.

Admins can also send a message from the **Email Logs** page. Enter the recipient,
subject, and message; sends and failures are recorded in the email log. The message
is sent as plain text within the system's email template.

### Dashboard
| Method | Endpoint              | Access    | Description     |
|--------|-----------------------|-----------|-----------------|
| GET    | /api/dashboard/stats  | Committee | Dashboard stats |

### Form Security

Login, registration, supervisor profile setup, and public evaluation-link endpoints are
limited to 20 requests per IP address per 15-minute window. Supervisor setup and evaluation
links use expiring, single-use tokens; evaluation submissions are validated by the backend.

---

## Excel Import Format

The Excel file must have these exact column headers in row 1:

```
ID | ENGLISHNAME | CAMPUS | PHONE | EMAIL | CUMULATIVE_GPA | HOURS_EARNED
```

Example rows:
```
202099001 | Ali Mansour   | Beirut  | 03111111 | ali.m@students.bau.edu.lb  | 3.5 | 90
202099002 | Rima Khalil   | Tripoli | 06222222 | rima.k@students.bau.edu.lb | 3.8 | 120
```

---

## Email Configuration for Production / Railway

In production, the backend defaults to `EMAIL_MODE=real`. Set these variables in the Railway
backend service (do not use `EMAIL_MODE=test` for real delivery):

```env
EMAIL_MODE=real
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your_brevo_smtp_login
SMTP_PASS=your_brevo_smtp_key
SMTP_FROM="BAU Internship System <verified-sender@your-domain.com>"
```

`SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` are required when `EMAIL_MODE=real`. The sender
address must be verified/authorized with the SMTP provider. The service defaults `SMTP_HOST`
to Brevo; if using Gmail instead, explicitly set `SMTP_HOST=smtp.gmail.com`, use a Gmail
App Password, and set `SMTP_FROM` to the Gmail address or an authorized alias.

If delivery fails, check the Railway deployment logs for the `Email failed` error and the
Committee → Email Logs page for the recorded failure. Missing or incorrect SMTP credentials
usually produce an authentication error; a timeout/connection error despite valid settings
may indicate Railway or the SMTP provider is blocking the connection.

Run the backend email tests with `npm test` from the `backend` directory.

---

## Uploaded Files Location

All student documents are stored in:
```
backend/uploads/
├── task-evidence/
├── completion-certificates/
└── recommendation-letters/
```

Files are served at: `http://localhost:5000/uploads/<path>`

---

## Business Rules Summary

1. Students must exist in the DB (imported via Excel) before they can register.
2. Student registration: StudentID + email must match the imported record.
3. Only one active (Pending/Approved) internship request per student at a time.
4. A student cannot be marked **Graduated** unless at least one internship is **Completed**.
5. Approval/Rejection triggers an email to the student's university email.
6. All sent emails are logged in the `email_logs` table regardless of success/failure.
7. Only Admin committee members can: import students, manage committee members.
8. Committee members can: review requests, update student fields, view email logs.
9. Administrators can open or lock internship request submission from the dashboard.
10. Requests require task details and a PDF/image showing the company's task confirmation.
11. Completion and recommendation documents belong to a specific internship and unlock only when it is completed.
12. Supervisors activate an invited account at `/register/supervisor`, then see only assigned students, internship records, completion certificates, and evaluation forms.

---

## Useful Commands

```bash
# Reset database and re-seed
npm run db:reset

# Open Prisma Studio (visual DB browser)
npm run db:studio

# Build frontend for production
cd frontend && npm run build
```
