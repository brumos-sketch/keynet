import { Search, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./brand-logo";

const toneClasses: Record<string, string> = {
  neutral: "bg-muted text-gray-500 border-gray-100",
  info: "bg-electric/5 text-electric border-accent",
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/15 text-warning-foreground border-warning/35",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
  primary: "bg-electric/10 text-electric border-electric/25",
  purple: "bg-purple-brand/10 text-purple-brand border-purple-brand/30",
  sky: "bg-sky-brand/10 text-sky-brand border-sky-brand/30",
  amber: "bg-amber-brand/10 text-amber-brand border-amber-brand/30",
  orange: "bg-orange-brand/10 text-orange-brand border-orange-brand/30",
  gold: "bg-gold-brand/10 text-gold-brand border-gold-brand/30",
};

export function Pill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof toneClasses;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function CodeChip({
  value,
  className,
}: {
  value: string | null | undefined;
  className?: string;
}) {
  if (!value) return <span className="text-gray-500">—</span>;
  return (
    <span
      className={cn(
        "code-chip inline-flex items-center rounded-[8px] border border-gray-100 bg-gray-50 px-2 py-1 text-sm font-medium text-foreground",
        className,
      )}
    >
      {value}
    </span>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("inline-block", className)}>
      <BrandLogo textClassName="text-lg" />
    </Link>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder = "Buscar…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full sm:max-w-sm", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-500" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={120}
        className="h-10 w-full rounded-xl border border-gray-100 bg-white pr-9 pl-9 text-sm text-foreground outline-none placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-gray-500 hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
