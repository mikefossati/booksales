"use client";

import { useState } from "react";
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
  { match: /password should be at least/i,      message: "La contraseña debe tener al menos 8 caracteres." },
  { match: /rate limit|too many requests/i,     message: "Demasiados intentos. Espera un momento y vuelve a intentarlo." },
  { match: /network|fetch/i,                    message: "Problema de conexión. Revisa tu internet e intenta de nuevo." },
  { match: /weak password|easy to guess|pwned/i, message: "Esa contraseña es muy común o ha sido filtrada. Elige una más segura." },
];

function translateAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : "";
  for (const { match, message } of AUTH_ERRORS) {
    if (match.test(raw)) return message;
  }
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}

export default function LoginForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  function switchMode() {
    setMode(mode === "login" ? "signup" : "login");
    setError(null);
    setMessage(null);
    setConfirmPassword("");
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
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
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
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {mode === "signup" && (
          <p className="text-[11px] text-[var(--color-text-muted)]">Mínimo 8 caracteres.</p>
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
            minLength={8}
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
