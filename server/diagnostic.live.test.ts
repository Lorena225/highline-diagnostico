import { describe, expect, it } from "vitest";
import { DIAGNOSTIC_SECTIONS } from "../shared/diagnostic";
import { appRouter } from "./routers";
import { getSupabaseAdmin } from "./supabase";

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

    expect(result).toMatchObject({ success: true, emailDelivered: true, receiptUrl: expect.stringContaining("/api/receipt/") });
    const receiptPath = new URL(result.receiptUrl).pathname;
    const receiptResponse = await fetch(`http://localhost:3000${receiptPath}`, { redirect: "manual" });
    expect(receiptResponse.status).toBe(302);
    expect(receiptResponse.headers.get("location")).toContain("http");

    const supabase = getSupabaseAdmin();
    expect(supabase).not.toBeNull();
    const { data, error } = await supabase!.from("diagnostic_submissions").select("respondent_role, respondent_email, email_status, email_error, receipt_storage_key, receipt_access_token, receipt_expires_at").eq("respondent_name", marker).limit(1).single();

    expect(error).toBeNull();
    expect(data).toMatchObject({
      respondent_role: "Validação técnica",
      respondent_email: "diagnostico@virtruvia.com.br",
      email_status: "sent",
      email_error: null,
      receipt_storage_key: expect.stringContaining("comprovante-diagnostico"),
      receipt_access_token: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(new Date(data!.receipt_expires_at).getTime()).toBeGreaterThan(Date.now());
  }, 30_000);
});
