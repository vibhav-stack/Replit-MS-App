import type { Express } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import { storage } from "./storage";
import {
  generateToken,
  hashPassword,
  comparePassword,
  requireAuth,
  requireClinician,
  requirePatient,
} from "./auth";
import { z } from "zod";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updatePatientSchema,
  dailyLogFormSchema,
  invitePatientSchema,
  acceptInviteSchema,
} from "@shared/schema";
import { sendInvitationEmail, sendPasswordResetEmail } from "./email";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(cookieParser());

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);

      if (data.role !== "clinician") {
        return res.status(400).json({ message: "Only clinicians can self-register. Patients are invited by their clinician." });
      }

      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const passwordHash = await hashPassword(data.password);
      const user = await storage.createUser({
        name: data.name,
        email: data.email,
        passwordHash,
        role: "clinician",
      });

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: "clinician",
      });

      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await comparePassword(data.password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role as "clinician" | "patient",
      });

      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Login failed" });
    }
  });

  app.post("/api/auth/logout", (_req, res) => {
    res.clearCookie("token");
    return res.json({ message: "Logged out" });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.user!.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const data = forgotPasswordSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);

      if (user) {
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await storage.createPasswordResetToken(user.id, token, expiresAt);

        const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
        const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost:5000";
        const resetUrl = `${protocol}://${host}/reset-password?token=${token}`;
        await sendPasswordResetEmail({ to: data.email, resetUrl });
      }

      return res.json({ message: "If an account with that email exists, you will receive a password reset link shortly." });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Failed to process request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const data = resetPasswordSchema.parse(req.body);

      const resetToken = await storage.getPasswordResetToken(data.token);
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      if (new Date() > resetToken.expiresAt) {
        await storage.markTokenUsed(resetToken.id);
        return res.status(400).json({ message: "Reset token has expired" });
      }

      const passwordHash = await hashPassword(data.password);
      await storage.updateUserPassword(resetToken.userId, passwordHash);
      await storage.markTokenUsed(resetToken.id);

      return res.json({ message: "Password has been reset successfully" });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Failed to reset password" });
    }
  });

  app.get("/api/auth/invite/:token", async (req, res) => {
    const invitation = await storage.getInvitationToken(req.params.token);
    if (!invitation) {
      return res.status(404).json({ message: "Invalid or expired invitation" });
    }
    if (new Date() > invitation.expiresAt) {
      return res.status(400).json({ message: "This invitation has expired" });
    }
    const clinician = await storage.getUser(invitation.clinicianId);
    return res.json({
      email: invitation.email,
      name: invitation.name,
      clinicianName: clinician?.name || "Your clinician",
    });
  });

  app.post("/api/auth/accept-invite", async (req, res) => {
    try {
      const data = acceptInviteSchema.parse(req.body);

      const invitation = await storage.getInvitationToken(data.token);
      if (!invitation) {
        return res.status(400).json({ message: "Invalid or expired invitation" });
      }
      if (new Date() > invitation.expiresAt) {
        await storage.markInvitationUsed(invitation.id);
        return res.status(400).json({ message: "This invitation has expired" });
      }

      const existingUser = await storage.getUserByEmail(invitation.email);
      if (existingUser) {
        await storage.markInvitationUsed(invitation.id);
        return res.status(400).json({ message: "An account with this email already exists. Please sign in instead." });
      }

      const passwordHash = await hashPassword(data.password);
      const patientInfo = invitation.patientData ? JSON.parse(invitation.patientData) : {};

      const user = await storage.acceptInvitation(invitation, passwordHash, patientInfo);

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: "patient",
      });

      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Failed to accept invitation" });
    }
  });

  app.get("/api/clinician/patients", requireAuth, requireClinician, async (req, res) => {
    const patientRecords = await storage.getPatientsByClinicianId(req.user!.userId);

    const patientsWithNames = await Promise.all(
      patientRecords.map(async (p) => {
        const user = await storage.getUser(p.patientUserId);
        return {
          ...p,
          patientName: user?.name || "Unknown",
          patientEmail: user?.email || "",
        };
      })
    );

    return res.json(patientsWithNames);
  });

  app.get("/api/clinician/patient/:id", requireAuth, requireClinician, async (req, res) => {
    const patient = await storage.getPatientById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    if (patient.clinicianId !== req.user!.userId) {
      return res.status(403).json({ message: "Access denied" });
    }
    const user = await storage.getUser(patient.patientUserId);
    return res.json({
      ...patient,
      patientName: user?.name || "Unknown",
      patientEmail: user?.email || "",
    });
  });

  app.post("/api/clinician/patient/create", requireAuth, requireClinician, async (req, res) => {
    try {
      const validated = invitePatientSchema.parse(req.body);
      const { patientName, patientEmail, age, msDurationYears, totalRelapses, relapsesLast12Months, edssScore, notes } = validated;

      const existingUser = await storage.getUserByEmail(patientEmail);
      if (existingUser) {
        if (existingUser.role !== "patient") {
          return res.status(400).json({ message: "That email is already registered as a clinician" });
        }
        const existingPatient = await storage.getPatientByUserId(existingUser.id);
        if (existingPatient) {
          if (existingPatient.clinicianId !== req.user!.userId) {
            return res.status(400).json({ message: "This patient is already linked to another clinician" });
          }
          return res.status(400).json({ message: "This patient is already in your records" });
        }
        const patient = await storage.createPatient({
          clinicianId: req.user!.userId,
          patientUserId: existingUser.id,
          age: age || null,
          msDurationYears: msDurationYears || null,
          totalRelapses: totalRelapses || null,
          relapsesLast12Months: relapsesLast12Months || null,
          edssScore: edssScore || null,
          notes: notes || null,
        });
        return res.json({
          ...patient,
          patientName: existingUser.name,
          patientEmail: existingUser.email,
        });
      }

      const inviteToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const patientData = JSON.stringify({ age, msDurationYears, totalRelapses, relapsesLast12Months, edssScore, notes });

      await storage.createInvitationToken({
        email: patientEmail,
        name: patientName,
        clinicianId: req.user!.userId,
        token: inviteToken,
        patientData,
        expiresAt,
      });

      const clinicianUser = await storage.getUser(req.user!.userId);
      const clinicianName = clinicianUser?.name || "Your clinician";

      const host = req.headers.host || "localhost:5000";
      const protocol = req.headers["x-forwarded-proto"] || (host.includes("localhost") ? "http" : "https");
      const inviteUrl = `${protocol}://${host}/accept-invite?token=${inviteToken}`;

      let emailSent = false;
      try {
        emailSent = await sendInvitationEmail({
          to: patientEmail,
          patientName,
          clinicianName,
          inviteUrl,
        });
      } catch (emailError: any) {
        console.error("[Email Error]", emailError.message);
      }

      return res.json({
        message: emailSent ? "Invitation email sent successfully" : "Invitation created but email could not be sent. Please share the invite link manually.",
        invited: true,
        emailSent,
        patientName,
        patientEmail,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Failed to create patient record" });
    }
  });

  app.patch("/api/clinician/patient/:id", requireAuth, requireClinician, async (req, res) => {
    try {
      const patient = await storage.getPatientById(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      if (patient.clinicianId !== req.user!.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const data = updatePatientSchema.parse(req.body);
      const updated = await storage.updatePatient(req.params.id, data as any);

      const user = await storage.getUser(patient.patientUserId);
      return res.json({
        ...updated,
        patientName: user?.name || "Unknown",
        patientEmail: user?.email || "",
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Failed to update patient" });
    }
  });

  app.get("/api/patient/dashboard", requireAuth, requirePatient, async (req, res) => {
    const patient = await storage.getPatientByUserId(req.user!.userId);
    if (!patient) {
      return res.status(404).json({ message: "Patient record not found" });
    }

    const clinician = await storage.getUser(patient.clinicianId);
    return res.json({
      ...patient,
      clinicianName: clinician?.name || "Unknown",
    });
  });

  app.post("/api/patient/daily-log", requireAuth, requirePatient, async (req, res) => {
    try {
      const data = dailyLogFormSchema.parse(req.body);
      const existing = await storage.getDailyLogByDate(req.user!.userId, data.logDate);

      if (existing) {
        return res.status(400).json({ message: "A log already exists for this date. Only your clinician can edit daily logs." });
      }

      const log = await storage.createDailyLog({
        patientUserId: req.user!.userId,
        logDate: data.logDate,
        sleepHours: data.sleepHours,
        physicalComfort: data.physicalComfort,
        mentalFog: data.mentalFog,
        mood: data.mood,
        overallWellbeing: data.overallWellbeing,
        activityLevel: data.activityLevel,
        medicationAdherence: data.medicationAdherence,
        painSymptoms: data.painSymptoms || [],
        fatigueSymptoms: data.fatigueSymptoms || [],
        visualSymptoms: data.visualSymptoms || [],
        notes: data.notes || null,
      });
      return res.json(log);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Failed to save daily log" });
    }
  });

  app.get("/api/patient/daily-log/:date", requireAuth, requirePatient, async (req, res) => {
    const log = await storage.getDailyLogByDate(req.user!.userId, req.params.date);
    if (!log) {
      return res.status(404).json({ message: "No log found for this date" });
    }
    return res.json(log);
  });

  app.get("/api/patient/daily-logs", requireAuth, requirePatient, async (req, res) => {
    const { start, end } = req.query;
    if (start && end) {
      const logs = await storage.getDailyLogsByDateRange(
        req.user!.userId,
        start as string,
        end as string
      );
      return res.json(logs);
    }
    const logs = await storage.getRecentDailyLogs(req.user!.userId, 30);
    return res.json(logs);
  });

  app.post("/api/clinician/patient/:id/daily-log", requireAuth, requireClinician, async (req, res) => {
    try {
      const patient = await storage.getPatientById(req.params.id);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      if (patient.clinicianId !== req.user!.userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const data = dailyLogFormSchema.parse(req.body);
      const existing = await storage.getDailyLogByDate(patient.patientUserId, data.logDate);

      const logData = {
        patientUserId: patient.patientUserId,
        logDate: data.logDate,
        sleepHours: data.sleepHours,
        physicalComfort: data.physicalComfort,
        mentalFog: data.mentalFog,
        mood: data.mood,
        overallWellbeing: data.overallWellbeing,
        activityLevel: data.activityLevel,
        medicationAdherence: data.medicationAdherence,
        painSymptoms: data.painSymptoms || [],
        fatigueSymptoms: data.fatigueSymptoms || [],
        visualSymptoms: data.visualSymptoms || [],
        notes: data.notes || null,
      };

      if (existing) {
        const updated = await storage.updateDailyLog(existing.id, logData);
        return res.json(updated);
      }

      const log = await storage.createDailyLog(logData);
      return res.json(log);
    } catch (error: any) {
      return res.status(400).json({ message: error.message || "Failed to save daily log" });
    }
  });

  app.get("/api/clinician/patient/:id/daily-logs", requireAuth, requireClinician, async (req, res) => {
    const patient = await storage.getPatientById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    if (patient.clinicianId !== req.user!.userId) {
      return res.status(403).json({ message: "Access denied" });
    }
    const { start, end } = req.query;
    if (start && end) {
      const logs = await storage.getDailyLogsByDateRange(
        patient.patientUserId,
        start as string,
        end as string
      );
      return res.json(logs);
    }
    const logs = await storage.getRecentDailyLogs(patient.patientUserId, 30);
    return res.json(logs);
  });

  function computeSymptomVariance(logs: any[]) {
    if (logs.length < 2) return { metrics: [], mostVarying: null, dailyData: [] };

    const numericMetrics = [
      { key: "sleepHours", label: "Sleep Hours", color: "hsl(var(--chart-3))" },
      { key: "physicalComfort", label: "Physical Comfort", color: "hsl(var(--chart-2))" },
      { key: "overallWellbeing", label: "Overall Wellbeing", color: "hsl(var(--primary))" },
      { key: "activityLevel", label: "Activity Level", color: "hsl(var(--chart-4))" },
    ];

    const metrics = numericMetrics.map((m) => {
      const values = logs.map((l: any) => l[m.key] as number);
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
      const stdDev = Math.sqrt(variance);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min;
      const cv = mean !== 0 ? (stdDev / mean) * 100 : 0;
      return { ...m, mean: +mean.toFixed(2), stdDev: +stdDev.toFixed(2), variance: +variance.toFixed(2), min, max, range, cv: +cv.toFixed(1) };
    });

    const symptomCategories = [
      { key: "painSymptoms", label: "Pain Symptoms" },
      { key: "fatigueSymptoms", label: "Fatigue Symptoms" },
      { key: "visualSymptoms", label: "Visual Symptoms" },
    ];
    const symptomMetrics = symptomCategories.map((cat) => {
      const counts = logs.map((l: any) => (l[cat.key] || []).length);
      const mean = counts.reduce((s, v) => s + v, 0) / counts.length;
      const variance = counts.reduce((s, v) => s + (v - mean) ** 2, 0) / counts.length;
      const stdDev = Math.sqrt(variance);
      const cv = mean !== 0 ? (stdDev / mean) * 100 : 0;
      return { key: cat.key, label: cat.label, mean: +mean.toFixed(2), stdDev: +stdDev.toFixed(2), variance: +variance.toFixed(2), cv: +cv.toFixed(1), min: Math.min(...counts), max: Math.max(...counts), range: Math.max(...counts) - Math.min(...counts), color: "" };
    });

    const allMetrics = [...metrics, ...symptomMetrics];
    const mostVarying = allMetrics.reduce((best, m) => (m.cv > best.cv ? m : best), allMetrics[0]);

    const dailyData = logs.map((l: any) => ({
      date: l.logDate,
      sleepHours: l.sleepHours,
      physicalComfort: l.physicalComfort,
      overallWellbeing: l.overallWellbeing,
      activityLevel: l.activityLevel,
      painCount: (l.painSymptoms || []).length,
      fatigueCount: (l.fatigueSymptoms || []).length,
      visualCount: (l.visualSymptoms || []).length,
    }));

    return { metrics: allMetrics, mostVarying, dailyData };
  }

  app.post("/api/patient/insights/ai", requireAuth, requirePatient, async (req, res) => {
    const patient = await storage.getPatientByUserId(req.user!.userId);
    if (!patient) return res.status(404).json({ message: "Patient record not found" });

    const logs = await storage.getRecentDailyLogs(req.user!.userId, 30);
    const patientUser = await storage.getUser(req.user!.userId);

    const patientSummary = {
      name: patientUser?.name || "Unknown",
      age: patient.age,
      msDurationYears: patient.msDurationYears,
      totalRelapses: patient.totalRelapses,
      relapsesLast12Months: patient.relapsesLast12Months,
      edssScore: patient.edssScore,
    };

    const logSummary = logs.map((l: any) => ({
      date: l.logDate,
      sleepHours: l.sleepHours,
      physicalComfort: l.physicalComfort,
      mentalFog: l.mentalFog,
      mood: l.mood,
      overallWellbeing: l.overallWellbeing,
      activityLevel: l.activityLevel,
      medicationAdherence: l.medicationAdherence,
      painSymptoms: l.painSymptoms,
      fatigueSymptoms: l.fatigueSymptoms,
      visualSymptoms: l.visualSymptoms,
      notes: l.notes,
    }));

    const varianceData = logs.length >= 2 ? computeSymptomVariance(logs) : null;

    try {
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const prompt = `You are a health assistant helping an MS patient understand their own health data. Analyze this patient's data and daily symptom logs to provide supportive, easy-to-understand insights and actionable recommendations.

PATIENT PROFILE:
${JSON.stringify(patientSummary, null, 2)}

DAILY SYMPTOM LOGS (most recent 30 days):
${JSON.stringify(logSummary, null, 2)}

${varianceData ? `SYMPTOM VARIANCE ANALYSIS:
Most varying metric: ${varianceData.mostVarying?.label} (CV: ${varianceData.mostVarying?.cv}%)
All metrics: ${JSON.stringify(varianceData.metrics.map((m: any) => ({ label: m.label, mean: m.mean, cv: m.cv, range: m.range })), null, 2)}` : "No variance data available (fewer than 2 logs)."}

Provide your analysis as JSON with this exact structure:
{
  "summary": "A 2-3 sentence friendly overview of the patient's current health status",
  "alarmingFindings": ["List of concerning patterns the patient should be aware of and discuss with their clinician"],
  "positiveFindings": ["List of positive trends or things the patient is doing well"],
  "recommendations": ["Specific, practical, actionable daily life recommendations for the patient"],
  "symptomPatterns": "Description of any notable symptom patterns or trends over time, written in plain language",
  "riskLevel": "low" | "moderate" | "high"
}

IMPORTANT GUIDELINES FOR RECOMMENDATIONS:
- Write recommendations in a supportive, encouraging tone directed at the patient (use "you/your").
- Make recommendations HIGHLY SPECIFIC and PRACTICAL based on the actual data. Reference real numbers from the logs.
- For sleep: If sleep is low (e.g. averaging 5h), suggest "Try reducing screen time 1 hour before bed and aim for at least 7 hours of sleep each night."
- For activity: If activity is low, suggest "Try a 10-15 minute gentle walk daily — even short movement helps with MS fatigue."
- For pain/fatigue symptoms: Suggest specific management strategies like "Apply heat therapy for joint pain relief" or "Schedule short rest breaks throughout your day to manage fatigue."
- For mental fog: Suggest "Use a daily written to-do list to help manage cognitive fatigue" or "Try brain exercises like reading or puzzles in the morning."
- For medication adherence: If inconsistent, suggest "Set a daily phone alarm as a medication reminder" or "Use a weekly pill organiser to track doses."
- For mood: If anxious/sad patterns appear, suggest "Try 5 minutes of deep breathing exercises daily" or "Consider journaling your thoughts before bed."
- Provide at least 4-6 specific recommendations.
- Keep language accessible and non-alarming — this is for the patient, not a clinical report.

Be specific, reference actual data points, and focus on empowering the patient.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) return res.status(500).json({ message: "AI returned empty response" });

      const raw = JSON.parse(content);
      const insights = {
        summary: typeof raw.summary === "string" ? raw.summary : "No summary available.",
        alarmingFindings: Array.isArray(raw.alarmingFindings) ? raw.alarmingFindings : [],
        positiveFindings: Array.isArray(raw.positiveFindings) ? raw.positiveFindings : [],
        recommendations: Array.isArray(raw.recommendations) ? raw.recommendations : [],
        symptomPatterns: typeof raw.symptomPatterns === "string" ? raw.symptomPatterns : "",
        riskLevel: ["low", "moderate", "high"].includes(raw.riskLevel) ? raw.riskLevel : "moderate",
      };
      return res.json(insights);
    } catch (error: any) {
      console.error("[AI Patient Insights Error]", error.message);
      return res.status(500).json({ message: "Failed to generate AI insights: " + error.message });
    }
  });

  app.get("/api/patient/insights/symptom-variance", requireAuth, requirePatient, async (req, res) => {
    const logs = await storage.getRecentDailyLogs(req.user!.userId, 30);
    if (logs.length < 2) {
      return res.json({ metrics: [], mostVarying: null, dailyData: [], message: "Need at least 2 daily logs to generate insights" });
    }
    return res.json(computeSymptomVariance(logs));
  });

  app.post("/api/clinician/patient/:id/insights/ai", requireAuth, requireClinician, async (req, res) => {
    const patient = await storage.getPatientById(req.params.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    if (patient.clinicianId !== req.user!.userId) return res.status(403).json({ message: "Access denied" });

    const logs = await storage.getRecentDailyLogs(patient.patientUserId, 30);
    const patientUser = await storage.getUser(patient.patientUserId);

    const patientSummary = {
      name: patientUser?.name || "Unknown",
      age: patient.age,
      msDurationYears: patient.msDurationYears,
      totalRelapses: patient.totalRelapses,
      relapsesLast12Months: patient.relapsesLast12Months,
      edssScore: patient.edssScore,
      notes: patient.notes,
    };

    const logSummary = logs.map((l: any) => ({
      date: l.logDate,
      sleepHours: l.sleepHours,
      physicalComfort: l.physicalComfort,
      mentalFog: l.mentalFog,
      mood: l.mood,
      overallWellbeing: l.overallWellbeing,
      activityLevel: l.activityLevel,
      medicationAdherence: l.medicationAdherence,
      painSymptoms: l.painSymptoms,
      fatigueSymptoms: l.fatigueSymptoms,
      visualSymptoms: l.visualSymptoms,
      notes: l.notes,
    }));

    const varianceData = logs.length >= 2 ? computeSymptomVariance(logs) : null;

    try {
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const prompt = `You are a clinical decision support assistant for Multiple Sclerosis (MS) patient management. Analyze this patient's data and daily symptom logs to provide actionable clinical insights.

PATIENT PROFILE:
${JSON.stringify(patientSummary, null, 2)}

DAILY SYMPTOM LOGS (most recent 30 days):
${JSON.stringify(logSummary, null, 2)}

${varianceData ? `SYMPTOM VARIANCE ANALYSIS:
Most varying metric: ${varianceData.mostVarying?.label} (CV: ${varianceData.mostVarying?.cv}%)
All metrics: ${JSON.stringify(varianceData.metrics.map((m: any) => ({ label: m.label, mean: m.mean, cv: m.cv, range: m.range })), null, 2)}` : "No variance data available (fewer than 2 logs)."}

Provide your analysis as JSON with this exact structure:
{
  "summary": "A 2-3 sentence overview of the patient's current status",
  "alarmingFindings": ["List of concerning patterns or red flags that need clinical attention"],
  "positiveFindings": ["List of positive trends or stable metrics"],
  "recommendations": ["Specific, practical, actionable recommendations for the patient's daily life"],
  "symptomPatterns": "Description of any notable symptom patterns, correlations, or trends over time",
  "riskLevel": "low" | "moderate" | "high"
}

IMPORTANT GUIDELINES FOR RECOMMENDATIONS:
- Make recommendations HIGHLY SPECIFIC and PRACTICAL based on the actual data. Reference real numbers from the logs.
- For sleep: If sleep is low (e.g. averaging 5h), suggest specific habits like "Reduce screen time 1 hour before bed, aim for at least 7 hours of sleep, and maintain a consistent bedtime routine."
- For activity: If activity is low, suggest "Try a 15-minute gentle walk daily" or "Consider light stretching or yoga to gradually increase activity."
- For pain/fatigue symptoms: Suggest specific management strategies like "Apply heat therapy for recurring joint pain" or "Schedule rest breaks every 2 hours to manage fatigue."
- For mental fog: Suggest cognitive strategies like "Use written reminders and break tasks into smaller steps."
- For medication adherence: If inconsistent, suggest "Set a daily phone alarm for medication" or "Use a pill organizer."
- For mood: If anxious/sad patterns, suggest "Practice 5-minute breathing exercises" or "Consider journaling before bed."
- Always tie recommendations directly to the patient's actual logged data points and trends.
- Provide at least 4-6 specific recommendations.

Be specific, reference actual data points, and focus on clinically relevant observations. If there are few logs, note the limited data but still provide what analysis you can.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ message: "AI returned empty response" });
      }

      const raw = JSON.parse(content);
      const insights = {
        summary: typeof raw.summary === "string" ? raw.summary : "No summary available.",
        alarmingFindings: Array.isArray(raw.alarmingFindings) ? raw.alarmingFindings : [],
        positiveFindings: Array.isArray(raw.positiveFindings) ? raw.positiveFindings : [],
        recommendations: Array.isArray(raw.recommendations) ? raw.recommendations : [],
        symptomPatterns: typeof raw.symptomPatterns === "string" ? raw.symptomPatterns : "",
        riskLevel: ["low", "moderate", "high"].includes(raw.riskLevel) ? raw.riskLevel : "moderate",
      };
      return res.json(insights);
    } catch (error: any) {
      console.error("[AI Insights Error]", error.message);
      return res.status(500).json({ message: "Failed to generate AI insights: " + error.message });
    }
  });

  app.get("/api/clinician/patient/:id/insights/symptom-variance", requireAuth, requireClinician, async (req, res) => {
    const patient = await storage.getPatientById(req.params.id);
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    if (patient.clinicianId !== req.user!.userId) return res.status(403).json({ message: "Access denied" });

    const logs = await storage.getRecentDailyLogs(patient.patientUserId, 30);
    if (logs.length < 2) {
      return res.json({ metrics: [], mostVarying: null, dailyData: [], message: "Need at least 2 daily logs to generate insights" });
    }
    return res.json(computeSymptomVariance(logs));
  });

  // AI Chatbot
  app.post("/api/chat", requireAuth, async (req, res) => {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "Messages array is required" });
    }

    const role = req.user!.role;

    const navGuide = role === "clinician"
      ? `APP NAVIGATION — CLINICIAN PORTAL:
- Dashboard: Shows your patient list with Name, Age, MS Duration, Relapses, and EDSS columns.
- Add Patient: Click "Add Patient" (top right) to invite a patient by email. Fill in their name, email, age, MS duration, relapses, and EDSS score. They receive an invitation email to create their account.
- Manage Patients: Each patient row has View, Edit, and Logs buttons.
  - View: Opens the Patient Insights panel (right side) showing MS stage classification and AI insights.
  - Edit: Opens the Edit Patient dialog to update clinical data.
  - Logs: Opens the Daily Logs panel to view, create, or edit daily log entries for that patient.
- AI Clinical Insights: Select a patient (View), then click "Generate AI Analysis" to get a risk level, summary, alarming findings, positive findings, symptom patterns, and recommendations based on the last 30 days of logs.
- Symptom Variance: In the patient insights panel, click "Generate Insights" to see which metric varies most in the patient's logs.
- Help Guide: Click the "Help Guide" button in the top header to open a role-specific tutorial with screenshots.`
      : `APP NAVIGATION — PATIENT PORTAL:
- Overview tab: Your personal health summary, current MS stage classification (by age, relapses, duration), and quick stats.
- Daily Log tab: Submit today's symptom log. Adjust sliders for Sleep Hours, Physical Comfort, Wellbeing, Activity Level. Select Mood, toggle Mental Fog and Medication Taken, tick any Pain/Fatigue/Visual symptoms, and add notes. Click "Submit Today's Log" to save. You can only submit one log per day.
- Weekly Trends tab: View your wellbeing trend line chart, sleep pattern bar chart, and symptom counts chart. Summary stats cards show Avg Wellbeing, Avg Sleep, Avg Comfort, Trend direction, Medication Adherence, Mental Fog Days, and Mood Distribution.
- MS Insights tab: See your AI Health Analysis (generate or regenerate it), MS stage classifications, most common symptoms bar chart, and Symptom Variance chart. Click "Generate" or "Regenerate" in the AI Health Analysis card to get personalised AI insights.
- Help Guide: Click the "Help Guide" button in the top header for step-by-step tutorials with screenshots.`;

    const disclaimer = role === "patient"
      ? `\n\nIMPORTANT: You are speaking with a patient. Always include a brief reminder that they should consult their clinician or neurologist for any medical decisions, diagnosis, or treatment changes. Keep your tone warm, encouraging, and accessible — avoid overly clinical language.`
      : `\n\nYou are speaking with a clinician. You may use clinical terminology. Be concise and evidence-based.`;

    const systemPrompt = `You are the Clear Skies MS Assistant — an AI helper embedded in the Clear Skies MS patient management portal. You have two core jobs:
1. Help users navigate the Clear Skies app.
2. Answer questions about Multiple Sclerosis (MS) accurately, drawing on established clinical knowledge and research.

${navGuide}${disclaimer}

---
MS KNOWLEDGE BASE (based on established clinical research and guidelines):

TYPES OF MS:
- Clinically Isolated Syndrome (CIS): First episode of CNS demyelination lasting ≥24h. ~50-85% convert to MS if MRI shows lesions. McDonald 2017 criteria may diagnose MS at this stage.
- Relapsing-Remitting MS (RRMS): Most common form (~85% of diagnoses). Defined attacks (relapses) followed by partial or complete recovery. MRI typically shows active gadolinium-enhancing lesions during attacks.
- Secondary Progressive MS (SPMS): Follows RRMS in ~50-65% of untreated patients within 15-20 years. Gradual neurological worsening with or without superimposed relapses. Siponimod (EXPAND trial) and cladribine have shown benefit.
- Primary Progressive MS (PPMS): ~10-15% of cases. Progressive disability from onset, no distinct relapses. More common in men and older age of onset. Ocrelizumab (ORATORIO trial, NEJM 2017) is the only approved DMT.

DIAGNOSIS — McDonald Criteria 2017 (Lancet Neurology):
- Requires demonstration of CNS lesion dissemination in space (DIS) and time (DIT).
- MRI findings: T2 lesions in ≥2 of these locations: periventricular, juxtacortical/cortical, infratentorial, spinal cord.
- DIT can be shown by simultaneous T1 Gd-enhancing + T2 lesions, new T2/Gd lesion on follow-up MRI, or CSF-specific oligoclonal bands.
- CSF: Oligoclonal bands (OCBs) present in ~85-90% of MS patients; elevated IgG index.
- Evoked potentials (VEP, SSEP): can reveal subclinical demyelination.

EDSS (Expanded Disability Status Scale):
- 0.0: Normal neurological exam.
- 1.0-2.5: Minimal signs, no disability.
- 3.0-4.5: Moderate disability; ambulatory without aid; able to work full day.
- 5.0-6.5: Requires walking aid (cane, crutch, brace).
- 7.0-8.5: Restricted to wheelchair; limited self-care.
- 9.0-10.0: Bedridden; totally dependent; MS-related death.

SYMPTOMS:
- Fatigue: Most common symptom (~80-90%). Central MS fatigue ≠ normal tiredness. Worsens with heat (Uhthoff's phenomenon). Managed with amantadine, modafinil, exercise.
- Visual: Optic neuritis (painful unilateral vision loss, RAPD); internuclear ophthalmoplegia (double vision); nystagmus.
- Motor: Spasticity, weakness, gait disturbance. Baclofen, tizanidine, dalfampridine (improves walking speed, NEJM 2010).
- Sensory: Numbness, tingling (paresthesia), Lhermitte's sign (electric sensation down spine on neck flexion — indicates cervical cord lesion).
- Cerebellar: Ataxia, intention tremor, dysarthria (Charcot's triad = tremor + nystagmus + scanning speech).
- Cognitive: Affects ~40-65% of patients; slowed processing speed, memory, attention. Measured with SDMT (Symbol Digit Modalities Test).
- Bladder/Bowel: Urgency, frequency, incontinence (neurogenic bladder). Managed with oxybutynin, solifenacin, intermittent catheterisation.
- Pain: Neuropathic pain (gabapentin, pregabalin, duloxetine), trigeminal neuralgia, Lhermitte's.
- Pseudobulbar affect: Involuntary laughing/crying. Treated with dextromethorphan/quinidine (Nuedexta).
- Depression/Anxiety: Very common (~50% lifetime prevalence). SSRIs, SNRIs, CBT effective.
- Heat sensitivity: Uhthoff's phenomenon — symptom worsening at elevated core temperature; cooling strategies helpful.

DISEASE-MODIFYING THERAPIES (DMTs):
First-line (moderate efficacy):
- Interferon beta-1a/1b (Avonex, Rebif, Betaseron): ~30% relapse reduction. Injection-based.
- Glatiramer acetate (Copaxone): ~30% reduction. Daily subcutaneous injection. Mechanism: immune deviation.
- Teriflunomide (Aubagio): ~37% reduction (TOWER trial). Oral, once daily. Dihydroorotate dehydrogenase inhibitor.
- Dimethyl fumarate / monomethyl fumarate (Tecfidera, Bafiertam): ~49-53% reduction (DEFINE/CONFIRM trials). Oral, twice daily. Nrf2 pathway activation.

High-efficacy:
- Natalizumab (Tysabri): ~68% reduction. IV infusion monthly. Blocks α4-integrin; risk of PML with JC virus antibody positivity.
- Ocrelizumab (Ocrevus): ~46-47% reduction vs. interferon (OPERA I/II, NEJM 2017). Anti-CD20 B-cell depletion. IV every 6 months. Only DMT for PPMS.
- Ofatumumab (Kesimpta): ~50% reduction vs. teriflunomide (ASCLEPIOS). Anti-CD20. Subcutaneous monthly self-injection.
- Siponimod (Mayzent): Approved for active SPMS. S1P receptor modulator.
- Ozanimod (Zeposia), Ponesimod (Ponvory): S1P modulators for RRMS.
- Alemtuzumab (Lemtrada): Anti-CD52; very high efficacy; risk of secondary autoimmune disease (thyroid ~30%). Two annual courses.
- Cladribine (Mavenclad): Selective lymphocyte reduction; oral; short treatment course; CLARITY trial ~58% reduction.

Key monitoring considerations:
- JCV antibody index for natalizumab PML risk.
- CBC monitoring for lymphopenia with S1P modulators and cladribine.
- Cardiac monitoring (first-dose bradycardia) with siponimod, ozanimod, ponesimod.
- Pregnancy contraindicated with most high-efficacy DMTs (alemtuzumab safest in this regard post-treatment).

LIFESTYLE AND WELLNESS (evidence-based):
- Exercise: Strong evidence for fatigue reduction, improved mood, cognitive function, and quality of life. Aerobic + resistance training 150 min/week recommended (Halabchi et al., J Sport Health Sci, 2017).
- Vitamin D: Serum 25-OH levels <30 ng/mL associated with increased MS activity (Ascherio et al., Ann Neurol, 2012). Supplementation commonly recommended; optimal levels debated (40-60 ng/mL often targeted).
- Diet: Mediterranean diet associated with lower fatigue and depression scores. No single diet proven to alter disease course; low-fat diets (Swank) have observational data only.
- Smoking: Current smoking increases relapse rate and accelerates conversion from RRMS to SPMS. Strong recommendation to quit.
- Sleep: Poor sleep worsens MS fatigue and cognitive symptoms. CBT-I effective for insomnia in MS.
- Stress: Psychological stress associated with increased relapse risk. Mindfulness-based stress reduction (MBSR) reduces fatigue and anxiety.
- Alcohol: Moderate consumption likely safe; excessive use may worsen balance and interact with medications.

BIOMARKERS AND MONITORING:
- Neurofilament light chain (NfL): Serum NfL is elevated during relapses and correlates with disease activity and DMT response. Emerging as a monitoring tool (Comi et al., Lancet Neurology, 2021).
- MRI: Annual brain MRI recommended on most DMTs. New T2 or Gd-enhancing lesions indicate disease activity even without clinical relapse ("silent" activity).
- No Evidence of Disease Activity (NEDA-3): No relapses + no MRI activity + no disability progression. NEDA-4 adds brain volume loss.

EBV AND MS:
- Strong epidemiological and mechanistic evidence that Epstein-Barr virus (EBV) infection is a prerequisite for MS. Bjornevik et al., Science 2022: Military cohort study showed MS risk increased 32-fold after EBV infection.
- Molecular mimicry between EBV protein EBNA1 and CNS protein GlialCAM hypothesised as mechanism (Lanz et al., Nature 2022).

PREGNANCY AND MS:
- Relapse rate decreases during pregnancy (especially 3rd trimester) and increases in first 3 months postpartum.
- Most DMTs should be discontinued before conception; planning with neurologist essential.
- MS does not worsen long-term due to pregnancy.

LIFE EXPECTANCY AND PROGNOSIS:
- Median life expectancy reduced by ~6-7 years vs. general population (mostly due to comorbidities and complications).
- 15 years after diagnosis: ~20% wheelchair dependent; ~80% still ambulatory.
- Good prognostic factors: female sex, younger age of onset, RRMS type, low lesion burden, complete recovery from first relapse, long interval between first two relapses.

---
RESPONSE GUIDELINES:
- Be accurate, warm, and helpful.
- Always cite the basis for clinical statements (e.g., "Research shows...", "Clinical guidelines recommend...").
- If a question is outside your knowledge, say so honestly.
- Do not provide specific dosing advice or change a patient's treatment plan.
- Keep responses concise unless the user asks for detail.
- For navigation questions, give clear step-by-step instructions using the app guide above.`;

    try {
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.7,
        max_tokens: 700,
      });

      return res.json({ message: completion.choices[0].message.content });
    } catch (error: any) {
      console.error("[Chat Error]", error.message);
      return res.status(500).json({ message: "Failed to get response: " + error.message });
    }
  });

  return httpServer;
}
