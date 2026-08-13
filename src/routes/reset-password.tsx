import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { BrandLogo } from "@/components/pasallave/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nueva contraseña — PASALLAVE" },
      { name: "description", content: "Elegí una nueva contraseña para tu cuenta de PASALLAVE." },
      { property: "og:title", content: "Nueva contraseña — PASALLAVE" },
      {
        property: "og:description",
        content: "Restablecé el acceso a tu cuenta de PASALLAVE en un paso.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (password !== password2) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contraseña actualizada");
    void navigate({ to: "/login" });
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-5">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-card"
      >
        <BrandLogo textClassName="text-lg" />
        <h1 className="flex items-center gap-2 text-xl font-bold text-navy">
          <KeyRound className="h-5 w-5 text-electric" />
          Nueva contraseña
        </h1>

        <div className="space-y-2">
          <Label htmlFor="pass">Contraseña</Label>
          <div className="relative">
            <Input
              id="pass"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-gray-500 hover:text-foreground"
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pass2">Repetir contraseña</Label>
          <Input
            id="pass2"
            type={show ? "text" : "password"}
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full rounded-xl" disabled={saving}>
          Guardar contraseña
        </Button>
      </form>
    </div>
  );
}
