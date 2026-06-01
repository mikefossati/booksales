"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";

type ProfileData = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export default function EditProfileForm({ profile }: { profile: ProfileData }) {
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [avatarUrl, setAvatarUrl]     = useState(profile.avatarUrl ?? "");
  const [saved, setSaved]             = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();
  const router = useRouter();

  const initials = (profile.displayName || profile.email || "?").charAt(0).toUpperCase();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false); setError(null);
    startTransition(async () => {
      const result = await updateProfile({
        profileId:   profile.id,
        displayName,
        avatarUrl:   avatarUrl || undefined,
      });
      if (result.error) { setError(result.error); }
      else { setSaved(true); router.refresh(); }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      {/* Avatar preview */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[var(--color-accent-light)] flex items-center justify-center overflow-hidden shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" onError={() => setAvatarUrl("")} />
          ) : (
            <span className="text-2xl font-semibold text-[var(--color-accent)]">{initials}</span>
          )}
        </div>
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="avatar-url">URL de foto de perfil</Label>
          <Input
            id="avatar-url"
            type="url"
            value={avatarUrl}
            onChange={e => setAvatarUrl(e.target.value)}
            placeholder="https://..."
          />
          <p className="text-xs text-[var(--color-text-muted)]">Pega el enlace de cualquier imagen online</p>
        </div>
      </div>

      {/* Display name */}
      <div className="space-y-1.5">
        <Label htmlFor="display-name">Nombre artístico</Label>
        <Input
          id="display-name"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="Como quieres que aparezca en la app"
        />
      </div>

      {/* Email (read-only) */}
      <div className="space-y-1.5">
        <Label>Correo electrónico</Label>
        <Input value={profile.email} readOnly className="bg-[var(--color-bg)] text-[var(--color-text-muted)] cursor-default" />
        <p className="text-xs text-[var(--color-text-muted)]">Para cambiar tu correo, contacta al soporte</p>
      </div>

      {error && (
        <p className="text-sm text-[var(--color-danger)] bg-[var(--color-danger)]/8 rounded-[var(--radius-sm)] px-3 py-2">{error}</p>
      )}

      {saved && (
        <p className="flex items-center gap-1.5 text-sm text-[var(--color-success)]">
          <CheckCircle2 size={15} /> Perfil actualizado
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
