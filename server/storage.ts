import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  patients,
  passwordResetTokens,
  dailyLogs,
  type User,
  type Patient,
  type InsertPatient,
  type PasswordResetToken,
  type DailyLog,
  type InsertDailyLog,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(data: { name: string; email: string; passwordHash: string; role: "clinician" | "patient" }): Promise<User>;
  getPatientsByClinicianId(clinicianId: string): Promise<Patient[]>;
  getPatientByUserId(patientUserId: string): Promise<Patient | undefined>;
  getPatientById(id: string): Promise<Patient | undefined>;
  createPatient(data: InsertPatient): Promise<Patient>;
  updatePatient(id: string, data: Partial<Patient>): Promise<Patient | undefined>;
  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markTokenUsed(id: string): Promise<void>;
  updateUserPassword(userId: string, passwordHash: string): Promise<void>;
  createDailyLog(data: InsertDailyLog): Promise<DailyLog>;
  updateDailyLog(id: string, data: Partial<InsertDailyLog>): Promise<DailyLog | undefined>;
  getDailyLogByDate(patientUserId: string, logDate: string): Promise<DailyLog | undefined>;
  getDailyLogsByDateRange(patientUserId: string, startDate: string, endDate: string): Promise<DailyLog[]>;
  getRecentDailyLogs(patientUserId: string, limit: number): Promise<DailyLog[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(data: { name: string; email: string; passwordHash: string; role: "clinician" | "patient" }): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async getPatientsByClinicianId(clinicianId: string): Promise<Patient[]> {
    return db.select().from(patients).where(eq(patients.clinicianId, clinicianId));
  }

  async getPatientByUserId(patientUserId: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.patientUserId, patientUserId));
    return patient;
  }

  async getPatientById(id: string): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async createPatient(data: InsertPatient): Promise<Patient> {
    const [patient] = await db.insert(patients).values(data).returning();
    return patient;
  }

  async updatePatient(id: string, data: Partial<Patient>): Promise<Patient | undefined> {
    const [patient] = await db
      .update(patients)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(patients.id, id))
      .returning();
    return patient;
  }

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const [resetToken] = await db
      .insert(passwordResetTokens)
      .values({ userId, token, expiresAt })
      .returning();
    return resetToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.token, token), eq(passwordResetTokens.used, "false")));
    return resetToken;
  }

  async markTokenUsed(id: string): Promise<void> {
    await db.update(passwordResetTokens).set({ used: "true" }).where(eq(passwordResetTokens.id, id));
  }

  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  }

  async createDailyLog(data: InsertDailyLog): Promise<DailyLog> {
    const [log] = await db.insert(dailyLogs).values(data).returning();
    return log;
  }

  async updateDailyLog(id: string, data: Partial<InsertDailyLog>): Promise<DailyLog | undefined> {
    const [log] = await db.update(dailyLogs).set(data).where(eq(dailyLogs.id, id)).returning();
    return log;
  }

  async getDailyLogByDate(patientUserId: string, logDate: string): Promise<DailyLog | undefined> {
    const [log] = await db.select().from(dailyLogs)
      .where(and(eq(dailyLogs.patientUserId, patientUserId), eq(dailyLogs.logDate, logDate)));
    return log;
  }

  async getDailyLogsByDateRange(patientUserId: string, startDate: string, endDate: string): Promise<DailyLog[]> {
    return db.select().from(dailyLogs)
      .where(and(
        eq(dailyLogs.patientUserId, patientUserId),
        gte(dailyLogs.logDate, startDate),
        lte(dailyLogs.logDate, endDate)
      ))
      .orderBy(dailyLogs.logDate);
  }

  async getRecentDailyLogs(patientUserId: string, limit: number): Promise<DailyLog[]> {
    return db.select().from(dailyLogs)
      .where(eq(dailyLogs.patientUserId, patientUserId))
      .orderBy(desc(dailyLogs.logDate))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
