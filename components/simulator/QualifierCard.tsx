"use client";

import type { RoutingQualifier } from "@/lib/simulator/types";
import { QCard } from "./QCard";
import { QUALIFIER } from "@/lib/simulator/labels";
import { track } from "@/lib/simulator/analytics";

/**
 * Stage 3 — the triage qualifier (5 routing questions). No PII, skippable.
 * Routes to one of: Gate, Diagnostic, Not-yet, or neutral (all three).
 */
export function QualifierCard({
  qualifier,
  useCase,
  onQualifierChange,
}: {
  qualifier: RoutingQualifier | undefined;
  useCase: string;
  onQualifierChange: (qualifier: RoutingQualifier) => void;
}) {
  const q: RoutingQualifier = qualifier || {
    imminence: null,
    breadth: null,
    pressure: null,
    dataReach: null,
    stakes: null,
  };

  function updateAnswer<K extends keyof RoutingQualifier>(key: K, value: RoutingQualifier[K]) {
    const updated: RoutingQualifier = { ...q, [key]: value } as RoutingQualifier;
    onQualifierChange(updated);

    // Fire analytics on completion (all 5 answered)
    if (
      updated.imminence &&
      updated.breadth &&
      updated.pressure !== null &&
      updated.dataReach &&
      updated.stakes
    ) {
      track("sim_qualifier_completed", { use_case: useCase });
    }
  }

  type QuestionKey = "imminence" | "breadth" | "pressure" | "dataReach" | "stakes";

  interface QuestionDef {
    key: QuestionKey;
    title: string;
    options: Array<{ value: string | boolean | null; label: string }>;
  }

  const questions: QuestionDef[] = [
    {
      key: "imminence",
      title: QUALIFIER.q1,
      options: [
        { value: "committed", label: QUALIFIER.q1_committed },
        { value: "this-year", label: QUALIFIER.q1_this_year },
        { value: "exploring", label: QUALIFIER.q1_exploring },
      ],
    },
    {
      key: "breadth",
      title: QUALIFIER.q2,
      options: [
        { value: "just-this-one", label: QUALIFIER.q2_one },
        { value: "handful", label: QUALIFIER.q2_handful },
        { value: "whole-estate", label: QUALIFIER.q2_estate },
      ],
    },
    {
      key: "pressure",
      title: QUALIFIER.q3,
      options: [
        { value: true, label: QUALIFIER.q3_yes },
        { value: false, label: QUALIFIER.q3_not_yet },
      ],
    },
    {
      key: "dataReach",
      title: QUALIFIER.q4,
      options: [
        { value: "yes", label: QUALIFIER.q4_yes },
        { value: "hard", label: QUALIFIER.q4_hard },
        { value: "no", label: QUALIFIER.q4_no },
      ],
    },
    {
      key: "stakes",
      title: QUALIFIER.q5,
      options: [
        { value: "small", label: QUALIFIER.q5_small },
        { value: "material", label: QUALIFIER.q5_material },
        { value: "large", label: QUALIFIER.q5_large },
      ],
    },
  ];

  return (
    <QCard num="3" title={QUALIFIER.heading}>
      <p className="text-[14.5px] leading-relaxed text-ink-muted mb-4">{QUALIFIER.intro}</p>

      <div className="space-y-5">
        {questions.map((question) => (
          <fieldset key={question.key} className="border-l-2 border-border-faint pl-4">
            <legend className="text-[13.5px] font-semibold text-ink mb-2">{question.title}</legend>
            <div className="space-y-2">
              {question.options.map((option) => {
                const isSelected = q[question.key] === option.value;
                return (
                  <label
                    key={String(option.value)}
                    className="flex items-center gap-3 cursor-pointer rounded-control p-2 hover:bg-surface-muted transition-colors"
                  >
                    <input
                      type="radio"
                      name={question.key}
                      value={String(option.value)}
                      checked={isSelected}
                      onChange={() => {
                        // Track qualifier start on first answer
                        if (!q[question.key]) {
                          track("sim_qualifier_started", { use_case: useCase });
                        }
                        updateAnswer(question.key, option.value as never);
                      }}
                      className="w-4 h-4 rounded-full border-2 border-border cursor-pointer accent-accent"
                    />
                    <span
                      className={`text-[13px] ${isSelected ? "font-semibold text-ink" : "text-ink-muted"}`}
                    >
                      {option.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-5 text-[12px] text-ink-faint">
        {questions.filter((qDef) => q[qDef.key] !== null).length} of 5 answered
      </div>
    </QCard>
  );
}
