import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface PlanCardProps {
  name: string;
  subtitle: string;
  price: React.ReactNode;
  priceLabel?: string;
  features: string[];
  cta: string;
  variant?: "default" | "recommended" | "outline";
  onClick?: () => void;
  planKey?: string;
}

export function PlanCard({
  name,
  subtitle,
  price,
  priceLabel,
  features,
  cta,
  variant = "default",
  onClick,
  planKey,
}: PlanCardProps) {
  const isRecommended = variant === "recommended";
  const isOutline = variant === "outline";

  return (
    <div
      className={cn(
        "plan-card relative rounded-[2.5rem] border bg-white p-10 shadow-sm",
        isRecommended
          ? "border-2 border-electric shadow-xl"
          : "border-gray-100",
      )}
    >
      {isRecommended && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-electric px-4 py-1 text-xs font-bold uppercase tracking-widest text-white">
          Recomendado
        </div>
      )}
      <h3 className="mb-2 text-2xl font-bold text-navy">{name}</h3>
      <p className="mb-6 text-sm text-gray-400">{subtitle}</p>
      <div className="mb-8 text-4xl font-bold text-navy">
        {price}{" "}
        {priceLabel && (
          <span className="text-sm font-normal text-gray-400">{priceLabel}</span>
        )}
      </div>
      <ul className="mb-10 space-y-4 text-sm text-gray-600">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2">
            <span className="text-electric">✓</span> {feature}
          </li>
        ))}
      </ul>
      <Link
        to="/login"
        search={planKey ? { plan: planKey } : {}}
        onClick={onClick}
        className={cn(
          "block w-full rounded-2xl py-4 text-center font-bold transition-all",
          isRecommended
            ? "bg-electric text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
            : isOutline
              ? "border-2 border-navy text-navy hover:bg-navy hover:text-white"
              : "border-2 border-electric text-electric hover:bg-electric hover:text-white",
        )}
      >
        {cta}
      </Link>
    </div>
  );
}
