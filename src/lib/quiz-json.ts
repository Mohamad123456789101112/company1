/**
 * Pure parser for AI-generated quiz JSON (no DB / no server-only imports so it
 * can be unit-tested). Used by importQuizJsonAction.
 */

export type RawQuestion = Record<string, unknown>;

export function pickField(source: RawQuestion, keys: string[]): unknown {
  for (const k of keys) {
    const v = source[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

const LETTER_MAP: Record<string, number> = {
  a: 0, b: 1, c: 2, d: 3, e: 4, f: 5,
  "أ": 0, "ا": 0, "ب": 1, "ج": 2, "د": 3, "هـ": 4, "ه": 4, "و": 5,
};

/** Accepts: index (0-5), letter (a/b/أ/ب...), or the exact option text. */
function normalizeCorrect(raw: unknown, options: string[]): number | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "number") return Number.isInteger(raw) && raw >= 0 && raw < options.length ? raw : null;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  const asNum = Number(t.replace(/[^\d]/g, ""));
  if (/^\d+$/.test(t) && asNum >= 1 && asNum <= options.length) return asNum - 1; // human 1-based
  const letter = t.toLowerCase().replace(/^الاختيار\s*/, "");
  if (letter in LETTER_MAP && LETTER_MAP[letter] < options.length) return LETTER_MAP[letter];
  const exact = options.findIndex((o) => o.trim() === t);
  return exact >= 0 ? exact : null;
}

export function extractQuestions(root: unknown): { questions: Array<{ text: string; options: string[]; correctIndex: number; explanation: string | null; points: number }>; errors: string[] } {
  const errors: string[] = [];
  const candidate = Array.isArray(root)
    ? root
    : (root as RawQuestion)?.questions ?? (root as RawQuestion)?.items ?? (root as RawQuestion)?.qs ?? [];
  if (!Array.isArray(candidate)) return { questions: [], errors: ["لم أجد مفتاح «questions» في الـ JSON"] };
  const items: unknown[] = candidate;
  const out: Array<{ text: string; options: string[]; correctIndex: number; explanation: string | null; points: number }> = [];
  items.forEach((it, i) => {
    if (typeof it !== "object" || it === null) { errors.push(`سؤال ${i + 1}: صيغة غير صحيحة`); return; }
    const q = it as RawQuestion;
    const text = pickField(q, ["question", "text", "question_text", "prompt", "statement", "title", "سؤال", "نص السؤال"]);
    let options = pickField(q, ["options", "choices", "answers", "options_ar", "اختيارات", "الاختيارات", "choices_ar"]);
    if (!Array.isArray(options)) {
      options = [1, 2, 3, 4, 5, 6].map((n) => (pickField(q, [`option_${n}`, `choice_${n}`, `اختيار_${n}`]) as string | undefined)).filter(Boolean);
    }
    const cleanOptions = (options as unknown[]).map((o) => String(o).trim()).filter(Boolean).slice(0, 6);
    const correctIndex = normalizeCorrect(pickField(q, ["correct", "correctIndex", "correct_index", "answer", "answerIndex", "answer_index", "correct_answer", "correct_option", "الإجابة", "answer_letter"]), cleanOptions);
    const explanation = pickField(q, ["explanation", "explain", "شرح", "التفسير"]);
    const pointsRaw = Number(pickField(q, ["points", "score", "degree", "points_value", "الدرجة"]) ?? 1);
    const points = Number.isFinite(pointsRaw) ? Math.max(1, Math.min(20, Math.round(pointsRaw))) : 1;

    if (typeof text !== "string" || text.trim().length < 2) { errors.push(`سؤال ${i + 1}: النص مفقود`); return; }
    if (cleanOptions.length < 2) { errors.push(`سؤال ${i + 1}: لازم على الأقل اختيارين`); return; }
    if (correctIndex === null) { errors.push(`سؤال ${i + 1}: الإجابة الصحيحة غير واضحة`); return; }
    out.push({ text: String(text).trim().slice(0, 2000), options: cleanOptions, correctIndex, explanation: typeof explanation === "string" && explanation.trim() ? explanation.trim().slice(0, 1500) : null, points });
  });
  return { questions: out, errors };
}

