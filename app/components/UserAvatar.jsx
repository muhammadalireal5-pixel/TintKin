"use client";

import { useState } from "react";

// Shows the account photo when there is one that actually loads; otherwise
// the first letter of the user's name (or email). Google profile photos often
// 403 when a Referer is sent, which is what left the broken-image icon in the
// header — hence referrerPolicy="no-referrer" plus the onError fallback.
export default function UserAvatar({ photoURL, name, email, className = "" }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const initial = (name || email || "?").trim().charAt(0).toUpperCase() || "?";

  if (photoURL && failedSrc !== photoURL) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoURL}
        alt={name || "User"}
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(photoURL)}
        className="w-full h-full object-cover"
      />
    );
  }

  return (
    <span
      aria-label={name || email || "User"}
      className={`w-full h-full flex items-center justify-center font-semibold text-primary select-none ${className}`}
    >
      {initial}
    </span>
  );
}
