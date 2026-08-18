import { generateDiagnosticPdf } from "../client/src/lib/diagnosticPdf";
import { DIAGNOSTIC_SECTIONS } from "../shared/diagnostic";

export function createDiagnosticReceipt(input: {
  respondent: { name: string; role?: string; email: string; phone?: string };
  answers: Record<string, string | string[] | Record<string, string>>;
  materials: Array<{ title: string; notes: string; files: string[] }>;
}) {
  const pdf = generateDiagnosticPdf({
    respondent: { name: input.respondent.name, role: input.respondent.role ?? "", email: input.respondent.email, phone: input.respondent.phone ?? "" },
    answers: input.answers,
    sections: DIAGNOSTIC_SECTIONS,
    materials: input.materials,
  });
  return Buffer.from(pdf.output("arraybuffer"));
}
