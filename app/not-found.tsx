import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { NotFoundRecovery } from "@/components/common/not-found-recovery";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="min-h-screen bg-public flex items-center justify-center px-4">
      <NotFoundRecovery />
      <div className="bg-white rounded-xl border border-sand shadow-soft shadow-sm p-10 max-w-sm w-full text-center">
        <div className="inline-flex items-center justify-center size-12 rounded-full bg-sand/30 mb-4">
          <MagnifyingGlassIcon className="size-6 text-bark" />
        </div>
        <p className="text-3xl font-bold text-bark">404</p>
        <h1 className="text-lg font-semibold text-bark mt-1">Page not found</h1>
        <p className="text-sm text-stone mt-2 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist, or the link may
          have expired.
        </p>
        <Link
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-stone underline underline-offset-4 hover:text-bark transition-colors"
          href="/"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to home
        </Link>
      </div>
    </main>
  );
}
