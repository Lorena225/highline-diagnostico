import { z } from "zod";
import { createDiagnosticSubmission, updateDiagnosticEmailStatus } from "../db";
import { sendDiagnosticEmail } from "../diagnosticEmail";
import { publicProcedure, router } from "../_core/trpc";

const answerValue = z.union([z.string().max(12000), z.array(z.string().max(1000)).max(20)]);

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
    }))
    .mutation(async ({ input }) => {
      const submission = await createDiagnosticSubmission({
        respondentName: input.respondent.name,
        respondentRole: input.respondent.role || null,
        respondentEmail: input.respondent.email,
        respondentPhone: input.respondent.phone || null,
        answers: input.answers,
        emailStatus: "pending",
      });

      try {
        const email = await sendDiagnosticEmail({ submissionId: submission.id, respondent: input.respondent, answers: input.answers });
        await updateDiagnosticEmailStatus(submission.id, email.sent ? "sent" : "pending", email.sent ? null : email.reason ?? "Integração de e-mail ainda não configurada.");
        return { success: true, emailDelivered: email.sent };
      } catch (error) {
        await updateDiagnosticEmailStatus(submission.id, "failed", error instanceof Error ? error.message : "Falha inesperada no envio de e-mail.");
        return { success: true, emailDelivered: false };
      }
    }),
});
