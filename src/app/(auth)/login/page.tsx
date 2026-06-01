import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-10 text-center">
        <h1
          className="text-5xl font-semibold text-[var(--color-accent)] tracking-tight"
          style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}
        >
          Mis Libros
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-3 leading-relaxed">
          El lugar donde tu trabajo creativo<br />se convierte en números claros
        </p>
      </div>

      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-7 shadow-[var(--shadow-float)] border border-[var(--color-border)]">
        <LoginForm />
      </div>
    </div>
  );
}
