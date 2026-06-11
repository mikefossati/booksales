import {
  LayoutDashboard,
  BookOpen,
  Store,
  Package,
  DollarSign,
  BarChart3,
  Settings,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = { text: string };
type Tip  = { text: string };
type Block =
  | { kind: "p";     text: string }
  | { kind: "steps"; items: Step[] }
  | { kind: "tip";   text: string }
  | { kind: "table"; rows: [string, string][] };

type Section = {
  id:       string;
  icon:     LucideIcon;
  title:    string;
  blocks:   Block[];
};

// ── Content ───────────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    id: "inicio",
    icon: LayoutDashboard,
    title: "Inicio",
    blocks: [
      {
        kind: "p",
        text: "El dashboard muestra un resumen del mes en curso: ingresos, gastos, resultado neto y un desglose por canal de venta.",
      },
      {
        kind: "table",
        rows: [
          ["Resultado neto del mes", "Ingresos menos gastos del mes en curso. Verde = positivo, rojo = negativo."],
          ["Desglose por canal", "Porcentaje de ingresos que aporta cada canal en el mes actual."],
          ["Alertas", "Aparecen cuando una librería tiene pagos pendientes o un libro tiene stock bajo (≤ 10 ej.)."],
          ["Últimas ventas / Últimos gastos", "Los 5 registros más recientes del mes. Hacé clic en «Ver todos» para ir al listado completo."],
        ],
      },
      {
        kind: "tip",
        text: "Usá el botón + en «Mis Ventas» o «Mis Gastos» para registrar rápido sin salir del inicio.",
      },
    ],
  },
  {
    id: "libros",
    icon: BookOpen,
    title: "Mis Libros",
    blocks: [
      {
        kind: "p",
        text: "Desde aquí gestionás tu catálogo de libros, tiradas de impresión, merchandising y los movimientos de canjes o regalos.",
      },
      {
        kind: "table",
        rows: [
          ["Libros", "Listado de títulos. Podés agregar formatos (físico, digital, audiolibro) y registrar tiradas de impresión."],
          ["Merchandising", "Productos físicos que vendés junto a los libros (remeras, stickers, etc.)."],
          ["Canjes / Regalos", "Salidas de stock que no generan venta. Los canjes quedan pendientes de cumplimiento (reseña, mención, etc.); los regalos se marcan cumplidos al momento."],
        ],
      },
      {
        kind: "p",
        text: "Cómo registrar una tirada de impresión:",
      },
      {
        kind: "steps",
        items: [
          { text: "Abrí la ficha del libro (clic en el título)." },
          { text: "En la sección «Tiradas», hacé clic en el botón +." },
          { text: "Completá la cantidad impresa, el costo total y la fecha." },
          { text: "Guardá. El stock del inventario personal se actualiza automáticamente." },
        ],
      },
      {
        kind: "p",
        text: "Cómo registrar un canje o regalo:",
      },
      {
        kind: "steps",
        items: [
          { text: "Abrí «Canjes / Regalos» en el menú de Libros." },
          { text: "Hacé clic en el botón +." },
          { text: "Elegí «Canje» si esperás algo a cambio (reseña, nota de prensa) o «Regalo» si es una entrega directa." },
          { text: "Indicá destinatario, libro, cantidad y — para canjes — qué se acordó y la fecha límite." },
          { text: "Guardá. El stock se deduce del inventario de origen seleccionado." },
        ],
      },
      {
        kind: "tip",
        text: "Para actualizar el estado de un canje (marcar como cumplido o no cumplido) usá el ícono de lápiz en la fila.",
      },
    ],
  },
  {
    id: "canales",
    icon: Store,
    title: "Canales",
    blocks: [
      {
        kind: "p",
        text: "Un canal representa un lugar o plataforma donde vendés. Cada venta se asocia a un canal para que puedas ver el desempeño por origen.",
      },
      {
        kind: "table",
        rows: [
          ["Venta directa (DIRECT)", "Ventas que hacés vos directamente: redes sociales, eventos, boca a boca."],
          ["Librería (BOOKSTORE)", "Libros en consignación. El sistema rastrea el stock que enviaste y los pagos pendientes."],
          ["Digital (DIGITAL)", "Plataformas de ebook o audiolibro (Amazon KDP, Audible, etc.)."],
          ["Feria / Evento (EVENTS)", "Ventas en ferias del libro u otros eventos presenciales."],
          ["Mayorista (WHOLESALE)", "Distribuidoras u operaciones de venta al por mayor."],
        ],
      },
      {
        kind: "p",
        text: "Cómo crear un canal:",
      },
      {
        kind: "steps",
        items: [
          { text: "Andá a Canales en el menú lateral." },
          { text: "Hacé clic en «Agregar canal»." },
          { text: "Ingresá el nombre (ej. «Amazon KDP», «Librería El Ateneo»), elegí el tipo y guardá." },
          { text: "Si es una librería, el sistema te va a proponer crear un inventario asociado para trackear el stock en consignación." },
        ],
      },
      {
        kind: "tip",
        text: "Podés desactivar un canal sin eliminarlo para que no aparezca en los formularios de venta pero sus datos históricos se conserven.",
      },
    ],
  },
  {
    id: "inventario",
    icon: Package,
    title: "Inventario",
    blocks: [
      {
        kind: "p",
        text: "El módulo de inventario lleva un registro de todos los ejemplares físicos: cuántos tenés en la mano, cuántos están en librerías y el movimiento entre inventarios.",
      },
      {
        kind: "table",
        rows: [
          ["Inventario personal", "Tu stock propio (el «en mano»). Se crea automáticamente al registrarte."],
          ["Inventario de librería", "Stock en consignación en una librería. Se vincula a un canal de tipo Librería."],
          ["En mano", "Suma de todos los inventarios personales."],
          ["En librerías", "Suma de todos los inventarios vinculados a librerías."],
          ["Total circulación", "Todos los inventarios juntos."],
        ],
      },
      {
        kind: "p",
        text: "Tipos de movimiento:",
      },
      {
        kind: "table",
        rows: [
          ["Nueva tirada", "Entrada al inventario personal al registrar una impresión."],
          ["Envío a librería", "Transferencia del inventario personal al inventario de la librería."],
          ["Devolución", "Regresa stock de la librería al inventario personal."],
          ["Venta directa", "Descuento automático al registrar una venta en un canal directo."],
          ["Baja / Pérdida", "Ejemplares dañados, perdidos o destruidos. Se registran en «Acciones de stock»."],
          ["Ajuste", "Corrección manual del stock (entrada o salida)."],
        ],
      },
      {
        kind: "tip",
        text: "Usá «Acciones de stock» en Configuración → Inventarios para registrar bajas, ajustes o transferencias manuales entre inventarios.",
      },
    ],
  },
  {
    id: "finanzas",
    icon: DollarSign,
    title: "Finanzas",
    blocks: [
      {
        kind: "p",
        text: "Desde Finanzas registrás y consultás ventas, gastos y los pagos que recibís de las librerías.",
      },
      {
        kind: "table",
        rows: [
          ["Ventas", "Historial de todas las ventas registradas, con filtros por período."],
          ["Gastos", "Historial de gastos operativos (impresión, diseño, envíos, publicidad, etc.)."],
          ["Te deben", "Pagos pendientes de canales tipo Librería o Digital. Muestra cuánto vendiste vs. cuánto te pagaron."],
        ],
      },
      {
        kind: "p",
        text: "Cómo registrar una venta:",
      },
      {
        kind: "steps",
        items: [
          { text: "Usá el botón flotante + (esquina inferior derecha) o el botón + en el dashboard." },
          { text: "Elegí el libro o producto de merchandising." },
          { text: "Seleccioná el canal de venta." },
          { text: "Ingresá la cantidad y el precio. Podés usar «precio por unidad» o «monto total» para ventas en lote." },
          { text: "Guardá." },
        ],
      },
      {
        kind: "p",
        text: "Cómo registrar un pago de librería:",
      },
      {
        kind: "steps",
        items: [
          { text: "Andá a Finanzas → Te deben." },
          { text: "En la fila de la librería que pagó, hacé clic en «Registrar pago»." },
          { text: "Ingresá el monto y la fecha del pago." },
          { text: "Guardá. El saldo pendiente se actualiza." },
        ],
      },
      {
        kind: "tip",
        text: "Las ventas en moneda extranjera se convierten automáticamente a tu moneda base usando el tipo de cambio que ingresés al momento del registro.",
      },
    ],
  },
  {
    id: "reportes",
    icon: BarChart3,
    title: "Reportes",
    blocks: [
      {
        kind: "p",
        text: "Los reportes te dan una visión consolidada de tu actividad. Podés filtrar por período usando las flechas de mes en la parte superior.",
      },
      {
        kind: "table",
        rows: [
          ["Análisis de ventas", "Ingresos totales por período, desglose por canal y por libro. Comparativa mes a mes."],
          ["Estado de inventario", "Existencias actuales por inventario y por libro. Estado de consignaciones en librerías."],
          ["Cuadre", "Verifica que los números cierren: total impreso = en inventarios + vendidos + canjes/regalos + bajas. Si aparece una discrepancia, hay ejemplares sin contabilizar."],
          ["Resumen financiero", "Gastos por categoría, rentabilidad por libro, P&L de merchandising."],
          ["Proyecciones", "Estimación de ventas futuras basada en el promedio de los últimos 3 meses, con escenario conservador (−20%) y optimista (+20%)."],
        ],
      },
      {
        kind: "tip",
        text: "El «Cuadre» es tu herramienta de auditoría: si la suma de todos los destinos de tus libros no coincide con lo impreso, encontrarás exactamente cuántos ejemplares faltan en el informe.",
      },
    ],
  },
  {
    id: "configuracion",
    icon: Settings,
    title: "Configuración",
    blocks: [
      {
        kind: "p",
        text: "Desde Configuración ajustás tu perfil, preferencias de cuenta, canales de venta e inventarios.",
      },
      {
        kind: "table",
        rows: [
          ["Perfil", "Cambiá tu nombre de usuario."],
          ["Preferencias", "Moneda base, configuración regional. La moneda base es la que se usa para todos los totales y gráficos."],
          ["Seguridad", "Cambio de contraseña."],
          ["Canales", "Creá, editá o desactivá canales de venta."],
          ["Inventarios", "Creá inventarios adicionales (ej. un depósito, una feria). Desde aquí también podés registrar bajas, ajustes y transferencias de stock."],
        ],
      },
      {
        kind: "tip",
        text: "Si cambiás la moneda base, los montos ya registrados en otras monedas se reconvierten usando el tipo de cambio que ingresaste en cada operación.",
      },
    ],
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function TipBox({ text }: { text: string }) {
  return (
    <div className="flex gap-3 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--color-accent-light)] border border-[var(--color-accent)]/20">
      <Lightbulb size={15} className="shrink-0 mt-0.5 text-[var(--color-accent)]" />
      <p className="text-sm text-[var(--color-text)] leading-relaxed">{text}</p>
    </div>
  );
}

function StepList({ items }: { items: Step[] }) {
  return (
    <ol className="space-y-2 ml-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm text-[var(--color-text)] leading-relaxed">
          <span
            className="shrink-0 w-5 h-5 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center text-xs font-bold mt-0.5"
            aria-hidden="true"
          >
            {i + 1}
          </span>
          {item.text}
        </li>
      ))}
    </ol>
  );
}

function InfoTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden">
      {rows.map(([term, desc], i) => (
        <div
          key={i}
          className="grid md:grid-cols-[200px_1fr] divide-y md:divide-y-0 md:divide-x divide-[var(--color-border)] border-b border-[var(--color-border)] last:border-b-0"
        >
          <dt className="px-4 py-3 text-xs font-semibold text-[var(--color-text)] bg-[var(--color-accent-light)]/40 leading-snug flex items-center">
            {term}
          </dt>
          <dd className="px-4 py-3 text-sm text-[var(--color-text-muted)] leading-relaxed">
            {desc}
          </dd>
        </div>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AyudaPage() {
  return (
    <main className="p-5 md:p-8 max-w-5xl">
      {/* Header */}
      <header className="mb-8">
        <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-widest mb-2">
          Manual de uso
        </p>
        <h1
          className="text-4xl font-semibold text-[var(--color-text)] leading-none mb-3"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Ayuda
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] max-w-lg leading-relaxed">
          Guía rápida de todas las funciones de la aplicación. Usá el índice para ir directamente a la sección que necesitás.
        </p>
      </header>

      <div className="flex gap-8 items-start">
        {/* Sticky TOC — desktop only */}
        <nav
          aria-label="Índice"
          className="hidden lg:flex flex-col gap-0.5 w-44 shrink-0 sticky top-8"
        >
          <p className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 px-2">
            Índice
          </p>
          {SECTIONS.map(({ id, icon: Icon, title }) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex items-center gap-2 px-2 py-2 rounded-[var(--radius-md)] text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-accent-light)] transition-colors"
            >
              <Icon size={14} className="shrink-0" />
              {title}
            </a>
          ))}
        </nav>

        {/* Sections */}
        <div className="flex-1 min-w-0 space-y-10">
          {SECTIONS.map(({ id, icon: Icon, title, blocks }) => (
            <article key={id} id={id} className="scroll-mt-8">
              {/* Section header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-accent)] flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-white" />
                </div>
                <h2
                  className="text-xl font-semibold text-[var(--color-text)]"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {title}
                </h2>
              </div>

              {/* Blocks */}
              <div className="space-y-4 ml-11">
                {blocks.map((block, i) => {
                  if (block.kind === "p")     return <p key={i} className="text-sm text-[var(--color-text-muted)] leading-relaxed">{block.text}</p>;
                  if (block.kind === "tip")   return <TipBox key={i} text={block.text} />;
                  if (block.kind === "steps") return <StepList key={i} items={block.items} />;
                  if (block.kind === "table") return <InfoTable key={i} rows={block.rows} />;
                })}
              </div>

              {/* Divider */}
              <div className="mt-10 border-b border-[var(--color-border)]" />
            </article>
          ))}

          {/* Footer note */}
          <p className="text-xs text-[var(--color-text-muted)] pb-4">
            ¿Encontraste algo que no funciona bien? Escribinos a{" "}
            <a
              href="mailto:soporte@autoriapp.com"
              className="text-[var(--color-accent)] hover:underline"
            >
              soporte@autoriapp.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
