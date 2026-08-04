"use client";

import { WarningIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-public flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border border-sand shadow-soft shadow-sm p-10 max-w-sm w-full text-center">
        <div className="inline-flex items-center justify-center size-12 rounded-full bg-red-100 mb-4">
          <WarningIcon className="size-6 text-red-600" weight="duotone" />
        </div>
        <h1 className="text-lg font-semibold text-bark">
          Something went wrong
        </h1>
        <p className="text-sm text-stone mt-2 leading-relaxed">
          An unexpected error occurred. You can try again, or head back home.
        </p>
        {error.digest && (
          <p className="text-2xs text-stone/60 mt-3 font-mono">
            Ref: {error.digest}
          </p>
        )}
        <div className="mt-6 flex gap-3 justify-center">
          <Button
            className="bg-bark hover:bg-bark/90 text-white rounded-md"
            onClick={reset}
          >
            Try again
          </Button>
          <Button
            asChild
            className="border-sand text-bark hover:bg-cream rounded-md"
            variant="outline"
          >
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
