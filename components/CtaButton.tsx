import { CTA_HREF, CTA_LABEL } from "@/lib/nav";

/**
 * The single persistent call-to-action (BUILD_SPEC §4). Drives the one next
 * step: into Hepburn Advisory's AI Economics Diagnostic.
 */
export function CtaButton({
  variant = "solid",
  className = "",
}: {
  variant?: "solid" | "ghost";
  className?: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-control px-3.5 py-2 text-sm font-medium transition-colors";
  const styles =
    variant === "solid"
      ? "bg-accent text-white hover:bg-accent-hover"
      : "text-accent hover:bg-accent-soft";
  return (
    <a href={CTA_HREF} target="_blank" rel="noopener noreferrer" className={`${base} ${styles} ${className}`}>
      {CTA_LABEL}
      <span aria-hidden="true">→</span>
    </a>
  );
}
