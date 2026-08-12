import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_HOME, type AppRole } from "@/lib/pasallave";

export function RoleGuard({ allow, children }: { allow: AppRole; children: ReactNode }) {
  const { loading, role, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      void navigate({ to: "/login", replace: true });
      return;
    }
    if (role && role !== allow) {
      void navigate({ to: ROLE_HOME[role], replace: true });
    }
  }, [loading, role, session, allow, navigate]);

  if (loading || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    );
  }

  if (role !== allow) return null;

  return <>{children}</>;
}
