"use client";

import { useEffect } from "react";
import { AutoriappLogo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error-boundary]", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-6">
          <AutoriappLogo size="md" />
        </div>
        <h1
          className="text-3xl font-semibold text-[var(--color-text)] mb-2 font-heading"
        >
          Algo salió mal
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-8">
          Ocurrió un error inesperado. Tus datos están a salvo —
          intenta de nuevo o vuelve al inicio.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset}>Reintentar</Button>
          <Button variant="outline" asChild>
            <a href="/dashboard">Ir al inicio</a>
          </Button>
        </div>
        {error.digest && (
          <p className="text-xs text-[var(--color-text-muted)] mt-8">
            Código de referencia: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
