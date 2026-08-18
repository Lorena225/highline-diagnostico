import { DIAGNOSTIC_SECTIONS } from "../shared/diagnostic";
import nodemailer from "nodemailer";
import { ENV } from "./_core/env";

export type DiagnosticEmailPayload = {
  submissionId: number;
  respondent: { name: string; role?: string; email: string; phone?: string };
  answers: Record<string, string | string[]>;
  materials?: Array<{ category: string; notes?: string; fileName?: string; fileUrl?: string }>;
};

const DESTINATION = "diagnostico@virtruvia.com.br";

function escapeHtml(value: string) {
  return value.replace(/[&<>'\"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function answerText(value: string | string[] | undefined) {
  if (!value || (Array.isArray(value) && value.length === 0)) return "Não respondido";
  return Array.isArray(value) ? value.join(", ") : value;
}

const materialTitles: Record<string, string> = {
  digital: "Links e ativos digitais",
  commercial: "Dados e materiais comerciais",
  institutional: "Materiais institucionais e provas de valor",
};

export function formatDiagnosticEmail(payload: DiagnosticEmailPayload) {
  const submittedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date());
  const header = `<h1 style="margin:0 0 8px;color:#1a2124;font-family:Georgia,serif">Diagnóstico 360° — High Line School</h1><p style="margin:0 0 20px;color:#6e675f">Envio #${payload.submissionId} · ${submittedAt}</p><table style="border-collapse:collapse;width:100%;margin-bottom:28px"><tr><td style="padding:8px 0;color:#6e675f;width:120px">Respondente</td><td style="padding:8px 0;color:#1a2124"><strong>${escapeHtml(payload.respondent.name)}</strong></td></tr><tr><td style="padding:8px 0;color:#6e675f">Cargo</td><td style="padding:8px 0;color:#1a2124">${escapeHtml(payload.respondent.role || "Não informado")}</td></tr><tr><td style="padding:8px 0;color:#6e675f">E-mail</td><td style="padding:8px 0;color:#1a2124">${escapeHtml(payload.respondent.email)}</td></tr><tr><td style="padding:8px 0;color:#6e675f">Telefone</td><td style="padding:8px 0;color:#1a2124">${escapeHtml(payload.respondent.phone || "Não informado")}</td></tr></table>`;
  const sections = DIAGNOSTIC_SECTIONS.map(section => {
    const answers = section.questions.map(question => `<div style="padding:14px 0;border-top:1px solid #e0e5e7"><p style="margin:0 0 6px;color:#3e474b;font-weight:700">${escapeHtml(question.label)}</p><p style="margin:0;color:#1a2124;white-space:pre-wrap">${escapeHtml(answerText(payload.answers[question.id]))}</p></div>`).join("");
    return `<section style="margin:28px 0"><h2 style="margin:0 0 10px;padding-bottom:10px;border-bottom:1px solid #dbc2b4;color:#2c393f;font-family:Georgia,serif;font-weight:500">${escapeHtml(section.title)}</h2>${answers}</section>`;
  }).join("");
  const materials = payload.materials?.filter(item => item.notes || item.fileName) ?? [];
  const materialsHtml = materials.length === 0 ? "" : `<section style="margin:28px 0"><h2 style="margin:0 0 10px;padding-bottom:10px;border-bottom:1px solid #dbc2b4;color:#2c393f;font-family:Georgia,serif;font-weight:500">Materiais de apoio para aprofundamento</h2>${materials.map(item => `<div style="padding:14px 0;border-top:1px solid #e0e5e7"><p style="margin:0 0 6px;color:#3e474b;font-weight:700">${escapeHtml(materialTitles[item.category] ?? item.category)}</p>${item.notes ? `<p style="margin:0 0 8px;color:#1a2124;white-space:pre-wrap">${escapeHtml(item.notes)}</p>` : ""}${item.fileName && item.fileUrl ? `<p style="margin:0"><a style="color:#8a5732" href="${escapeHtml(item.fileUrl)}">${escapeHtml(item.fileName)}</a></p>` : ""}</div>`).join("")}</section>`;
  const html = `<main style="max-width:760px;margin:0 auto;padding:32px 24px;background:#f7f9fa;font-family:Arial,sans-serif;line-height:1.55">${header}${sections}${materialsHtml}</main>`;
  const plainText = DIAGNOSTIC_SECTIONS.map(section => `\n\n${section.title.toUpperCase()}\n${section.questions.map(question => `${question.label}\n${answerText(payload.answers[question.id])}`).join("\n\n")}`).join("");
  const materialsText = materials.length === 0 ? "" : `\n\nMATERIAIS DE APOIO PARA APROFUNDAMENTO\n${materials.map(item => `${materialTitles[item.category] ?? item.category}\n${item.notes ?? ""}${item.fileName ? `\nArquivo: ${item.fileName}${item.fileUrl ? ` (${item.fileUrl})` : ""}` : ""}`).join("\n\n")}`;
  return { html, plainText: `DIAGNÓSTICO 360° — HIGH LINE SCHOOL\nEnvio #${payload.submissionId}\nRespondente: ${payload.respondent.name}\nCargo: ${payload.respondent.role || "Não informado"}\nE-mail: ${payload.respondent.email}\nTelefone: ${payload.respondent.phone || "Não informado"}${plainText}${materialsText}` };
}

export async function sendDiagnosticEmail(payload: DiagnosticEmailPayload) {
  if (!ENV.smtpHost || !ENV.smtpUser || !ENV.smtpPassword) {
    return { sent: false, reason: "Integração de e-mail ainda não configurada." };
  }

  const message = formatDiagnosticEmail(payload);
  const transport = nodemailer.createTransport({
    host: ENV.smtpHost,
    port: ENV.smtpPort,
    secure: ENV.smtpPort === 465,
    auth: { user: ENV.smtpUser, pass: ENV.smtpPassword },
    // A hospedagem apresenta certificado autoassinado. A conexão continua cifrada por TLS,
    // com a exceção de validação aprovada pela agência para este servidor específico.
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: false },
  });
  await transport.sendMail({
    from: `Diagnósticos VirtruvIA <${ENV.smtpUser}>`,
    to: DESTINATION,
    replyTo: payload.respondent.email,
    subject: `Diagnóstico 360° High Line | ${payload.respondent.name}`,
    html: message.html,
    text: message.plainText,
    headers: { "X-Virtruvia-Submission": String(payload.submissionId) },
  });
  return { sent: true };
}
