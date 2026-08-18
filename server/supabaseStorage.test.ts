import { describe, expect, it } from "vitest";
import { getSupabaseAdmin } from "./supabase";

describe("armazenamento Supabase", () => {
  it("envia, assina e remove um arquivo de validação no bucket privado", async () => {
    const supabase = getSupabaseAdmin();
    expect(supabase).not.toBeNull();
    const key = `validation/${crypto.randomUUID()}.txt`;

    const { error: uploadError } = await supabase!.storage.from("diagnostic-assets").upload(key, "validacao", { contentType: "text/plain", upsert: false });
    expect(uploadError).toBeNull();

    const { data, error: signError } = await supabase!.storage.from("diagnostic-assets").createSignedUrl(key, 60);
    expect(signError).toBeNull();
    expect(data?.signedUrl).toContain("/storage/v1/object/sign/");

    const { error: removeError } = await supabase!.storage.from("diagnostic-assets").remove([key]);
    expect(removeError).toBeNull();
  });
});
