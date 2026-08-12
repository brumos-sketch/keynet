import { cn } from "@/lib/utils";
import logoAsset from "@/assets/logo-pasallave.svg.asset.json";

export function Isotype({ className, scale = 1 }: { className?: string; scale?: number }) {
  return (
    <img
      src={logoAsset.url}
      alt="Pasallave"
      className={cn("inline-block object-contain", className)}
      style={{ width: 40 * scale, height: 40 * scale }}
    />
  );
}

export function BrandLogo({ className, textClassName }: { className?: string; textClassName?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Isotype scale={0.9} />
      <span className={cn("text-2xl font-bold tracking-tight text-navy", textClassName)}>
        pasallave
      </span>
    </div>
  );
}
