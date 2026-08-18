import { describe, expect, it } from "vitest";
import { generateDiagnosticPdf, pdfAnswerText } from "../client/src/lib/diagnosticPdf";

describe("comprovante PDF do diagnóstico", () => {
  it("formata respostas estruturadas e gera um comprovante para download", () => {
    expect(pdfAnswerText({ Região: "Jardim Goiás", Perfil: "Famílias que valorizam autonomia" })).toContain("Região: Jardim Goiás");
    const pdf = generateDiagnosticPdf({
      respondent: { name: "Ana Gestão", role: "Diretora", email: "ana@highline.edu.br", phone: "62999999999" },
      answers: { origem: "A escola nasceu para transformar a experiência educacional." },
      sections: [{ title: "Origem", questions: [{ id: "origem", label: "Conte a origem da escola." }] }],
      materials: [{ title: "Ativos digitais", notes: "https://highline.edu.br", files: ["apresentacao.pdf"] }],
    });
    expect(pdf.output("arraybuffer").byteLength).toBeGreaterThan(1000);
    expect(pdf.output()).toContain("Ana Gestão");
    expect(pdf.output()).toContain("apresentacao.pdf");
  });
});
