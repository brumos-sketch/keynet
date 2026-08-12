import { cn } from "@/lib/utils";

const accentClasses: Record<string, string> = {
  primary: "bg-electric/10 text-electric",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning-foreground",
  info: "bg-electric/10 text-electric",
  danger: "bg-destructive/10 text-destructive",
  neutral: "bg-gray-50 text-gray-500",
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
        "glass-card animate-fade-in min-w-0 p-3 transition-shadow hover:shadow-elevated sm:p-4",
        className,
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center justify-between gap-2 sm:block">
        <span
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-xl sm:size-9",
            accentClasses[accent],
          )}
        >
          <Icon className="size-4 sm:size-4.5" />
        </span>
        <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:mt-3 sm:text-3xl">
          {value}
        </p>
      </div>
      <p className="mt-2 truncate text-xs font-medium tracking-wide text-gray-500 uppercase sm:mt-0.5">
        {label}
      </p>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

