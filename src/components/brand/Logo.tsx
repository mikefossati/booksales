/**
 * Autoriapp brand assets.
 *
 * AutoriappMark  — the standalone A-quill icon (scalable via className/size)
 * AutoriappLogo  — icon + wordmark lockup
 */

interface MarkProps {
  className?: string;
  size?: number;
}

/**
 * The A-mark: two calligraphic strokes (thick downstroke + thin upstroke)
 * meeting at the apex, with a fine crossbar — like a quill-written capital A.
 */
export function AutoriappMark({ className, size = 24 }: MarkProps) {
  return (
    <svg
      width={size}
      height={Math.round(size * 1.2)}
      viewBox="0 0 20 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Thick downstroke — the quill's weighted leg */}
      <path
        d="M10 1.5 L1 22.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* Thin upstroke */}
      <path
        d="M10 1.5 L19 22.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* Fine crossbar */}
      <path
        d="M4.5 15.5 L15.5 15.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* Small serif at the apex — the pen-tip moment */}
      <path
        d="M8.5 2.5 L11.5 2.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Hide the text wordmark — icon only */
  markOnly?: boolean;
}

const SIZE_MAP = {
  sm: { mark: 16, text: "text-base",   gap: "gap-2"   },
  md: { mark: 20, text: "text-lg",     gap: "gap-2.5" },
  lg: { mark: 28, text: "text-2xl",    gap: "gap-3"   },
};

/**
 * Full lockup: icon + "autoriapp" wordmark.
 * Uses the heading font for the serif-literary feel.
 */
export function AutoriappLogo({ className, size = "md", markOnly = false }: LogoProps) {
  const { mark, text, gap } = SIZE_MAP[size];
  return (
    <span
      className={`inline-flex items-center ${gap} text-[var(--color-accent)] ${className ?? ""}`}
    >
      <AutoriappMark size={mark} />
      {!markOnly && (
        <span
          className={`font-semibold tracking-tight ${text} leading-none font-heading`}
          style={{ letterSpacing: "-0.02em" }}
        >
          autoriapp
        </span>
      )}
    </span>
  );
}
