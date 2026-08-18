import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const diagnosticSubmissions = mysqlTable("diagnosticSubmissions", {
  id: int("id").autoincrement().primaryKey(),
  respondentName: varchar("respondentName", { length: 191 }).notNull(),
  respondentRole: varchar("respondentRole", { length: 191 }),
  respondentEmail: varchar("respondentEmail", { length: 320 }).notNull(),
  respondentPhone: varchar("respondentPhone", { length: 64 }),
  answers: json("answers").$type<Record<string, string | string[]>>().notNull(),
  emailStatus: mysqlEnum("emailStatus", ["pending", "sent", "failed"]).default("pending").notNull(),
  emailError: text("emailError"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
});

export type DiagnosticSubmission = typeof diagnosticSubmissions.$inferSelect;
export type InsertDiagnosticSubmission = typeof diagnosticSubmissions.$inferInsert;

export const diagnosticMaterials = mysqlTable("diagnosticMaterials", {
  id: int("id").autoincrement().primaryKey(),
  submissionId: int("submissionId").notNull(),
  category: varchar("category", { length: 64 }).notNull(),
  notes: text("notes"),
  fileName: varchar("fileName", { length: 512 }),
  storageKey: varchar("storageKey", { length: 1024 }),
  fileUrl: varchar("fileUrl", { length: 1024 }),
  contentType: varchar("contentType", { length: 191 }),
  sizeBytes: int("sizeBytes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DiagnosticMaterial = typeof diagnosticMaterials.$inferSelect;
export type InsertDiagnosticMaterial = typeof diagnosticMaterials.$inferInsert;
