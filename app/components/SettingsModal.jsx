"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  X,
  MapPin,
  History,
  Share2,
  LogOut,
  User,
  ChevronRight,
  Check,
  Crown,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { saveLocation, getUserProfile, updateUserSettings } from "@/app/lib/actions";
import { useAuthContext } from "../context/AuthContext";

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export default function SettingsModal({ isOpen, onClose }) {
  const { user, signOutUser } = useAuthContext();
  const mounted = useMounted();
  const [profile, setProfile] = useState(null);
  const [locationMode, setLocationMode] = useState("idle"); // idle | editing | loading | saved
  const [city, setCity] = useState("");
  const [currentCity, setCurrentCity] = useState("");
  const [skinType, setSkinType] = useState("");
  const [optIn, setOptIn] = useState(false);
  const panelRef = useRef(null);

  // Fetch DB profile data when modal opens
  useEffect(() => {
    if (isOpen) {
      getUserProfile().then((data) => {
        if (data) {
          setProfile(data);
          if (data.location?.city) {
            setCurrentCity(data.location.city);
          }
          if (data.skinType) {
            setSkinType(data.skinType);
          }
          setOptIn(Boolean(data.optInComparison));
        }
      });
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleUseGeolocation = () => {
    setLocationMode("loading");
    if (!("geolocation" in navigator)) {
      setLocationMode("idle");
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          let cityName = "";
          try {
            const geoRes = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              if (geoData.city) {
                cityName = geoData.principalSubdivision
                  ? `${geoData.city}, ${geoData.principalSubdivision}`
                  : geoData.city;
              } else if (geoData.locality) {
                cityName = geoData.locality;
              }
            }
          } catch (e) {
            console.error("Reverse geocode failed:", e);
          }

          if (!cityName) {
            cityName = `Lat ${latitude.toFixed(2)}, Lng ${longitude.toFixed(2)}`;
          }

          const res = await saveLocation({ lat: latitude, lng: longitude, city: cityName });
          if (res?.success) {
            setCurrentCity(cityName);
            setProfile((prev) => ({
              ...prev,
              location: { lat: latitude, lng: longitude, city: cityName },
            }));
            setLocationMode("saved");
            setTimeout(() => setLocationMode("idle"), 2000);
          } else {
            setLocationMode("editing");
          }
        } catch (err) {
          console.error("Save location error:", err);
          setLocationMode("idle");
        }
      },
      () => {
        setLocationMode("editing");
      }
    );
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!city.trim()) return;
    setLocationMode("loading");
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
      );
      const data = await res.json();
      if (data.results?.length > 0) {
        const { latitude, longitude, name, admin1, country } = data.results[0];
        const cityName = admin1 ? `${name}, ${admin1}` : country ? `${name}, ${country}` : name;
        const saveRes = await saveLocation({ lat: latitude, lng: longitude, city: cityName });
        if (saveRes?.success) {
          setCurrentCity(cityName);
          setProfile((prev) => ({
            ...prev,
            location: { lat: latitude, lng: longitude, city: cityName },
          }));
          setCity("");
          setLocationMode("saved");
          setTimeout(() => setLocationMode("idle"), 2000);
        } else {
          alert("Could not save location. Please try again.");
          setLocationMode("editing");
        }
      } else {
        alert("City not found. Please try again.");
        setLocationMode("editing");
      }
    } catch {
      alert("Error finding city.");
      setLocationMode("editing");
    }
  };

  const handleSkinTypeChange = async (newSkinType) => {
    setSkinType(newSkinType);
    await updateUserSettings({ skinType: newSkinType });
    setProfile((prev) => ({ ...prev, skinType: newSkinType }));
  };

  const handleOptInToggle = async () => {
    const nextVal = !optIn;
    setOptIn(nextVal);
    await updateUserSettings({ optInComparison: nextVal });
    setProfile((prev) => ({ ...prev, optInComparison: nextVal }));
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className={`fixed right-0 top-0 h-full w-full max-w-sm z-[210] flex flex-col bg-[#FDFBF7] shadow-2xl border-l border-black/5 transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/5 shrink-0">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#5B6D7F]">Settings</p>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors text-[#5B6D7F] hover:text-[#2C3E50]"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Account */}
          <div className="px-6 py-5 border-b border-black/5">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-[#8E9BAA] mb-3">
              Account
            </p>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#E6E6FA] flex items-center justify-center shrink-0 overflow-hidden border border-white/50 shadow-sm">
                {user?.photoURL || profile?.photoURL ? (
                  <img
                    src={user?.photoURL || profile?.photoURL}
                    alt={user?.displayName || profile?.displayName || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={20} className="text-[#2C3E50]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#2C3E50] truncate">
                  {user?.displayName || profile?.displayName || "Your Name"}
                </p>
                <p className="text-xs text-[#5B6D7F] truncate">{user?.email || profile?.email}</p>
              </div>
            </div>

            {/* Plan / Tier status */}
            <div className="mt-3.5 pt-3 border-t border-black/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown size={14} className="text-amber-500" />
                <span className="text-xs text-[#5B6D7F]">Plan:</span>
                <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/5 text-[#2C3E50]">
                  {profile?.tier || "Free"}
                </span>
              </div>
              {profile?.tier !== "premium" && (
                <Link
                  href="/dashboard/upgrade"
                  onClick={onClose}
                  className="text-xs font-medium text-[#8A9A5B] hover:text-[#2C3E50] transition-colors flex items-center gap-0.5"
                >
                  Upgrade <ChevronRight size={12} />
                </Link>
              )}
            </div>
          </div>

          {/* Skin Profile & Preferences */}
          <div className="px-6 py-5 border-b border-black/5">
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal size={14} className="text-[#8A9A5B]" />
              <p className="text-[10px] font-semibold tracking-widest uppercase text-[#8E9BAA]">
                Skin Profile
              </p>
            </div>

            {/* Skin Type selector */}
            <div className="mb-4">
              <label className="text-xs text-[#5B6D7F] block mb-2">Skin Type</label>
              <div className="flex flex-wrap gap-1.5">
                {["oily", "dry", "combination", "normal", "sensitive"].map((type) => {
                  const isSelected = skinType?.toLowerCase() === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleSkinTypeChange(type)}
                      className={`px-2.5 py-1 rounded-full text-xs capitalize transition-all border ${
                        isSelected
                          ? "bg-[#2C3E50] text-white border-[#2C3E50] font-medium shadow-sm"
                          : "bg-white text-[#5B6D7F] border-black/10 hover:border-black/20"
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Community Rank Opt-in */}
            <div className="flex items-center justify-between pt-3 border-t border-black/5">
              <div>
                <p className="text-xs font-medium text-[#2C3E50]">Peer Comparison</p>
                <p className="text-[11px] text-[#8E9BAA]">Anonymous ranking with age peers</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={optIn}
                onClick={handleOptInToggle}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  optIn ? "bg-[#8A9A5B]" : "bg-black/15"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    optIn ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Location */}
          <div className="px-6 py-5 border-b border-black/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-[#8A9A5B]" />
                <p className="text-[10px] font-semibold tracking-widest uppercase text-[#8E9BAA]">
                  Location
                </p>
              </div>
              {locationMode === "idle" && (
                <button
                  onClick={() => setLocationMode("editing")}
                  className="text-xs font-medium text-[#8A9A5B] hover:text-[#2C3E50] transition-colors"
                >
                  {currentCity ? "Update" : "Set location"}
                </button>
              )}
            </div>

            {locationMode === "idle" && (
              <p className="text-sm text-[#2C3E50]">
                {currentCity ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8A9A5B] inline-block"></span>
                    {currentCity}
                  </span>
                ) : (
                  <span className="text-[#8E9BAA] italic text-xs">
                    Not set — add your city for weather-aware advice
                  </span>
                )}
              </p>
            )}

            {locationMode === "saved" && (
              <div className="flex items-center gap-2 text-sm text-[#8A9A5B] font-medium">
                <Check size={14} /> Location saved!
              </div>
            )}

            {locationMode === "loading" && (
              <p className="text-sm text-[#8E9BAA] italic">Saving…</p>
            )}

            {locationMode === "editing" && (
              <div className="space-y-2 mt-1">
                <button
                  onClick={handleUseGeolocation}
                  className="w-full py-2 rounded-xl bg-[#2C3E50] text-white text-sm font-medium hover:bg-[#2C3E50]/90 transition-colors"
                >
                  Use My Location
                </button>
                <div className="flex items-center gap-2 text-xs text-[#8E9BAA]">
                  <div className="flex-1 h-px bg-black/5"></div>
                  or
                  <div className="flex-1 h-px bg-black/5"></div>
                </div>
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter city name…"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-black/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]/40 bg-white"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-[#8A9A5B]/15 text-[#8A9A5B] font-medium text-sm rounded-xl hover:bg-[#8A9A5B]/25 transition-colors"
                  >
                    Save
                  </button>
                </form>
                <button
                  onClick={() => setLocationMode("idle")}
                  className="text-xs text-[#8E9BAA] hover:text-[#5B6D7F] w-full text-center mt-1"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="px-6 py-5 border-b border-black/5">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-[#8E9BAA] mb-3">
              Quick Access
            </p>
            <div className="space-y-1">
              <Link
                href="/history"
                onClick={onClose}
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-black/[0.03] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <History size={16} className="text-[#8A9A5B]" />
                  <span className="text-sm font-medium text-[#2C3E50]">Scan History</span>
                </div>
                <ChevronRight size={14} className="text-[#8E9BAA] group-hover:text-[#5B6D7F] transition-colors" />
              </Link>

              <Link
                href="/share"
                onClick={onClose}
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-black/[0.03] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Share2 size={16} className="text-[#8A9A5B]" />
                  <span className="text-sm font-medium text-[#2C3E50]">Share My Card</span>
                </div>
                <ChevronRight size={14} className="text-[#8E9BAA] group-hover:text-[#5B6D7F] transition-colors" />
              </Link>

              <Link
                href="/dashboard/upgrade"
                onClick={onClose}
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-black/[0.03] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Sparkles size={16} className="text-[#8A9A5B]" />
                  <span className="text-sm font-medium text-[#2C3E50]">Upgrade Plan</span>
                </div>
                <ChevronRight size={14} className="text-[#8E9BAA] group-hover:text-[#5B6D7F] transition-colors" />
              </Link>
            </div>
          </div>
        </div>

        {/* Sign out — pinned to bottom */}
        <div className="px-6 py-5 border-t border-black/5 shrink-0 bg-[#FDFBF7]">
          <button
            onClick={async () => {
              onClose();
              await signOutUser();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-sm font-medium"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
