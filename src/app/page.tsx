import Link from "next/link";
import { BookOpen, BarChart3, Clock, Package } from "lucide-react";
import { AutoriappLogo, AutoriappMark } from "@/components/brand/Logo";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Todos tus canales, en un lugar",
    body: "Amazon, Buscalibre, librerías en consignación, ferias, Instagram. Sin importar dónde vendas, el número total siempre está claro.",
  },
  {
    icon: Package,
    title: "Tiradas e inventario sin hojas de cálculo",
    body: "Registra cuántos ejemplares imprimiste, cuánto costó, cuántos quedan en mano y cuántos están en librerías. Y cuándo recuperaste la inversión.",
  },
  {
    icon: Clock,
    title: "¿Qué te deben? Lo sabes al instante",
    body: "Las librerías y plataformas digitales pagan con retraso. La app te muestra qué ingresos ya ganaste pero todavía no llegaron a tu cuenta.",
  },
  {
    icon: BarChart3,
    title: "Reportes que hablan en autor",
    body: "No en lenguaje contable. ¿Cuánto gané este mes? ¿Cuál es mi canal más fuerte? ¿Cuándo cubrí los gastos de impresión? Esas preguntas.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Nav */}
      <nav className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <AutoriappLogo size="md" />
        <Link
          href="/login"
          className="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          Entrar →
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-[var(--color-accent)] uppercase tracking-widest mb-5">
            Para autores independientes
          </p>
          <h1
            className="text-5xl md:text-7xl font-semibold text-[var(--color-text)] leading-[1.05] font-heading"
            style={{ letterSpacing: "-0.025em" }}
          >
            Tus ventas, tan claras como tus palabras.
          </h1>
          <p className="mt-6 text-lg text-[var(--color-text-muted)] leading-relaxed max-w-lg">
            Un solo lugar para entender cuánto venden tus libros, dónde, y qué te deben — sin hojas de cálculo ni apps genéricas de contabilidad.
          </p>
          <div className="flex flex-wrap gap-3 mt-10">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-[var(--shadow-float)]"
            >
              Empezar gratis
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text)] text-sm font-medium hover:border-[var(--color-accent)] transition-colors"
            >
              Ya tengo cuenta →
            </Link>
          </div>
        </div>

        {/* Dashboard preview card */}
        <div className="mt-16 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-float)] overflow-hidden">
          {/* Mini nav bar */}
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
            <div className="w-3 h-3 rounded-full bg-[var(--color-border)]" />
            <div className="w-3 h-3 rounded-full bg-[var(--color-border)]" />
            <div className="w-3 h-3 rounded-full bg-[var(--color-border)]" />
            <span className="ml-3 text-xs text-[var(--color-text-muted)]">autoriapp.com/dashboard</span>
          </div>
          {/* Faux dashboard */}
          <div className="p-6 md:p-8">
            <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Junio de 2026</p>
            <p className="text-3xl font-semibold text-[var(--color-text)] mb-6 font-heading">
              Hola, Ana
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Este mes",        value: "$248.500" },
                { label: "Este año",        value: "$1.840.000" },
                { label: "¿Qué me deben?", value: "$96.000" },
                { label: "Unidades",        value: "31" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 bg-[var(--color-bg)]">
                  <p className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wide">{label}</p>
                  <p className="text-lg font-semibold text-[var(--color-text)] mt-1 font-heading">{value}</p>
                </div>
              ))}
            </div>
            {/* Faux channel table */}
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden">
              <div className="px-4 py-2.5 bg-[var(--color-bg)] border-b border-[var(--color-border)] flex justify-between">
                <span className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wide">Canal</span>
                <span className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wide">Ingresos</span>
              </div>
              {[
                { name: "Feria del Libro Santiago", pct: 52, val: "$129.200" },
                { name: "Amazon KDP",               pct: 30, val: "$74.550" },
                { name: "Librería Antártica",        pct: 18, val: "$44.730" },
              ].map(({ name, pct, val }) => (
                <div key={name} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] last:border-0">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-[var(--color-text)]">{name}</p>
                    <div className="mt-1.5 h-1 rounded-full bg-[var(--color-border)]">
                      <div className="h-1 rounded-full bg-[var(--color-accent)]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-[var(--color-text)] tabular-nums">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-5xl mx-auto px-6 py-20 md:py-24">
          <p className="text-xs font-medium text-[var(--color-accent)] uppercase tracking-widest mb-3">Funcionalidades</p>
          <h2
            className="text-3xl md:text-4xl font-semibold text-[var(--color-text)] mb-14 max-w-md font-heading"
            style={{ letterSpacing: "-0.02em" }}
          >
            Todo lo que necesita un autor independiente.
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4">
                <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-accent-light)] flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={16} className="text-[var(--color-accent)]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--color-text)] font-heading">
                    {title}
                  </h3>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1.5 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="bg-[var(--color-accent)]">
        <div className="max-w-5xl mx-auto px-6 py-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h2
              className="text-3xl font-semibold text-white leading-tight font-heading"
            >
              Empieza gratis hoy.
            </h2>
            <p className="text-white/70 text-sm mt-1.5">
              Configura tu primer libro en menos de 2 minutos.
            </p>
          </div>
          <Link
            href="/login"
            className="shrink-0 inline-flex items-center gap-2 px-7 py-3.5 rounded-[var(--radius-md)] bg-white text-[var(--color-accent)] text-sm font-semibold hover:bg-white/95 transition-colors shadow-lg"
          >
            Crear cuenta gratuita →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] px-6 py-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <AutoriappLogo size="sm" />
          <p className="text-xs text-[var(--color-text-muted)]">
            Hecho con cariño para autores independientes · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
