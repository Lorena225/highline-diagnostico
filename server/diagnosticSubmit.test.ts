import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSubmission: vi.fn(),
  createMaterials: vi.fn(),
  updateEmailStatus: vi.fn(),
  sendEmail: vi.fn(),
  storeMaterial: vi.fn(),
}));

vi.mock("./db", () => ({
  createDiagnosticSubmission: mocks.createSubmission,
  createDiagnosticMaterials: mocks.createMaterials,
  updateDiagnosticEmailStatus: mocks.updateEmailStatus,
}));

vi.mock("./diagnosticEmail", () => ({ sendDiagnosticEmail: mocks.sendEmail }));
vi.mock("./storage", () => ({ storagePut: mocks.storeMaterial }));

import { diagnosticRouter } from "./routers/diagnostic";

describe("diagnostic.submit", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.createSubmission.mockResolvedValue({ id: 77 });
  });

  it("persiste as respostas e marca o e-mail como enviado", async () => {
    mocks.sendEmail.mockResolvedValue({ sent: true });
    const caller = diagnosticRouter.createCaller({} as never);

    const result = await caller.submit({
      respondent: { name: "Ana Gestão", role: "Diretora", email: "ana@highline.edu.br", phone: "62999999999" },
      answers: { pitch_30s: "Uma escola que une acolhimento e excelência.", segmentos_atendidos: ["Educação Infantil"] },
    });

    expect(mocks.createSubmission).toHaveBeenCalledWith(expect.objectContaining({
      respondentName: "Ana Gestão",
      respondentEmail: "ana@highline.edu.br",
      emailStatus: "pending",
      answers: expect.objectContaining({ pitch_30s: "Uma escola que une acolhimento e excelência." }),
    }));
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ submissionId: 77 }));
    expect(mocks.updateEmailStatus).toHaveBeenCalledWith(77, "sent", null);
    expect(result).toEqual({ success: true, emailDelivered: true });
  });

  it("mantém o envio registrado como pendente quando o provedor está indisponível", async () => {
    mocks.sendEmail.mockResolvedValue({ sent: false, reason: "Integração de e-mail ainda não configurada." });
    const caller = diagnosticRouter.createCaller({} as never);

    const result = await caller.submit({
      respondent: { name: "Ana Gestão", email: "ana@highline.edu.br" },
      answers: { pitch_30s: "Resposta" },
    });

    expect(mocks.updateEmailStatus).toHaveBeenCalledWith(77, "pending", "Integração de e-mail ainda não configurada.");
    expect(result).toEqual({ success: true, emailDelivered: false });
  });

  it("persiste uma observação opcional de material e a inclui no e-mail", async () => {
    mocks.sendEmail.mockResolvedValue({ sent: true });
    const caller = diagnosticRouter.createCaller({} as never);

    await caller.submit({
      respondent: { name: "Ana Gestão", email: "ana@highline.edu.br" },
      answers: { pitch_30s: "Resposta" },
      materials: [{ category: "digital", notes: "Site institucional e campanha de matrícula.", files: [] }],
    });

    expect(mocks.createMaterials).toHaveBeenCalledWith([expect.objectContaining({
      submissionId: 77,
      category: "digital",
      notes: "Site institucional e campanha de matrícula.",
    })]);
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      materials: [{ category: "digital", notes: "Site institucional e campanha de matrícula." }],
    }));
  });

  it("armazena um arquivo permitido e registra seus metadados", async () => {
    mocks.sendEmail.mockResolvedValue({ sent: true });
    mocks.storeMaterial.mockResolvedValue({ key: "diagnosticos/high-line/teste.pdf", url: "/manus-storage/diagnosticos/high-line/teste.pdf" });
    const caller = diagnosticRouter.createCaller({} as never);

    await caller.submit({
      respondent: { name: "Ana Gestão", email: "ana@highline.edu.br" },
      answers: { pitch_30s: "Resposta" },
      materials: [{
        category: "institutional",
        files: [{ name: "proposta.pdf", contentType: "application/pdf", dataBase64: Buffer.from("documento institucional").toString("base64") }],
      }],
    });

    expect(mocks.storeMaterial).toHaveBeenCalledWith(expect.stringContaining("institutional/proposta.pdf"), expect.any(Buffer), "application/pdf");
    expect(mocks.createMaterials).toHaveBeenCalledWith([expect.objectContaining({
      submissionId: 77,
      category: "institutional",
      fileName: "proposta.pdf",
      storageKey: "diagnosticos/high-line/teste.pdf",
    })]);
  });
});
