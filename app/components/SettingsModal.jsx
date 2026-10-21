"use client";

import { useState, useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import AnimatedModal from "./AnimatedModal";
import UserAvatar from "./UserAvatar";
import {
  X,
  MapPin,
  History,
  Share2,
  LogOut,
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
  Mail,
  Bell,
  MonitorSmartphone,
} from "lucide-react";
import Link from "next/link";
import { saveLocation, getUserProfile, updateUserSettings, updatePrivacySettings, changeSubscriptionTier } from "@/app/lib/actions";
import { resendVerificationEmail } from "@/app/lib/auth-actions";
import { subscribeToPush, unsubscribeFromPush, sendTestNotification } from "@/app/lib/push-actions";
import { exportUserData, emailUserDataExport } from "@/app/lib/export-data";
import { deleteUserAccount } from "@/app/lib/delete-account";
import { useAuthContext } from "../context/AuthContext";
import { usePwaInstall } from "../context/PwaContext";
import { useToast } from "@/app/components/ToastProvider";
import { SKIN_TYPES } from "@/lib/constants/profile";
import { TIERS, TIER_NAMES, ACTIVE_SUBSCRIPTION_TIERS, STANDARD_PACING } from "@/lib/constants/tiers";
import { PHOTO_PRIVACY } from "@/lib/constants/privacy";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function SettingsModal({ isOpen, onClose }) {
  const { user, signOutUser } = useAuthContext();
  const { canInstall, isInstalled, isIOS, promptInstall } = usePwaInstall();
  const { showToast } = useToast();
  const [installing, setInstalling] = useState(false);
  const [profile, setProfile] = useState(null);
  const [locationMode, setLocationMode] = useState("idle"); // idle | editing | loading | saved
  const [city, setCity] = useState("");
  const [currentCity, setCurrentCity] = useState("");
  const [skinType, setSkinType] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [photoPrivacy, setPhotoPrivacy] = useState(PHOTO_PRIVACY.STORE);
  const [standardPlanFrequency, setStandardPlanFrequency] = useState(STANDARD_PACING.FLEXIBLE);
  const [isExporting, setIsExporting] = useState(false);
  const [isEmailingExport, setIsEmailingExport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteEverytimeConfirm, setShowDeleteEverytimeConfirm] = useState(false);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const [verifyEmailState, setVerifyEmailState] = useState("idle"); // idle | sending | sent
  const [tierChangeState, setTierChangeState] = useState("idle"); // idle | changing
  const [isOpeningBillingPortal, setIsOpeningBillingPortal] = useState(false);
  const [notifSupported, setNotifSupported] = useState(false);
  const [notifPermission, setNotifPermission] = useState("default");
  const [notifSubscribed, setNotifSubscribed] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);
  const [testNotifState, setTestNotifState] = useState("idle"); // idle | sending

  // Check push support/subscription state when the modal opens. notifSupported
  // defaults to false, so the unsupported-browser case needs no extra setState.
  useEffect(() => {
    if (!isOpen || !VAPID_PUBLIC_KEY) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") {
      return;
    }
    navigator.serviceWorker
      .register("/service-worker.js", { scope: "/" })
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => {
        setNotifSupported(true);
        setNotifPermission(Notification.permission);
        setNotifSubscribed(Boolean(sub));
      })
      .catch(() => {});
  }, [isOpen]);

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

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        showToast({ type: "success", title: "Installed", message: "TintKin has been added to your device." });
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleResendVerification = async () => {
    if (verifyEmailState === "sending") return;
    setVerifyEmailState("sending");
    try {
      await resendVerificationEmail();
    } finally {
      setVerifyEmailState("sent");
    }
  };

  const handleEnableNotifications = async () => {
    setNotifBusy(true);
    try {
      const registration = await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
      if (permission !== "granted") {
        showToast({
          type: "error",
          title: "Notifications Blocked",
          message: "Enable notifications for this site in your browser settings to turn this on.",
        });
        return;
      }
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const res = await subscribeToPush(sub.toJSON());
      if (res?.success) {
        setNotifSubscribed(true);
      } else {
        await sub.unsubscribe();
        showToast({ type: "error", title: "Error", message: res?.error || "Could not enable notifications." });
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { scope: "push-subscribe-client" } });
      showToast({ type: "error", title: "Error", message: "Could not enable notifications." });
    } finally {
      setNotifBusy(false);
    }
  };

  const handleDisableNotifications = async () => {
    setNotifBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const sub = await registration?.pushManager.getSubscription();
      if (sub) {
        await unsubscribeFromPush(sub.endpoint);
        await sub.unsubscribe();
      }
      setNotifSubscribed(false);
    } catch (err) {
      Sentry.captureException(err, { tags: { scope: "push-unsubscribe-client" } });
      showToast({ type: "error", title: "Error", message: "Could not disable notifications." });
    } finally {
      setNotifBusy(false);
    }
  };

  const handleSendTestNotification = async () => {
    setTestNotifState("sending");
    try {
      const res = await sendTestNotification();
      showToast(
        res?.success
          ? { type: "success", title: "Sent", message: "Check for the test notification on this device." }
          : { type: "error", title: "Error", message: res?.error || "Could not send test notification." }
      );
    } finally {
      setTestNotifState("idle");
    }
  };

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

  const applyPrivacyChange = async (val) => {
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

  const handlePrivacyChange = (e) => {
    const val = e.target.value;
    if (val === PHOTO_PRIVACY.DELETE && photoPrivacy !== PHOTO_PRIVACY.DELETE) {
      // Switching into "delete immediately" wipes any photo already kept
      // under "store" — confirm before it happens, not after.
      setShowDeleteEverytimeConfirm(true);
      return;
    }
    applyPrivacyChange(val);
  };

  const handleConfirmDeleteEverytime = async () => {
    setIsSavingPrivacy(true);
    try {
      await applyPrivacyChange(PHOTO_PRIVACY.DELETE);
    } finally {
      setIsSavingPrivacy(false);
      setShowDeleteEverytimeConfirm(false);
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

  const handleChangeTier = async (newTier) => {
    if (tierChangeState === "changing") return;
    setTierChangeState("changing");
    try {
      const res = await changeSubscriptionTier(newTier);
      if (res?.success) {
        const isUpgrade = newTier === TIERS.PREMIUM;
        showToast({
          type: 'success',
          title: isUpgrade ? 'Upgraded' : 'Plan Changed',
          message: isUpgrade
            ? `You're now on ${TIER_NAMES[newTier]}. The prorated difference was charged immediately.`
            : `You'll move to ${TIER_NAMES[newTier]} at the end of your current billing period.`,
        });
      } else {
        showToast({ type: 'error', title: 'Error', message: res?.error || "Failed to change your plan." });
      }
    } catch {
      showToast({ type: 'error', title: 'Error', message: "Failed to change your plan." });
    } finally {
      setTierChangeState("idle");
    }
  };

  const handleManageBilling = async () => {
    setIsOpeningBillingPortal(true);
    try {
      // An installed Android PWA's standalone window can fail to follow the
      // eventual redirect out to Polar's customer-portal domain cleanly —
      // open it in the regular browser instead (see PricingClient.jsx's
      // goToCheckout for the same fix on the checkout flow).
      if (isInstalled) {
        window.open("/api/billing-portal", "_blank", "noopener,noreferrer");
      } else {
        window.location.href = "/api/billing-portal";
      }
    } finally {
      // Navigation is about to replace the page; this only matters if it fails.
      setIsOpeningBillingPortal(false);
    }
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
      Sentry.captureException(err, { tags: { scope: "data-export-download" } });
      showToast({
        type: "error",
        title: "Export Failed",
        message: "Something went wrong — please try again.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleEmailExport = async () => {
    setIsEmailingExport(true);
    try {
      const res = await emailUserDataExport();
      showToast(
        res?.success
          ? { type: "success", title: "Export Sent", message: "Check your inbox for a copy of your data." }
          : { type: "error", title: "Export Failed", message: res?.error || "Could not email the export." }
      );
    } catch (err) {
      Sentry.captureException(err, { tags: { scope: "data-export-email" } });
      showToast({ type: "error", title: "Export Failed", message: "Something went wrong — please try again." });
    } finally {
      setIsEmailingExport(false);
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
      Sentry.captureException(err, { tags: { scope: "account-deletion" } });
      showToast({
        type: "error",
        title: "Deletion Failed",
        message: "Something went wrong — please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      variant="sheet"
      zIndex={200}
      ariaLabel="Settings"
      panelClassName="flex flex-col max-h-[calc(92dvh-env(safe-area-inset-bottom))] sm:max-h-none sm:h-full"
    >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-6 pb-4 sm:pt-5 border-b border-line shrink-0 bg-white">
          <p className="text-lg font-semibold text-primary">Settings</p>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-blush transition-colors text-muted hover:text-primary"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-base px-4 py-4 space-y-3">
          {/* Account */}
          <div className="tk-card px-5 py-4">
            <p className="tk-text-micro font-semibold tracking-widest uppercase text-muted mb-3">
              Account
            </p>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-blush flex items-center justify-center shrink-0 overflow-hidden border border-line">
                <UserAvatar
                  photoURL={user?.photoURL || profile?.photoURL}
                  name={user?.displayName || profile?.displayName}
                  email={user?.email || profile?.email}
                  className="text-base text-primary"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-primary truncate">
                  {user?.displayName || profile?.displayName || "Your Name"}
                </p>
                <p className="text-xs text-muted truncate">{user?.email || profile?.email}</p>
              </div>
            </div>

            {profile?.emailVerified === false && (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-accent-soft border border-accent/20 px-3 py-2">
                <p className="text-xs text-accent-deep">
                  {verifyEmailState === "sent" ? "Confirmation email sent — check your inbox." : "Please confirm your email address."}
                </p>
                {verifyEmailState !== "sent" && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={verifyEmailState === "sending"}
                    className="shrink-0 text-xs font-semibold text-accent-deep underline disabled:opacity-50"
                  >
                    {verifyEmailState === "sending" ? "Sending…" : "Resend"}
                  </button>
                )}
              </div>
            )}

            {/* Plan / Tier status */}
            <div className="mt-3.5 pt-3 border-t border-line flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown size={14} className="text-accent" />
                <span className="text-xs text-muted">Plan:</span>
                <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-line text-primary">
                  {TIER_NAMES[profile?.tier] || "Free"}
                </span>
              </div>
              {!ACTIVE_SUBSCRIPTION_TIERS.includes(profile?.tier) && (
                <Link
                  href="/pricing"
                  onClick={onClose}
                  className="text-xs font-medium text-accent hover:text-primary transition-colors flex items-center gap-0.5"
                >
                  Change Plan <ChevronRight size={12} />
                </Link>
              )}
            </div>

            {/* Credit balance (shop top-ups, spent after the plan's own quota) */}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted">Credits:</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-primary">{profile?.creditBalance ?? 0}</span>
                <Link
                  href="/shop"
                  onClick={onClose}
                  className="text-xs font-medium text-accent hover:text-primary transition-colors"
                >
                  Buy more
                </Link>
              </div>
            </div>

            {ACTIVE_SUBSCRIPTION_TIERS.includes(profile?.tier) && (
              <div className="mt-3 pt-3 border-t border-line flex items-center gap-2">
                {profile.tier === TIERS.STANDARD && (
                  <button
                    onClick={() => handleChangeTier(TIERS.PREMIUM)}
                    disabled={tierChangeState === "changing"}
                    className="flex-1 py-1.5 px-2 rounded-full bg-accent text-white tk-text-micro font-medium transition-colors disabled:opacity-50"
                  >
                    {tierChangeState === "changing" ? "Upgrading…" : "Upgrade to Pro"}
                  </button>
                )}
                {profile.tier === TIERS.PREMIUM && (
                  <button
                    onClick={() => handleChangeTier(TIERS.STANDARD)}
                    disabled={tierChangeState === "changing"}
                    className="flex-1 py-1.5 px-2 rounded border border-line text-muted tk-text-micro font-medium transition-colors hover:border-line disabled:opacity-50"
                  >
                    {tierChangeState === "changing" ? "Switching…" : "Switch to Standard"}
                  </button>
                )}
                <button
                  onClick={handleManageBilling}
                  disabled={isOpeningBillingPortal}
                  className="flex-1 py-1.5 px-2 rounded border border-line text-muted tk-text-micro font-medium transition-colors hover:border-line disabled:opacity-50"
                >
                  Manage Billing
                </button>
              </div>
            )}

            {profile?.tier === TIERS.STANDARD && (
              <div className="mt-3 pt-3 border-t border-line">
                <label className="text-xs text-muted block mb-2">Scan Pacing</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleFrequencyChange(STANDARD_PACING.EVERY_OTHER_DAY)}
                    className={`flex-1 py-1.5 px-2 rounded border tk-text-micro font-medium transition-colors ${
                      standardPlanFrequency === STANDARD_PACING.EVERY_OTHER_DAY
                        ? "bg-accent text-white border-accent"
                        : "bg-white text-muted border-line hover:border-accent/40"
                    }`}
                  >
                    Every Other Day
                  </button>
                  <button
                    onClick={() => handleFrequencyChange(STANDARD_PACING.FLEXIBLE)}
                    className={`flex-1 py-1.5 px-2 rounded border tk-text-micro font-medium transition-colors ${
                      standardPlanFrequency === STANDARD_PACING.FLEXIBLE
                        ? "bg-accent text-white border-accent"
                        : "bg-white text-muted border-line hover:border-accent/40"
                    }`}
                  >
                    Flexible
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Install App */}
          {(canInstall || isInstalled || isIOS) && (
            <div className="tk-card px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <MonitorSmartphone size={14} className="text-accent" />
                <p className="tk-text-micro font-semibold tracking-widest uppercase text-muted">
                  App
                </p>
              </div>
              {isInstalled ? (
                <div className="flex items-center gap-2 text-sm text-accent font-medium">
                  <Check size={14} /> Installed on this device
                </div>
              ) : canInstall ? (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={installing}
                  className="tk-pill-btn tk-btn-primary w-full py-2.5 text-sm"
                >
                  <Download size={15} />
                  {installing ? "Opening install prompt…" : "Install TintKin App"}
                </button>
              ) : (
                <p className="text-xs text-muted leading-relaxed">
                  Tap <Share2 size={12} className="inline -mt-0.5" /> <strong>Share</strong>, then <strong>&quot;Add to Home Screen&quot;</strong> to install TintKin on this device.
                </p>
              )}
            </div>
          )}

          {/* Skin Profile & Preferences */}
          <div className="tk-card px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal size={14} className="text-accent" />
              <p className="tk-text-micro font-semibold tracking-widest uppercase text-muted">
                Skin Profile
              </p>
            </div>

            {/* Skin Type selector */}
            <div className="mb-4">
              <label className="text-xs text-muted block mb-2">Skin Type</label>
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
                          ? "bg-accent text-white border-accent font-medium shadow-sm"
                          : "bg-white text-muted border-line hover:border-accent/40"
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Community Rank Opt-in */}
            <div className="flex items-center justify-between pt-3 border-t border-line">
              <div>
                <p className="text-xs font-medium text-primary">Peer Comparison</p>
                <p className="tk-text-micro text-muted">Anonymous ranking with age peers</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={optIn}
                onClick={handleOptInToggle}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  optIn ? "bg-accent" : "bg-line"
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

          {/* Notifications */}
          {VAPID_PUBLIC_KEY && (
            <div className="tk-card px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Bell size={14} className="text-accent" />
                <p className="tk-text-micro font-semibold tracking-widest uppercase text-muted">
                  Notifications
                </p>
              </div>
              {!notifSupported ? (
                <p className="text-xs text-muted italic">Not supported in this browser.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-primary">Push Notifications</p>
                      <p className="tk-text-micro text-muted">
                        {notifPermission === "denied"
                          ? "Blocked — enable in your browser settings"
                          : "Get notified right on this device"}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={notifSubscribed}
                      disabled={notifBusy || notifPermission === "denied"}
                      onClick={notifSubscribed ? handleDisableNotifications : handleEnableNotifications}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                        notifSubscribed ? "bg-accent" : "bg-line"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          notifSubscribed ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  {notifSubscribed && (
                    <button
                      type="button"
                      onClick={handleSendTestNotification}
                      disabled={testNotifState === "sending"}
                      className="mt-3 text-xs font-medium text-accent hover:text-primary transition-colors disabled:opacity-50"
                    >
                      {testNotifState === "sending" ? "Sending…" : "Send test notification"}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Location */}
          <div className="tk-card px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-accent" />
                <p className="tk-text-micro font-semibold tracking-widest uppercase text-muted">
                  Location
                </p>
              </div>
              {locationMode === "idle" && (
                <button
                  onClick={() => setLocationMode("editing")}
                  className="text-xs font-medium text-accent hover:text-primary transition-colors"
                >
                  {currentCity ? "Update" : "Set location"}
                </button>
              )}
            </div>

            {locationMode === "idle" && (
              <p className="text-sm text-primary">
                {currentCity ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block"></span>
                    {currentCity}
                  </span>
                ) : (
                  <span className="text-muted italic text-xs">
                    Not set — add your city for weather-aware advice
                  </span>
                )}
              </p>
            )}

            {locationMode === "saved" && (
              <div className="flex items-center gap-2 text-sm text-accent font-medium">
                <Check size={14} /> Location saved!
              </div>
            )}

            {locationMode === "loading" && (
              <p className="text-sm text-muted italic">Saving…</p>
            )}

            {locationMode === "editing" && (
              <div className="space-y-2 mt-1">
                <button
                  onClick={handleUseGeolocation}
                  className="tk-pill-btn tk-btn-primary w-full py-2 text-sm"
                >
                  Use My Location
                </button>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <div className="flex-1 h-px bg-line"></div>
                  or
                  <div className="flex-1 h-px bg-line"></div>
                </div>
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter city name…"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/40 bg-white"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-accent-soft text-accent-deep font-medium text-sm rounded-xl hover:bg-accent/25 transition-colors"
                  >
                    Save
                  </button>
                </form>
                <button
                  onClick={() => setLocationMode("idle")}
                  className="text-xs text-muted hover:text-muted w-full text-center mt-1"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Privacy & Photo Retention */}
          <div className="tk-card px-5 py-4">
            <p className="tk-text-micro font-semibold tracking-widest uppercase text-muted mb-3">
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
                    className="appearance-none w-4 h-4 rounded-full border border-line checked:border-accent transition-colors"
                  />
                  {photoPrivacy === PHOTO_PRIVACY.STORE && <div className="absolute w-2 h-2 rounded-full bg-accent" />}
                </div>
                <div className="flex-1 text-sm text-primary">
                  <p className="font-medium group-hover:text-accent transition-colors">Store photo till next scan (Recommended)</p>
                  <p className="text-xs text-muted mt-0.5">Keep your latest selfie for fast &quot;What-If&quot; simulations and journal display.</p>
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
                    className="appearance-none w-4 h-4 rounded-full border border-line checked:border-accent transition-colors"
                  />
                  {photoPrivacy === PHOTO_PRIVACY.DELETE && <div className="absolute w-2 h-2 rounded-full bg-accent" />}
                </div>
                <div className="flex-1 text-sm text-primary">
                  <p className="font-medium group-hover:text-accent transition-colors">Delete immediately</p>
                  <p className="text-xs text-muted mt-0.5">For privacy. Your photo is analyzed and instantly deleted. Simulations will require a new upload.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Quick Links */}
          <div className="tk-card px-5 py-4">
            <p className="tk-text-micro font-semibold tracking-widest uppercase text-muted mb-3">
              Quick Access
            </p>
            <div className="space-y-1">
              <Link
                href="/leaderboard"
                onClick={onClose}
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-blush/60 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Trophy size={16} className="text-accent" />
                  <span className="text-sm font-medium text-primary">Community Board</span>
                </div>
                <ChevronRight size={14} className="text-muted group-hover:text-muted transition-colors" />
              </Link>

              <Link
                href="/history"
                onClick={onClose}
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-blush/60 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <History size={16} className="text-accent" />
                  <span className="text-sm font-medium text-primary">Scan History</span>
                </div>
                <ChevronRight size={14} className="text-muted group-hover:text-muted transition-colors" />
              </Link>

              <Link
                href="/share"
                onClick={onClose}
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-blush/60 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Share2 size={16} className="text-accent" />
                  <span className="text-sm font-medium text-primary">Share My Card</span>
                </div>
                <ChevronRight size={14} className="text-muted group-hover:text-muted transition-colors" />
              </Link>

              <Link
                href="/pricing"
                onClick={onClose}
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-blush/60 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Sparkles size={16} className="text-accent" />
                  <span className="text-sm font-medium text-primary">Upgrade Plan</span>
                </div>
                <ChevronRight size={14} className="text-muted group-hover:text-muted transition-colors" />
              </Link>

              <button
                type="button"
                onClick={handleExportData}
                disabled={isExporting}
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-blush/60 transition-colors group text-left disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <Download size={16} className="text-accent" />
                  <div>
                    <span className="text-sm font-medium text-primary">Download My Data</span>
                    <p className="tk-text-micro text-muted">GDPR / CCPA data & photos (.zip)</p>
                  </div>
                </div>
                {isExporting ? (
                  <Loader2 size={14} className="animate-spin text-accent" />
                ) : (
                  <ChevronRight size={14} className="text-muted group-hover:text-muted transition-colors" />
                )}
              </button>

              <button
                type="button"
                onClick={handleEmailExport}
                disabled={isEmailingExport}
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-blush/60 transition-colors group text-left disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-accent" />
                  <div>
                    <span className="text-sm font-medium text-primary">Email My Data</span>
                    <p className="tk-text-micro text-muted">Same export, sent to your inbox</p>
                  </div>
                </div>
                {isEmailingExport ? (
                  <Loader2 size={14} className="animate-spin text-accent" />
                ) : (
                  <ChevronRight size={14} className="text-muted group-hover:text-muted transition-colors" />
                )}
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="tk-card px-5 py-4">
            <p className="tk-text-micro font-semibold tracking-widest uppercase text-danger mb-1.5">
              Danger Zone
            </p>
            <p className="text-xs text-muted mb-3">
              Permanently erase your account, all uploaded selfies, simulations, and journal history.
            </p>
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmText("");
                setShowDeleteConfirm(true);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-danger bg-danger-soft hover:opacity-90 transition-all flex items-center gap-1.5"
            >
              <Trash2 size={13} />
              Delete Account
            </button>
          </div>
        </div>

        {/* Sign out — pinned to bottom */}
        <div className="px-5 py-4 border-t border-line shrink-0 bg-white pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            onClick={async () => {
              try {
                await signOutUser();
                onClose();
              } catch (err) {
                Sentry.captureException(err, { tags: { scope: "sign-out" } });
                showToast({ type: 'error', title: 'Sign Out Failed', message: "Something went wrong — please try again." });
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-danger-soft text-danger hover:opacity-90 transition-colors text-sm font-medium"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
    </AnimatedModal>

      {/* Delete Account Confirmation Modal */}
      <AnimatedModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteConfirmText("");
        }}
        variant="center"
        zIndex={250}
        role="alertdialog"
        ariaLabel="Permanently Delete Account?"
        panelClassName="p-6 pt-7 sm:pt-6 text-primary"
      >
            <div className="flex items-center gap-3 mb-3 text-danger">
              <div className="w-10 h-10 rounded-full bg-danger-soft flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold">Permanently Delete Account?</h3>
                <p className="text-xs text-muted">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-muted leading-relaxed mb-4">
              All your skin analysis data, uploaded photos, simulations, routine streaks, and account credentials will be immediately and irreversibly wiped.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-medium text-primary mb-1.5">
                Type <span className="font-bold text-danger">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-3 sm:py-2 text-base sm:text-sm border border-danger/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-danger bg-white"
                autoFocus
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
                disabled={isDeleting}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-xl text-sm sm:text-xs font-medium text-muted hover:bg-blush transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText.trim() !== "DELETE" || isDeleting}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-xl text-sm sm:text-xs font-semibold text-white bg-danger hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                {isDeleting && <Loader2 size={13} className="animate-spin" />}
                {isDeleting ? "Erasing Data..." : "Permanently Delete"}
              </button>
            </div>
      </AnimatedModal>

      {/* Delete-every-time Photo Privacy Confirmation Modal */}
      <AnimatedModal
        isOpen={showDeleteEverytimeConfirm}
        onClose={() => setShowDeleteEverytimeConfirm(false)}
        variant="center"
        zIndex={250}
        role="alertdialog"
        ariaLabel="Delete photo immediately?"
        panelClassName="p-6 pt-7 sm:pt-6 text-primary"
      >
            <div className="flex items-center gap-3 mb-3 text-danger">
              <div className="w-10 h-10 rounded-full bg-danger-soft flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold">Delete photo immediately?</h3>
                <p className="text-xs text-muted">This also deletes what&apos;s already stored.</p>
              </div>
            </div>

            <p className="text-xs text-muted leading-relaxed mb-5">
              Switching to this option will immediately and permanently delete any photo currently stored
              from your previous scans. Future scans will be analyzed and instantly deleted — simulations
              will need a fresh upload each time.
            </p>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteEverytimeConfirm(false)}
                disabled={isSavingPrivacy}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-xl text-sm sm:text-xs font-medium text-muted hover:bg-blush transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEverytime}
                disabled={isSavingPrivacy}
                className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-xl text-sm sm:text-xs font-semibold text-white bg-danger hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                {isSavingPrivacy && <Loader2 size={13} className="animate-spin" />}
                {isSavingPrivacy ? "Deleting…" : "Delete Stored Photo & Confirm"}
              </button>
            </div>
      </AnimatedModal>
    </>
  );
}

