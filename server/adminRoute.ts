import type { Express, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { ENV } from "./_core/env";
import {
  getDiagnosticSubmissionById,
  listDiagnosticSubmissions,
  listOpenDiagnosticDrafts,
} from "./db";
import { storageGetSignedUrl } from "./storage";

const COOKIE = "virtruvia_consulta";

function keysMatch(provided: string, expected: string) {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function isAuthorized(req: Request) {
  const expected = ENV.adminAccessKey;
  if (!expected) return false;
  const fromQuery = typeof req.query.key === "string" ? req.query.key : "";
  const fromCookie = typeof req.headers.cookie === "string"
    ? (req.headers.cookie.split(";").map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) ?? "")
    : "";
  return (fromQuery && keysMatch(fromQuery, expected)) || (fromCookie && keysMatch(decodeURIComponent(fromCookie), expected));
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] as string));
}

function formatDate(value: unknown) {
  if (!value) return "—";
  return new Date(String(value)).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function statusBadge(status: string) {
  const map: Record<string, [string, string]> = {
    sent: ["Entregue", "ok"],
    pending: ["Pendente", "warn"],
    failed: ["Falhou", "err"],
  };
  const [label, tone] = map[status] ?? [status, "warn"];
  return `<span class="badge badge--${tone}">${escapeHtml(label)}</span>`;
}

function page(title: string, body: string) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(title)} · VirtruvIA</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
<style>
  :root { --ink:#1a2124; --slate:#2c393f; --muted:#5f727b; --bronze:#8a5732; --mist:#eff4f5; --line:#e0e5e7; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--mist); color:var(--ink); font-family:"Instrument Sans",system-ui,sans-serif; font-size:15px; }
  header { background:var(--slate); color:#fff; padding:22px 28px; }
  header p { margin:0; font-size:12px; letter-spacing:.16em; text-transform:uppercase; color:#b9c6cc; }
  header h1 { margin:6px 0 0; font-family:"Cormorant Garamond",serif; font-weight:500; font-size:27px; }
  main { max-width:1180px; margin:0 auto; padding:28px; }
  .cards { display:flex; gap:14px; flex-wrap:wrap; margin-bottom:22px; }
  .card { background:#fff; border:1px solid var(--line); border-radius:4px; padding:16px 20px; min-width:170px; }
  .card b { display:block; font-family:"Cormorant Garamond",serif; font-size:30px; font-weight:500; line-height:1.1; }
  .card span { font-size:12px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); }
  .actions { display:flex; gap:12px; margin-bottom:18px; flex-wrap:wrap; }
  a.button { display:inline-block; background:var(--slate); color:#fff; text-decoration:none; padding:9px 16px; border-radius:3px; font-size:13px; }
  a.button--ghost { background:transparent; color:var(--slate); border:1px solid var(--line); }
  table { width:100%; border-collapse:collapse; background:#fff; border:1px solid var(--line); }
  th, td { text-align:left; padding:11px 14px; border-bottom:1px solid var(--line); font-size:14px; vertical-align:top; }
  th { font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); background:#f7fafb; }
  tr:last-child td { border-bottom:none; }
  .badge { font-size:11px; padding:3px 9px; border-radius:99px; letter-spacing:.06em; text-transform:uppercase; }
  .badge--ok { background:#e6f2ea; color:#1f6b3f; } .badge--warn { background:#fdf1de; color:#8a5732; } .badge--err { background:#fbe7e7; color:#96201f; }
  .empty { background:#fff; border:1px solid var(--line); padding:34px; text-align:center; color:var(--muted); }
  .qa { background:#fff; border:1px solid var(--line); padding:18px 22px; margin-bottom:10px; }
  .qa h3 { margin:0 0 6px; font-size:14px; font-weight:600; }
  .qa p { margin:0; color:#3e4c52; white-space:pre-wrap; line-height:1.6; }
  form.login { background:#fff; border:1px solid var(--line); padding:30px; max-width:400px; margin:60px auto; }
  form.login input { width:100%; padding:10px 12px; border:1px solid var(--line); border-radius:3px; font-size:15px; margin:12px 0 16px; }
  form.login button { width:100%; background:var(--slate); color:#fff; border:0; padding:11px; border-radius:3px; font-size:14px; cursor:pointer; }
  footer { text-align:center; color:var(--muted); font-size:12px; padding:26px; }
</style></head><body>${body}<footer>VirtruvIA · Diagnóstico 360º High Line School</footer></body></html>`;
}

export function registerAdminRoutes(app: Express) {
  const guard = (req: Request, res: Response) => {
    if (isAuthorized(req)) return true;
    res.status(401).send(page("Consulta", `<form class="login" method="get" action="/consulta">
      <p style="margin:0;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#5f727b">Acesso restrito</p>
      <h1 style="font-family:'Cormorant Garamond',serif;font-weight:500;margin:8px 0 0">Consulta de respostas</h1>
      <input type="password" name="key" placeholder="Chave de acesso" autofocus/>
      <button type="submit">Entrar</button></form>`));
    return false;
  };

  app.get("/consulta", async (req, res) => {
    if (!guard(req, res)) return;
    if (typeof req.query.key === "string") {
      res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(req.query.key)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=43200`);
    }
    try {
      const [submissions, drafts] = await Promise.all([listDiagnosticSubmissions(), listOpenDiagnosticDrafts()]);
      const delivered = submissions.filter(item => item.email_status === "sent").length;
      const stuck = submissions.length - delivered;

      const rows = submissions.map(item => `<tr>
        <td>#${escapeHtml(item.id)}</td>
        <td><b>${escapeHtml(item.respondent_name)}</b><br/><span style="color:#5f727b;font-size:13px">${escapeHtml(item.respondent_email)}</span></td>
        <td>${escapeHtml(item.respondent_role ?? "—")}</td>
        <td>${formatDate(item.submitted_at)}</td>
        <td>${statusBadge(String(item.email_status))}${item.email_error ? `<br/><span style="color:#96201f;font-size:12px">${escapeHtml(item.email_error)}</span>` : ""}</td>
        <td><a href="/consulta/${escapeHtml(item.id)}">Ver respostas</a>${item.receipt_access_token ? ` · <a href="/api/receipt/${escapeHtml(item.receipt_access_token)}">PDF</a>` : ""}</td>
      </tr>`).join("");

      const draftRows = drafts.map(item => `<tr>
        <td><b>${escapeHtml(item.respondent_name ?? "—")}</b><br/><span style="color:#5f727b;font-size:13px">${escapeHtml(item.respondent_email)}</span></td>
        <td>${escapeHtml(item.answered_count)} respostas</td>
        <td>Bloco ${escapeHtml(item.active_step)}</td>
        <td>${formatDate(item.updated_at)}</td>
      </tr>`).join("");

      res.send(page("Consulta", `<header><p>VirtruvIA · Painel interno</p><h1>Respostas do Diagnóstico 360º</h1></header>
      <main>
        <div class="cards">
          <div class="card"><b>${submissions.length}</b><span>Submissões</span></div>
          <div class="card"><b>${delivered}</b><span>E-mail entregue</span></div>
          <div class="card"><b>${stuck}</b><span>Sem confirmação</span></div>
          <div class="card"><b>${drafts.length}</b><span>Em preenchimento</span></div>
        </div>
        <div class="actions"><a class="button" href="/consulta/exportar.csv">Exportar CSV</a><a class="button button--ghost" href="/consulta">Atualizar</a></div>
        ${submissions.length === 0 ? `<div class="empty">Nenhuma submissão registrada até agora.</div>` : `<table><thead><tr><th>ID</th><th>Respondente</th><th>Cargo</th><th>Enviado em</th><th>Notificação</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table>`}
        ${drafts.length > 0 ? `<h2 style="font-family:'Cormorant Garamond',serif;font-weight:500;margin:34px 0 12px">Preenchimentos em andamento</h2>
        <p style="color:#5f727b;margin:0 0 12px;font-size:14px">Rascunhos salvos no servidor que ainda não foram enviados. Se alguém abandonar o formulário, as respostas continuam aqui.</p>
        <table><thead><tr><th>Respondente</th><th>Progresso</th><th>Parou em</th><th>Última atividade</th></tr></thead><tbody>${draftRows}</tbody></table>` : ""}
      </main>`));
    } catch (error) {
      console.error("[Consulta] Falha ao listar:", error);
      res.status(500).send(page("Consulta", `<header><h1>Consulta indisponível</h1></header><main><div class="empty">Não foi possível consultar o banco agora.<br/><small>${escapeHtml(error instanceof Error ? error.message : "erro desconhecido")}</small></div></main>`));
    }
  });

  app.get("/consulta/exportar.csv", async (req, res) => {
    if (!guard(req, res)) return;
    const submissions = await listDiagnosticSubmissions(1000);
    const header = ["id", "nome", "cargo", "email", "telefone", "status_email", "enviado_em"];
    const lines = submissions.map(item => [item.id, item.respondent_name, item.respondent_role ?? "", item.respondent_email, item.respondent_phone ?? "", item.email_status, item.submitted_at]
      .map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="diagnostico-highline-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(["\ufeff" + header.join(","), ...lines].join("\n"));
  });

  app.get("/consulta/:id", async (req, res) => {
    if (!guard(req, res)) return;
    const record = await getDiagnosticSubmissionById(Number(req.params.id));
    if (!record) {
      res.status(404).send(page("Consulta", `<header><h1>Submissão não encontrada</h1></header><main><div class="empty">Nenhum registro com este identificador.</div></main>`));
      return;
    }
    const answers = (record.submission.answers ?? {}) as Record<string, unknown>;
    const blocks = Object.entries(answers).map(([id, value]) => {
      const text = Array.isArray(value)
        ? value.join(", ")
        : value && typeof value === "object"
          ? Object.entries(value as Record<string, string>).map(([key, item]) => `${key}: ${item}`).join("\n")
          : String(value ?? "");
      return `<div class="qa"><h3>${escapeHtml(id)}</h3><p>${escapeHtml(text) || "—"}</p></div>`;
    }).join("");

    const materials = record.materials.map(item => `<div class="qa"><h3>${escapeHtml(item.category)}</h3><p>${escapeHtml(item.notes ?? "")}${item.file_name ? `<br/><b>Arquivo:</b> ${escapeHtml(item.file_name)}` : ""}</p></div>`).join("");

    res.send(page("Submissão", `<header><p>VirtruvIA · Submissão #${escapeHtml(record.submission.id)}</p>
      <h1>${escapeHtml(record.submission.respondent_name)}</h1></header>
      <main>
        <div class="cards">
          <div class="card"><span>E-mail</span><b style="font-size:16px">${escapeHtml(record.submission.respondent_email)}</b></div>
          <div class="card"><span>Enviado em</span><b style="font-size:16px">${formatDate(record.submission.submitted_at)}</b></div>
          <div class="card"><span>Notificação</span><b style="font-size:16px">${statusBadge(String(record.submission.email_status))}</b></div>
        </div>
        <div class="actions"><a class="button button--ghost" href="/consulta">← Voltar</a>${record.submission.receipt_access_token ? `<a class="button" href="/api/receipt/${escapeHtml(record.submission.receipt_access_token)}">Baixar comprovante</a>` : ""}</div>
        ${blocks}
        ${materials ? `<h2 style="font-family:'Cormorant Garamond',serif;font-weight:500;margin:30px 0 12px">Materiais de apoio</h2>${materials}` : ""}
      </main>`));
  });

  // Acesso direto a um arquivo de material, sempre por URL assinada temporária.
  app.get("/consulta/:id/material/:key(*)", async (req, res) => {
    if (!guard(req, res)) return;
    try {
      res.redirect(302, await storageGetSignedUrl(req.params.key));
    } catch {
      res.status(410).send("Arquivo indisponível.");
    }
  });
}
