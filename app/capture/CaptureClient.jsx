"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeAndSaveSelfie, uploadSelfieServerAction, getUsageQuotas, acceptScanConsent } from "@/app/lib/actions";
import ScanConsentModal from "@/app/components/ScanConsentModal";
import { useToast } from "@/app/components/ToastProvider";
import { FlipHorizontal, Camera, Image as ImageIcon, X, Sun, Sparkles, ScanFace, Smile, CheckCircle2, AlertCircle, Loader2, Lock, ArrowLeft, Crop, CalendarClock } from "lucide-react";
import ImageCropper from "@/app/components/ImageCropper";
import { ComponentErrorFallback } from "@/app/components/ComponentErrorFallback";
import { refreshReportStatus } from "@/app/components/reportStatus";
import Link from "next/link";
import PageHeader from "@/app/components/ui/PageHeader";

export default function CaptureClient({ precheckPromise, quotasPromise }) {
    const router = useRouter();
    const { showToast } = useToast();
    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingTextIndex, setLoadingTextIndex] = useState(0);
    const [preview, setPreview] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [rawImage, setRawImage] = useState(null);
    const [rawFile, setRawFile] = useState(null);
    const [isCropping, setIsCropping] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);
    const [quotas, setQuotas] = useState(null);
    const [quotasLoaded, setQuotasLoaded] = useState(false);
    const [showConsent, setShowConsent] = useState(false);
    const [savingConsent, setSavingConsent] = useState(false);
    // Server Component kicks this fetch off at request time (before the JS
    // bundle even downloads), so by the time hydration finishes and a click
    // is possible, it has almost always already resolved — see the fallback
    // await in handleActionClick for the rare case it hasn't.
    const [precheck, setPrecheck] = useState(null);
    const [scanStage, setScanStage] = useState(null); // null | 'upload' | 'analyze' | 'done'
    const pendingActionType = useRef(null);
    const browserQuotasLoaded = useRef(false);

    const loadingTexts = [
        "Analyzing skin tone & texture...",
        "Evaluating spots & smoothness...",
        "Calculating your skin age...",
        "Formulating recommendations...",
        "Polishing your skin journal..."
    ];

    useEffect(() => {
        if (!loading || status?.type !== "info") return;
        const interval = setInterval(() => {
            setLoadingTextIndex((prev) => (prev + 1) % loadingTexts.length);
        }, 2500);
        return () => clearInterval(interval);
    }, [loading, status?.type, loadingTexts.length]);

    const openPicker = (type) => {
        if (type === 'camera') cameraInputRef.current?.click();
        else galleryInputRef.current?.click();
    };

    const handleActionClick = async (type) => {
        // precheckPromise always resolves (its own failure fallbacks live
        // server-side in page.jsx) — this catch is defense in depth only.
        // Fails open since analyzeAndSaveSelfie re-checks onboarding/consent
        // server-side regardless, so the real gate can't be bypassed here.
        let result;
        try {
            result = precheck || await precheckPromise;
        } catch {
            openPicker(type);
            return;
        }
        if (!result.onboardingComplete) {
            router.push("/onboarding");
            return;
        }
        // Don't open the camera for a photo that will be rejected anyway —
        // surface the limit card now instead of after upload.
        if (quotas && !quotas.scans.canScanToday) {
            setQuotasLoaded(true);
            return;
        }
        if (result.needsConsent) {
            pendingActionType.current = type;
            setShowConsent(true);
            return;
        }
        openPicker(type);
    };

    const handleConsentAccept = async (photoPrivacy) => {
        setSavingConsent(true);
        try {
            const res = await acceptScanConsent(photoPrivacy);
            if (res.success) {
                setShowConsent(false);
                setPrecheck((prev) => prev ? { ...prev, needsConsent: false } : prev);
                const type = pendingActionType.current;
                pendingActionType.current = null;
                openPicker(type || 'gallery');
            } else {
                showToast({ type: "error", title: "Couldn't save", message: res.error || "Please try again." });
            }
        } finally {
            setSavingConsent(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        precheckPromise.then((result) => {
            if (!cancelled) setPrecheck(result);
        });
        return () => { cancelled = true; };
    }, [precheckPromise]);

    useEffect(() => {
        let cancelled = false;
        // Server-prefetched quotas (stored timezone) show the limit card
        // early; the browser-timezone fetch below replaces them once it lands.
        quotasPromise.then((result) => {
            if (cancelled || !result || browserQuotasLoaded.current) return;
            setQuotas(result);
            setQuotasLoaded(true);
        });
        return () => { cancelled = true; };
    }, [quotasPromise]);

    useEffect(() => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        getUsageQuotas(tz)
            .catch((err) => {
                Sentry.captureException(err, { tags: { scope: "capture-usage-quotas-unexpected-rejection" } });
                return null;
            })
            .then((quotaData) => {
                if (quotaData) {
                    browserQuotasLoaded.current = true;
                    setQuotas(quotaData);
                }
                setQuotasLoaded(true);
            });
    }, []);

    const uploadToCloudinary = async (file) => {
        const form = new FormData();
        form.append("file", file);
        if (isFlipped) form.append("flip", "true");

        const res = await uploadSelfieServerAction(form);
        if (!res.success) throw new Error(res.error || "Upload failed");

        return res.url;
    };

    const clearRawImage = () => {
        if (rawImage) URL.revokeObjectURL(rawImage);
        setRawImage(null);
        setRawFile(null);
    };

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (rawImage) URL.revokeObjectURL(rawImage);
        const url = URL.createObjectURL(file);
        setRawFile(file);
        setRawImage(url);
        setIsCropping(true);
        setIsFlipped(false);
        setStatus(null);
        e.target.value = "";
    };

    const handleCropComplete = (croppedFile, croppedUrl) => {
        setSelectedFile(croppedFile);
        setPreview(croppedUrl);
        setIsCropping(false);
    };

    const handleCropCancel = () => {
        if (preview && selectedFile) {
            setIsCropping(false);
        } else {
            setRawImage(null);
            setRawFile(null);
            setPreview(null);
            setSelectedFile(null);
            setIsCropping(false);
        }
    };

    const confirmUpload = async () => {
        if (!selectedFile) return;
        setLoading(true);
        setScanStage("upload");
        setStatus({ type: "info", msg: "Uploading photo…" });

        try {
            const imgUrl = await uploadToCloudinary(selectedFile);
            setScanStage("analyze");
            setStatus({ type: "info", msg: "Analysing your skin… (3–5s)" });

            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const res = await analyzeAndSaveSelfie(imgUrl, tz);

            if (res.success) {
                setScanStage("done");
                const refreshed = [];
                if (res.habitsChanged) refreshed.push("habits");
                if (res.workoutChanged) refreshed.push("facial workout");
                if (res.productsChanged) refreshed.push("30-day routine");

                if (refreshed.length > 0) {
                    showToast({
                        type: "success",
                        title: "Plan Refreshed!",
                        message: `Updated your ${refreshed.join(", ")} based on today's scan.`,
                    });
                }

                if (res.reportJustUnlocked) {
                    showToast({
                        type: "success",
                        title: "Your weekly report is ready!",
                        message: "That's 7 scans. Generate your report from your journal or the Reports tab.",
                    });
                }
                refreshReportStatus();

                setStatus({ type: "success", msg: "Done! Opening your journal…" });
                setTimeout(() => {
                  try { window.sessionStorage.setItem("tk:justScanned", "1"); } catch {}
                  router.push("/dashboard");
                }, 800);
            } else {
                setStatus({ type: "error", msg: `Oops: ${res.message || res.error}` });
                setScanStage(null);
                setLoading(false);
            }
        } catch (err) {
            Sentry.captureException(err, { tags: { scope: "capture-confirm-upload-unexpected" } });
            setStatus({ type: "error", msg: "Upload failed. Please try again." });
            setScanStage(null);
            setLoading(false);
        }
    };

    const scanLimitReached = quotas ? !quotas.scans.canScanToday : false;

    const tips = [
        { icon: Sun, title: "Good light", body: "Face a window or soft, even light." },
        { icon: Sparkles, title: "No filters", body: "Skip beauty filters and heavy makeup." },
        { icon: ScanFace, title: "Face forward", body: "Look straight at the lens, hair back." },
        { icon: Smile, title: "Neutral face", body: "Relax your expression for accuracy." },
    ];

    const stageIdle = !isCropping && !preview && !(quotasLoaded && scanLimitReached);

    return (
        <div className="capture-page tk-container">
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

            <PageHeader
                eyebrow="Scan"
                title="Today's Entry"
                subtitle="A clear, front-facing photo in good lighting gives the best results."
            />

            <div className="capture-grid">
                <div className="capture-card tk-card">
                    <ComponentErrorFallback title="Camera Access Error">
                    {isCropping && rawImage ? (
                        <ImageCropper
                            imageSrc={rawImage}
                            originalFile={rawFile}
                            onCropComplete={handleCropComplete}
                            onCancel={handleCropCancel}
                        />
                    ) : preview ? (
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
                                        <motion.div
                                            className="scan-line"
                                            initial={{ top: "-10%" }}
                                            animate={{ top: "110%" }}
                                            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                                        />
                                        <div className="scan-grid" />
                                    </div>
                                )}
                            </div>

                            {!loading && (
                                <div className="preview-actions flex gap-2 mt-4 w-full">
                                    <button
                                        className="cta-btn cta-secondary flex-1 justify-center text-sm"
                                        onClick={() => setIsFlipped(!isFlipped)}
                                        title="Mirror photo"
                                    >
                                        Flip <FlipHorizontal size={16} className="ml-1" />
                                    </button>
                                    <button
                                        className="cta-btn cta-secondary flex-1 justify-center text-sm"
                                        onClick={() => setIsCropping(true)}
                                        title="Adjust face framing"
                                    >
                                        Crop <Crop size={16} className="ml-1" />
                                    </button>
                                    <button
                                        className="cta-btn cta-primary flex-[2] justify-center"
                                        onClick={confirmUpload}
                                    >
                                        Analyze
                                    </button>
                                    <button
                                        className="cta-btn cta-secondary cta-cancel justify-center"
                                        onClick={() => { setPreview(null); setSelectedFile(null); clearRawImage(); }}
                                        aria-label="Cancel"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : quotasLoaded && scanLimitReached ? (
                        <div className="limit-card" role="status">
                            <div className="limit-icon tk-icon-circle">
                                <CalendarClock size={22} strokeWidth={2} />
                            </div>
                            <p className="limit-title">
                                {quotas.scans.denialReason === 'monthly_limit'
                                    ? "Monthly limit reached"
                                    : "You're all set for today"}
                            </p>
                            <p className="limit-body">
                                {quotas.scans.denialReason === 'monthly_limit'
                                    ? "You've used all your scans for this month. Your allowance resets next billing cycle."
                                    : quotas.scans.denialReason === 'every_other_day'
                                    ? "Your plan uses every-other-day pacing. Come back tomorrow for your next entry."
                                    : "You've already logged a photo today. Come back tomorrow to keep your streak going!"}
                            </p>
                            <div className="limit-actions">
                                <Link href="/dashboard" className="cta-btn cta-primary limit-btn">
                                    View my journal
                                </Link>
                                {quotas.scans.denialReason === 'monthly_limit' && (
                                    <Link href="/pricing" className="cta-btn cta-secondary limit-btn">
                                        See plans
                                    </Link>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="cta-group">
                            <div className="camera-frame" aria-hidden="true">
                                <div className="camera-ring" />
                                <ScanFace size={44} strokeWidth={1.4} className="camera-frame-icon" />
                                <span className="camera-frame-hint">Centre your face in the oval</span>
                            </div>

                            <button
                                className="tk-fab shutter-btn focus-visible:ring-2 ring-accent"
                                onClick={() => handleActionClick('camera')}
                                disabled={loading}
                                aria-label="Take a photo"
                            >
                                <Camera size={28} strokeWidth={2} />
                            </button>
                            <p className="shutter-label">Take a photo</p>

                            <button
                                className="tk-pill-btn tk-btn-ghost upload-pill"
                                onClick={() => handleActionClick('gallery')}
                                disabled={loading}
                            >
                                <ImageIcon size={18} strokeWidth={2} />
                                Upload photo
                            </button>
                        </div>
                    )}

                    {status && status.type === "info" && loading ? (
                        <div className="scan-progress">
                            <div className="scan-progress-track">
                                <div className={`scan-progress-fill scan-progress-${scanStage || "upload"}`} />
                            </div>
                            <div className="scan-progress-steps">
                                <div className={`scan-step ${scanStage !== "upload" ? "scan-step-done" : "scan-step-active"}`}>
                                    {scanStage !== "upload" ? <CheckCircle2 size={14} /> : <Loader2 size={14} className="spin" />}
                                    <span>Uploading photo</span>
                                </div>
                                <div className={`scan-step ${scanStage === "done" ? "scan-step-done" : scanStage === "analyze" ? "scan-step-active" : ""}`}>
                                    {scanStage === "done" ? (
                                        <CheckCircle2 size={14} />
                                    ) : scanStage === "analyze" ? (
                                        <Loader2 size={14} className="spin" />
                                    ) : (
                                        <span className="scan-step-dot" />
                                    )}
                                    <AnimatePresence mode="wait">
                                        <motion.span
                                            key={scanStage === "analyze" ? loadingTextIndex : "pending"}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -6 }}
                                            transition={{ duration: 0.25 }}
                                        >
                                            {scanStage === "analyze" ? loadingTexts[loadingTextIndex] : "Analysing your skin"}
                                        </motion.span>
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    ) : status && (
                        <div className={`status-pill status-${status.type}`}>
                            {status.type === "success" && <CheckCircle2 size={16} />}
                            {status.type === "error" && <AlertCircle size={16} />}
                            {status.msg}
                        </div>
                    )}

                    {preview && !loading && !isCropping && (
                        <button
                            className="retake-btn flex items-center justify-center w-full mt-2"
                            onClick={() => {
                                setPreview(null);
                                setSelectedFile(null);
                                clearRawImage();
                                setStatus(null);
                            }}
                        >
                            <ArrowLeft size={14} className="mr-1" /> Try a different photo
                        </button>
                    )}

                    <p className="privacy-note mt-4">
                        <Lock size={12} strokeWidth={2} />
                        Private &amp; securely processed · <Link href="/terms" className="hover:text-accent transition-colors">Terms</Link> · <Link href="/privacy" className="hover:text-accent transition-colors">Privacy</Link>
                    </p>
                    </ComponentErrorFallback>
                </div>

                <aside className="capture-side" aria-label="Scan tips">
                    <div className="flex flex-wrap gap-2">
                        {quotasLoaded && quotas ? (
                            <span className={`tk-chip ${scanLimitReached ? "tk-chip-danger" : "tk-chip-success"}`}>
                                {scanLimitReached ? "Scan limit reached" : "Scan available today"}
                            </span>
                        ) : (
                            <span className="tk-chip">Checking your allowance…</span>
                        )}
                        <span className="tk-chip"><Lock size={11} /> Private &amp; secure</span>
                        {stageIdle && <span className="tk-chip">Takes ~5 seconds</span>}
                    </div>

                    <p className="tk-eyebrow mt-5 mb-3">For the best scan</p>
                    <div className="capture-tips">
                        {tips.map(({ icon: Icon, title, body }) => (
                            <div key={title} className="tk-tile p-3.5 capture-tip">
                                <span className="tk-icon-circle w-9 h-9 mb-2.5">
                                    <Icon size={17} strokeWidth={2} />
                                </span>
                                <p className="text-sm font-semibold text-primary leading-tight">{title}</p>
                                <p className="text-xs text-muted mt-1 leading-snug">{body}</p>
                            </div>
                        ))}
                    </div>

                    <div className="tk-card-flat p-4 mt-4 flex items-start gap-3">
                        <span className="tk-icon-circle w-9 h-9">
                            <Lock size={16} />
                        </span>
                        <p className="text-xs text-muted leading-relaxed">
                            Your photo is used only to analyze your skin. You choose whether it is stored or deleted right after, and can change this any time in Settings.
                        </p>
                    </div>
                </aside>
            </div>

            <style>{`
                .capture-page {
                    flex: 1;
                    width: 100%;
                    padding-top: 1.25rem;
                    padding-bottom: 2rem;
                }

                .capture-grid {
                    display: grid;
                    gap: 1.25rem;
                    grid-template-columns: minmax(0, 1fr);
                    align-items: start;
                }
                @media (min-width: 1024px) {
                    .capture-grid { grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr); gap: 1.75rem; }
                    .capture-side { position: sticky; top: 1.5rem; }
                }

                .capture-tips { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
                /* On phones the tips become a swipeable row so they don't push the page long */
                @media (max-width: 1023px) {
                    .capture-tips {
                        display: flex;
                        overflow-x: auto;
                        scroll-snap-type: x mandatory;
                        margin-inline: -1.25rem;
                        padding-inline: 1.25rem;
                        padding-bottom: 0.25rem;
                        scrollbar-width: none;
                    }
                    .capture-tips::-webkit-scrollbar { display: none; }
                    .capture-tip { flex: 0 0 72%; max-width: 16rem; scroll-snap-align: start; }
                }
                @media (min-width: 640px) and (max-width: 1023px) {
                    .capture-tips { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); overflow: visible; margin-inline: 0; padding-inline: 0; }
                    .capture-tip { flex: none; max-width: none; }
                }

                /* Keep Analyze reachable above the bottom nav on phones */
                @media (max-width: 767px) {
                    .preview-actions {
                        position: sticky;
                        bottom: calc(var(--tk-nav-h) + 12px + env(safe-area-inset-bottom, 0px));
                        z-index: 20;
                        padding: 0.5rem;
                        margin-inline: -0.5rem;
                        border-radius: 1.5rem;
                        background: color-mix(in srgb, var(--tk-surface-card) 92%, transparent);
                        backdrop-filter: blur(10px);
                    }
                    .camera-frame { max-height: 46svh; }
                    .capture-page { padding-top: 0.75rem; }
                }

                .capture-card {
                    position: relative;
                    width: 100%;
                    padding: 1.25rem;
                    border-radius: 1.75rem;
                    animation: fadeInUp 0.6s ease both;
                }
                @media (min-width: 640px) { .capture-card { padding: 1.75rem; } }

                .cta-group {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-bottom: 0.75rem;
                }

                .camera-frame {
                    position: relative;
                    width: 100%;
                    max-width: 420px;
                    aspect-ratio: 4 / 5;
                    max-height: 52svh;
                    border-radius: 1.75rem;
                    background: linear-gradient(160deg, var(--tk-accent-soft) 0%, var(--tk-blush) 55%, var(--tk-bg) 100%);
                    border: 1px solid var(--tk-border-solid);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    overflow: hidden;
                }
                .camera-ring {
                    position: absolute;
                    left: 50%; top: 46%;
                    width: 62%; height: 72%;
                    transform: translate(-50%, -50%);
                    border-radius: 50%;
                    border: 2px dashed rgb(var(--tk-accent-rgb)/0.55);
                    box-shadow: 0 0 0 9999px rgba(251,243,238,0.35);
                }
                .camera-frame-icon { color: var(--tk-accent); opacity: 0.55; position: relative; margin-top: -2rem; }
                .camera-frame-hint {
                    position: absolute;
                    bottom: 0.9rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--tk-text-muted);
                    background: rgba(255,251,248,0.85);
                    padding: 0.3rem 0.75rem;
                    border-radius: 9999px;
                }

                .shutter-btn {
                    width: 4.5rem; height: 4.5rem;
                    margin-top: 1.25rem;
                    cursor: pointer;
                    transition: transform 0.15s ease;
                }
                .shutter-btn:hover { transform: scale(1.05); }
                .shutter-btn:active { transform: scale(0.95); }
                .shutter-btn:disabled { opacity: 0.5; pointer-events: none; }
                .shutter-label {
                    margin: 0.5rem 0 1rem;
                    font-size: 0.8125rem;
                    font-weight: 600;
                    color: var(--tk-text-primary);
                }
                .upload-pill { padding: 0.65rem 1.4rem; font-size: 0.9rem; }
                .upload-pill:disabled { opacity: 0.5; pointer-events: none; }

                .cta-btn {
                    min-height: 3rem;
                    justify-content: center;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    width: 100%;
                    padding: 0.8rem 1.1rem;
                    border-radius: 9999px;
                    border: none;
                    cursor: pointer;
                    transition: all 0.22s ease;
                    font-family: var(--font-body);
                    font-weight: 600;
                    -webkit-tap-highlight-color: transparent;
                    text-align: left;
                }
                .cta-btn:disabled { opacity: 0.5; pointer-events: none; }
                .cta-btn:active { transform: scale(0.97); }

                .cta-primary {
                    background: var(--tk-accent);
                    color: #fff;
                    box-shadow: 0 8px 20px -8px rgb(var(--tk-accent-rgb)/0.6);
                }
                .cta-primary:hover { background: var(--tk-accent-deep); transform: translateY(-1px); }

                .cta-secondary {
                    background: #fff;
                    color: var(--tk-text-primary);
                    border: 1px solid var(--tk-border-strong);
                }
                .cta-secondary:hover { background: var(--tk-accent-soft); }
                .cta-cancel { width: auto; flex: 0 0 auto; padding: 0.8rem; }

                .limit-card {
                    text-align: center;
                    padding: 1.5rem 1.25rem 1.25rem;
                    margin-bottom: 1rem;
                    border-radius: 1.25rem;
                    background: var(--tk-bg);
                    border: 1px solid var(--tk-border-solid);
                }
                .limit-icon { width: 48px; height: 48px; margin-bottom: 0.875rem; }
                .limit-title {
                    font-family: var(--font-display);
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--tk-text-primary);
                    margin: 0 0 0.375rem;
                }
                .limit-body {
                    font-size: 0.875rem;
                    line-height: 1.55;
                    color: var(--tk-text-muted);
                    margin: 0 0 1.25rem;
                }
                .limit-actions { display: flex; flex-direction: column; gap: 0.5rem; }
                .limit-btn { justify-content: center; text-align: center; font-size: 0.9375rem; text-decoration: none; }

                .preview-wrap {
                    position: relative;
                    width: 100%;
                    /* Leave room on short phones so the Analyze bar stays in view */
                    max-width: min(360px, calc(50svh * 0.8));
                    aspect-ratio: 4 / 5;
                    margin: 0 auto 1.25rem;
                    border-radius: 1.75rem;
                    overflow: hidden;
                    background: var(--tk-blush);
                    box-shadow: var(--tk-shadow-card);
                    border: 3px solid #fff;
                }
                .preview-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                    transition: transform 0.3s ease;
                }
                .preview-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(74,42,31,0.18);
                    overflow: hidden;
                }
                .scan-grid {
                    position: absolute;
                    inset: 0;
                    background-image:
                        repeating-linear-gradient(0deg, rgb(var(--tk-accent-rgb)/0.14) 0px, transparent 1px, transparent 24px, rgb(var(--tk-accent-rgb)/0.14) 25px),
                        repeating-linear-gradient(90deg, rgb(var(--tk-accent-rgb)/0.14) 0px, transparent 1px, transparent 24px, rgb(var(--tk-accent-rgb)/0.14) 25px);
                    opacity: 0.5;
                }
                .scan-line {
                    position: absolute;
                    left: 0; right: 0;
                    height: 3px;
                    background: linear-gradient(90deg, transparent, rgb(var(--tk-accent-rgb)/0.95), transparent);
                    box-shadow: 0 0 16px 2px rgb(var(--tk-accent-rgb)/0.7);
                }

                .status-pill {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0 1rem;
                    height: 48px;
                    min-height: 48px;
                    max-height: 48px;
                    width: 100%;
                    border-radius: 9999px;
                    font-size: 0.8125rem;
                    font-weight: 500;
                    margin-bottom: 1rem;
                    box-sizing: border-box;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    animation: fadeIn 0.3s ease both;
                }
                .status-success { background: var(--color-success-soft, #E3F2E8); color: var(--tk-success); border: 1px solid rgba(47,143,91,0.25); }
                .status-error   {
                    background: #FBE7E4;
                    color: var(--tk-danger);
                    border: 1px solid rgba(179,38,30,0.2);
                    height: auto;
                    max-height: none;
                    white-space: normal;
                    border-radius: 1rem;
                    padding: 0.75rem 1rem;
                    text-align: center;
                }
                .status-info    { background: var(--tk-accent-soft); color: var(--tk-text-primary); border: 1px solid var(--tk-border-solid); }

                .scan-progress {
                    width: 100%;
                    padding: 0.875rem 1rem 1rem;
                    margin-bottom: 1rem;
                    border-radius: 1.25rem;
                    background: var(--tk-bg);
                    border: 1px solid var(--tk-border-solid);
                    box-sizing: border-box;
                    animation: fadeIn 0.3s ease both;
                }
                .scan-progress-track {
                    height: 6px;
                    border-radius: 9999px;
                    background: var(--tk-border-solid);
                    overflow: hidden;
                    margin-bottom: 0.75rem;
                }
                .scan-progress-fill {
                    height: 100%;
                    border-radius: 9999px;
                    background: linear-gradient(90deg, var(--tk-accent), var(--tk-accent-deep));
                }
                .scan-progress-fill.scan-progress-upload {
                    width: 30%;
                    transition: width 0.4s ease;
                }
                .scan-progress-fill.scan-progress-analyze {
                    width: 92%;
                    transition: width 4s cubic-bezier(0.1, 0.5, 0.2, 1);
                }
                .scan-progress-fill.scan-progress-done {
                    width: 100%;
                    transition: width 0.3s ease;
                }
                .scan-progress-steps {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .scan-step {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.8125rem;
                    font-weight: 500;
                    color: var(--tk-text-muted);
                    transition: color 0.3s ease;
                }
                .scan-step-active { color: var(--tk-text-primary); }
                .scan-step-done { color: var(--tk-accent); }
                .scan-step-dot {
                    width: 14px;
                    height: 14px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }
                .scan-step-dot::before {
                    content: "";
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: currentColor;
                    opacity: 0.4;
                }

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
                .retake-btn:hover { color: var(--tk-accent); }

                .privacy-note {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.4rem;
                    font-size: 0.75rem;
                    color: var(--tk-text-muted);
                    margin: 0;
                }

                @keyframes spin { to { transform: rotate(360deg); } }
                .spin { animation: spin 1.1s linear infinite; }
                @media (prefers-reduced-motion: reduce) { .spin { animation: none; } }

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
            <ScanConsentModal
                isOpen={showConsent}
                onAccept={handleConsentAccept}
                submitting={savingConsent}
            />
        </div>
    );
}
