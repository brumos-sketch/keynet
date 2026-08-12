import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_HOME, type AppRole } from "@/lib/pasallave";
import { BrandLogo } from "@/components/pasallave/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Ingresar — PASALLAVE" },
      {
        name: "description",
        content: "Accedé a tu panel de PASALLAVE para gestionar llaves, puntos e intercambios.",
      },
      { property: "og:title", content: "Ingresar — PASALLAVE" },
      {
        property: "og:description",
        content: "Accedé a tu panel de PASALLAVE para gestionar llaves, puntos e intercambios.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, role, loading, refresh, signOut } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !session || !role) return;
    if (role === "pending") {
      toast.error("Tu cuenta está pendiente de aprobación");
      void signOut();
      return;
    }
    void navigate({ to: ROLE_HOME[role as AppRole], replace: true });
  }, [loading, session, role, navigate, signOut]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          toast.success("Cuenta creada. Revisá tu email para confirmarla.");
          setBusy(false);
          return;
        }
      }
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos completar la operación";
      toast.error(
        message.includes("Invalid login credentials") ? "Email o contraseña incorrectos" : message,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("No pudimos iniciar sesión con Google");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    await refresh();
    setBusy(false);
  };

  return (
    <main className="hero-gradient flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 text-center">
          <BrandLogo className="justify-center" />
          <p className="mt-2 text-sm text-gray-500">
            Intercambio de llaves en puntos asociados
          </p>
        </div>

        <div className="rounded-[2.5rem] border border-gray-100 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-navy">
            {mode === "login" ? "Ingresar" : "Crear cuenta"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {mode === "login"
              ? "Usá tu email y contraseña."
              : "Al registrarte accedés como anfitrión."}
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-navy">Nombre</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  required
                  maxLength={80}
                  className="rounded-xl border-gray-200"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-navy">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                maxLength={255}
                className="rounded-xl border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-navy">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  maxLength={72}
                  className="rounded-xl border-gray-200 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-400 transition-colors hover:text-navy"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="h-12 w-full rounded-2xl bg-electric text-base font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
              disabled={busy}
            >
              {mode === "login" ? "Ingresar" : "Registrarme"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">o</span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-2xl border-gray-200 font-semibold text-navy hover:bg-gray-50"
            onClick={handleGoogle}
            disabled={busy}
          >
            Continuar con Google
          </Button>

          <p className="mt-5 text-center text-sm text-gray-500">
            {mode === "login" ? "¿No tenés cuenta? " : "¿Ya tenés cuenta? "}
            <button
              type="button"
              className="font-bold text-electric hover:underline"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Registrate" : "Ingresá"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
