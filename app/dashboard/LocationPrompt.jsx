"use client";

import { useState, useEffect } from "react";
import { saveLocation, updateUserSettings } from "@/app/lib/actions";
import { useToast } from "@/app/components/ToastProvider";
import { Sun, X } from "lucide-react";

export default function LocationPrompt({ user }) {
  const { showToast } = useToast();
  const [show, setShow] = useState(false);
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const isDismissedLocal = typeof window !== "undefined" && localStorage.getItem("tintkin_dismissed_location") === "true";
      // Show only if not previously dismissed (in DB or localStorage), user is onboarded, has at least one scan, but hasn't set location
      if (
        !isDismissedLocal &&
        !user?.locationPromptDismissed &&
        user?.onboardingComplete &&
        user?.lastUploadDate &&
        !user?.location?.city &&
        !user?.location?.lat
      ) {
        setShow(true);
      }
    } catch {
      if (!user?.locationPromptDismissed && user?.onboardingComplete && user?.lastUploadDate && !user?.location?.city && !user?.location?.lat) {
        setShow(true);
      }
    }
  }, [user]);

  const handleDismiss = () => {
    setShow(false);
    try {
      localStorage.setItem("tintkin_dismissed_location", "true");
    } catch {}
    updateUserSettings({ locationPromptDismissed: true }).catch(() => {});
  };

  const handleUseGeolocation = () => {
    setLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const res = await saveLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
            if (res?.success) {
              setShow(false);
              // Trigger a page reload to refresh all location-dependent components
              window.location.reload();
              showToast({ type: "success", title: "Location Saved", message: "Weather-aware skincare tips enabled!" });
            } else {
              showToast({ type: "error", title: "Error", message: res?.error || "Failed to save location." });
            }
          } catch {
            showToast({ type: "error", title: "Error", message: "Failed to save location." });
          } finally {
            setLoading(false);
          }
        },
        () => {
          setLoading(false);
          showToast({ type: "error", title: "Location Denied", message: "Location access denied. You can manually enter your city instead." });
        }
      );
    } else {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!city.trim()) return;
    setLoading(true);
    
    try {
      const res = await saveLocation({ city });
      if (res?.success) {
        setShow(false);
        // Trigger a page reload to refresh all location-dependent components
        window.location.reload();
        showToast({ type: "success", title: "Location Saved", message: "Weather-aware skincare tips enabled!" });
      } else {
        showToast({ type: "error", title: "Error", message: res?.error || "City not found. Please try again." });
      }
    } catch {
      showToast({ type: "error", title: "Error", message: "Failed to save location." });
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-sage/15 via-white/80 to-lavender/20 border border-sage/30 rounded-3xl shadow-xs relative tk-anim-1 backdrop-blur-md">
      <button 
        onClick={handleDismiss} 
        className="absolute top-3.5 right-3.5 w-7 h-7 flex items-center justify-center rounded-full text-muted hover:text-primary hover:bg-black/5 transition-colors cursor-pointer"
        aria-label="Dismiss location banner"
      >
        <X size={15} />
      </button>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pr-6 sm:pr-8">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sage/20 border border-sage/30 flex items-center justify-center shrink-0 text-sage mt-0.5">
            <Sun size={19} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-display font-semibold text-primary">
              Want weather-aware skincare advice?
            </h3>
            <p className="text-xs text-muted max-w-xl mt-0.5 leading-relaxed">
              Enable your location to receive daily UV and climate-adapted tips tailored to your local environment.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleUseGeolocation}
            disabled={loading}
            className="px-3.5 py-1.5 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Locating..." : "Use My Location"}
          </button>
          <form onSubmit={handleManualSubmit} className="flex gap-1.5 items-center">
            <input
              type="text"
              placeholder="City / Zip"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-28 sm:w-32 px-3 py-1.5 text-xs bg-white/90 border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage"
            />
            <button
              type="submit"
              disabled={loading || !city.trim()}
              className="px-3 py-1.5 bg-sage text-white text-xs font-semibold rounded-xl hover:bg-sage/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Save
            </button>
          </form>
          <button
            onClick={handleDismiss}
            className="text-xs font-medium text-muted hover:text-primary px-1.5 py-1 transition-colors cursor-pointer"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
