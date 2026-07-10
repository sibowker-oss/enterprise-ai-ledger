/**
 * The models surfaced in the picker. Prices, providers, verification status
 * and the efficiency-floor economics all come from the price sheet registry
 * (lib/simulator/data.ts) — this module only carries PRESENTATION metadata
 * (display label, provider display name) and the curated allow-list. No
 * prices are hard-coded here.
 *
 * VERIFICATION GATE (CTO update v2, 0.1): models whose price is not verified
 * against the vendor's own page stay selectable — labelled "price unverified"
 * — but are EXCLUDED from floor/routing/default calculations. The floor is no
 * longer a fixed choice: it is computed over the verified models the user is
 * willing to consider (A4), in lib/simulator/engine.ts.
 */
import type { Model } from "./types";
import { isModelVerified, modelPrice } from "./data";

/** Display labels for the surfaced models. Keys match benchmark_price_sheet.json. */
const MODEL_LABELS: Record<string, string> = {
  claude_opus_4_8: "Claude Opus 4.8",
  claude_sonnet_4_6: "Claude Sonnet 4.6",
  claude_haiku_4_5: "Claude Haiku 4.5",
  gpt_5_5: "GPT-5.5",
  gpt_5_5_pro: "GPT-5.5 Pro",
  gemini_2_5_pro: "Gemini 2.5 Pro",
  gemini_2_5_flash: "Gemini 2.5 Flash",
  grok_3: "Grok 3",
  grok_3_mini: "Grok 3 Mini",
  deepseek_v4_pro: "DeepSeek V4 Pro",
  deepseek_v4_flash: "DeepSeek V4 Flash",
  mistral_large_3: "Mistral Large 3",
  mistral_small_3_2: "Mistral Small 3.2",
  lfm2_24b_together: "LFM2 24B (open)",
  glm_4_6: "GLM-4.6",
  kimi_k2_0905: "Kimi K2",
  minimax_m2: "MiniMax M2",
};

/** Provider display names. */
const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  deepseek: "DeepSeek",
  xai: "xAI",
  mistral: "Mistral",
  together: "Together",
  zhipu: "Zhipu (Z.ai)",
  moonshot: "Moonshot",
  minimax: "MiniMax",
};

/**
 * The picker set — every current model in the price sheet, grouped by provider
 * in the UI. The historical gpt_5_line_pre_apr2026 is intentionally omitted —
 * it's a past pricing point (the April 2026 doubling proof), not a model you'd
 * pick today.
 */
export const MODEL_KEYS = [
  // Anthropic
  "claude_opus_4_8",
  "claude_sonnet_4_6",
  "claude_haiku_4_5",
  // OpenAI
  "gpt_5_5",
  "gpt_5_5_pro",
  // Google
  "gemini_2_5_pro",
  "gemini_2_5_flash",
  // xAI (prices unverified as of 2026-07-11 — selectable, excluded from floor)
  "grok_3",
  "grok_3_mini",
  // DeepSeek (open)
  "deepseek_v4_pro",
  "deepseek_v4_flash",
  // Mistral (open)
  "mistral_large_3",
  "mistral_small_3_2",
  // Together (open)
  "lfm2_24b_together",
  // Chinese open-weight (vendor-verified 2026-07-11)
  "glm_4_6",
  "kimi_k2_0905",
  "minimax_m2",
] as const;

export function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
}

export function model(key: string): Model {
  const price = modelPrice(key);
  return {
    ...price,
    label: MODEL_LABELS[key] ?? key,
    providerLabel: providerLabel(price.provider),
    verified: isModelVerified(key),
  };
}

export const MODELS: Model[] = MODEL_KEYS.map(model);

/** Distinct providers in the picker, in first-seen order (the A4 exclusion list). */
export const PICKER_PROVIDERS: string[] = [...new Set(MODELS.map((m) => m.provider))];

/** Floor/routing candidates: price verified against the vendor's own page. */
export const VERIFIED_MODEL_KEYS: string[] = MODEL_KEYS.filter((k) => isModelVerified(k));
