import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function readEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const raw = fs.readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    env[key] = value;
  }
  return env;
}

function maskSecret(secret) {
  if (!secret) return "(empty)";
  if (secret.length <= 8) return "*".repeat(secret.length);
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}

async function runCheck(label, task) {
  const { error } = await task();
  if (error) {
    return { ok: false, label, message: error.message };
  }
  return { ok: true, label };
}

async function main() {
  const envPath = path.resolve(process.cwd(), ".env");
  const fileEnv = readEnvFile(envPath);
  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL || fileEnv.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    fileEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase config.");
    console.error("Required: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }

  console.log(`URL: ${supabaseUrl}`);
  console.log(`ANON KEY: ${maskSecret(supabaseAnonKey)}`);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch },
  });

  const checks = [];
  checks.push(await runCheck("users table", () => supabase.from("users").select("id").limit(1)));
  checks.push(
    await runCheck("properties columns (rent_day, dues_amount, dues_day)", () =>
      supabase.from("properties").select("id,rent_day,dues_amount,dues_day").limit(1)
    )
  );
  checks.push(
    await runCheck("receipts columns (document_url, status)", () =>
      supabase.from("receipts").select("id,document_url,status").limit(1)
    )
  );
  checks.push(
    await runCheck("maintenance columns (photo_urls, status)", () =>
      supabase.from("maintenance_requests").select("id,photo_urls,status").limit(1)
    )
  );
  checks.push(await runCheck("calendar_events table", () => supabase.from("calendar_events").select("id").limit(1)));
  checks.push(await runCheck("property_documents table", () => supabase.from("property_documents").select("id").limit(1)));
  checks.push(await runCheck("NON_EXISTENT_TABLE", () => supabase.from("non_existent_table").select("id").limit(1)));

  let hasError = false;
  for (const item of checks) {
    if (item.ok) {
      console.log(`OK: ${item.label}`);
    } else {
      hasError = true;
      console.error(`FAIL: ${item.label} -> ${item.message}`);
    }
  }

  if (hasError) {
    process.exit(2);
  }

  console.log("Connection and schema checks passed.");
}

main().catch((err) => {
  console.error(`Unexpected error: ${err?.message || String(err)}`);
  process.exit(3);
});
