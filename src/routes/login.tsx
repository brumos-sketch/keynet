import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_HOME, type AppRole } from "@/lib/pasallave";
import { Brand } from "@/components/pasallave/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 text-center">
          <Brand className="text-2xl" />
          <p className="mt-2 text-sm text-muted-foreground">
            Intercambio de llaves en puntos asociados
          </p>
        </div>

        <div className="rounded-[16px] border border-border bg-card p-6 shadow-[0_1px_2px_rgba(17,24,39,0.04)]">
          <h1 className="text-xl font-semibold text-foreground">
            {mode === "login" ? "Ingresar" : "Crear cuenta"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login"
              ? "Usá tu email y contraseña."
              : "Al registrarte accedés como anfitrión."}
          </p>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  required
                  maxLength={80}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                maxLength={255}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
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
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full rounded-[10px]" disabled={busy}>
              {mode === "login" ? "Ingresar" : "Registrarme"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">o</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full rounded-[10px]"
            onClick={handleGoogle}
            disabled={busy}
          >
            Continuar con Google
          </Button>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "login" ? "¿No tenés cuenta? " : "¿Ya tenés cuenta? "}
            <button
              type="button"
              className="font-medium text-primary hover:underline"
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
