import { Pill } from "@/components/pasallave/ui-bits";
import {
  PLAN_LABELS,
  PLAN_TONE,
  STATUS_LABELS,
  STATUS_TONE,
  type ExchangeStatus,
  type SubscriptionType,
} from "@/lib/pasallave";
import { CodeChip } from "@/components/pasallave/ui-bits";

export function StatusBadge({ status }: { status: string }) {
  const key = status as ExchangeStatus;
  return (
    <Pill tone={STATUS_TONE[key] ?? "neutral"}>{STATUS_LABELS[key] ?? status}</Pill>
  );
}

export function PlanBadge({ plan }: { plan: string }) {
  const key = plan as SubscriptionType;
  return <Pill tone={PLAN_TONE[key] ?? "neutral"}>{PLAN_LABELS[key] ?? plan}</Pill>;
}

export function BookingRef({ value }: { value: string | null | undefined }) {
  return <CodeChip value={value} />;
}
