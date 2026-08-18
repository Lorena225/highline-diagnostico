import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { DIAGNOSTIC_SECTIONS } from "../shared/diagnostic";
import { diagnosticSubmissions } from "../drizzle/schema";
import { getDb } from "./db";
import { appRouter } from "./routers";

const enabled = process.env.RUN_LIVE_DIAGNOSTIC_EMAIL_TEST === "1";

function buildSampleAnswers() {
  return Object.fromEntries(
    DIAGNOSTIC_SECTIONS.flatMap(section => section.questions.map(question => [
      question.id,
      question.type === "checkbox"
        ? ["Simulação controlada", "Validar entrega"]
        : `Simulação ponta a ponta. Resposta de teste para: ${question.label}`,
    ])),
  );
}

describe("diagnóstico ponta a ponta", () => {
  it.skipIf(!enabled)("persiste e entrega uma simulação real para a caixa configurada", async () => {
    const marker = `SIMULAÇÃO E2E ${new Date().toISOString()}`;
    const caller = appRouter.createCaller({} as never);

    const result = await caller.diagnostic.submit({
      respondent: {
        name: marker,
        role: "Validação técnica",
        email: "diagnostico@virtruvia.com.br",
        phone: "00000000000",
      },
      answers: buildSampleAnswers(),
    });

    expect(result).toMatchObject({ success: true, emailDelivered: true, receiptUrl: expect.stringContaining("http") });

    const db = await getDb();
    expect(db).not.toBeNull();
    const rows = await db!.select().from(diagnosticSubmissions).where(eq(diagnosticSubmissions.respondentName, marker)).limit(1);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      respondentRole: "Validação técnica",
      respondentEmail: "diagnostico@virtruvia.com.br",
      emailStatus: "sent",
      emailError: null,
      receiptStorageKey: expect.stringContaining("comprovante-diagnostico"),
    });
  }, 30_000);
});
