"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

export function AuthForm({ mode }: { mode: "signup" | "signin" }) {
  const router = useRouter();
  const isSignup = mode === "signup";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${isSignup ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSignup ? { name, email, password } : { email, password },
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        setBusy(false);
        return;
      }
      router.replace("/hub");
      router.refresh();
    } catch {
      setError("Network hiccup. Check your connection and try again.");
      setBusy(false);
    }
  }

  const inputCls =
    "h-13 w-full rounded-[14px] border border-white/12 bg-elevated px-4 text-[15px] text-cream outline-none placeholder:text-clay focus:border-gold/50";

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-4">
      {isSignup && (
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-sand">
            What should we call you?
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            className={inputCls}
            required
          />
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-sand">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className={inputCls}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-sand">Password</span>
        <span className="relative block">
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isSignup ? "At least 8 characters" : "Your password"}
            autoComplete={isSignup ? "new-password" : "current-password"}
            className={`${inputCls} pr-12`}
            required
            minLength={isSignup ? 8 : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            aria-label={showPw ? "Hide password" : "Show password"}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-clay hover:text-cream"
          >
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </span>
      </label>

      {error && (
        <p className="rounded-[12px] border border-alert/30 bg-alert/10 px-3.5 py-2.5 text-[13px] text-alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="flex h-13 w-full items-center justify-center rounded-[16px] bg-gradient-to-r from-gold to-violet font-display text-[16px] font-semibold text-canvas transition active:scale-[0.98] disabled:opacity-50"
      >
        {busy
          ? isSignup
            ? "Setting up your office…"
            : "Opening the doors…"
          : isSignup
            ? "Create account"
            : "Sign in"}
      </button>

      <p className="text-center text-[13.5px] text-sand">
        {isSignup ? "Already in the family? " : "New to Oretha? "}
        <Link
          href={isSignup ? "/signin" : "/signup"}
          className="font-semibold text-gold"
        >
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
