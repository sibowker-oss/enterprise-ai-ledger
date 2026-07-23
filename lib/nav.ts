/**
 * Navigation model. Four built modules + two deferred ("Coming in platform")
 * placeholders that keep the prototype honest about the product roadmap
 * (BUILD_SPEC §2/§4). One persistent CTA points at Hepburn Advisory.
 */
export interface NavItem {
  href: string;
  label: string;
  blurb: string;
  /** Deferred modules render disabled with a "Coming in platform" tooltip. */
  disabled?: boolean;
}

export const navItems: NavItem[] = [
  { href: "/", label: "Control Room", blurb: "Portfolio economics & board pack" },
  { href: "/register", label: "Use Case Register", blurb: "The system of record" },
  { href: "/cost", label: "Cost Ledger", blurb: "What AI actually costs" },
  { href: "/outcome", label: "Outcome Ledger", blurb: "Whether AI earns back" },
];

export const futureNavItems: NavItem[] = [
  { href: "#", label: "Token Optimisation", blurb: "Coming in platform", disabled: true },
  { href: "#", label: "Governance Evidence", blurb: "Coming in platform", disabled: true },
];

/** Where the CTA points (BUILD_SPEC §11 default). */
export const CTA_HREF = "https://hepburnadvisory.com.au";
export const CTA_LABEL = "Contact Hepburn Advisory";

/** Active-state helper that tolerates the trailing slash + basePath. */
export function isActivePath(pathname: string, href: string): boolean {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (href === "/") return clean === "/";
  return clean === href || clean.startsWith(href + "/");
}
