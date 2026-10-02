import { siGithub } from "simple-icons";
import Link from "next/link";
import { formatDate } from "@/lib/format";

export const REPO_URL = "https://github.com/Coderyansky/pareto_visual_ai";

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path d="M3 4.5h4.5V9H12v4h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="3" cy="4.5" r="1.9" fill="currentColor" />
      <circle cx="7.5" cy="9" r="1.9" fill="currentColor" />
      <circle cx="12" cy="13" r="1.9" fill="currentColor" />
      <circle cx="17" cy="13" r="1.9" fill="currentColor" />
    </svg>
  );
}

export function SiteHeader({ voteCutoff, sourceUrl }: { voteCutoff: string | null; sourceUrl: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.08] bg-white/70 backdrop-blur-2xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-foreground/90 transition-opacity hover:opacity-70">
          <Logo className="size-5" />
          <span className="text-[14px] font-semibold tracking-[-0.01em]">Pareto</span>
        </Link>
        <nav className="ml-2 hidden items-center gap-0.5 sm:flex">
          {[
            ["Frontier", "#frontier"],
            ["Models", "#models"],
            ["Method", "#method"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="inline-flex h-7 items-center rounded-full px-2.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            title="Data snapshot from arena.ai"
            className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] text-muted-foreground ring-1 ring-black/[0.08] ring-inset transition-colors hover:bg-black/[0.04] hover:text-foreground"
          >
            <span className="relative flex size-1.5">
              <span className="animate-ping-soft absolute inline-flex size-full rounded-full bg-positive" />
              <span className="relative inline-flex size-1.5 rounded-full bg-positive" />
            </span>
            <span className="hidden sm:inline">Synced</span>
            <span className="font-mono text-[11px] tabular-nums">{formatDate(voteCutoff)}</span>
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Source on GitHub"
            className="inline-flex size-7 items-center justify-center rounded-full bg-foreground text-white transition-transform hover:scale-[1.04]"
          >
            <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden>
              <path d={siGithub.path} />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
