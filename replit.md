# Clear Skies - MS Patient Management Portal

## Overview
A secure, role-based web application for managing Multiple Sclerosis patient data. Features clinician and patient roles with strict data isolation and permission enforcement. Includes daily symptom logging, weekly trend charts, MS stage classification, and symptom variance analysis.

## Tech Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: Node.js + Express
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: JWT-based with bcryptjs password hashing, cookie-based token storage
- **Email**: SendGrid for patient invitation emails
- **AI**: OpenAI (gpt-4o-mini) for per-patient clinical insights and MS chatbot assistant
- **Routing**: wouter (frontend), Express (backend)

## Architecture
- `shared/schema.ts` - Database schema (users, patients, password_reset_tokens, invitation_tokens, daily_logs) + Zod validation
- `server/db.ts` - Database connection
- `server/storage.ts` - Data access layer (DatabaseStorage implements IStorage)
- `server/auth.ts` - JWT auth middleware (requireAuth, requireClinician, requirePatient)
- `server/routes.ts` - API routes with cookie-parser
- `server/email.ts` - SendGrid email client for invitation emails
- `server/github.ts` - GitHub integration client (Replit connector)
- `client/src/lib/auth.tsx` - Auth context provider & useAuth hook (login, register, logout, refreshUser)
- `client/src/pages/` - Login, Register (clinician-only), Accept Invite, Forgot/Reset Password, Clinician Dashboard, Patient Dashboard

## Key Features
- **Clinician-only self-registration** — only clinicians can register on their own
- **Clinician invites patients** — clinician enters patient name, email, and clinical data → patient receives an invitation email via SendGrid → patient clicks link to set password and activate account
- Clinician CRUD on patient MS records
- Patient dashboard with 4 tabs: Overview, Daily Log, Weekly Trends, MS Insights
- Daily symptom logging: sleep, mood, physical comfort, mental fog, activity, medication adherence, pain/fatigue/visual symptoms
- **One log per day for patients** — after submission, patients see a read-only view; only clinicians can edit daily logs
- Clinician patient dialog with 3 tabs: Clinical Data, Daily Logs (create/edit forms), MS Insights (stage classification + top symptoms)
- Clinicians can create and edit daily logs for their patients via POST /api/clinician/patient/:id/daily-log
- Weekly trend charts (Recharts): wellbeing, sleep pattern, symptom counts
- MS stage classification (CIS/RRMS/SPMS/PPMS) by age, relapse count, and disease duration
- **Symptom Variance Analysis**: Both patient and clinician can view the "most varying" metric (by coefficient of variation), a line chart of that metric over time, and a ranked variability bar
  - Patient: "Generate Insights" button in MS Insights tab → GET /api/patient/insights/symptom-variance
  - Clinician: per-patient insights panel in stage classification table → GET /api/clinician/patient/:id/insights/symptom-variance
- **AI Clinical Insights (Clinician)**: Per-patient OpenAI-powered analysis (POST /api/clinician/patient/:id/insights/ai) that examines daily logs + clinical data to identify alarming findings, positive trends, symptom patterns, recommendations, and risk level
- **AI Health Insights (Patient)**: Patient-facing AI analysis (POST /api/patient/insights/ai) that provides personalised, supportive insights in plain language — summary, risk level, things to watch, positive findings, numbered recommendations referencing actual log data, and symptom patterns
- **Password Reset**: Token-based flow with 1-hour expiry; reset link delivered via SendGrid email
- IDOR protection (ownership validation on all endpoints)

## Patient Invitation Flow
1. Clinician clicks "Invite Patient" on dashboard
2. Fills in patient name, email, and clinical data (age, MS duration, relapses, EDSS)
3. Backend creates an invitation_token (7-day expiry) and sends email via Resend
4. Patient receives email with "Create Your Account" link → `/accept-invite?token=...`
5. Patient sets password → user account + patient record are created atomically
6. Patient is auto-logged in and redirected to their dashboard

## Database Tables
- `users` - Auth accounts with roles (clinician/patient)
- `patients` - Clinical MS data (age, duration, relapses, EDSS, notes) linked to clinician + patient user
- `password_reset_tokens` - Token-based password recovery
- `invitation_tokens` - Clinician-to-patient invitation tokens (email, name, clinicianId, patientData JSON, expiresAt)
- `daily_logs` - Patient self-reported daily symptom tracking (sleep, mood, comfort, fog, wellbeing, activity, medication, pain/fatigue/visual symptoms, notes)

## Demo Accounts
- Clinician: sarah@clearskies.com / password123
- Clinician: thisisvibhav@gmail.com / password123
- Patient: vibhav.aluru2@gmail.com / password123
- Patient: james@example.com / password123
- Patient: emily@example.com / password123

## Database
Uses Replit PostgreSQL. Schema pushed via `npm run db:push`.

## Dependencies
Key additions: bcryptjs, jsonwebtoken, cookie-parser, @octokit/rest, recharts, date-fns, @sendgrid/mail, openai
