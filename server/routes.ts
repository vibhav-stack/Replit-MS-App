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
} from "@shared/schema";

const createPatientBodySchema = z.object({
  patientEmail: z.string().email(),
  age: z.number().int().positive().nullable().optional(),
  msDurationYears: z.string().nullable().optional(),
  totalRelapses: z.number().int().min(0).nullable().optional(),
  relapsesLast12Months: z.number().int().min(0).nullable().optional(),
  edssScore: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(cookieParser());

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);

      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }

      if (data.role === "patient" && !data.clinicianEmail) {
        return res.status(400).json({ message: "Clinician email is required for patient registration" });
      }

      let clinician;
      if (data.role === "patient") {
        clinician = await storage.getUserByEmail(data.clinicianEmail!);
        if (!clinician || clinician.role !== "clinician") {
          return res.status(400).json({ message: "No clinician found with that email" });
        }
      }

      const passwordHash = await hashPassword(data.password);
      const user = await storage.createUser({
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
      });

      if (data.role === "patient" && clinician) {
        await storage.createPatient({
          clinicianId: clinician.id,
          patientUserId: user.id,
        });
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

        console.log(`[Password Reset] Token for ${data.email}: ${token}`);
        console.log(`[Password Reset] Reset URL: /reset-password?token=${token}`);
      }

      return res.json({ message: "If an account exists with that email, a reset link has been generated. Check server logs." });
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
      const validated = createPatientBodySchema.parse(req.body);
      const { patientEmail, age, msDurationYears, totalRelapses, relapsesLast12Months, edssScore, notes } = validated;

      let patientUser = await storage.getUserByEmail(patientEmail);

      if (!patientUser) {
        return res.status(400).json({ message: "No patient account found with that email" });
      }

      if (patientUser.role !== "patient") {
        return res.status(400).json({ message: "That user is not registered as a patient" });
      }

      const existingPatient = await storage.getPatientByUserId(patientUser.id);
      if (existingPatient) {
        if (existingPatient.clinicianId !== req.user!.userId) {
          return res.status(400).json({ message: "This patient is already linked to another clinician" });
        }
        const updated = await storage.updatePatient(existingPatient.id, {
          age: age ?? existingPatient.age,
          msDurationYears: msDurationYears ?? existingPatient.msDurationYears,
          totalRelapses: totalRelapses ?? existingPatient.totalRelapses,
          relapsesLast12Months: relapsesLast12Months ?? existingPatient.relapsesLast12Months,
          edssScore: edssScore ?? existingPatient.edssScore,
          notes: notes ?? existingPatient.notes,
        } as any);
        return res.json({
          ...updated,
          patientName: patientUser.name,
          patientEmail: patientUser.email,
        });
      }

      const patient = await storage.createPatient({
        clinicianId: req.user!.userId,
        patientUserId: patientUser.id,
        age: age || null,
        msDurationYears: msDurationYears || null,
        totalRelapses: totalRelapses || null,
        relapsesLast12Months: relapsesLast12Months || null,
        edssScore: edssScore || null,
        notes: notes || null,
      });

      return res.json({
        ...patient,
        patientName: patientUser.name,
        patientEmail: patientUser.email,
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

  return httpServer;
}
