"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const router = useRouter();
  const [is2FAEnabled, setIs2FAEnabled] = useState<boolean | null>(null);
  const [hasSecondaryPass, setHasSecondaryPass] = useState<boolean | null>(null);
  const [backupCodesCount, setBackupCodesCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setIs2FAEnabled((data?.totp ?? []).some((f) => f.status === "verified"));
    }).catch(() => setIs2FAEnabled(false));

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("secondary_password_hash").eq("id", user.id).maybeSingle()
        .then(({ data }) => setHasSecondaryPass(!!data?.secondary_password_hash))
        .then(undefined, () => setHasSecondaryPass(false));
      supabase.rpc("get_backup_codes_count", { user_id: user.id })
        .then(({ data }) => setBackupCodesCount(data ?? 0))
        .then(undefined, () => setBackupCodesCount(0));
    });
  }, []);

  const sections = [
    {
      label: "Personal Info",
      description: "Change your email address",
      href: "/settings/personal-info",
      badge: null,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
      ),
    },
    {
      label: "Security",
      description: "Change your password",
      href: "/settings/security",
      badge: null,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
    {
      label: "2-Step Verification",
      description: "Protect your account with Google Authenticator",
      href: "/settings/2fa",
      badge: is2FAEnabled,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      label: "Secondary Password",
      description: "Backup password to recover your account",
      href: "/settings/secondary-password",
      badge: hasSecondaryPass,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
        </svg>
      ),
    },
    {
      label: "Backup Codes",
      description: "One-time codes to access your account",
      href: "/settings/backup-codes",
      badge: backupCodesCount !== null ? backupCodesCount > 0 : null,
      badgeLabel: backupCodesCount !== null && backupCodesCount > 0 ? `${backupCodesCount} left` : backupCodesCount === 0 ? "Off" : null,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-zinc-800">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-zinc-800 transition">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <span className="font-bold text-lg">Account Centre</span>
      </div>

      <p className="text-zinc-500 text-sm px-4 py-4">Manage your account information and security settings.</p>

      <div className="flex flex-col px-2 gap-1">
        {sections.map((s) => (
          <button
            key={s.href}
            onClick={() => router.push(s.href)}
            className="flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-900 active:bg-zinc-800 transition text-left w-full"
          >
            <span className="text-zinc-300">{s.icon}</span>
            <div className="flex-1">
              <p className="font-semibold text-[15px]">{s.label}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{s.description}</p>
            </div>
            {/* status badge */}
            {s.badge !== null && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full mr-1 ${
                s.badge === true
                  ? "bg-green-500/20 text-green-400"
                  : "bg-zinc-800 text-zinc-500"
              }`}>
                {(s as any).badgeLabel ?? (s.badge === true ? "On" : "Off")}
              </span>
            )}
            <svg className="text-zinc-600 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
