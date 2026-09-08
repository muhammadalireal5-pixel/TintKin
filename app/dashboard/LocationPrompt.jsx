"use client";

import { useState, useEffect } from "react";
import { saveLocation } from "@/app/lib/actions";
import { useToast } from "@/app/components/ToastProvider";

export default function LocationPrompt({ user }) {
  const { showToast } = useToast();
  const [show, setShow] = useState(false);
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Show if user is onboarded, has at least one scan (lastUploadDate), but hasn't set location
    if (user.onboardingComplete && user.lastUploadDate && !user.location?.city && !user.location?.lat) {
      setShow(true);
    }
  }, [user]);

  const handleUseGeolocation = () => {
    setLoading(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const res = await saveLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
            if (res?.success) {
              setShow(false);
            } else {
              showToast({ type: 'error', title: 'Error', message: res?.error || "Failed to save location." });
            }
          } catch {
            showToast({ type: 'error', title: 'Error', message: "Failed to save location." });
          } finally {
            setLoading(false);
          }
        },
        () => {
          // Denied, fallback to manual input below
          setLoading(false);
          showToast({ type: 'error', title: 'Location Denied', message: "Location access denied. You can manually enter your city instead." });
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
      } else {
        showToast({ type: 'error', title: 'Error', message: res?.error || "City not found. Please try again." });
      }
    } catch {
      showToast({ type: 'error', title: 'Error', message: "Failed to save location." });
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="tk-glass bg-white max-w-md w-full rounded-3xl p-8 border border-white/50 shadow-2xl relative">
        <button onClick={() => setShow(false)} className="absolute top-4 right-4 text-muted hover:text-primary">
          ✕
        </button>
        <h2 className="text-2xl font-display font-medium text-primary mb-2">Want weather-aware advice?</h2>
        <p className="text-muted text-sm mb-6">
          Get personalized daily recommendations (like "skip your exfoliant" or "apply heavy SPF") based on today's UV index and weather.
        </p>
        
        <button 
          onClick={handleUseGeolocation} 
          disabled={loading}
          className="w-full py-3 bg-primary text-white rounded-xl mb-4 font-medium"
        >
          {loading ? "Processing..." : "Use My Location"}
        </button>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink-0 mx-4 text-muted text-xs uppercase tracking-widest font-semibold">or</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input 
            type="text" 
            placeholder="Enter City / Zip" 
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage"
          />
          <button 
            type="submit" 
            disabled={loading}
            className="px-4 py-2 bg-sage text-white font-medium rounded-xl hover:bg-sage/90 shadow-sm transition-colors"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
