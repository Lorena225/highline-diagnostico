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

// ─────────────────────────────────────────────────────────────────────────────
// Resiliência: rascunhos no servidor, consulta administrativa e verificação de
// saúde. Todas as funções abaixo exigem Supabase configurado — o objetivo é
// justamente falhar cedo e de forma visível quando o banco não estiver de pé.
// ─────────────────────────────────────────────────────────────────────────────

function requireSupabase() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Banco de dados indisponível.");
  return supabase;
}

export type DiagnosticDraftInput = {
  respondentEmail: string;
  respondentName?: string | null;
  respondentRole?: string | null;
  respondentPhone?: string | null;
  answers: Record<string, unknown>;
  activeStep: number;
  questionPage: number;
};

/** Grava (ou atualiza) o rascunho do respondente no servidor. */
export async function saveDiagnosticDraft(draft: DiagnosticDraftInput) {
  const supabase = requireSupabase();
  const answeredCount = Object.values(draft.answers ?? {}).filter(value => {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === "object") return Object.values(value as Record<string, string>).some(item => String(item ?? "").trim().length > 0);
    return String(value ?? "").trim().length > 0;
  }).length;

  const { data, error } = await supabase.from("diagnostic_drafts").upsert({
    respondent_email: draft.respondentEmail.trim().toLowerCase(),
    respondent_name: draft.respondentName ?? null,
    respondent_role: draft.respondentRole ?? null,
    respondent_phone: draft.respondentPhone ?? null,
    answers: draft.answers,
    active_step: draft.activeStep,
    question_page: draft.questionPage,
    answered_count: answeredCount,
    updated_at: new Date().toISOString(),
  }, { onConflict: "respondent_email" }).select("id, answered_count").single();

  if (error || !data) throw new Error(`Supabase: ${error?.message ?? "falha ao salvar rascunho"}`);
  return { id: Number(data.id), answeredCount: Number(data.answered_count) };
}

/** Recupera o rascunho de um respondente pelo e-mail. */
export async function getDiagnosticDraftByEmail(email: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("diagnostic_drafts")
    .select("respondent_email, respondent_name, respondent_role, respondent_phone, answers, active_step, question_page, answered_count, updated_at")
    .eq("respondent_email", email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw new Error(`Supabase: ${error.message}`);
  if (!data) return undefined;
  return {
    respondent: {
      name: data.respondent_name ?? "",
      role: data.respondent_role ?? "",
      email: data.respondent_email,
      phone: data.respondent_phone ?? "",
    },
    answers: (data.answers ?? {}) as Record<string, unknown>,
    activeStep: Number(data.active_step ?? 0),
    questionPage: Number(data.question_page ?? 0),
    answeredCount: Number(data.answered_count ?? 0),
    updatedAt: new Date(data.updated_at),
  };
}

/** Marca o rascunho como concluído após uma submissão bem-sucedida. */
export async function markDiagnosticDraftSubmitted(email: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await supabase
    .from("diagnostic_drafts")
    .update({ submitted_at: new Date().toISOString() })
    .eq("respondent_email", email.trim().toLowerCase());
}

/** Lista rascunhos ainda não enviados — respostas em risco de se perderem. */
export async function listOpenDiagnosticDrafts() {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("diagnostic_drafts")
    .select("id, respondent_email, respondent_name, answered_count, active_step, updated_at, submitted_at")
    .is("submitted_at", null)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data ?? [];
}

/** Lista submissões para a tela de consulta. */
export async function listDiagnosticSubmissions(limit = 200) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("diagnostic_submissions")
    .select("id, respondent_name, respondent_role, respondent_email, respondent_phone, email_status, email_error, email_attempts, receipt_access_token, receipt_expires_at, submitted_at")
    .order("submitted_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data ?? [];
}

/** Retorna uma submissão completa, com respostas e materiais. */
export async function getDiagnosticSubmissionById(id: number) {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from("diagnostic_submissions").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Supabase: ${error.message}`);
  if (!data) return undefined;
  const { data: materials } = await supabase.from("diagnostic_materials").select("*").eq("submission_id", id);
  return { submission: data, materials: materials ?? [] };
}

/** Submissões cuja notificação por e-mail ainda não foi confirmada. */
export async function listSubmissionsPendingEmail() {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("diagnostic_submissions")
    .select("id, respondent_name, respondent_email, email_status, email_error, email_attempts, receipt_access_token, submitted_at, answers")
    .in("email_status", ["pending", "failed"])
    .order("submitted_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data ?? [];
}

/** Registra mais uma tentativa de notificação. */
export async function registerEmailAttempt(id: number, attempts: number) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  await supabase
    .from("diagnostic_submissions")
    .update({ email_attempts: attempts, last_email_attempt_at: new Date().toISOString() })
    .eq("id", id);
}

/**
 * Verifica se o banco está realmente respondendo. Usado pelo portão de saúde
 * que impede alguém de responder 51 perguntas contra uma base indisponível.
 */
export async function checkDiagnosticDatabase(): Promise<{ ok: boolean; reason?: string }> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return { ok: false, reason: "Credenciais do banco não configuradas." };
    const { error } = await supabase.from("diagnostic_submissions").select("id", { count: "exact", head: true }).limit(1);
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Falha desconhecida no banco." };
  }
}
