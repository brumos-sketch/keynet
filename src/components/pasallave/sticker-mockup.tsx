import { Isotype } from "./brand-logo";

export function StickerMockup() {
  return (
    <div className="relative mx-auto flex h-80 w-80 rotate-2 flex-col items-center justify-between rounded-[3rem] border-[6px] border-navy bg-white p-8 text-navy shadow-2xl">
      <div className="absolute -top-4 -right-4 rounded-full bg-orange-brand px-4 py-1 text-xs font-bold text-white shadow-lg">
        PUNTO SEGURO
      </div>

      <Isotype scale={1.5} className="mt-4" />

      <div className="text-center">
        <p className="text-3xl font-black uppercase tracking-tight">
          punto <br /> <span className="text-electric">pasallave</span>
        </p>
        <p className="mt-2 text-[10px] font-bold opacity-60">
          RETIRÁ Y DEJÁ LLAVES AQUÍ
        </p>
      </div>

      <div className="flex w-full items-center justify-between rounded-xl bg-gray-50 p-2">
        <div className="h-8 w-8 rounded bg-gray-200" />
        <span className="text-[8px] font-bold opacity-40">DESCARGÁ LA APP</span>
      </div>
    </div>
  );
}
