import { describe, expect, it } from "vitest";
import { getSupabaseAdmin } from "./supabase";

describe("credenciais Supabase", () => {
  it("autentica a chave de serviço com uma consulta leve à tabela privada", async () => {
    const supabase = getSupabaseAdmin();
    expect(supabase).not.toBeNull();
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith("sb_secret_")).toBe(true);

    const { error } = await supabase!.from("diagnostic_submissions").select("id").limit(1);

    expect(error, `Supabase respondeu com código ${error?.code ?? "sem código"}: ${error?.message ?? "sem mensagem"}`).toBeNull();
  });
});
