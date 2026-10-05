"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeAndSaveSelfie, uploadSelfieServerAction, getUsageQuotas, checkOnboardingStatus, getScanConsentStatus, acceptScanConsent } from "@/app/lib/actions";
import ScanConsentModal from "@/app/components/ScanConsentModal";
import { useToast } from "@/app/components/ToastProvider";
import { FlipHorizontal, Camera, Image as ImageIcon, ArrowRight, X, CheckCircle2, AlertCircle, Loader2, Lock, ArrowLeft, Crop, CalendarClock } from "lucide-react";
import ImageCropper from "@/app/components/ImageCropper";
import { ComponentErrorFallback } from "@/app/components/ComponentErrorFallback";
import { refreshReportStatus } from "@/app/components/reportStatus";
import Link from "next/link";

export default function CapturePage() {
    const router = useRouter();
    const { showToast } = useToast();
    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);

    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [checkingOnboarding, setCheckingOnboarding] = useState(false);
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
    const pendingActionType = useRef(null);

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
        setCheckingOnboarding(true);
        const res = await checkOnboardingStatus();
        if (!res.complete) {
            setCheckingOnboarding(false);
            router.push("/onboarding");
            return;
        }

        const consent = await getScanConsentStatus();
        setCheckingOnboarding(false);
        if (consent.needsConsent) {
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
        const fetchQuotas = async () => {
            try {
                const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                const data = await getUsageQuotas(tz);
                setQuotas(data);
            } catch {
                // Best-effort quota fetch
            } finally {
                setQuotasLoaded(true);
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
        setStatus({ type: "info", msg: "Uploading photo…" });

        try {
            const imgUrl = await uploadToCloudinary(selectedFile);
            setStatus({ type: "info", msg: "Analysing your skin… (3–5s)" });

            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const res = await analyzeAndSaveSelfie(imgUrl, tz);

            if (res.success) {
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
                setTimeout(() => router.push("/dashboard"), 800);
            } else {
                setStatus({ type: "error", msg: `Oops: ${res.message || res.error}` });
                setLoading(false);
            }
        } catch {
            setStatus({ type: "error", msg: "Upload failed. Please try again." });
            setLoading(false);
        }
    };

    const scanLimitReached = quotas ? !quotas.scans.canScanToday : false;

    return (
        <div className="capture-page">
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

            <div className="blob-layer" aria-hidden="true">
                <div className="blob blob-1" />
                <div className="blob blob-2" />
            </div>

            <div className="capture-card">
                <ComponentErrorFallback title="Camera Access Error">
                {!isCropping && (
                    <div className="capture-header">
                        <div className="camera-badge">
                            <Camera size={26} strokeWidth={2} />
                        </div>
                        <h1 className="capture-title">Today&apos;s Entry</h1>
                        <p className="capture-subtitle">
                            A clear, front-facing photo in good lighting gives the best results.
                        </p>
                    </div>
                )}

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
                            <div className="preview-actions flex flex-wrap sm:flex-nowrap gap-2 mt-5 w-full">
                                <button 
                                    className="cta-btn cta-secondary flex-1 justify-center min-w-[80px] text-xs sm:text-sm py-2 sm:py-3 shadow-md hover:shadow-lg" 
                                    onClick={() => setIsFlipped(!isFlipped)}
                                    title="Mirror photo"
                                >
                                    Flip <FlipHorizontal size={16} className="ml-1" />
                                </button>
                                <button 
                                    className="cta-btn cta-secondary flex-1 justify-center min-w-[80px] text-xs sm:text-sm py-2 sm:py-3 shadow-md hover:shadow-lg" 
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
                ) : !quotasLoaded ? (
                    <div className="cta-group" aria-busy="true">
                        <div className="cta-skeleton" />
                        <div className="or-divider"><span /><p>or</p><span /></div>
                        <div className="cta-skeleton" />
                    </div>
                ) : scanLimitReached ? (
                    <div className="limit-card" role="status">
                        <div className="limit-icon">
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
                        <button
                            className="cta-btn cta-primary"
                            onClick={() => handleActionClick('camera')}
                            disabled={loading || checkingOnboarding}
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

                        <button
                            className="cta-btn cta-secondary"
                            onClick={() => handleActionClick('gallery')}
                            disabled={loading || checkingOnboarding}
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

                {status && (
                    <div className={`status-pill status-${status.type}`}>
                        {status.type === "success" && <CheckCircle2 size={16} />}
                        {status.type === "error" && <AlertCircle size={16} />}
                        {status.type === "info" && <Loader2 size={16} className="spin" />}
                        {loading && status.type === "info" ? (
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={loadingTextIndex}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    {loadingTexts[loadingTextIndex]}
                                </motion.span>
                            </AnimatePresence>
                        ) : (
                            status.msg
                        )}
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
                    Private &amp; securely processed · <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link> · <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
                </p>
                </ComponentErrorFallback>
            </div>

            <style>{`
                .capture-page {
                    flex: 1;
                    width: 100%;
                    min-height: calc(100vh - 80px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1.5rem 1rem;
                    background-color: var(--tk-bg);
                    position: relative;
                    isolation: isolate;
                }

                /* Blobs live in their own clipped layer. They used to sit directly in a
                   scroll container, so their endless transform animation kept resizing
                   its scrollable area and nudged the card down whenever it overflowed. */
                .blob-layer {
                    position: absolute;
                    inset: 0;
                    overflow: hidden;
                    pointer-events: none;
                    z-index: 0;
                }

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

                .capture-card {
                    position: relative;
                    z-index: 1;
                    width: 100%;
                    max-width: 400px;
                    margin: auto 0;
                    flex-shrink: 0;
                    background: #FFFFFF;
                    border: 1px solid rgba(44, 62, 80, 0.08);
                    border-radius: 2rem;
                    padding: 1.5rem;
                    box-shadow: 0 1px 2px rgba(44, 62, 80, 0.04), 0 8px 24px -12px rgba(44, 62, 80, 0.12);
                    animation: fadeInUp 0.6s ease both;
                }
                
                @media (min-width: 640px) {
                    .capture-card {
                        padding: 2.25rem 2rem 2rem;
                        border-radius: 2.5rem;
                    }
                }

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

                .cta-group {
                    display: flex;
                    flex-direction: column;
                    margin-bottom: 0.5rem;
                    gap: 0.75rem;
                }

                .cta-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.875rem;
                    width: 100%;
                    padding: 1rem 1.125rem;
                    border-radius: 1.125rem;
                    border: none;
                    cursor: pointer;
                    transition: all 0.22s ease;
                    font-family: var(--font-body);
                    -webkit-tap-highlight-color: transparent;
                    text-align: left;
                }
                .cta-btn:disabled { opacity: 0.5; pointer-events: none; }
                .cta-btn:active { transform: scale(0.97); }

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

                .cta-secondary {
                    background: var(--tk-bg);
                    color: var(--tk-text-primary);
                    border: 1px solid rgba(44,62,80,0.06);
                    box-shadow: 0 2px 10px rgba(44,62,80,0.04);
                }
                .cta-secondary:hover {
                    background: #F7F4EE;
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

                .cta-skeleton {
                    height: 74px;
                    border-radius: 1.125rem;
                    background: rgba(44,62,80,0.06);
                    animation: pulse 1.6s ease-in-out infinite;
                }

                .limit-card {
                    text-align: center;
                    padding: 1.5rem 1.25rem 1.25rem;
                    margin-bottom: 1rem;
                    border-radius: 1.25rem;
                    background: #fff;
                    border: 1px solid rgba(44,62,80,0.08);
                }
                .limit-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 48px; height: 48px;
                    border-radius: 14px;
                    background: var(--tk-accent-peach);
                    color: var(--tk-text-primary);
                    margin-bottom: 0.875rem;
                }
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
                .limit-btn { justify-content: center; text-align: center; font-weight: 600; font-size: 0.9375rem; text-decoration: none; }

                @keyframes pulse { 50% { opacity: 0.55; } }

                .or-divider {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.5rem 0;
                }
                .or-divider span {
                    flex: 1;
                    height: 1px;
                    background: rgba(44,62,80,0.08);
                }
                .or-divider p {
                    font-size: 0.65rem;
                    color: var(--tk-text-faint);
                    font-weight: 600;
                    margin: 0;
                    text-transform: uppercase;
                    letter-spacing: 0.07em;
                }

                .preview-wrap {
                    position: relative;
                    width: 100%;
                    max-width: 280px;
                    height: 280px;
                    margin: 0 auto 1.25rem;
                    border-radius: 1.5rem;
                    overflow: hidden;
                    background: var(--tk-accent-lavender);
                    box-shadow: 0 10px 40px rgba(44,62,80,0.18);
                    border: 3px solid rgba(255,255,255,0.7);
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
                    background: rgba(44,62,80,0.18);
                    overflow: hidden;
                }
                .scan-grid {
                    position: absolute;
                    inset: 0;
                    background-image:
                        repeating-linear-gradient(0deg, rgba(138,154,91,0.12) 0px, transparent 1px, transparent 24px, rgba(138,154,91,0.12) 25px),
                        repeating-linear-gradient(90deg, rgba(138,154,91,0.12) 0px, transparent 1px, transparent 24px, rgba(138,154,91,0.12) 25px);
                    opacity: 0.5;
                }
                .scan-line {
                    position: absolute;
                    left: 0; right: 0;
                    height: 3px;
                    background: linear-gradient(90deg, transparent, rgba(138,154,91,0.9), transparent);
                    box-shadow: 0 0 16px 2px rgba(138,154,91,0.7);
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
                .status-success { background: rgba(138,154,91,0.12); color: var(--tk-accent-sage); border: 1px solid rgba(138,154,91,0.2); }
                .status-error   { 
                    background: rgba(224,84,84,0.08); 
                    color: #c94444; 
                    border: 1px solid rgba(224,84,84,0.2);
                    height: auto;
                    max-height: none;
                    white-space: normal;
                    border-radius: 1rem;
                    padding: 0.75rem 1rem;
                    text-align: center;
                }
                .status-info    { background: rgba(230,230,250,0.5); color: var(--tk-text-primary); border: 1px solid rgba(230,230,250,0.4); }

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

                .privacy-note {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.4rem;
                    font-size: 0.75rem;
                    color: var(--tk-text-faint);
                    margin: 0;
                }

                @keyframes spin { to { transform: rotate(360deg); } }
                .spin { animation: spin 1.1s linear infinite; }

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