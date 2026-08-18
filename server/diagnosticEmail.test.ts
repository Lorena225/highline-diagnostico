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

});
