"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CldUploadButton } from "next-cloudinary";
import { analyzeAndSaveSelfie } from "@/app/lib/actions";

export default function CapturePage() {
    const router = useRouter();
    const [status, setStatus] = useState("Upload a clear, front-facing photo in good lighting.");
    const [loading, setLoading] = useState(false);

    const handleUpload = async (result) => {
        const imgUrl = result?.info?.secure_url;
        if (!imgUrl) {
            setStatus("Upload failed. Let's try again.");
            return;
        }

        setLoading(true);
        setStatus("Taking a gentle look at your skin... (3-5s)");

        const res = await analyzeAndSaveSelfie(imgUrl);
        setLoading(false);

        if (res.success) {
            setStatus("Done! Opening your journal...");
            setTimeout(() => router.push("/dashboard"), 1000);
        } else {
            setStatus(`Oops: ${res.error}`);
        }
    };

    const isDone = status.includes("Done!");
    const isError = status.includes("Oops");

    return (
        <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-6 bg-base relative overflow-hidden tk-mesh-bg">
            
            <div className="w-full max-w-md relative z-10 tk-anim-1">
                
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-lavender text-primary shadow-[0_8px_32px_rgba(230,230,250,0.8)] mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>
                    </div>
                    <h1 className="text-4xl font-display font-medium text-primary mb-3">
                        Today's Entry
                    </h1>
                    <p className="text-muted text-sm px-4">
                        Let's capture a moment in your skin's journey.
                    </p>
                </div>

                {/* Main Upload Box (Pill/Soft Rectangle) */}
                <div className="tk-glass p-8 relative overflow-hidden shadow-[0_0_40px_rgba(230,230,250,0.6)] mb-6 flex flex-col items-center justify-center min-h-[260px]">
                    
                    {/* Tooltip for alignment (only visible when not loading) */}
                    {!loading && (
                        <div className="absolute top-4 bg-white/60 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-medium text-primary shadow-sm tk-tooltip-anim">
                            Ensure your face is centered
                        </div>
                    )}

                    <div className="flex flex-col items-center gap-6 text-center z-10 w-full">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${loading ? 'bg-sage/20 text-sage scale-110 shadow-[0_0_30px_rgba(138,154,91,0.4)]' : 'bg-primary/5 text-primary'}`}>
                            {loading ? (
                                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            )}
                        </div>

                        {loading ? (
                            <div className="w-full max-w-[200px]">
                                <p className="text-sm text-primary font-medium mb-3">Analysing...</p>
                                <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-sage rounded-full animate-pulse w-full"></div>
                                </div>
                            </div>
                        ) : (
                            <CldUploadButton
                                uploadPreset="ml_default"
                                onUpload={handleUpload}
                                options={{ maxFiles: 1, resourceType: "image" }}
                                disabled={loading}
                                className="tk-pill-btn tk-btn-primary w-full max-w-[240px] shadow-[0_8px_24px_rgba(44,62,80,0.15)]"
                            >
                                Tap to capture
                            </CldUploadButton>
                        )}
                    </div>
                </div>

                {/* Status indicator */}
                <div className={`px-5 py-2.5 rounded-full text-center text-sm font-medium transition-colors ${
                    isDone ? 'bg-sage/15 text-sage border border-sage/20' : 
                    isError ? 'bg-red-100 text-red-700 border border-red-200' : 
                    'bg-white/50 text-muted border border-white/40'
                }`}>
                    {status}
                </div>

                {/* Privacy Assurance */}
                <p className="text-center text-xs text-faint mt-8 flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    Your entry is private and securely processed.
                </p>

            </div>
        </div>
    );
}