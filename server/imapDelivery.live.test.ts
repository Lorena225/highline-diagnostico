import tls from "node:tls";
import { describe, expect, it } from "vitest";

const enabled = process.env.RUN_LIVE_DIAGNOSTIC_EMAIL_TEST === "1";

function escapeImap(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function createImapSession() {
  const host = process.env.SMTP_HOST!;
  const user = process.env.SMTP_USER!;
  const password = process.env.SMTP_PASSWORD!;
  const socket = tls.connect({ host, port: 993, servername: host, rejectUnauthorized: false });

  let buffer = "";
  socket.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf8");
  });
  const readUntil = (matcher: (value: string) => boolean) => new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Tempo esgotado ao aguardar resposta IMAP."));
    }, 10_000);
    const onData = () => {
      if (!matcher(buffer)) return;
      cleanup();
      resolve(buffer);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      clearTimeout(timeout);
      socket.off("data", onData);
      socket.off("error", onError);
    };
    socket.on("data", onData);
    socket.on("error", onError);
    onData();
  });

  const command = async (tag: string, value: string) => {
    const responsePromise = readUntil(response => new RegExp(`\\r?\\n${tag} (OK|NO|BAD)`, "i").test(response));
    socket.write(`${tag} ${value}\r\n`);
    const response = await responsePromise;
    if (!new RegExp(`\\r?\\n${tag} OK`, "i").test(response)) throw new Error(`IMAP respondeu: ${response}`);
    return response;
  };

  return { socket, user, password, readUntil, command };
}

describe("entrega na caixa de destino", () => {
  it.skipIf(!enabled)("localiza no INBOX a confirmação do diagnóstico enviada ao respondente", async () => {
    const session = createImapSession();
    try {
      const greeting = await session.readUntil(response => /^\* OK/m.test(response));
      expect(greeting).toMatch(/^\* OK/m);
      await session.command("a1", `LOGIN "${escapeImap(session.user)}" "${escapeImap(session.password)}"`);
      await session.command("a2", "SELECT INBOX");
      const search = await session.command("a3", 'SEARCH SUBJECT "Confirmação de envio"');
      expect(search).toMatch(/\* SEARCH\s+\d+/);
      await session.command("a4", "LOGOUT");
    } finally {
      session.socket.destroy();
    }
  }, 30_000);
});
