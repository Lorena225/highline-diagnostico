import { desc, like } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { diagnosticSubmissions } from "../drizzle/schema";
import { getDb } from "./db";
import { storageGetSignedUrl } from "./storage";

const enabled = process.env.RUN_LIVE_DIAGNOSTIC_EMAIL_TEST === "1";

describe("link seguro do comprovante", () => {
  it.skipIf(!enabled)("abre o PDF armazenado da última simulação ponta a ponta", async () => {
    const db = await getDb();
    expect(db).not.toBeNull();
    const rows = await db!.select().from(diagnosticSubmissions).where(like(diagnosticSubmissions.respondentName, "SIMULAÇÃO E2E%")).orderBy(desc(diagnosticSubmissions.id)).limit(1);
    expect(rows[0]?.receiptStorageKey).toBeTruthy();

    const url = await storageGetSignedUrl(rows[0]!.receiptStorageKey!);
    const response = await fetch(url);
    const bytes = new Uint8Array(await response.arrayBuffer());

    expect(response.ok).toBe(true);
    expect(response.headers.get("content-type")).toContain("application/pdf");
    expect(Buffer.from(bytes.subarray(0, 4)).toString()).toBe("%PDF");
  }, 30_000);
});
