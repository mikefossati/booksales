import { Suspense } from "react";
import { AutoriappLogo } from "@/components/brand/Logo";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-10 text-center">
        <div className="flex justify-center mb-4">
          <AutoriappLogo size="lg" />
        </div>
        <p className="text-sm text-[var(--color-text-muted)] mt-3 leading-relaxed">
          El lugar donde tu trabajo creativo<br />se convierte en números claros
        </p>
      </div>

      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-7 shadow-[var(--shadow-float)] border border-[var(--color-border)]">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
