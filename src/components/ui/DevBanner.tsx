"use client";

const appEnv    = process.env.NEXT_PUBLIC_APP_ENV;
const gitBranch = process.env.NEXT_PUBLIC_GIT_BRANCH;
const gitSha    = process.env.NEXT_PUBLIC_GIT_COMMIT_SHA;

export default function DevBanner() {
  if (appEnv === "production") return null;

  const label = appEnv === "preview" ? "preview" : "development";

  return (
    <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-3 px-4 py-1.5 bg-amber-950/90 backdrop-blur-sm text-amber-300 text-[11px] font-mono pointer-events-none select-none">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
      <span>{label}</span>
      <span className="text-amber-600">·</span>
      <span>branch: <span className="text-amber-200">{gitBranch}</span></span>
      <span className="text-amber-600">·</span>
      <span>commit: <span className="text-amber-200">{gitSha}</span></span>
    </div>
  );
}
