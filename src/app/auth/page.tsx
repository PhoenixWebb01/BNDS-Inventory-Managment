"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName, role: "staff" } },
        });
        if (error) throw error;
        setError("Check your email for a confirmation link!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: "radial-gradient(circle at 25% 25%, rgba(0,107,91,0.06) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(80,68,225,0.04) 0%, transparent 50%)"
      }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="gradient-primary mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl text-base font-bold tracking-wide text-on-primary"
            style={{ boxShadow: "var(--shadow-ambient)" }}>
            BDX
          </div>
          <h1 className="font-[family-name:var(--font-hero)] text-2xl font-bold text-on-surface">
            Boudreaux&apos;s Inventory
          </h1>
          <p className="mt-1 text-[13px] text-on-surface-muted">
            Drug Store Inventory Management System
          </p>
        </div>

        {/* Auth Card — tonal lift */}
        <div className="rounded-2xl bg-surface-card p-8" style={{ boxShadow: "var(--shadow-float)" }}>
          <h2 className="mb-6 font-[family-name:var(--font-hero)] text-xl font-semibold text-on-surface">
            {isSignUp ? "Create Account" : "Sign In"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-on-surface-subtle">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-clinical w-full rounded-lg px-4 py-3 text-[13px]"
                  placeholder="Phoenix Webb"
                  required
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-on-surface-subtle">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-clinical w-full rounded-lg px-4 py-3 text-[13px]"
                placeholder="you@boudreauxrx.com"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.05em] text-on-surface-subtle">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-clinical w-full rounded-lg px-4 py-3 text-[13px]"
                placeholder="Min 6 characters"
                minLength={6}
                required
              />
            </div>

            {error && (
              <div className={`rounded-lg px-4 py-3 text-[13px] font-medium ${
                error.includes("Check your email")
                  ? "bg-success-container text-primary"
                  : "bg-error-container text-on-error-container"
              }`}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="gradient-primary w-full rounded-lg py-3 text-[13px] font-semibold text-on-primary transition-all hover:opacity-90 disabled:opacity-50"
              style={{ boxShadow: "var(--shadow-ambient)" }}
            >
              {loading ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center text-[13px] text-on-surface-muted">
            {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
              className="font-semibold text-primary transition hover:text-primary-container"
            >
              {isSignUp ? "Sign In" : "Create one"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
