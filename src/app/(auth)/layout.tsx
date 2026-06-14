export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4 overflow-hidden">
      {/* Radial accent bloom — upper-left quadrant */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, oklch(44% 0.13 155 / 0.08) 0%, transparent 70%)",
        }}
      />
      {/* Secondary warm bloom — lower-right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, oklch(68% 0.09 75 / 0.06) 0%, transparent 70%)",
        }}
      />
      {/* Noise texture overlay */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.025]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="auth-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#auth-noise)" />
      </svg>

      {/* Decorative quill-strokes — top-right ornament */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute top-8 right-10 opacity-[0.06]"
        width="180"
        height="220"
        viewBox="0 0 180 220"
        fill="none"
      >
        <path
          d="M90 10 L10 200"
          stroke="currentColor"
          strokeWidth="18"
          strokeLinecap="round"
          className="text-[var(--color-accent)]"
        />
        <path
          d="M90 10 L170 200"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          className="text-[var(--color-accent)]"
        />
        <path
          d="M38 138 L142 138"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          className="text-[var(--color-accent)]"
        />
      </svg>

      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </div>
  );
}
