import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";
import { getSupabaseAdmin } from "./supabase";

const publishableKey = "sb_publishable_dixII5eZiRit29abJ8HNaw_T3_97Igf";

describe("privacidade Supabase", () => {
  it("rejeita acesso público às submissões e ao bucket privado", async () => {
    const publicClient = createClient(ENV.supabaseUrl, publishableKey, { auth: { persistSession: false } });

    const { error: tableError } = await publicClient.from("diagnostic_submissions").select("id").limit(1);
    expect(tableError).not.toBeNull();

    const admin = getSupabaseAdmin();
    expect(admin).not.toBeNull();
    const key = `privacy/${crypto.randomUUID()}.txt`;
    const { error: uploadError } = await admin!.storage.from("diagnostic-assets").upload(key, "privado", { contentType: "text/plain" });
    expect(uploadError).toBeNull();

    const { error: downloadError } = await publicClient.storage.from("diagnostic-assets").download(key);
    expect(downloadError).not.toBeNull();

    const { error: removeError } = await admin!.storage.from("diagnostic-assets").remove([key]);
    expect(removeError).toBeNull();
  });
});
