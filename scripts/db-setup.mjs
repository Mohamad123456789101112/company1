#!/usr/bin/env node
/**
 * إعداد قاعدة البيانات من سطر الأوامر — خارج لوحة الإدارة تمامًا.
 *
 *   npm run db:setup     ← ينفّذ supabase/schema.sql على DATABASE_URL
 *   npm run db:check     ← يتأكد أن الاتصال يعمل
 *
 * لماذا خارج اللوحة؟ حتى لا يظهر ملف SQL أو رابط الاتصال داخل الويب،
 * و حتى لا يستطيع أي حساب إداري تنفيذ أوامر على قاعدة البيانات من المتصفح.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { config as loadEnv } from "dotenv";
import pg from "pg";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("❌ DATABASE_URL غير موجود. ضعه في .env.local (انظر .env.example) أو في متغيرات Vercel.");
  process.exit(1);
}

const isLocal = url.includes("127.0.0.1") || url.includes("localhost");
const ssl = process.env.DATABASE_SSL === "false" ? false : process.env.DATABASE_SSL === "true" || !isLocal ? { rejectUnauthorized: false } : false;

const client = new pg.Client({ connectionString: url, ssl });

const mode = process.argv[2] === "check" ? "check" : "setup";

try {
  await client.connect();
  const { rows } = await client.query("select current_database() as db, version() as v");
  console.log(`✅ الاتصال ناجح بقاعدة البيانات: ${rows[0].db}`);
  if (mode === "check") {
    console.log(`   ${String(rows[0].v).split(" ").slice(0, 2).join(" ")}`);
  } else {
    let sql = await readFile(path.join(process.cwd(), "supabase", "schema.sql"), "utf8");
    try {
      await client.query(sql);
    } catch (e) {
      // Some local Postgres builds don't ship the pgcrypto extension. Modern
      // PostgreSQL (13+) has gen_random_uuid() built in, so the extension line
      // is optional outside Supabase.
      if (e instanceof Error && /pgcrypto/i.test(e.message)) {
        console.log("ℹ️ إضافة pgcrypto غير متاحة محليًا – سيتم استخدام gen_random_uuid() المدمج.");
        sql = sql.replace(/create\s+extension\s+if\s+not\s+exists\s+"?pgcrypto"?\s*;/gi, "");
        await client.query(sql);
      } else {
        throw e;
      }
    }
    console.log("✅ تم تنفيذ supabase/schema.sql — كل الجداول والإعدادات وحساب المدير جاهزة.");
    console.log("   بيانات الدخول الافتراضية للمدير موضّحة في docs/SETUP.md — غيّرها فور أول دخول.");
  }
} catch (e) {
  console.error("❌ فشل الاتصال/التنفيذ:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
