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
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 38;

  const addPage = () => { pdf.addPage(); y = 34; };
  const ensureSpace = (height: number) => { if (y + height > 274) addPage(); };
  const write = (text: string, size = 10, options: { bold?: boolean; color?: [number, number, number]; gap?: number } = {}) => {
    pdf.setFont("helvetica", options.bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(...(options.color ?? [62, 71, 75]));
    const lines = pdf.splitTextToSize(text, contentWidth);
    const lineHeight = size * 0.49;
    ensureSpace(lines.length * lineHeight + 5);
    pdf.text(lines, margin, y);
    y += lines.length * lineHeight + (options.gap ?? 4);
  };
  const writeQuestion = (label: string, answer: string) => {
    write(label, 9.4, { bold: true, color: [44, 57, 63], gap: 2 });
    write(answer, 9.8, { color: [62, 71, 75], gap: 6 });
    pdf.setDrawColor(224, 229, 231);
    pdf.line(margin, y - 2, pageWidth - margin, y - 2);
    y += 3;
  };

  pdf.setFillColor(239, 244, 245);
  pdf.roundedRect(margin, y, contentWidth, 50, 2, 2, "F");
  y += 11;
  write("DIAGNÓSTICO 360°", 9, { bold: true, color: [138, 87, 50], gap: 4 });
  write("High Line School Goiânia", 23, { color: [26, 33, 36], gap: 5 });
  write("Comprovante de respostas", 11, { color: [95, 114, 123], gap: 0 });
  y += 18;
  write(`Respondente: ${respondent.name} · ${respondent.email}`, 10, { color: [44, 57, 63], gap: 3 });
  if (respondent.role) write(`Cargo ou área: ${respondent.role}`, 9.5, { color: [110, 103, 95], gap: 3 });
  if (respondent.phone) write(`Telefone: ${respondent.phone}`, 9.5, { color: [110, 103, 95], gap: 3 });
  write(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 8.8, { color: [110, 103, 95], gap: 12 });

  sections.forEach((section, sectionIndex) => {
    ensureSpace(28);
    pdf.setFillColor(231, 237, 239);
    pdf.roundedRect(margin, y, contentWidth, 19, 1.5, 1.5, "F");
    y += 7;
    write(`BLOCO ${String(sectionIndex + 1).padStart(2, "0")}`, 8.5, { bold: true, color: [138, 87, 50], gap: 2 });
    write(section.title, 14, { color: [44, 57, 63], gap: 11 });
    section.questions.forEach(question => writeQuestion(question.label, pdfAnswerText(answers[question.id])));
    y += 4;
  });

  if (materials.some(material => material.notes || material.files.length > 0)) {
    ensureSpace(28);
    pdf.setFillColor(247, 238, 232);
    pdf.roundedRect(margin, y, contentWidth, 19, 1.5, 1.5, "F");
    y += 7;
    write("MATERIAIS OPCIONAIS", 8.5, { bold: true, color: [138, 87, 50], gap: 2 });
    write("Contextos complementares compartilhados", 14, { color: [44, 57, 63], gap: 11 });
    materials.forEach(material => {
      write(material.title, 9.4, { bold: true, color: [44, 57, 63], gap: 2 });
      if (material.notes) write(material.notes, 9.8, { color: [62, 71, 75], gap: 3 });
      if (material.files.length > 0) write(`Arquivos: ${material.files.join(", ")}`, 9.2, { color: [95, 114, 123], gap: 6 });
    });
  }

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFillColor(44, 57, 63);
    pdf.rect(0, 0, pageWidth, 14, "F");
    pdf.setFont("times", "italic");
    pdf.setFontSize(10.5);
    pdf.setTextColor(255, 255, 255);
    pdf.text("VirtruvIA", margin, 9);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.text("DIAGNÓSTICO ESTRATÉGICO · HIGH LINE SCHOOL", pageWidth - margin, 9, { align: "right" });
    pdf.setDrawColor(219, 194, 180);
    pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    pdf.setFontSize(7.5);
    pdf.setTextColor(95, 114, 123);
    pdf.text("Estratégia, verdade e crescimento com intenção.", margin, pageHeight - 10);
    pdf.text(`Página ${page} de ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: "right" });
  }
  return pdf;
}
