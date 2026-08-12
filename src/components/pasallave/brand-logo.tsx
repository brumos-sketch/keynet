import { cn } from "@/lib/utils";

export function Isotype({ className, scale = 1 }: { className?: string; scale?: number }) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center",
        className,
      )}
      style={{
        width: 40 * scale,
        height: 40 * scale,
        border: `${4 * scale}px solid #2979ff`,
        borderRadius: "50% 50% 0 50%",
        transform: "rotate(-45deg)",
        position: "relative",
      }}
      aria-hidden="true"
    >
      <span
        style={{
          width: 8 * scale,
          height: 8 * scale,
          backgroundColor: "#ff6d00",
          borderRadius: "50%",
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
      <span
        style={{
          position: "absolute",
          bottom: -12 * scale,
          right: 4 * scale,
          width: 4 * scale,
          height: 12 * scale,
          backgroundColor: "#2979ff",
          borderRadius: "0 0 2px 2px",
        }}
      />
    </div>
  );
}

export function BrandLogo({ className, textClassName }: { className?: string; textClassName?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Isotype scale={0.75} />
      <span
        className={cn(
          "text-2xl font-bold tracking-tight text-navy ml-1",
          textClassName,
        )}
      >
        asallave
      </span>
    </div>
  );
}
