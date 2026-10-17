/** Shared (client-safe) types for the AI receipt verification feature. */
export type AiProvider = "gemini" | "openai";

export type AiVerdict = {
  provider: AiProvider;
  model: string;
  checkedAt: string;
  isReceipt: boolean;
  /** Raw model confidence 0..100 */
  confidence: number;
  /** Adjusted score after cross-checking expected values 0..100 */
  score: number;
  valid: boolean;
  amount: number | null;
  recipient: string | null;
  sender: string | null;
  reference: string | null;
  date: string | null;
  statusText: string | null;
  tampering: string[];
  summary: string;
  matches: { amount: boolean | null; recipient: boolean | null; reference: boolean | null };
  error?: string;
};
