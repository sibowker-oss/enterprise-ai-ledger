import { useCases } from "@/lib/seed";
import { PageHeader } from "@/components/PageHeader";
import { RegisterTable } from "@/components/RegisterTable";

export default function RegisterPage() {
  return (
    <>
      <PageHeader
        eyebrow="AI Use Case Register"
        title="The system of record"
        lead="Every AI use case at Meridian — owner, business unit, vendor, workflow, cost, risk and the scale/fix/stop call."
        narrative={
          <>
            Filter to <strong className="font-semibold text-ink">Decision = Stop</strong> to see the
            two use cases the bank should pause, or sort by{" "}
            <strong className="font-semibold text-ink">Annual cost</strong> to find where the money
            goes. Click any row for the full record.
          </>
        }
      />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <RegisterTable useCases={useCases} />
      </div>
    </>
  );
}
