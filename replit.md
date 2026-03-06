# Clear Skies - MS Patient Management Portal

## Overview
A secure, role-based web application for managing Multiple Sclerosis patient data. Features clinician and patient roles with strict data isolation and permission enforcement. Includes daily symptom logging, weekly trend charts, and MS stage classification — features ported from the MS-App GitHub repo (vibhav-stack/MS-App).

## Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: Node.js + Express
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: JWT-based with bcryptjs password hashing, cookie-based token storage
- **Routing**: wouter (frontend), Express (backend)

## Architecture
- `shared/schema.ts` - Database schema (users, patients, password_reset_tokens, daily_logs) + Zod validation
- `server/db.ts` - Database connection
- `server/storage.ts` - Data access layer (DatabaseStorage implements IStorage)
- `server/auth.ts` - JWT auth middleware (requireAuth, requireClinician, requirePatient)
- `server/routes.ts` - API routes with cookie-parser
- `server/github.ts` - GitHub integration client (Replit connector)
- `client/src/lib/auth.tsx` - Auth context provider & useAuth hook
- `client/src/pages/` - Login, Register, Forgot/Reset Password, Clinician Dashboard, Patient Dashboard

## Key Features
- Role-based registration (Clinician/Patient)
- Patient links to clinician via email during registration
- Clinician CRUD on patient MS records
- Patient dashboard with 4 tabs: Overview, Daily Log, Weekly Trends, MS Insights
- Daily symptom logging: sleep, mood, physical comfort, mental fog, activity, medication adherence, pain/fatigue/visual symptoms
- **One log per day for patients** — after submission, patients see a read-only view; only clinicians can edit daily logs
- Clinician patient dialog with 3 tabs: Clinical Data, Daily Logs (create/edit forms), MS Insights (stage classification + top symptoms)
- Clinicians can create and edit daily logs for their patients via POST /api/clinician/patient/:id/daily-log
- Weekly trend charts (Recharts): wellbeing, sleep pattern, symptom counts
- MS stage classification (CIS/RRMS/SPMS/PPMS) by age, relapse count, and disease duration
- Password recovery with token-based reset
- IDOR protection (ownership validation on all endpoints)

## Database Tables
- `users` - Auth accounts with roles (clinician/patient)
- `patients` - Clinical MS data (age, duration, relapses, EDSS, notes) linked to clinician + patient user
- `password_reset_tokens` - Token-based password recovery
- `daily_logs` - Patient self-reported daily symptom tracking (sleep, mood, comfort, fog, wellbeing, activity, medication, pain/fatigue/visual symptoms, notes)

## Demo Accounts
- Clinician: sarah@clearskies.com / password123
- Patient: james@example.com / password123
- Patient: emily@example.com / password123

## Database
Uses Replit PostgreSQL. Schema pushed via `npm run db:push`.

## Dependencies
Key additions: bcryptjs, jsonwebtoken, cookie-parser, @octokit/rest, recharts, date-fns
