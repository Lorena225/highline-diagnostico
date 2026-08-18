import { jsPDF } from "jspdf";

type PdfSection = { title: string; questions: Array<{ label: string; id: string }> };

export function pdfAnswerText(value: unknown) {
  if (!value) return "Não respondido";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return Object.entries(value as Record<string, string>).filter(([, response]) => response.trim()).map(([field, response]) => `${field}: ${response}`).join(" · ") || "Não respondido";
  return String(value);
}

export function generateDiagnosticPdf({ respondent, answers, sections, materials = [] }: { respondent: { name: string; role: string; email: string; phone: string }; answers: Record<string, unknown>; sections: PdfSection[]; materials?: Array<{ title: string; notes: string; files: string[] }> }) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 18;
  const width = 210 - margin * 2;
  let y = 20;
  const write = (text: string, size = 10, bold = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, width);
    if (y + lines.length * (size * 0.48) > 278) { pdf.addPage(); y = 20; }
    pdf.text(lines, margin, y);
    y += lines.length * (size * 0.48) + 4;
  };
  write("Diagnóstico 360° VirtruvIA", 18, true);
  write("High Line School Goiânia", 12);
  write(`Respondente: ${respondent.name} · ${respondent.email}`, 10);
  if (respondent.role) write(`Cargo ou área: ${respondent.role}`, 10);
  if (respondent.phone) write(`Telefone: ${respondent.phone}`, 10);
  write(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 9);
  y += 3;
  sections.forEach((section, sectionIndex) => {
    write(`Bloco ${String(sectionIndex + 1).padStart(2, "0")} · ${section.title}`, 13, true);
    section.questions.forEach(question => { write(question.label, 10, true); write(pdfAnswerText(answers[question.id]), 10); });
  });
  if (materials.some(material => material.notes || material.files.length > 0)) {
    write("Materiais de apoio opcionais", 13, true);
    materials.forEach(material => {
      write(material.title, 10, true);
      if (material.notes) write(material.notes, 10);
      if (material.files.length > 0) write(`Arquivos: ${material.files.join(", ")}`, 10);
    });
  }
  return pdf;
}
