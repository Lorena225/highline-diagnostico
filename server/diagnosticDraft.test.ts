import { describe, expect, it } from "vitest";
import { parseDiagnosticDraft, serializeDiagnosticDraft } from "../client/src/lib/diagnosticDraft";

describe("rascunho do diagnóstico", () => {
  it("preserva a pergunta exata e as respostas ao serializar o rascunho", () => {
    const raw = serializeDiagnosticDraft({
      answers: { historia_origem: "Uma resposta com contexto suficiente para seguir." },
      respondent: { name: "Ana", role: "Diretora", email: "ana@highline.edu.br", phone: "" },
      accepted: false,
      activeStep: 2,
      questionPage: 5,
    });

    expect(parseDiagnosticDraft(raw)).toMatchObject({ activeStep: 2, questionPage: 5, answers: { historia_origem: "Uma resposta com contexto suficiente para seguir." } });
  });

  it("rejeita conteúdo de rascunho inválido", () => {
    expect(parseDiagnosticDraft("{invalido")).toBeNull();
    expect(parseDiagnosticDraft(JSON.stringify({ activeStep: 2 }))).toBeNull();
  });
});
