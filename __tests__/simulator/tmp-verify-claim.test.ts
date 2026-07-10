import { describe, expect, it } from "vitest";
import { defaultConfig, defaultState, parseState, serializeState } from "@/lib/simulator/urlState";
import { deriveCase } from "@/lib/simulator/derive";
import { ARCHETYPES } from "@/lib/simulator/archetypes";

describe("verify claim: phantom verdict on shared-link open", () => {
  it("prints default verdict klass and per-archetype default verdicts", () => {
    const def = defaultState();
    console.log("DEFAULT archetype:", def.current.archetypeKey);
    console.log("DEFAULT verdict klass:", deriveCase(def.current).verdict.klass);

    for (const a of ARCHETYPES) {
      const d = deriveCase(defaultConfig(a.key));
      console.log(`archetype=${a.key} verdict=${d.verdict.klass}`);
    }

    // Round-trip a non-default use case through the query string, as a shared
    // link would carry it, and derive the verdict the visitor actually lands on.
    const other = ARCHETYPES.find((x) => x.key !== "code_assistant")!;
    const alt = defaultState();
    alt.current = defaultConfig(other.key);
    const qs = serializeState(alt);
    const parsed = parseState("?" + qs);
    console.log(
      "shared-link use case:", parsed.current.archetypeKey,
      "verdict:", deriveCase(parsed.current).verdict.klass,
    );
    expect(parsed.current.archetypeKey).toBe(other.key);
  });
});
