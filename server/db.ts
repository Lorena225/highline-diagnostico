import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { diagnosticMaterials, diagnosticSubmissions, InsertDiagnosticMaterial, InsertDiagnosticSubmission, InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { getSupabaseAdmin } from "./supabase";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createDiagnosticSubmission(submission: InsertDiagnosticSubmission) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase.from("diagnostic_submissions").insert({
      respondent_name: submission.respondentName,
      respondent_role: submission.respondentRole ?? null,
      respondent_email: submission.respondentEmail,
      respondent_phone: submission.respondentPhone ?? null,
      answers: submission.answers,
      email_status: submission.emailStatus,
      email_error: submission.emailError ?? null,
    }).select("id").single();
    if (error || !data) throw new Error(`Supabase: ${error?.message ?? "falha ao criar submissão"}`);
    return { id: Number(data.id) };
  }
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");

  const result = await db.insert(diagnosticSubmissions).values(submission);
  return { id: Number(result[0].insertId) };
}

export async function updateDiagnosticEmailStatus(
  id: number,
  status: "pending" | "sent" | "failed",
  error: string | null,
) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error: supabaseError } = await supabase.from("diagnostic_submissions").update({ email_status: status, email_error: error }).eq("id", id);
    if (supabaseError) throw new Error(`Supabase: ${supabaseError.message}`);
    return;
  }
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");

  await db.update(diagnosticSubmissions).set({ emailStatus: status, emailError: error }).where(eq(diagnosticSubmissions.id, id));
}

export async function updateDiagnosticReceipt(id: number, receipt: { receiptStorageKey: string; receiptAccessToken: string; receiptExpiresAt: Date }) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from("diagnostic_submissions").update({
      receipt_storage_key: receipt.receiptStorageKey,
      receipt_access_token: receipt.receiptAccessToken,
      receipt_expires_at: receipt.receiptExpiresAt.toISOString(),
    }).eq("id", id);
    if (error) throw new Error(`Supabase: ${error.message}`);
    return;
  }
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  await db.update(diagnosticSubmissions).set(receipt).where(eq(diagnosticSubmissions.id, id));
}

export async function getActiveDiagnosticReceiptByToken(token: string) {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase.from("diagnostic_submissions").select("id, receipt_storage_key, receipt_expires_at").eq("receipt_access_token", token).maybeSingle();
    if (error) throw new Error(`Supabase: ${error.message}`);
    if (!data?.receipt_storage_key || !data.receipt_expires_at || new Date(data.receipt_expires_at).getTime() < Date.now()) return undefined;
    return { id: Number(data.id), receiptStorageKey: data.receipt_storage_key, receiptExpiresAt: new Date(data.receipt_expires_at) };
  }
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const result = await db.select().from(diagnosticSubmissions).where(and(eq(diagnosticSubmissions.receiptAccessToken, token))).limit(1);
  const receipt = result[0];
  if (!receipt?.receiptStorageKey || !receipt.receiptExpiresAt || receipt.receiptExpiresAt.getTime() < Date.now()) return undefined;
  return receipt;
}

export async function createDiagnosticMaterials(materials: InsertDiagnosticMaterial[]) {
  if (materials.length === 0) return;
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from("diagnostic_materials").insert(materials.map(material => ({
      submission_id: material.submissionId,
      category: material.category,
      notes: material.notes ?? null,
      file_name: material.fileName ?? null,
      storage_key: material.storageKey ?? null,
      file_url: material.fileUrl ?? null,
      content_type: material.contentType ?? null,
      size_bytes: material.sizeBytes ?? null,
    })));
    if (error) throw new Error(`Supabase: ${error.message}`);
    return;
  }
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");

  await db.insert(diagnosticMaterials).values(materials);
}
