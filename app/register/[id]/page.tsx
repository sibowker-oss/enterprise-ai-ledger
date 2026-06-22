import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { useCases } from "@/lib/seed";
import { findUseCase } from "@/lib/portfolio";
import { UseCaseDetail } from "@/components/UseCaseDetail";

/** Pre-render a static page for every use case (required for output: export). */
export function generateStaticParams() {
  return useCases.map((uc) => ({ id: uc.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const uc = findUseCase(useCases, params.id);
  if (!uc) return { title: "Use case not found — Enterprise AI Ledger" };
  return {
    title: `${uc.name} (${uc.id}) — Enterprise AI Ledger`,
    description: `${uc.businessUnit} · ${uc.workflow}. Illustrative demo.`,
  };
}

export default function UseCasePage({ params }: { params: { id: string } }) {
  const uc = findUseCase(useCases, params.id);
  if (!uc) notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <UseCaseDetail uc={uc} />
    </div>
  );
}
