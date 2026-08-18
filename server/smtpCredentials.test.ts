import tls from "node:tls";
import { describe, expect, it } from "vitest";

function smtpCommand(socket: tls.TLSSocket, command: string, expectedCode: number) {
  return new Promise<void>((resolve, reject) => {
    let response = "";
    const onData = (chunk: Buffer) => {
      response += chunk.toString("utf8");
      const lines = response.trim().split(/\r?\n/);
      const lastLine = lines.at(-1) ?? "";
      if (!new RegExp(`^${expectedCode} `).test(lastLine) && !/^\d{3} /.test(lastLine)) return;
      socket.off("data", onData);
      if (new RegExp(`^${expectedCode} `).test(lastLine)) resolve();
      else reject(new Error(`SMTP respondeu: ${lastLine}`));
    };
    socket.on("data", onData);
    socket.write(`${command}\r\n`);
  });
}

describe("SMTP seguro", () => {
  it.skipIf(!process.env.SMTP_PASSWORD)("autentica a conta configurada sem enviar mensagens", async () => {
    const host = process.env.SMTP_HOST!;
    const port = Number(process.env.SMTP_PORT!);
    const user = process.env.SMTP_USER!;
    const password = process.env.SMTP_PASSWORD!;

    await new Promise<void>((resolve, reject) => {
      const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: false });
      let greeting = "";
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error("Tempo esgotado ao conectar ao servidor SMTP."));
      }, 12_000);

      socket.once("error", error => {
        clearTimeout(timeout);
        reject(error);
      });
      socket.on("data", async chunk => {
        greeting += chunk.toString("utf8");
        if (!/^220 /m.test(greeting)) return;
        socket.removeAllListeners("data");
        try {
          await smtpCommand(socket, "EHLO highline-diagnostico", 250);
          const token = Buffer.from(`\u0000${user}\u0000${password}`).toString("base64");
          await smtpCommand(socket, `AUTH PLAIN ${token}`, 235);
          await smtpCommand(socket, "QUIT", 221);
          clearTimeout(timeout);
          resolve();
        } catch (error) {
          clearTimeout(timeout);
          socket.destroy();
          reject(error);
        }
      });
    });

    expect(process.env.SMTP_USER).toBe("diagnostico@virtruvia.com.br");
  }, 20_000);
});
