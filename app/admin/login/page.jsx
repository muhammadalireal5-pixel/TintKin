"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, ArrowRight, Loader2, ShieldCheck } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1 = email, 2 = OTP
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSendOTP = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to send code.");
        triggerShake();
      } else {
        setStep(2);
        setResendCooldown(60);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      }
    } catch {
      setError("Network error. Please try again.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleOTPChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError("");

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5 && newOtp.every((d) => d)) {
      verifyOTP(newOtp.join(""));
    }
  };

  const handleOTPKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter" && otp.every((d) => d)) {
      verifyOTP(otp.join(""));
    }
  };

  const handleOTPPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    const nextIdx = Math.min(pasted.length, 5);
    otpRefs.current[nextIdx]?.focus();
    if (pasted.length === 6) {
      verifyOTP(pasted);
    }
  };

  const verifyOTP = async (code) => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Invalid code.");
        triggerShake();
        setOtp(["", "", "", "", "", ""]);
        otpRefs.current[0]?.focus();
      } else {
        router.push("/admin");
      }
    } catch {
      setError("Network error. Please try again.");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background orbs */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "-10%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(230,230,250,0.6) 0%, transparent 70%)",
          animation: "orbFloat 20s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-15%",
          right: "-5%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,218,185,0.6) 0%, transparent 70%)",
          animation: "orbFloat 15s ease-in-out infinite reverse",
          pointerEvents: "none",
        }}
      />

      {/* Login Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "var(--tk-surface-glass)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid var(--tk-border-glass)",
          borderRadius: "24px",
          padding: "48px 36px",
          boxShadow: "var(--tk-glow-card)",
          animation: shake
            ? "shake 0.5s ease-in-out"
            : "fadeInUp 0.6s ease both",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "var(--tk-accent-lavender)",
              marginBottom: "16px",
            }}
          >
            <ShieldCheck size={28} style={{ color: "var(--tk-text-primary)" }} />
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display, 'Playfair Display', serif)",
              fontSize: "24px",
              fontWeight: 600,
              color: "var(--tk-text-primary)",
              margin: "0 0 6px",
              letterSpacing: "-0.5px",
            }}
          >
            TintKin Admin
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "var(--tk-text-muted)",
              margin: 0,
            }}
          >
            {step === 1 ? "Enter your admin email to continue" : "Enter the 6-digit code sent to your email"}
          </p>
        </div>

        {/* Step 1: Email */}
        {step === 1 && (
          <form onSubmit={handleSendOTP} style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ position: "relative", marginBottom: "20px" }}>
              <Mail
                size={18}
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--tk-text-faint)",
                }}
              />
              <input
                type="email"
                placeholder="admin@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                required
                autoFocus
                style={{
                  width: "100%",
                  padding: "14px 16px 14px 44px",
                  background: "rgba(255,255,255,0.6)",
                  border: error ? "1px solid rgba(239,68,68,0.5)" : "1px solid var(--tk-border-solid)",
                  borderRadius: "14px",
                  color: "var(--tk-text-primary)",
                  fontSize: "15px",
                  outline: "none",
                  transition: "border-color 0.2s",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => { if (!error) e.target.style.borderColor = "var(--tk-text-primary)"; }}
                onBlur={(e) => { if (!error) e.target.style.borderColor = "var(--tk-border-solid)"; }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              style={{
                width: "100%",
                padding: "14px",
                background: "var(--tk-text-primary)",
                border: "none",
                borderRadius: "14px",
                color: "#FDFBF7",
                fontSize: "15px",
                fontWeight: 500,
                cursor: loading ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.2s",
                fontFamily: "inherit",
                opacity: !email ? 0.5 : loading ? 0.8 : 1,
              }}
              onMouseEnter={(e) => { if (!loading) e.target.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { if (!loading) e.target.style.opacity = "1"; }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
              {loading ? "Sending code…" : "Send verification code"}
            </button>
          </form>
        )}

        {/* Step 2: OTP */}
        {step === 2 && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "center",
                marginBottom: "24px",
              }}
            >
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (otpRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOTPChange(i, e.target.value)}
                  onKeyDown={(e) => handleOTPKeyDown(i, e)}
                  onPaste={i === 0 ? handleOTPPaste : undefined}
                  style={{
                    width: "48px",
                    height: "56px",
                    textAlign: "center",
                    fontSize: "22px",
                    fontWeight: 600,
                    background: "rgba(255,255,255,0.6)",
                    border: error
                      ? "1px solid rgba(239,68,68,0.5)"
                      : digit
                        ? "1px solid var(--tk-text-primary)"
                        : "1px solid var(--tk-border-solid)",
                    borderRadius: "12px",
                    color: "var(--tk-text-primary)",
                    outline: "none",
                    transition: "all 0.2s",
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--tk-text-primary)";
                    e.target.style.boxShadow = "var(--tk-glow-focus)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = digit ? "var(--tk-text-primary)" : "var(--tk-border-solid)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              ))}
            </div>

            {loading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  color: "var(--tk-text-muted)",
                  fontSize: "14px",
                  marginBottom: "16px",
                }}
              >
                <Loader2 size={16} className="animate-spin" />
                Verifying…
              </div>
            )}

            {/* Resend OTP */}
            <div style={{ textAlign: "center", marginTop: "8px" }}>
              {resendCooldown > 0 ? (
                <p style={{ fontSize: "13px", color: "var(--tk-text-muted)", margin: 0 }}>
                  Resend code in {resendCooldown}s
                </p>
              ) : (
                <button
                  onClick={handleSendOTP}
                  disabled={loading}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--tk-text-muted)",
                    fontSize: "13px",
                    cursor: "pointer",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px",
                    fontFamily: "inherit",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.target.style.color = "var(--tk-text-primary)")}
                  onMouseLeave={(e) => (e.target.style.color = "var(--tk-text-muted)")}
                >
                  Resend code
                </button>
              )}
            </div>

            {/* Back to email */}
            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <button
                onClick={() => { setStep(1); setOtp(["", "", "", "", "", ""]); setError(""); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--tk-text-faint)",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.target.style.color = "var(--tk-text-muted)")}
                onMouseLeave={(e) => (e.target.style.color = "var(--tk-text-faint)")}
              >
                ← Use a different email
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <p
            style={{
              color: "#ef4444",
              fontSize: "13px",
              textAlign: "center",
              marginTop: "16px",
              marginBottom: 0,
              animation: "fadeIn 0.2s ease",
            }}
          >
            {error}
          </p>
        )}
      </div>

      {/* Shake keyframe */}
      <style>{`
        @keyframes shake {
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
