import { cn } from "@/lib/utils";

const toneClasses: Record<string, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-accent text-accent-foreground border-accent",
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/15 text-warning-foreground border-warning/35",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
  primary: "bg-primary/10 text-primary border-primary/25",
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

export function CodeChip({ value, className }: { value: string | null | undefined; className?: string }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "code-chip inline-flex items-center rounded-[8px] border border-border bg-secondary px-2 py-1 text-sm font-medium text-foreground",
        className,
      )}
    >
      {value}
    </span>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("text-lg font-bold tracking-[0.18em] text-foreground", className)}>
      PASALLAVE
    </span>
  );
}
