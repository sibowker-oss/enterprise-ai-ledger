import { FOOTER } from "@/lib/simulator/labels";
import { asOfLabel } from "@/lib/simulator/format";

/** The persistent "what's independent, what's an example" disclosure + as-of date. */
export function SimFooter({ asOf }: { asOf: string }) {
  return (
    <footer className="mt-10 border-t border-border pt-6 text-[12px] leading-relaxed text-ink-faint">
      <p>{FOOTER.independence}</p>
      <p className="mt-3">
        <b className="font-semibold text-ink-muted">{asOfLabel(asOf)}.</b> {FOOTER.note}
      </p>
      <p className="mt-3">{FOOTER.attribution}</p>
    </footer>
  );
}
