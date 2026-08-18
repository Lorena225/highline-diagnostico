import { z } from "zod";
import { randomBytes } from "node:crypto";
import { createDiagnosticMaterials, createDiagnosticSubmission, updateDiagnosticEmailStatus, updateDiagnosticReceipt } from "../db";
import { sendDiagnosticEmail, sendRespondentConfirmationEmail } from "../diagnosticEmail";
import { createDiagnosticReceipt } from "../diagnosticReceipt";
import { publicProcedure, router } from "../_core/trpc";
import { storageGetSignedUrl, storagePut } from "../storage";
import { ENV } from "../_core/env";

const answerValue = z.union([z.string().max(12000), z.array(z.string().max(1000)).max(20), z.record(z.string(), z.string().max(4000)).refine(value => Object.keys(value).length <= 12)]);
const materialCategory = z.enum(["digital", "commercial", "institutional"]);
const materialFile = z.object({
  name: z.string().trim().min(1).max(180),
  contentType: z.string().trim().min(1).max(120),
  dataBase64: z.string().min(1).max(4_200_000),
});
const materialArea = z.object({
  category: materialCategory,
  notes: z.string().trim().max(4000).optional(),
  files: z.array(materialFile).max(2),
});

const MAX_FILE_BYTES = 3 * 1024 * 1024;
const SAFE_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
]);

function safeFileName(name: string) {
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return normalized.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 180);
}

export const diagnosticRouter = router({
  submit: publicProcedure
    .input(z.object({
      respondent: z.object({
        name: z.string().trim().min(2).max(191),
        role: z.string().trim().max(191).optional(),
        email: z.string().trim().email().max(320),
        phone: z.string().trim().max(64).optional(),
      }),
      answers: z.record(z.string(), answerValue),
      materials: z.array(materialArea).max(3).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const submission = await createDiagnosticSubmission({
        respondentName: input.respondent.name,
        respondentRole: input.respondent.role || null,
        respondentEmail: input.respondent.email,
        respondentPhone: input.respondent.phone || null,
        answers: input.answers,
        emailStatus: "pending",
      });

      try {
        const storedMaterials: Array<{ category: string; notes?: string; fileName?: string; fileUrl?: string }> = [];
        const materialRecords = [];

        for (const area of input.materials ?? []) {
          const notes = area.notes?.trim() || undefined;
          if (area.files.length === 0 && notes) {
            materialRecords.push({ submissionId: submission.id, category: area.category, notes });
            storedMaterials.push({ category: area.category, notes });
          }

          for (const file of area.files) {
            if (!SAFE_CONTENT_TYPES.has(file.contentType)) {
              throw new Error(`O arquivo ${file.name} não está em um formato permitido.`);
            }
            const bytes = Buffer.from(file.dataBase64, "base64");
            if (bytes.length === 0 || bytes.length > MAX_FILE_BYTES) {
              throw new Error(`O arquivo ${file.name} deve ter no máximo 3 MB.`);
            }

            const saved = await storagePut(
              `diagnosticos/high-line/${submission.id}/${area.category}/${safeFileName(file.name)}`,
              bytes,
              file.contentType,
            );
            materialRecords.push({
              submissionId: submission.id,
              category: area.category,
              notes,
              fileName: file.name,
              storageKey: saved.key,
              fileUrl: saved.url,
              contentType: file.contentType,
              sizeBytes: bytes.length,
            });
            storedMaterials.push({ category: area.category, notes, fileName: file.name, fileUrl: saved.url });
          }
        }

        await createDiagnosticMaterials(materialRecords);
        const receipt = createDiagnosticReceipt({
          respondent: input.respondent,
          answers: input.answers,
          materials: (input.materials ?? []).map(area => ({ title: area.category, notes: area.notes ?? "", files: area.files.map(file => file.name) })),
        });
        const receiptSaved = await storagePut(`diagnosticos/high-line/${submission.id}/comprovante-diagnostico.pdf`, receipt, "application/pdf");
        const receiptAccessToken = randomBytes(32).toString("hex");
        const receiptExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await updateDiagnosticReceipt(submission.id, { receiptStorageKey: receiptSaved.key, receiptAccessToken, receiptExpiresAt });
        const baseUrl = ENV.publicAppUrl.replace(/\/+$/, "");
        const receiptUrl = `${baseUrl}/api/receipt/${receiptAccessToken}`;
        const agencyEmail = await sendDiagnosticEmail({ submissionId: submission.id, respondent: input.respondent, answers: input.answers, materials: storedMaterials });
        const confirmation = agencyEmail.sent ? await sendRespondentConfirmationEmail({ submissionId: submission.id, respondent: input.respondent, receiptUrl }) : { sent: false, reason: agencyEmail.reason };
        const allDelivered = agencyEmail.sent && confirmation.sent;
        await updateDiagnosticEmailStatus(submission.id, allDelivered ? "sent" : "pending", allDelivered ? null : confirmation.reason ?? agencyEmail.reason ?? "A confirmação ao respondente não foi entregue.");
        return { success: true, emailDelivered: allDelivered, receiptUrl };
      } catch (error) {
        await updateDiagnosticEmailStatus(submission.id, "failed", error instanceof Error ? error.message : "Falha inesperada no envio de e-mail.");
        return { success: true, emailDelivered: false };
      }
    }),
});
