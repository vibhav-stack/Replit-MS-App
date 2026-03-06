import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, timestamp, boolean, real, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["clinician", "patient"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const patients = pgTable("patients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clinicianId: varchar("clinician_id").notNull().references(() => users.id),
  patientUserId: varchar("patient_user_id").notNull().references(() => users.id),
  age: integer("age"),
  msDurationYears: numeric("ms_duration_years"),
  totalRelapses: integer("total_relapses"),
  relapsesLast12Months: integer("relapses_last_12_months"),
  edssScore: numeric("edss_score"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: text("used").default("false"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  passwordHash: true,
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["clinician", "patient"]),
  clinicianEmail: z.string().email().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const dailyLogs = pgTable("daily_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patientUserId: varchar("patient_user_id").notNull().references(() => users.id),
  logDate: date("log_date").notNull(),
  sleepHours: real("sleep_hours").notNull(),
  physicalComfort: integer("physical_comfort").notNull(),
  mentalFog: boolean("mental_fog").notNull().default(false),
  mood: text("mood", { enum: ["HAPPY", "SAD", "ANXIOUS", "NEUTRAL"] }).notNull(),
  overallWellbeing: integer("overall_wellbeing").notNull(),
  activityLevel: integer("activity_level").notNull(),
  medicationAdherence: boolean("medication_adherence").notNull().default(true),
  painSymptoms: text("pain_symptoms").array().default(sql`'{}'::text[]`),
  fatigueSymptoms: text("fatigue_symptoms").array().default(sql`'{}'::text[]`),
  visualSymptoms: text("visual_symptoms").array().default(sql`'{}'::text[]`),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updatePatientSchema = z.object({
  age: z.number().int().positive().optional(),
  msDurationYears: z.string().optional(),
  totalRelapses: z.number().int().min(0).optional(),
  relapsesLast12Months: z.number().int().min(0).optional(),
  edssScore: z.string().optional(),
  notes: z.string().optional(),
});

export const insertDailyLogSchema = createInsertSchema(dailyLogs).omit({
  id: true,
  createdAt: true,
});

export const dailyLogFormSchema = z.object({
  logDate: z.string(),
  sleepHours: z.number().min(0).max(24),
  physicalComfort: z.number().int().min(1).max(10),
  mentalFog: z.boolean(),
  mood: z.enum(["HAPPY", "SAD", "ANXIOUS", "NEUTRAL"]),
  overallWellbeing: z.number().int().min(0).max(10),
  activityLevel: z.number().int().min(1).max(5),
  medicationAdherence: z.boolean(),
  painSymptoms: z.array(z.string()).optional(),
  fatigueSymptoms: z.array(z.string()).optional(),
  visualSymptoms: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type DailyLog = typeof dailyLogs.$inferSelect;
export type InsertDailyLog = z.infer<typeof insertDailyLogSchema>;
