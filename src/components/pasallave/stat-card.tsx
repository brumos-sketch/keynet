import { cn } from "@/lib/utils";

const accentClasses: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning-foreground",
  info: "bg-info/10 text-info",
  danger: "bg-destructive/10 text-destructive",
  neutral: "bg-secondary text-muted-foreground",
};

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "primary",
  index = 0,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
  accent?: keyof typeof accentClasses;
  index?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass-card animate-fade-in p-4 transition-shadow hover:shadow-elevated",
        className,
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-[10px]",
          accentClasses[accent],
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
