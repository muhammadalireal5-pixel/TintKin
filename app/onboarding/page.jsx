"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/app/lib/actions";

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

    const goalsOptions = [
        "Reduce Acne/Pimples",
        "Anti-aging/Firmness",
        "Improve Radiance/Glow",
        "Reduce Spots/Pigmentation",
        "Other"
    ];

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
        if (!formData.birthDate || !formData.sex || !formData.skinType) {
            setError("Please fill in all required fields.");
            return;
        }
        
        if (formData.goals.length === 0) {
            setError("Please select at least one goal.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await completeOnboarding(formData);
            if (res.success) {
                router.push("/capture");
            } else {
                setError(res.error || "Something went wrong.");
                setLoading(false);
            }
        } catch (err) {
            console.error(err);
            setError("Something went wrong, please try again later");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-base tk-mesh-bg flex items-center justify-center p-4 sm:p-6">
            <div className="max-w-md w-full tk-glass p-6 sm:p-8 relative tk-anim-1">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-display font-medium text-primary mb-2">Welcome to TintKin</h1>
                    <p className="text-muted text-sm">Let's personalize your skin journey.</p>
                </div>

                {error && (
                    <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm mb-6 border border-red-200">
                        {error}
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-6 tk-anim-2">
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">Date of Birth</label>
                            <input 
                                type="date" 
                                name="birthDate"
                                value={formData.birthDate}
                                onChange={handleChange}
                                className="w-full bg-white/50 border border-lavender/50 rounded-xl p-3 text-primary focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-primary mb-2">Sex</label>
                            <select 
                                name="sex"
                                value={formData.sex}
                                onChange={handleChange}
                                className="w-full bg-white/50 border border-lavender/50 rounded-xl p-3 text-primary focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage"
                            >
                                <option value="">Select...</option>
                                <option value="female">Female</option>
                                <option value="male">Male</option>
                                <option value="other">Other</option>
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
                            Next
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 tk-anim-2">
                        <div>
                            <label className="block text-sm font-medium text-primary mb-3">What's your skin type?</label>
                            <div className="grid grid-cols-2 gap-3">
                                {['Oily', 'Dry', 'Combination', 'Normal'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setFormData(prev => ({ ...prev, skinType: type }))}
                                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                                            formData.skinType === type 
                                            ? 'bg-sage/20 border-sage text-sage' 
                                            : 'bg-white/50 border-lavender/50 text-muted hover:border-sage/50'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setStep(1)}
                                className="tk-pill-btn bg-white/50 border border-lavender text-primary flex-1"
                            >
                                Back
                            </button>
                            <button 
                                onClick={() => {
                                    if (formData.skinType) {
                                        setError("");
                                        setStep(3);
                                    } else {
                                        setError("Please select your skin type.");
                                    }
                                }}
                                className="tk-pill-btn tk-btn-primary flex-1"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 tk-anim-2">
                        <div>
                            <label className="block text-sm font-medium text-primary mb-3">What are your main goals?</label>
                            <div className="space-y-2">
                                {goalsOptions.map(goal => (
                                    <div key={goal}>
                                        <button
                                            onClick={() => handleGoalToggle(goal)}
                                            className={`w-full text-left p-3 rounded-xl border text-sm font-medium transition-all ${
                                                formData.goals.includes(goal)
                                                ? 'bg-sage/20 border-sage text-sage'
                                                : 'bg-white/50 border-lavender/50 text-muted hover:border-sage/50'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                {goal}
                                                {formData.goals.includes(goal) && (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                )}
                                            </div>
                                        </button>
                                        
                                        {goal === 'Other' && formData.goals.includes('Other') && (
                                            <div className="mt-2 pl-4">
                                                <input 
                                                    type="text"
                                                    placeholder="Please specify..."
                                                    name="customGoal"
                                                    value={formData.customGoal}
                                                    onChange={handleChange}
                                                    className="w-full bg-white/50 border border-lavender/50 rounded-xl p-3 text-sm text-primary focus:outline-none focus:border-sage focus:ring-1 focus:ring-sage"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setStep(2)}
                                className="tk-pill-btn bg-white/50 border border-lavender text-primary flex-1 disabled:opacity-50"
                                disabled={loading}
                            >
                                Back
                            </button>
                            <button 
                                onClick={handleSubmit}
                                disabled={loading}
                                className="tk-pill-btn tk-btn-primary flex-1 flex justify-center items-center"
                            >
                                {loading ? (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : "Complete"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
