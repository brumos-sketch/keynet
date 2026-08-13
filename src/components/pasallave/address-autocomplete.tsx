import { useEffect, useId, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { resolvePlace, suggestAddresses, type AddressSuggestion } from "@/lib/geo.functions";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
  leading?: React.ReactNode;
};

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  id,
  className,
  inputClassName,
  ariaLabel,
  leading,
}: Props) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const suggestFn = useServerFn(suggestAddresses);
  const [items, setItems] = useState<AddressSuggestion[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "none">("idle");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const skipNext = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const query = value.trim();
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    if (query.length < 3) {
      setItems([]);
      setState("idle");
      setOpen(false);
      return;
    }
    let cancelled = false;
    setState("loading");
    setOpen(true);
    const timer = setTimeout(() => {
      void suggestFn({ data: { query } })
        .then((results) => {
          if (cancelled) return;
          setItems(results);
          setHighlight(0);
          setState(results.length ? "idle" : "none");
        })
        .catch(() => {
          if (cancelled) return;
          setItems([]);
          setState("none");
        });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, suggestFn]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const choose = (item: AddressSuggestion) => {
    skipNext.current = true;
    onChange(item.label);
    onSelect(item);
    setOpen(false);
    setItems([]);
    setState("idle");
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {leading}
      <Input
        id={inputId}
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-autocomplete="list"
        role="combobox"
        className={inputClassName}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => items.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || items.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => (h + 1) % items.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => (h - 1 + items.length) % items.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            const item = items[highlight];
            if (item) choose(item);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && (state === "loading" || state === "none" || items.length > 0) && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-gray-100 bg-background shadow-lg">
          {state === "loading" && (
            <p className="px-3 py-2 text-sm text-gray-500">Buscando…</p>
          )}
          {state === "none" && (
            <p className="px-3 py-2 text-sm text-gray-500">Sin coincidencias</p>
          )}
          {state !== "loading" && (
            <ul role="listbox" className="max-h-60 overflow-y-auto">
              {items.map((item, i) => (
                <li key={`${item.lat}-${item.lng}-${i}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === highlight}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => choose(item)}
                    className={cn(
                      "block w-full px-3 py-2 text-left text-sm",
                      i === highlight ? "bg-electric/10 text-foreground" : "text-gray-600",
                    )}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
