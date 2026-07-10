import { FOOTER } from "@/lib/simulator/labels";
import { asOfLabel } from "@/lib/simulator/format";
import { APP_COMMIT, DATA_VERSION, ENGINE_VERSION } from "@/lib/simulator/versions";

/**
 * The persistent "what's independent, what's an example" disclosure + as-of
 * date, plus the reproducibility stamp (update v2, 0.4): app commit,
 * calculation-engine version and data version — any screenshot of this page
 * can be traced to the exact code and data that produced it.
 */
export function SimFooter({ asOf }: { asOf: string }) {
  return (
    <footer className="mt-10 border-t border-border pt-6 text-[12px] leading-relaxed text-ink-faint">
      <p>{FOOTER.independence}</p>
      <p className="mt-3">
        <b className="font-semibold text-ink-muted">{asOfLabel(asOf)}.</b> {FOOTER.note}
      </p>
      <p className="mt-3">{FOOTER.attribution}</p>
      <p className="mt-3 tabular text-[11px]">
        Data version {DATA_VERSION} · calculations v{ENGINE_VERSION} · app {APP_COMMIT}
      </p>
    </footer>
  );
}
