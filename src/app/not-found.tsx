import Link from "next/link";
import { AutoriappLogo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-6">
          <AutoriappLogo size="md" />
        </div>
        <p
          className="text-7xl font-semibold text-[var(--color-accent)] mb-2"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          404
        </p>
        <h1
          className="text-2xl font-semibold text-[var(--color-text)] mb-2"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Página no encontrada
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mb-8">
          La página que buscas no existe o fue movida.
        </p>
        <Button asChild>
          <Link href="/dashboard">Ir al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
