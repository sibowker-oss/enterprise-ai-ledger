/**
 * The models surfaced in the picker. Prices, providers and the efficiency-floor
 * economics all come from the price sheet (lib/simulator/data.ts) — this module
 * only carries PRESENTATION metadata (display label, provider display name) and
 * the curated allow-list. No prices are hard-coded here.
 */
import type { Model } from "./types";
import { modelPrice } from "./data";

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
 * in the UI. (The tool can only surface models that carry a verified list price
 * in benchmark_price_sheet.json — no invented prices — so the roster grows by
 * adding to that file, e.g. more GPT variants or other open-weight models.)
 * The historical gpt_5_line_pre_apr2026 is intentionally omitted — it's a past
 * pricing point (the April 2026 doubling proof), not a model you'd pick today.
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
  // xAI
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
  // Chinese open-weight (draft prices via OpenRouter, pending sign-off)
  "glm_4_6",
  "kimi_k2_0905",
  "minimax_m2",
] as const;

/**
 * The efficiency-floor model: the cheapest surfaced model, used for the
 * "cheapest model, today" band segment and the efficiency-offset counter-force.
 * DeepSeek V4 Flash reproduces the validated worked-example floor ($282 on the
 * code-assistant inference layer). It is a choice of WHICH model is the floor;
 * its price still comes from the sheet.
 */
export const FLOOR_MODEL_KEY = "deepseek_v4_flash";

export function providerLabel(provider: string): string {
  return PROVIDER_LABELS[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
}

export function model(key: string): Model {
  const price = modelPrice(key);
  return {
    ...price,
    label: MODEL_LABELS[key] ?? key,
    providerLabel: providerLabel(price.provider),
  };
}

export const MODELS: Model[] = MODEL_KEYS.map(model);
