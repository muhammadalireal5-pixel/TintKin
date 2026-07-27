"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CldUploadButton } from "next-cloudinary";
import { analyzeAndSaveSelfie } from "@/app/lib/actions";

export default function CapturePage() {
    const router = useRouter();
    const [status, setStatus] = useState("Upload a clear, front-facing selfie — no filters!");
    const [loading, setLoading] = useState(false);

    const handleUpload = async (result) => {
        const imgUrl = result?.info?.secure_url;
        if (!imgUrl) return setStatus("Upload failed — try again");

        setLoading(true);
        setStatus("Analysing your skin with AI… (takes 3–5s)");

        const res = await analyzeAndSaveSelfie(imgUrl);
        setLoading(false);

        if (res.success) {
            setStatus("✅ Done! Taking you to your dashboard…");
            setTimeout(() => router.push("/dashboard"), 1000);
        } else {
            setStatus(`❌ Error: ${res.error}`);
        }
    };

    const isDone = status.includes("✅");
    const isError = status.includes("❌");

    return (
        <div style={{
            minHeight: 'calc(100vh - 68px)',
            background: 'radial-gradient(ellipse at 50% 0%, rgba(224,84,84,0.15) 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(68,49,153,0.2) 0%, transparent 50%), var(--tk-bg)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '40px 24px',
        }}>

            <div style={{
                width: '100%', maxWidth: '460px',
                animation: 'bounceIn 0.55s ease both',
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '60px', height: '60px', borderRadius: '18px',
                        background: 'var(--tk-gradient)',
                        fontSize: '28px', marginBottom: '20px',
                        boxShadow: '0 8px 32px rgba(193,51,131,0.4)',
                    }}>📸</div>
                    <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--tk-text-faint)', marginBottom: '8px' }}>
                        Step 1
                    </p>
                    <h1 style={{
                        fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px',
                        margin: '0 0 12px',
                    }}>
                        Scan Your <span className="tk-gradient-text">Skin</span>
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--tk-text-muted)', margin: 0, lineHeight: 1.6 }}>
                        Our AI analyses 6 skin metrics from a single photo in seconds.
                    </p>
                </div>

                {/* Upload Zone */}
                <div className="tk-glass" style={{
                    borderRadius: '24px',
                    padding: '40px 32px',
                    marginBottom: '16px',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Animated gradient border effect */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        borderRadius: '24px',
                        padding: '1px',
                        background: loading
                            ? 'var(--tk-gradient)'
                            : 'linear-gradient(135deg, rgba(224,84,84,0.3), rgba(68,49,153,0.3))',
                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        WebkitMaskComposite: 'xor',
                        maskComposite: 'exclude',
                        animation: loading ? 'shimmer 1.5s linear infinite' : 'none',
                        backgroundSize: '200% 100%',
                        pointerEvents: 'none',
                    }} />

                    <div style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: '20px',
                        textAlign: 'center',
                    }}>
                        {/* Camera icon */}
                        <div style={{
                            width: '72px', height: '72px',
                            borderRadius: '20px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '32px',
                            boxShadow: loading ? '0 0 32px rgba(193,51,131,0.4)' : 'none',
                            transition: 'box-shadow 0.3s ease',
                        }}>
                            {loading ? '⏳' : '📷'}
                        </div>

                        {loading ? (
                            <div style={{ width: '100%' }}>
                                <p style={{ fontSize: '14px', color: 'var(--tk-text-muted)', marginBottom: '16px' }}>
                                    Analysing your skin…
                                </p>
                                {/* Shimmer bar */}
                                <div style={{
                                    height: '6px', borderRadius: '3px',
                                    background: 'rgba(255,255,255,0.06)',
                                    overflow: 'hidden',
                                }}>
                                    <div className="tk-skeleton" style={{ height: '100%', width: '100%', borderRadius: '3px' }} />
                                </div>
                            </div>
                        ) : (
                            <>
                                <p style={{ fontSize: '14px', color: 'var(--tk-text-muted)', margin: 0 }}>
                                    Drop your selfie here or tap to browse
                                </p>
                                <CldUploadButton
                                    uploadPreset="ml_default"
                                    onUpload={handleUpload}
                                    options={{ maxFiles: 1, resourceType: "image" }}
                                    disabled={loading}
                                    className="tk-btn-primary"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                                        padding: '14px 32px',
                                        borderRadius: '100px',
                                        fontSize: '15px', fontWeight: 600,
                                        fontFamily: 'var(--font-outfit, inherit)',
                                        boxShadow: '0 8px 28px rgba(193,51,131,0.4)',
                                        cursor: 'pointer',
                                        width: '100%', justifyContent: 'center',
                                    }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    Take / Upload Selfie
                                </CldUploadButton>
                            </>
                        )}
                    </div>
                </div>

                {/* Status pill */}
                <div style={{
                    padding: '12px 20px',
                    borderRadius: '100px',
                    textAlign: 'center',
                    fontSize: '13px', fontWeight: 500,
                    background: isDone
                        ? 'rgba(52,211,153,0.12)'
                        : isError
                        ? 'rgba(224,84,84,0.12)'
                        : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isDone ? 'rgba(52,211,153,0.3)' : isError ? 'rgba(224,84,84,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    color: isDone ? '#34d399' : isError ? 'var(--tk-coral)' : 'var(--tk-text-muted)',
                    transition: 'all 0.3s ease',
                }}>
                    {status}
                </div>

                {/* Reassurance */}
                <p style={{
                    textAlign: 'center', fontSize: '12px',
                    color: 'var(--tk-text-faint)', marginTop: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Your photo is analysed privately and never shared.
                </p>
            </div>
        </div>
    );
}