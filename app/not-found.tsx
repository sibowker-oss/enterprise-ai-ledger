import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">Not found</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">That page doesn’t exist</h1>
      <p className="mt-3 text-ink-muted">
        This site has a fixed set of modules and use cases.
      </p>
      <Link href="/" className="mt-6 inline-block text-accent hover:underline">
        ← Back to the Control Room
      </Link>
    </div>
  );
}
