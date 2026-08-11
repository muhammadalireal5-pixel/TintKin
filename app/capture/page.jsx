"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { analyzeAndSaveSelfie, uploadSelfieServerAction, getUsageQuotas } from "@/app/lib/actions";
import { useToast } from "@/app/components/ToastProvider";
import { FlipHorizontal, Camera, Image as ImageIcon, ArrowRight, X, CheckCircle2, AlertCircle, Loader2, Lock, ArrowLeft } from "lucide-react";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = "ml_default";

export default function CapturePage() {
    const router = useRouter();
    const { showToast } = useToast();
    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    const [status, setStatus] = useState(null); // { type: "info"|"success"|"error", msg: string }
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isFlipped, setIsFlipped] = useState(false);
    const [quotas, setQuotas] = useState(null);

    useEffect(() => {
        const fetchQuotas = async () => {
            try {
                const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const data = await getUsageQuotas(tz);
                setQuotas(data);
            } catch (err) {
                console.error("Failed to fetch quotas", err);
            }
        };
        fetchQuotas();
    }, []);

    const uploadToCloudinary = async (file) => {
        const form = new FormData();
        form.append("file", file);
        if (isFlipped) form.append("flip", "true");
        
        const res = await uploadSelfieServerAction(form);
        if (!res.success) throw new Error(res.error || "Upload failed");
        
        return res.url;
    };

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Show preview and wait for confirmation
        setPreview(URL.createObjectURL(file));
        setSelectedFile(file);
        setIsFlipped(false); // reset flip state
        setStatus(null);
        e.target.value = "";
    };

    const confirmUpload = async () => {
        if (!selectedFile) return;
        setLoading(true);
        setStatus({ type: "info", msg: "Uploading photo…" });

        try {
            const imgUrl = await uploadToCloudinary(selectedFile);
            setStatus({ type: "info", msg: "Analysing your skin… (3–5s)" });

            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const res = await analyzeAndSaveSelfie(imgUrl, tz);

            if (res.success) {
                if (res.habitsChanged) {
                    setTimeout(() => showToast({ type: "habit", title: "New habits recommended", message: "Your habits have been updated based on today's scan." }), 500);
                }
                if (res.workoutChanged) {
                    setTimeout(() => showToast({ type: "workout", title: "New workout suggested", message: "Check your dashboard for a fresh facial workout." }), 1000);
                }
                if (res.productsChanged) {
                    setTimeout(() => showToast({ type: "product", title: "New products recommended", message: "Your 30-day product cycle has refreshed!" }), 1500);
                }

                setStatus({ type: "success", msg: "Done! Opening your journal…" });
                setTimeout(() => router.push("/dashboard"), 900);
            } else {
                setStatus({ type: "error", msg: `Oops: ${res.error}` });
                setLoading(false);
            }
        } catch {
            setStatus({ type: "error", msg: "Upload failed. Please try again." });
            setLoading(false);
        }
    };

    return (
        <div className="capture-page">
            {/* Hidden native inputs */}
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleFile}
                className="sr-only"
                aria-hidden="true"
            />
            <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="sr-only"
                aria-hidden="true"
            />

            {/* Ambient blobs */}
            <div className="blob blob-1" aria-hidden="true" />
            <div className="blob blob-2" aria-hidden="true" />

            <div className="capture-card">
                {/* Header */}
                <div className="capture-header">
                    <div className="camera-badge">
                        <Camera size={26} strokeWidth={2} />
                    </div>
                    <h1 className="capture-title">Today's Entry</h1>
                    <p className="capture-subtitle">
                        A clear, front-facing photo in good lighting gives the best results.
                    </p>
                </div>

                {/* Preview or CTA */}
                {preview ? (
                    <div>
                        <div className="preview-wrap">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src={preview} 
                                alt="Your selfie preview" 
                                className="preview-img" 
                                style={{ transform: isFlipped ? 'scaleX(-1)' : 'none' }}
                            />
                            {loading && (
                                <div className="preview-overlay">
                                    <div className="spinner-ring" />
                                </div>
                            )}
                        </div>
                        
                        {!loading && (
                            <div className="preview-actions flex gap-2 mt-4 w-full">
                                <button 
                                    className="cta-btn cta-secondary flex-1 justify-center" 
                                    onClick={() => setIsFlipped(!isFlipped)}
                                >
                                    Flip <FlipHorizontal size={18} className="ml-1" />
                                </button>
                                <button 
                                    className="cta-btn cta-primary flex-[2] justify-center" 
                                    onClick={confirmUpload}
                                >
                                    Analyze
                                </button>
                                <button 
                                    className="cta-btn cta-secondary cta-cancel justify-center" 
                                    onClick={() => { setPreview(null); setSelectedFile(null); }}
                                    aria-label="Cancel"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="cta-group">
                        {quotas && quotas.scans.used >= quotas.scans.limit && (
                            <div className="mb-4 p-4 rounded-xl bg-orange-50 border border-orange-100 text-orange-800 text-sm flex items-start gap-2">
                                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-semibold text-base">Daily Scan Limit Reached</p>
                                    <p className="mt-0.5 opacity-90">You've used your 1 scan for today. Come back tomorrow for a new scan!</p>
                                </div>
                            </div>
                        )}
                        {/* Camera */}
                        <button
                            className="cta-btn cta-primary"
                            onClick={() => cameraInputRef.current?.click()}
                            disabled={loading || (quotas && quotas.scans.used >= quotas.scans.limit)}
                        >
                            <span className="cta-icon">
                                <Camera size={22} strokeWidth={2} />
                            </span>
                            <span className="cta-text">
                                <span className="cta-label">Take a Photo</span>
                                <span className="cta-hint">Opens your camera directly</span>
                            </span>
                            <span className="cta-arrow"><ArrowRight size={16} /></span>
                        </button>

                        <div className="or-divider">
                            <span /><p>or</p><span />
                        </div>

                        {/* Gallery */}
                        <button
                            className="cta-btn cta-secondary"
                            onClick={() => galleryInputRef.current?.click()}
                            disabled={loading || (quotas && quotas.scans.used >= quotas.scans.limit)}
                        >
                            <span className="cta-icon cta-icon-gallery">
                                <ImageIcon size={20} strokeWidth={2} />
                            </span>
                            <span className="cta-text">
                                <span className="cta-label">Upload from Gallery</span>
                                <span className="cta-hint">Choose an existing photo</span>
                            </span>
                        </button>
                    </div>
                )}

                {/* Status pill */}
                {status && (
                    <div className={`status-pill status-${status.type}`}>
                        {status.type === "success" && <CheckCircle2 size={16} />}
                        {status.type === "error" && <AlertCircle size={16} />}
                        {status.type === "info" && <Loader2 size={16} className="spin" />}
                        {status.msg}
                    </div>
                )}

                {/* Retake option when preview is shown and not loading */}
                {preview && !loading && (
                    <button
                        className="retake-btn flex items-center justify-center w-full mt-2"
                        onClick={() => { setPreview(null); setStatus(null); }}
                    >
                        <ArrowLeft size={14} className="mr-1" /> Try a different photo
                    </button>
                )}

                {/* Privacy note */}
                <p className="privacy-note mt-6">
                    <Lock size={12} strokeWidth={2} />
                    Private &amp; securely processed
                </p>
            </div>

            <style>{`
                .capture-page {
                    min-height: calc(100vh - 64px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1.25rem;
                    background-color: var(--tk-bg);
                    position: relative;
                    overflow: hidden;
                }

                /* ── Blobs ─────────────────────────────────────────── */
                .blob {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(80px);
                    pointer-events: none;
                    z-index: 0;
                }
                .blob-1 {
                    width: 320px; height: 320px;
                    top: -80px; left: -60px;
                    background: rgba(230,230,250,0.6);
                    animation: orbFloat 14s ease-in-out infinite;
                }
                .blob-2 {
                    width: 260px; height: 260px;
                    bottom: -60px; right: -40px;
                    background: rgba(255,218,185,0.5);
                    animation: orbFloat 18s ease-in-out infinite reverse;
                }

                /* ── Card ──────────────────────────────────────────── */
                .capture-card {
                    position: relative;
                    z-index: 1;
                    width: 100%;
                    max-width: 400px;
                    background: rgba(255, 255, 255, 0.35);
                    backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px);
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    border-radius: 2rem;
                    padding: 1.5rem;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
                    animation: fadeInUp 0.6s ease both;
                }
                
                @media (min-width: 640px) {
                    .capture-card {
                        padding: 2.25rem 2rem 2rem;
                        border-radius: 2.5rem;
                    }
                }

                /* ── Header ────────────────────────────────────────── */
                .capture-header { text-align: center; margin-bottom: 1.75rem; }

                .camera-badge {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 58px; height: 58px;
                    border-radius: 50%;
                    background: var(--tk-accent-lavender);
                    color: var(--tk-text-primary);
                    box-shadow: 0 6px 20px rgba(230,230,250,0.9);
                    margin-bottom: 1rem;
                }

                .capture-title {
                    font-family: var(--font-display);
                    font-size: clamp(1.75rem, 6vw, 2.2rem);
                    font-weight: 600;
                    color: var(--tk-text-primary);
                    margin: 0 0 0.5rem;
                    line-height: 1.2;
                }
                .capture-subtitle {
                    font-size: 0.875rem;
                    color: var(--tk-text-muted);
                    line-height: 1.55;
                    margin: 0;
                }

                /* ── CTAs ──────────────────────────────────────────── */
                .cta-group {
                    display: flex;
                    flex-direction: column;
                    margin-bottom: 1.25rem;
                }

                .cta-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.875rem;
                    width: 100%;
                    padding: 1.1rem 1.25rem;
                    border-radius: 1.25rem;
                    border: none;
                    cursor: pointer;
                    transition: all 0.22s ease;
                    font-family: var(--font-body);
                    -webkit-tap-highlight-color: transparent;
                    text-align: left;
                }
                .cta-btn:disabled { opacity: 0.5; pointer-events: none; }
                .cta-btn:active { transform: scale(0.97); }

                /* Primary — camera */
                .cta-primary {
                    background: var(--tk-text-primary);
                    color: #fff;
                    box-shadow: 0 6px 24px rgba(44,62,80,0.18);
                }
                .cta-primary:hover {
                    background: #3a5068;
                    transform: translateY(-2px);
                    box-shadow: 0 10px 30px rgba(44,62,80,0.25);
                }

                /* Secondary — gallery */
                .cta-secondary {
                    background: rgba(255,255,255,0.6);
                    color: var(--tk-text-primary);
                    border: 1px solid rgba(44,62,80,0.06);
                    box-shadow: 0 2px 10px rgba(44,62,80,0.04);
                }
                .cta-secondary:hover {
                    background: rgba(255,255,255,0.85);
                    transform: translateY(-1px);
                    box-shadow: 0 6px 18px rgba(44,62,80,0.08);
                }
                .cta-cancel {
                    width: auto;
                    flex: 0 0 auto;
                    padding: 1rem;
                }

                .cta-icon {
                    flex-shrink: 0;
                    width: 42px; height: 42px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.22s ease;
                }
                .cta-primary .cta-icon { background: rgba(255,255,255,0.15); }
                .cta-icon-gallery {
                    background: var(--tk-accent-lavender);
                    color: var(--tk-text-primary);
                }
                .cta-btn:hover .cta-icon { transform: scale(1.08); }

                .cta-text {
                    display: flex;
                    flex-direction: column;
                    gap: 0.1rem;
                    flex: 1;
                    min-width: 0;
                }
                .cta-label {
                    font-size: 0.9375rem;
                    font-weight: 600;
                    line-height: 1.2;
                }
                .cta-hint {
                    font-size: 0.75rem;
                    opacity: 0.6;
                }
                .cta-arrow {
                    font-size: 1rem;
                    opacity: 0.4;
                    flex-shrink: 0;
                }

                /* ── OR divider ────────────────────────────────────── */
                .or-divider {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.875rem 0;
                }
                .or-divider span {
                    flex: 1;
                    height: 1px;
                    background: rgba(44,62,80,0.1);
                }
                .or-divider p {
                    font-size: 0.7rem;
                    color: var(--tk-text-faint);
                    font-weight: 600;
                    margin: 0;
                    text-transform: uppercase;
                    letter-spacing: 0.07em;
                }

                /* ── Photo preview ─────────────────────────────────── */
                .preview-wrap {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 3/4;
                    border-radius: 1.25rem;
                    overflow: hidden;
                    margin-bottom: 1.25rem;
                    background: var(--tk-accent-lavender);
                    box-shadow: 0 4px 20px rgba(44,62,80,0.12);
                }
                .preview-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }
                .preview-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(253,251,247,0.7);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .spinner-ring {
                    width: 48px; height: 48px;
                    border-radius: 50%;
                    border: 3px solid rgba(138,154,91,0.2);
                    border-top-color: var(--tk-accent-sage);
                    animation: spin 0.85s linear infinite;
                }

                /* ── Status pill ───────────────────────────────────── */
                .status-pill {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.45rem;
                    padding: 0.6rem 1.1rem;
                    border-radius: 9999px;
                    font-size: 0.8125rem;
                    font-weight: 500;
                    margin-bottom: 1rem;
                    animation: fadeIn 0.3s ease both;
                }
                .status-success { background: rgba(138,154,91,0.12); color: var(--tk-accent-sage); border: 1px solid rgba(138,154,91,0.2); }
                .status-error   { background: rgba(224,84,84,0.08);  color: #c94444;               border: 1px solid rgba(224,84,84,0.2); }
                .status-info    { background: rgba(230,230,250,0.5); color: var(--tk-text-primary); border: 1px solid rgba(230,230,250,0.4); }

                /* ── Retake ────────────────────────────────────────── */
                .retake-btn {
                    display: block;
                    width: 100%;
                    text-align: center;
                    font-size: 0.8125rem;
                    color: var(--tk-text-muted);
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0.25rem 0 0.75rem;
                    font-family: var(--font-body);
                    transition: color 0.2s;
                }
                .retake-btn:hover { color: var(--tk-text-primary); }

                /* ── Privacy note ──────────────────────────────────── */
                .privacy-note {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.4rem;
                    font-size: 0.75rem;
                    color: var(--tk-text-faint);
                    margin: 0;
                }

                /* ── Animations ────────────────────────────────────── */
                @keyframes spin { to { transform: rotate(360deg); } }
                .spin { animation: spin 1.1s linear infinite; }

                /* sr-only */
                .sr-only {
                    position: absolute;
                    width: 1px; height: 1px;
                    padding: 0; margin: -1px;
                    overflow: hidden;
                    clip: rect(0,0,0,0);
                    white-space: nowrap;
                    border-width: 0;
                }
            `}</style>
        </div>
    );
}