import { describe, expect, it } from "vitest";
import { DIAGNOSTIC_SECTIONS } from "../shared/diagnostic";
import { formatDiagnosticEmail } from "./diagnosticEmail";

describe("formatDiagnosticEmail", () => {
  it("inclui a identificação e todas as seções do diagnóstico no e-mail", () => {
    const firstQuestion = DIAGNOSTIC_SECTIONS[0]?.questions[0];
    const message = formatDiagnosticEmail({
      submissionId: 42,
      respondent: { name: "Ana Gestão", role: "Diretora", email: "ana@highline.edu.br", phone: "(62) 99999-9999" },
      answers: { [firstQuestion!.id]: "Uma resposta estratégica completa." },
    });

    expect(message.html).toContain("Ana Gestão");
    expect(message.html).toContain("Uma resposta estratégica completa.");
    expect(message.plainText).toContain("DIAGNÓSTICO 360° — HIGH LINE SCHOOL");
    expect(message.plainText).toContain("Diretora");
    DIAGNOSTIC_SECTIONS.forEach(section => expect(message.html).toContain(section.title));
  });

  it("inclui observações e links dos materiais complementares", () => {
    const message = formatDiagnosticEmail({
      submissionId: 43,
      respondent: { name: "Ana Gestão", email: "ana@highline.edu.br" },
      answers: {},
      materials: [{
        category: "institutional",
        notes: "Portfólio institucional anonimizado.",
        fileName: "portfolio.pdf",
        fileUrl: "/manus-storage/diagnosticos/portfolio.pdf",
      }],
    });

    expect(message.html).toContain("Materiais de apoio para aprofundamento");
    expect(message.html).toContain("Portfólio institucional anonimizado.");
    expect(message.html).toContain("portfolio.pdf");
    expect(message.plainText).toContain("MATERIAIS DE APOIO PARA APROFUNDAMENTO");
  });

});
