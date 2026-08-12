export function PhoneMockup() {
  return (
    <div className="relative mx-auto h-[640px] w-[320px] rounded-[3rem] border-[14px] border-gray-900 bg-gray-900 shadow-2xl phone-mockup">
      <div className="relative h-full w-full overflow-hidden rounded-[2.5rem] bg-white">
        <div className="flex h-full flex-col bg-blue-50">
          <div className="flex items-center justify-between border-b bg-white p-6">
            <span className="font-bold text-navy">Mapa de Puntos</span>
            <div className="h-8 w-8 rounded-full bg-gray-100" />
          </div>
          <div
            className="relative flex-1 bg-slate-200"
            style={{
              backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          >
            <div className="absolute top-1/4 left-1/2 rounded-full border-2 border-electric bg-white p-1 shadow-lg">
              <div className="h-3 w-3 rounded-full bg-electric" />
            </div>
            <div className="absolute top-1/2 left-1/4 rounded-full border-2 border-electric bg-white p-1 shadow-lg">
              <div className="h-3 w-3 rounded-full bg-electric" />
            </div>
            <div className="absolute bottom-1/3 right-1/4 rounded-full border-2 border-electric bg-white p-1 shadow-lg">
              <div className="h-3 w-3 rounded-full bg-electric" />
            </div>

            <div className="absolute bottom-6 left-4 right-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-2xl">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-bold text-navy">Café Martínez</span>
                <span className="text-[10px] font-bold text-green-600">ABIERTO</span>
              </div>
              <p className="mb-4 text-[10px] text-gray-500">Av. Córdoba 3400, Palermo</p>
              <button className="w-full rounded-xl bg-navy py-3 text-xs font-bold text-white">
                Dejar llave aquí
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
