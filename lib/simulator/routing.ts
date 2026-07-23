/**
 * Routing engine for the triage qualifier (Stage 3/4).
 * Maps the five qualifier answers to one of three routes: Gate, Diagnostic, or Not-yet.
 * Implements the tie-break logic from the spec.
 */
import type { RoutingQualifier, RoutingOutcome, RoutingResult, VerdictClass } from "./types";

/** Compute the routing outcome from qualifier answers + verdict state. */
export function computeRoute(
  qualifier: RoutingQualifier | undefined,
  verdictClass: VerdictClass,
): RoutingResult {
  // If no qualifier answers, return neutral outcome with all three options.
  if (!qualifier || (!qualifier.imminence && !qualifier.breadth && qualifier.pressure === null && !qualifier.dataReach && !qualifier.stakes)) {
    return {
      outcome: "neutral",
      reasoning: "Skipped the routing questions — here are all three next steps.",
    };
  }

  // Extract the signals (null = not answered).
  const { imminence, breadth, pressure, dataReach, stakes } = qualifier;

  // Apply routing logic per spec (Part B, "Routing logic").
  // Signal pattern: One use case · imminent commitment · needs to be defensible fast → Gate.
  const isImminent = imminence === "committed";
  const isOneUseCaseFocus = breadth === "just-this-one";
  const isFragmentedEstate = breadth === "handful" || breadth === "whole-estate";
  const hasboardPressure = pressure === true;
  const noDataAccess = dataReach === "no";
  const smallStakes = stakes === "small";

  // Primary routes:
  // 1. One use case + imminent commitment → Gate (Offer 3)
  if (isOneUseCaseFocus && isImminent) {
    return {
      outcome: "gate",
      reasoning:
        "One use case with a near-term decision needed — the Gate is built for this: a defensible go/no-go in ten business days.",
    };
  }

  // 2. Multiple use cases / estate + board/CFO pressure → Diagnostic (Offer 1)
  if (isFragmentedEstate && hasboardPressure) {
    return {
      outcome: "diagnostic",
      reasoning:
        "Board or CFO pressure on a multi-use-case estate — the Diagnostic gives you a baseline decision on every material use case, not just one.",
    };
  }

  // Tie-breaks & edge cases per spec:
  // "Imminent commitment AND estate pressure → lead with Gate, name Diagnostic as fuller follow-on"
  if (isImminent && (isFragmentedEstate || hasboardPressure)) {
    // If both imminent and estate, Gate is the entry but Diagnostic is named as follow-on.
    // For routing purposes, we surface both, so gate is the primary.
    return {
      outcome: "gate",
      reasoning:
        "Imminent commitment on the immediate decision — start with the Gate, then move to the Diagnostic for the fuller estate review.",
    };
  }

  // "No data reach strengthens the case for a paid step"
  if (noDataAccess && (isImminent || hasboardPressure || isFragmentedEstate)) {
    if (isOneUseCaseFocus && isImminent) {
      return {
        outcome: "gate",
        reasoning:
          "Getting to real numbers is part of what you'd be buying — the Gate digs into your actual usage and finance data.",
      };
    }
    if (isFragmentedEstate || hasboardPressure) {
      return {
        outcome: "diagnostic",
        reasoning:
          "Getting to real numbers across your estate is part of what you'd be buying — the Diagnostic baseline reconciles your actual data.",
      };
    }
  }

  // "Doesn't pay on these numbers" logic per spec:
  // Routes to Not-yet by default, UNLESS stakes are large or commitment is imminent.
  if (verdictClass === "no") {
    if (stakes === "large" || isImminent) {
      return {
        outcome: "gate",
        reasoning:
          "The numbers say no — but before you walk away from this, a Gate can confirm that the no is real and you're not missing something.",
      };
    }
    return {
      outcome: "not-yet",
      reasoning:
        "Low stakes and robust numbers suggesting it doesn't pay yet — you may not need us. Come back if the picture changes.",
    };
  }

  // Not-yet route: small stakes + robust read + no imminent pressure
  if (smallStakes && !isImminent && !hasboardPressure && !isFragmentedEstate) {
    return {
      outcome: "not-yet",
      reasoning:
        "Small stakes and a solid grounding — the economics look OK on their own. You may not need us yet; come back if things change.",
    };
  }

  // Default fallback: if there's any imminent signal, Gate; if estate/pressure, Diagnostic; else Not-yet.
  if (isImminent || isOneUseCaseFocus) {
    return {
      outcome: "gate",
      reasoning: "The most direct next step is a single-use-case decision paper.",
    };
  }

  if (isFragmentedEstate || hasboardPressure) {
    return {
      outcome: "diagnostic",
      reasoning: "For a multi-use-case or board-level read, the Diagnostic is the right entry point.",
    };
  }

  // Neutral fallback (shouldn't normally reach here if qualifier is well-formed)
  return {
    outcome: "neutral",
    reasoning: "You can explore all three options below.",
  };
}
