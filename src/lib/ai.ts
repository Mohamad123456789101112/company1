import "server-only";
import type { AiProvider, AiVerdict } from "./ai-types";
import { normalizeDigits } from "./utils";

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  gemini: "gemini-2.0-flash",
  openai: "gpt-4o-mini",
};

const TIMEOUT_MS = 45_000;

function withTimeout(ms: number) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, clear: () => clearTimeout(t) };
}

async function callGemini(apiKey: string, model: string, text: string, image?: { base64: string; mime: string }, json = true): Promise<string> {
  const parts: Array<Record<string, unknown>> = [{ text }];
  if (image) parts.push({ inline_data: { mime_type: image.mime, data: image.base64 } });
  const t = withTimeout(TIMEOUT_MS);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0, ...(json ? { response_mime_type: "application/json" } : {}) },
      }),
      signal: t.signal,
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string }; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    if (!res.ok) throw new Error(data.error?.message ?? `Gemini HTTP ${res.status}`);
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  } finally {
    t.clear();
  }
}

async function callOpenAI(apiKey: string, model: string, text: string, image?: { base64: string; mime: string }, json = true): Promise<string> {
  const content: Array<Record<string, unknown>> = [{ type: "text", text }];
  if (image) content.push({ type: "image_url", image_url: { url: `data:${image.mime};base64,${image.base64}`, detail: "high" } });
  const t = withTimeout(TIMEOUT_MS);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [{ role: "user", content }],
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: t.signal,
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as { error?: { message?: string }; choices?: Array<{ message?: { content?: string } }> };
    if (!res.ok) throw new Error(data.error?.message ?? `OpenAI HTTP ${res.status}`);
    return data.choices?.[0]?.message?.content ?? "";
  } finally {
    t.clear();
  }
}

function extractJson(text: string): Record<string, unknown> | null {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

const digitsOnly = (s: string | null | undefined) => (s ? normalizeDigits(String(s)).replace(/\D/g, "") : "");
const alnum = (s: string | null | undefined) => (s ? normalizeDigits(String(s)).replace(/[^A-Za-z0-9]/g, "").toUpperCase() : "");

export async function pingAi(provider: AiProvider, apiKey: string, model: string): Promise<{ ok: boolean; message: string }> {
  try {
    const prompt = 'Reply with the JSON object {"ok":true} only.';
    const out = provider === "gemini" ? await callGemini(apiKey, model, prompt) : await callOpenAI(apiKey, model, prompt);
    const parsed = extractJson(out);
    return parsed ? { ok: true, message: `الاتصال ناجح – النموذج ${model} يعمل.` } : { ok: false, message: `رد غير متوقع من النموذج: ${out.slice(0, 120)}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "فشل الاتصال" };
  }
}

export async function analyzeReceipt(opts: {
  provider: AiProvider;
  apiKey: string;
  model: string;
  image: { base64: string; mime: string };
  expected: { amount: number; recipientNumber: string; reference?: string | null; senderPhone?: string | null };
  minConfidence: number;
}): Promise<AiVerdict> {
  const { provider, apiKey, model, image, expected } = opts;
  const prompt = `You are a payment-fraud analyst for an Egyptian e-learning platform. The student uploaded a screenshot that should be a successful Vodafone Cash (or InstaPay / bank wallet) money-transfer receipt.
Expected transfer details:
- amount: ${expected.amount} EGP
- recipient wallet number: ${expected.recipientNumber}
- transaction reference entered by the student: ${expected.reference ?? "(none)"}
- sender phone entered by the student: ${expected.senderPhone ?? "(none)"}

Analyze the image carefully (text may be Arabic or English; digits may be Arabic-Indic – convert them to Latin digits).
Return ONLY a JSON object with exactly these keys:
{"is_receipt": boolean, "amount": number|null, "currency": string|null, "recipient": string|null, "sender": string|null, "reference": string|null, "date": string|null, "status_text": string|null, "tampering_signs": string[], "confidence": number, "summary": string}
- confidence: 0-100 = how confident you are that this is a GENUINE, SUCCESSFUL transfer that matches the expected details.
- tampering_signs: list concrete issues (edited/misaligned text, inconsistent fonts or colors, blurred patches, cropped status, failed/pending status, chat screenshot instead of receipt, mismatched amount/recipient, screenshot of another screenshot, etc.). Empty array if none.
- summary: 1–2 short sentences in Arabic explaining the verdict.
If the image is not a receipt or unreadable: is_receipt=false and confidence <= 10.`;

  const base: AiVerdict = {
    provider,
    model,
    checkedAt: new Date().toISOString(),
    isReceipt: false,
    confidence: 0,
    score: 0,
    valid: false,
    amount: null,
    recipient: null,
    sender: null,
    reference: null,
    date: null,
    statusText: null,
    tampering: [],
    summary: "",
    matches: { amount: null, recipient: null, reference: null },
  };

  let raw = "";
  try {
    raw = provider === "gemini" ? await callGemini(apiKey, model, prompt, image) : await callOpenAI(apiKey, model, prompt, image);
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : "فشل الاتصال بالنموذج", summary: "تعذر تحليل الإيصال – راجع إعدادات الذكاء الاصطناعي." };
  }
  const j = extractJson(raw);
  if (!j) return { ...base, error: "رد غير صالح من النموذج", summary: raw.slice(0, 200) };

  const num = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(normalizeDigits(v).replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) && v.trim() !== "" ? n : null;
    }
    return null;
  };
  const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : v != null && typeof v !== "object" ? String(v).slice(0, 200) : null);

  const isReceipt = Boolean(j.is_receipt);
  const confidence = Math.max(0, Math.min(100, Math.round(num(j.confidence) ?? 0)));
  const amount = num(j.amount);
  const recipient = str(j.recipient);
  const sender = str(j.sender);
  const reference = str(j.reference);
  const tampering = Array.isArray(j.tampering_signs) ? (j.tampering_signs as unknown[]).map((x) => String(x).slice(0, 160)).slice(0, 8) : [];

  // Cross-checks against what we expect (server-side truth)
  const amountMatch = amount == null ? null : Math.abs(amount - expected.amount) < 1;
  const expRecip = digitsOnly(expected.recipientNumber);
  const gotRecip = digitsOnly(recipient);
  const recipientMatch = !gotRecip || gotRecip.length < 6 ? null : expRecip.slice(-9) === gotRecip.slice(-9) || gotRecip.includes(expRecip.slice(-9));
  const expRef = alnum(expected.reference);
  const gotRef = alnum(reference);
  const referenceMatch = !gotRef || !expRef || expRef.length < 4 ? null : gotRef === expRef || gotRef.includes(expRef) || expRef.includes(gotRef);

  let score = isReceipt ? confidence : Math.min(confidence, 5);
  if (amountMatch === false) score = Math.min(score, 25);
  if (recipientMatch === false) score = Math.min(score, 20);
  if (referenceMatch === false) score = Math.min(score, 35);
  if (tampering.length > 0) score = Math.min(score, 45);
  const statusText = str(j.status_text);
  if (statusText && /fail|pending|فشل|قيد|لم تتم|مرفوض/i.test(statusText)) score = Math.min(score, 15);

  return {
    ...base,
    isReceipt,
    confidence,
    score,
    valid: score >= opts.minConfidence,
    amount,
    recipient,
    sender,
    reference,
    date: str(j.date),
    statusText,
    tampering,
    summary: str(j.summary) ?? "",
    matches: { amount: amountMatch, recipient: recipientMatch, reference: referenceMatch },
  };
}
