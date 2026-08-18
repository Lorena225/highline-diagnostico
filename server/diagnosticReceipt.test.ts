import { describe, expect, it } from "vitest";
import { createDiagnosticReceipt } from "./diagnosticReceipt";

describe("comprovante armazenado do diagnóstico", () => {
  it("gera bytes PDF com identificação e materiais antes do envio da confirmação", () => {
    const receipt = createDiagnosticReceipt({
      respondent: { name: "Ana Gestão", role: "Diretora", email: "ana@highline.edu.br", phone: "62999999999" },
      answers: { origem: "A High Line foi criada para ampliar a experiência educacional." },
      materials: [{ title: "Links e ativos digitais", notes: "https://highline.edu.br", files: ["apresentacao.pdf"] }],
    });

    expect(receipt.subarray(0, 4).toString()).toBe("%PDF");
    expect(receipt.byteLength).toBeGreaterThan(1000);
  });
});
