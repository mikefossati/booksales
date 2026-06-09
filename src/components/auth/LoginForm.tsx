"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "signup";

// Map Supabase auth errors (English) to user-facing Spanish messages
const AUTH_ERRORS: { match: RegExp; message: string }[] = [
  { match: /invalid login credentials/i,        message: "Correo o contraseña incorrectos." },
  { match: /email not confirmed/i,              message: "Tu correo aún no está confirmado. Revisa tu bandeja de entrada." },
  { match: /user already registered/i,          message: "Ya existe una cuenta con este correo. Intenta entrar." },
  { match: /password should be at least/i,      message: "La contraseña debe tener al menos 6 caracteres." },
  { match: /rate limit|too many requests/i,     message: "Demasiados intentos. Espera un momento y vuelve a intentarlo." },
  { match: /network|fetch/i,                    message: "Problema de conexión. Revisa tu internet e intenta de nuevo." },
  { match: /weak password|easy to guess|pwned/i, message: "Esa contraseña es muy común o ha sido filtrada. Elige una más segura." },
];

// Errors arriving via /auth/callback redirect (?error=<code>)
const CALLBACK_ERRORS: Record<string, string> = {
  otp_expired:         "El enlace de confirmación expiró o ya fue usado. Ingresa tu correo y solicita uno nuevo.",
  access_denied:       "El enlace de confirmación no es válido. Ingresa tu correo y solicita uno nuevo.",
  verification_failed: "No pudimos verificar tu correo. Ingresa tu correo y solicita un nuevo enlace.",
};

function translateAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : "";
  for (const { match, message } of AUTH_ERRORS) {
    if (match.test(raw)) return message;
  }
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}

export default function LoginForm() {
  const searchParams  = useSearchParams();
  const callbackError = searchParams.get("error");

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(
    callbackError ? (CALLBACK_ERRORS[callbackError] ?? CALLBACK_ERRORS.verification_failed) : null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(Boolean(callbackError));

  const router = useRouter();
  const supabase = createClient();

  function switchMode() {
    setMode(mode === "login" ? "signup" : "login");
    setError(null);
    setMessage(null);
    setConfirmPassword("");
  }

  async function handleResend() {
    if (!email) {
      setError("Escribe tu correo arriba y vuelve a intentar.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      setMessage("Te enviamos un nuevo correo de confirmación.");
      setShowResend(false);
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (mode === "signup" && password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (/email not confirmed/i.test(error.message)) setShowResend(true);
          throw error;
        }
        router.push("/dashboard");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        setMessage("Revisa tu correo para confirmar tu cuenta.");
      }
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          type="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {mode === "signup" && (
          <p className="text-[11px] text-[var(--color-text-muted)]">Mínimo 6 caracteres.</p>
        )}
      </div>

      {mode === "signup" && (
        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirma tu contraseña</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/8 rounded-[var(--radius-sm)] px-3 py-2">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-[var(--color-success)] bg-[var(--color-success)]/8 rounded-[var(--radius-sm)] px-3 py-2">
          {message}
        </p>
      )}

      {showResend && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleResend}
          disabled={loading}
        >
          Reenviar correo de confirmación
        </Button>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Cargando..." : mode === "login" ? "Entrar" : "Crear cuenta"}
      </Button>

      <button
        type="button"
        onClick={switchMode}
        className="w-full text-sm text-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
      >
        {mode === "login"
          ? "¿No tienes cuenta? Crear una →"
          : "¿Ya tienes cuenta? Entrar →"}
      </button>
    </form>
  );
}
