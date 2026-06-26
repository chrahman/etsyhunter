import { CrosshairIcon } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-etsy text-white">
          <CrosshairIcon className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-tight">EtsyHunter</h1>
          <p className="text-xs text-muted">Product Hunter, Research & Analysis</p>
        </div>
      </div>
    </header>
  );
}
