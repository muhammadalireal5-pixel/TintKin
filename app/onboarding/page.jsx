"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/app/lib/actions";
import { SKIN_TYPES, SEX_OPTIONS, GOAL_OPTIONS } from "@/lib/constants/profile";
import { validateOnboarding } from "@/lib/validations/onboarding";

export default function OnboardingPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        birthDate: "",
        sex: "",
        skinType: "",
        goals: [],
        customGoal: ""
    });

    const goalsOptions = GOAL_OPTIONS;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGoalToggle = (goal) => {
        setFormData(prev => {
            const newGoals = prev.goals.includes(goal)
                ? prev.goals.filter(g => g !== goal)
                : [...prev.goals, goal];
            return { ...prev, goals: newGoals };
        });
    };

    const handleSubmit = async () => {
        const validation = validateOnboarding(formData);
        if (!validation.isValid) {
            setError(validation.error || "Please fill in all required fields.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await completeOnboarding(formData);
            if (res.success) {
                router.replace("/welcome");
            } else {
                setError(res.error || "Something went wrong.");
                setLoading(false);
            }
        } catch {
            setError("Something went wrong, please try again later");
            setLoading(false);
        }
    };

    const TITLES = {
        1: "About you",
        2: "What's your skin type?",
        3: "What are your main goals?",
    };
    const SUBTITLES = {
        1: "A few quick details so we can personalise your skin journey.",
        2: "Pick the one that fits best. You can change it later.",
        3: "Choose everything that applies. Next, a quick selfie builds your personal plan.",
    };
    const tile = (selected) =>
        `w-full text-left p-4 rounded-2xl border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
            selected
                ? "bg-accent-soft border-accent text-accent-deep"
                : "bg-white border-line text-primary hover:border-accent/50"
        }`;

    return (
        <div className="flex-1 flex items-start sm:items-center justify-center px-5 py-6 sm:py-10">
            <div className="w-full max-w-md tk-card p-6 sm:p-8 tk-anim-1">
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <p className="tk-eyebrow">Step {step} of 3</p>
                    </div>
                    <div className="h-1.5 rounded-full bg-line overflow-hidden" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step}>
                        <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-semibold text-primary leading-tight mt-5 mb-1.5">{TITLES[step]}</h1>
                    <p className="text-sm text-muted">{SUBTITLES[step]}</p>
                </div>

                {error && (
                    <div className="bg-danger-soft text-danger p-3 rounded-xl text-sm mb-6 border border-danger/20 flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span>{error}</span>
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-4 tk-anim-2">
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">Date of Birth</label>
                            <input
                                type="date"
                                name="birthDate"
                                value={formData.birthDate}
                                onChange={handleChange}
                                className="tk-input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">Gender</label>
                            <select
                                name="sex"
                                value={formData.sex}
                                onChange={handleChange}
                                className="tk-input"
                            >
                                <option value="">Select...</option>
                                {SEX_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>
                                        {opt === 'prefer_not_to_say' ? 'Prefer not to say' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => {
                                if (formData.birthDate && formData.sex) {
                                    setError("");
                                    setStep(2);
                                } else {
                                    setError("Please complete all fields to continue.");
                                }
                            }}
                            className="tk-pill-btn tk-btn-primary w-full"
                        >
                            Continue
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-5 tk-anim-2">
                        <div className="grid grid-cols-2 gap-3">
                            {SKIN_TYPES.map(type => (
                                <button
                                    key={type}
                                    onClick={() => setFormData(prev => ({ ...prev, skinType: type }))}
                                    aria-pressed={formData.skinType === type}
                                    className={`${tile(formData.skinType === type)} text-center capitalize`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => {
                                if (formData.skinType) {
                                    setError("");
                                    setStep(3);
                                } else {
                                    setError("Please select your skin type.");
                                }
                            }}
                            className="tk-pill-btn tk-btn-primary w-full"
                        >
                            Continue
                        </button>
                        <button
                            onClick={() => setStep(1)}
                            className="w-full text-center text-sm font-medium text-muted hover:text-primary transition-colors"
                        >
                            Back
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-5 tk-anim-2">
                        <div className="space-y-2">
                            {goalsOptions.map(goal => (
                                <div key={goal}>
                                    <button
                                        onClick={() => handleGoalToggle(goal)}
                                        aria-pressed={formData.goals.includes(goal)}
                                        className={tile(formData.goals.includes(goal))}
                                    >
                                        <div className="flex items-center justify-between">
                                            {goal}
                                            {formData.goals.includes(goal) && (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                            )}
                                        </div>
                                    </button>

                                    {goal === 'Other' && formData.goals.includes('Other') && (
                                        <div className="mt-2">
                                            <input
                                                type="text"
                                                placeholder="Please specify..."
                                                name="customGoal"
                                                value={formData.customGoal}
                                                onChange={handleChange}
                                                className="tk-input"
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="tk-pill-btn tk-btn-primary w-full flex justify-center items-center disabled:opacity-50"
                        >
                            {loading ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : "Continue"}
                        </button>
                        <button
                            onClick={() => setStep(2)}
                            disabled={loading}
                            className="w-full text-center text-sm font-medium text-muted hover:text-primary transition-colors disabled:opacity-50"
                        >
                            Back
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
