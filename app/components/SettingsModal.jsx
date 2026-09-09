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
  Trophy,
  Download,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { saveLocation, getUserProfile, updateUserSettings, updatePrivacySettings } from "@/app/lib/actions";
import { exportUserData } from "@/app/lib/export-data";
import { deleteUserAccount } from "@/app/lib/delete-account";
import { useAuthContext } from "../context/AuthContext";
import { useToast } from "@/app/components/ToastProvider";
import { SKIN_TYPES } from "@/lib/constants/profile";
import { TIERS, STANDARD_PACING } from "@/lib/constants/tiers";
import { PHOTO_PRIVACY } from "@/lib/constants/privacy";

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
  const { showToast } = useToast();
  const mounted = useMounted();
  const [profile, setProfile] = useState(null);
  const [locationMode, setLocationMode] = useState("idle"); // idle | editing | loading | saved
  const [city, setCity] = useState("");
  const [currentCity, setCurrentCity] = useState("");
  const [skinType, setSkinType] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [photoPrivacy, setPhotoPrivacy] = useState(PHOTO_PRIVACY.STORE);
  const [standardPlanFrequency, setStandardPlanFrequency] = useState(STANDARD_PACING.FLEXIBLE);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
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
          if (data.standardPlanFrequency) {
            setStandardPlanFrequency(data.standardPlanFrequency);
          }
          if (data.photoPrivacy) {
            setPhotoPrivacy(data.photoPrivacy);
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
      showToast({ type: 'error', title: 'Not Supported', message: "Geolocation is not supported by your browser." });
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
          } catch {
            // Reverse geocode failed silently
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
        } catch {
          setLocationMode("idle");
        }
      },
      () => {
        setLocationMode("editing");
      }
    );
  };

  const handlePrivacyChange = async (e) => {
    const val = e.target.value;
    const previousVal = photoPrivacy;
    setPhotoPrivacy(val);
    try {
      const res = await updatePrivacySettings(val);
      if (!res?.success) {
        setPhotoPrivacy(previousVal);
        showToast({ type: 'error', title: 'Error', message: "Failed to update privacy settings." });
      }
    } catch {
      setPhotoPrivacy(previousVal);
      showToast({ type: 'error', title: 'Error', message: "Failed to update privacy settings." });
    }
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
          showToast({ type: 'error', title: 'Save Failed', message: "Could not save location. Please try again." });
          setLocationMode("editing");
        }
      } else {
        showToast({ type: 'error', title: 'Not Found', message: "City not found. Please try again." });
        setLocationMode("editing");
      }
    } catch {
      showToast({ type: 'error', title: 'Error', message: "Error finding city." });
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

  const handleFrequencyChange = async (newFrequency) => {
    setStandardPlanFrequency(newFrequency);
    await updateUserSettings({ standardPlanFrequency: newFrequency });
    setProfile((prev) => ({ ...prev, standardPlanFrequency: newFrequency }));
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await exportUserData();
      if (res?.success && res.base64Zip) {
        const byteCharacters = atob(res.base64Zip);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/zip" });

        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = res.filename || "tintkin-data-export.zip";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);

        showToast({
          type: "success",
          title: "Export Complete",
          message: "Your complete data and photos have been downloaded.",
        });
      } else {
        showToast({
          type: "error",
          title: "Export Failed",
          message: res?.error || "Could not generate data export.",
        });
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Export Failed",
        message: err.message || "An unexpected error occurred.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim() !== "DELETE") {
      showToast({
        type: "error",
        title: "Confirmation Required",
        message: 'Please type "DELETE" to confirm account erasure.',
      });
      return;
    }

    setIsDeleting(true);
    try {
      const res = await deleteUserAccount();
      if (res?.success) {
        showToast({
          type: "success",
          title: "Account Deleted",
          message: "Your account and personal data have been permanently erased.",
        });
        setShowDeleteConfirm(false);
        await signOutUser();
        onClose();
      } else {
        showToast({
          type: "error",
          title: "Deletion Failed",
          message: res?.error || "Failed to delete account.",
        });
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Deletion Failed",
        message: err.message || "Something went wrong.",
      });
    } finally {
      setIsDeleting(false);
    }
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
              <Link
                href="/pricing"
                onClick={onClose}
                className="text-xs font-medium text-[#8A9A5B] hover:text-[#2C3E50] transition-colors flex items-center gap-0.5"
              >
                Change Plan <ChevronRight size={12} />
              </Link>
            </div>
            
            {profile?.tier === TIERS.STANDARD && (
              <div className="mt-3 pt-3 border-t border-black/5">
                <label className="text-xs text-[#5B6D7F] block mb-2">Scan Pacing</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleFrequencyChange(STANDARD_PACING.EVERY_OTHER_DAY)}
                    className={`flex-1 py-1.5 px-2 rounded border text-[10px] font-medium transition-colors ${
                      standardPlanFrequency === STANDARD_PACING.EVERY_OTHER_DAY
                        ? "bg-[#2C3E50] text-white border-[#2C3E50]"
                        : "bg-white text-[#5B6D7F] border-black/10 hover:border-black/20"
                    }`}
                  >
                    Every Other Day
                  </button>
                  <button
                    onClick={() => handleFrequencyChange(STANDARD_PACING.FLEXIBLE)}
                    className={`flex-1 py-1.5 px-2 rounded border text-[10px] font-medium transition-colors ${
                      standardPlanFrequency === STANDARD_PACING.FLEXIBLE
                        ? "bg-[#2C3E50] text-white border-[#2C3E50]"
                        : "bg-white text-[#5B6D7F] border-black/10 hover:border-black/20"
                    }`}
                  >
                    Flexible
                  </button>
                </div>
              </div>
            )}
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
                {SKIN_TYPES.map((type) => {
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

          {/* Privacy & Photo Retention */}
          <div className="px-6 py-5 border-b border-black/5">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-[#8E9BAA] mb-3">
              Photo Privacy
            </p>
            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center w-4 h-4 mt-0.5">
                  <input
                    type="radio"
                    name="photoPrivacy"
                    value={PHOTO_PRIVACY.STORE}
                    checked={photoPrivacy === PHOTO_PRIVACY.STORE}
                    onChange={handlePrivacyChange}
                    className="appearance-none w-4 h-4 rounded-full border border-black/20 checked:border-[#8A9A5B] transition-colors"
                  />
                  {photoPrivacy === PHOTO_PRIVACY.STORE && <div className="absolute w-2 h-2 rounded-full bg-[#8A9A5B]" />}
                </div>
                <div className="flex-1 text-sm text-[#2C3E50]">
                  <p className="font-medium group-hover:text-[#8A9A5B] transition-colors">Store photo till next scan (Recommended)</p>
                  <p className="text-xs text-[#8E9BAA] mt-0.5">Keep your latest selfie for fast "What-If" simulations and journal display.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center w-4 h-4 mt-0.5">
                  <input
                    type="radio"
                    name="photoPrivacy"
                    value={PHOTO_PRIVACY.DELETE}
                    checked={photoPrivacy === PHOTO_PRIVACY.DELETE}
                    onChange={handlePrivacyChange}
                    className="appearance-none w-4 h-4 rounded-full border border-black/20 checked:border-[#8A9A5B] transition-colors"
                  />
                  {photoPrivacy === PHOTO_PRIVACY.DELETE && <div className="absolute w-2 h-2 rounded-full bg-[#8A9A5B]" />}
                </div>
                <div className="flex-1 text-sm text-[#2C3E50]">
                  <p className="font-medium group-hover:text-[#8A9A5B] transition-colors">Delete immediately</p>
                  <p className="text-xs text-[#8E9BAA] mt-0.5">For privacy. Your photo is analyzed and instantly deleted. Simulations will require a new upload.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Quick Links */}
          <div className="px-6 py-5 border-b border-black/5">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-[#8E9BAA] mb-3">
              Quick Access
            </p>
            <div className="space-y-1">
              <Link
                href="/leaderboard"
                onClick={onClose}
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-black/[0.03] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Trophy size={16} className="text-[#8A9A5B]" />
                  <span className="text-sm font-medium text-[#2C3E50]">Community Board</span>
                </div>
                <ChevronRight size={14} className="text-[#8E9BAA] group-hover:text-[#5B6D7F] transition-colors" />
              </Link>

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
                href="/pricing"
                onClick={onClose}
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-black/[0.03] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Sparkles size={16} className="text-[#8A9A5B]" />
                  <span className="text-sm font-medium text-[#2C3E50]">Upgrade Plan</span>
                </div>
                <ChevronRight size={14} className="text-[#8E9BAA] group-hover:text-[#5B6D7F] transition-colors" />
              </Link>

              <button
                type="button"
                onClick={handleExportData}
                disabled={isExporting}
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-black/[0.03] transition-colors group text-left disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <Download size={16} className="text-[#8A9A5B]" />
                  <div>
                    <span className="text-sm font-medium text-[#2C3E50]">Download My Data</span>
                    <p className="text-[11px] text-[#8E9BAA]">GDPR / CCPA data & photos (.zip)</p>
                  </div>
                </div>
                {isExporting ? (
                  <Loader2 size={14} className="animate-spin text-[#8A9A5B]" />
                ) : (
                  <ChevronRight size={14} className="text-[#8E9BAA] group-hover:text-[#5B6D7F] transition-colors" />
                )}
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="px-6 py-5 border-b border-black/5">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-red-500 mb-1.5">
              Danger Zone
            </p>
            <p className="text-xs text-[#5B6D7F] mb-3">
              Permanently erase your account, all uploaded selfies, simulations, and journal history.
            </p>
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmText("");
                setShowDeleteConfirm(true);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50/70 transition-all flex items-center gap-1.5"
            >
              <Trash2 size={13} />
              Delete Account
            </button>
          </div>
        </div>

        {/* Sign out — pinned to bottom */}
        <div className="px-6 py-5 border-t border-black/5 shrink-0 bg-[#FDFBF7]">
          <button
            onClick={async () => {
              try {
                await signOutUser();
                onClose();
              } catch (err) {
                showToast({ type: 'error', title: 'Sign Out Failed', message: err.message });
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-sm font-medium"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-md bg-[#FDFBF7] rounded-2xl p-6 shadow-2xl border border-red-100 text-[#2C3E50]"
            role="alertdialog"
            aria-modal="true"
          >
            <div className="flex items-center gap-3 mb-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold">Permanently Delete Account?</h3>
                <p className="text-xs text-[#5B6D7F]">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-[#5B6D7F] leading-relaxed mb-4">
              All your skin analysis data, uploaded photos, simulations, routine streaks, and account credentials will be immediately and irreversibly wiped.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-medium text-[#2C3E50] mb-1.5">
                Type <span className="font-bold text-red-600">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 text-sm border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#5B6D7F] hover:bg-black/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText.trim() !== "DELETE" || isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-xs"
              >
                {isDeleting && <Loader2 size={13} className="animate-spin" />}
                {isDeleting ? "Erasing Data..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}

