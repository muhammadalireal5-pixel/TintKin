"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Sign in failed.");
        setPassword("");
        triggerShake();
        setLoading(false);
      } else {
        router.replace("/admin");
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
      triggerShake();
      setLoading(false);
    }
  };

  const canSubmit = email.trim() && password && !loading;

  return (
    <div className="admin-login">
      <div className={`admin-login-card ${shake ? "is-shaking" : ""}`}>
        <div className="admin-login-head">
          <div className="admin-login-badge">
            <ShieldCheck size={26} />
          </div>
          <h1>TintKin Admin</h1>
          <p>Sign in with your admin credentials</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <label className="admin-field">
            <span className="admin-field-label">Email</span>
            <span className={`admin-input-wrap ${error ? "has-error" : ""}`}>
              <Mail size={18} aria-hidden="true" />
              <input
                type="email"
                inputMode="email"
                autoComplete="username"
                placeholder="admin@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                autoFocus
                required
              />
            </span>
          </label>

          <label className="admin-field">
            <span className="admin-field-label">Password</span>
            <span className={`admin-input-wrap ${error ? "has-error" : ""}`}>
              <Lock size={18} aria-hidden="true" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                required
              />
              <button
                type="button"
                className="admin-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>

          {error && <p className="admin-error" role="alert">{error}</p>}

          <button type="submit" className="admin-submit" disabled={!canSubmit}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>

      <style>{`
        .admin-login {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
          background: var(--tk-bg);
        }
        .admin-login-card {
          width: 100%;
          max-width: 400px;
          background: #fff;
          border: 1px solid var(--tk-border-solid);
          border-radius: 24px;
          padding: 40px 32px 32px;
          box-shadow: 0 1px 2px rgba(44,62,80,0.04), 0 12px 32px -8px rgba(44,62,80,0.12);
          animation: fadeInUp 0.5s ease both;
        }
        .admin-login-card.is-shaking { animation: adminShake 0.45s ease-in-out; }
        .admin-login-head { text-align: center; margin-bottom: 28px; }
        .admin-login-badge {
          display: inline-flex; align-items: center; justify-content: center;
          width: 56px; height: 56px; border-radius: 16px;
          background: var(--tk-accent-lavender); color: var(--tk-text-primary);
          margin-bottom: 16px;
        }
        .admin-login-head h1 {
          font-family: var(--font-display, 'Playfair Display', serif);
          font-size: 24px; font-weight: 600; letter-spacing: -0.5px;
          color: var(--tk-text-primary); margin: 0 0 6px;
        }
        .admin-login-head p { font-size: 14px; color: var(--tk-text-muted); margin: 0; }

        .admin-field { display: block; margin-bottom: 16px; }
        .admin-field-label {
          display: block; font-size: 13px; font-weight: 500;
          color: var(--tk-text-primary); margin-bottom: 6px;
        }
        .admin-input-wrap {
          display: flex; align-items: center; gap: 10px;
          padding: 0 14px; height: 50px;
          background: var(--tk-bg);
          border: 1px solid rgba(44,62,80,0.12);
          border-radius: 14px;
          color: var(--tk-text-faint);
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .admin-input-wrap:focus-within {
          border-color: var(--tk-text-primary);
          box-shadow: 0 0 0 3px rgba(44,62,80,0.08);
        }
        .admin-input-wrap.has-error { border-color: rgba(220,38,38,0.5); }
        .admin-input-wrap input {
          flex: 1; min-width: 0; height: 100%;
          border: none; outline: none; background: transparent;
          color: var(--tk-text-primary);
          font-family: inherit;
          font-size: 16px; /* >=16px stops iOS zooming on focus */
        }
        .admin-eye {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; margin-right: -8px;
          border: none; background: none; border-radius: 10px;
          color: var(--tk-text-faint); cursor: pointer;
        }
        .admin-eye:hover { color: var(--tk-text-primary); background: rgba(44,62,80,0.05); }

        .admin-error {
          font-size: 13px; color: #dc2626;
          background: #fef2f2; border: 1px solid #fecaca;
          border-radius: 12px; padding: 10px 12px; margin: 0 0 16px;
        }
        .admin-submit {
          width: 100%; height: 50px; margin-top: 8px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          border: none; border-radius: 14px;
          background: var(--tk-text-primary); color: #FDFBF7;
          font-family: inherit; font-size: 15px; font-weight: 500;
          cursor: pointer; transition: background 0.15s, opacity 0.15s;
        }
        .admin-submit:hover:not(:disabled) { background: #3a5068; }
        .admin-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        @media (max-width: 480px) {
          .admin-login { align-items: flex-start; padding-top: 48px; }
          .admin-login-card { padding: 32px 20px 24px; border-radius: 20px; }
        }
        @keyframes adminShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
