import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSubmission: vi.fn(),
  createMaterials: vi.fn(),
  updateEmailStatus: vi.fn(),
  updateReceipt: vi.fn(),
  registerEmailAttempt: vi.fn(),
  markDraftSubmitted: vi.fn(),
  saveDraft: vi.fn(),
  getDraft: vi.fn(),
  checkDatabase: vi.fn(),
  sendEmail: vi.fn(),
  sendConfirmation: vi.fn(),
  storeMaterial: vi.fn(),
  getReceiptLink: vi.fn(),
  createReceipt: vi.fn(),
}));

vi.mock("./db", () => ({
  createDiagnosticSubmission: mocks.createSubmission,
  createDiagnosticMaterials: mocks.createMaterials,
  updateDiagnosticEmailStatus: mocks.updateEmailStatus,
  updateDiagnosticReceipt: mocks.updateReceipt,
  registerEmailAttempt: mocks.registerEmailAttempt,
  markDiagnosticDraftSubmitted: mocks.markDraftSubmitted,
  saveDiagnosticDraft: mocks.saveDraft,
  getDiagnosticDraftByEmail: mocks.getDraft,
  checkDiagnosticDatabase: mocks.checkDatabase,
}));

vi.mock("./diagnosticEmail", () => ({ sendDiagnosticEmail: mocks.sendEmail, sendRespondentConfirmationEmail: mocks.sendConfirmation }));
vi.mock("./diagnosticReceipt", () => ({ createDiagnosticReceipt: mocks.createReceipt }));
vi.mock("./storage", () => ({ storagePut: mocks.storeMaterial, storageGetSignedUrl: mocks.getReceiptLink }));

import { diagnosticRouter } from "./routers/diagnostic";

const caller = () => diagnosticRouter.createCaller({} as never);

describe("resiliência do diagnóstico", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("o portão de saúde acusa indisponibilidade do banco", async () => {
    mocks.checkDatabase.mockResolvedValue({ ok: false, reason: "Credenciais do banco não configuradas." });
    const result = await caller().health();
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Credenciais");
  });

  it("o portão de saúde confirma o banco disponível", async () => {
    mocks.checkDatabase.mockResolvedValue({ ok: true });
    const result = await caller().health();
    expect(result.ok).toBe(true);
    expect(result.database).toBe(true);
  });

  it("salva o progresso parcial no servidor durante o preenchimento", async () => {
    mocks.saveDraft.mockResolvedValue({ id: 5, answeredCount: 12 });
    const result = await caller().saveProgress({
      respondent: { name: "Ana Gestão", email: "ana@highline.edu.br" },
      answers: { pitch_30s: "Resposta parcial preservada no servidor." },
      activeStep: 3,
      questionPage: 1,
    });
    expect(result.saved).toBe(true);
    expect(result.answeredCount).toBe(12);
    expect(mocks.saveDraft).toHaveBeenCalledWith(expect.objectContaining({ respondentEmail: "ana@highline.edu.br", activeStep: 3, questionPage: 1 }));
  });

  it("recusa progresso sem e-mail válido, evitando rascunhos órfãos", async () => {
    await expect(caller().saveProgress({
      respondent: { name: "Sem e-mail", email: "não-é-email" },
      answers: {},
      activeStep: 0,
      questionPage: 0,
    })).rejects.toThrow();
    expect(mocks.saveDraft).not.toHaveBeenCalled();
  });

  it("recupera um rascunho salvo no servidor pelo e-mail", async () => {
    mocks.getDraft.mockResolvedValue({
      respondent: { name: "Ana Gestão", role: "Diretora", email: "ana@highline.edu.br", phone: "" },
      answers: { pitch_30s: "Resposta recuperada." },
      activeStep: 2,
      questionPage: 0,
      answeredCount: 7,
      updatedAt: new Date(),
    });
    const result = await caller().recoverDraft({ email: "ana@highline.edu.br" });
    expect(result.found).toBe(true);
    if (result.found) expect(result.answeredCount).toBe(7);
  });

  it("informa quando não há rascunho para o e-mail consultado", async () => {
    mocks.getDraft.mockResolvedValue(undefined);
    const result = await caller().recoverDraft({ email: "ninguem@highline.edu.br" });
    expect(result.found).toBe(false);
  });

  it("devolve o id da submissão mesmo quando a notificação falha", async () => {
    mocks.createSubmission.mockResolvedValue({ id: 91 });
    mocks.createReceipt.mockReturnValue(Buffer.from("pdf"));
    mocks.storeMaterial.mockResolvedValue({ key: "diagnosticos/high-line/91/comprovante.pdf", url: "/x" });
    mocks.sendEmail.mockResolvedValue({ sent: false, reason: "SMTP indisponível" });
    mocks.sendConfirmation.mockResolvedValue({ sent: false });

    const result = await caller().submit({
      respondent: { name: "Ana Gestão", email: "ana@highline.edu.br" },
      answers: { pitch_30s: "Resposta completa." },
    });

    expect(result.success).toBe(true);
    expect(result.emailDelivered).toBe(false);
    expect(result.submissionId).toBe(91);
    // O registro existe: falha de notificação não é perda de resposta.
    expect(mocks.markDraftSubmitted).toHaveBeenCalledWith("ana@highline.edu.br");
  });
});
