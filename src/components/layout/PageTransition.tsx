"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const isFirst = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (isFirst.current) {
      isFirst.current = false;
      return;
    }

    // Force reflow to restart the CSS animation after navigation
    el.classList.remove("animate-fade-up");
    void el.offsetHeight;
    el.classList.add("animate-fade-up");
  }, [pathname]);

  return (
    <div ref={ref} className="animate-fade-up">
      {children}
    </div>
  );
}
