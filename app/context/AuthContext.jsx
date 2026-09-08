"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/app/lib/firebase/client";
import { setSessionCookie, clearSessionCookie } from "@/lib/utils/auth-cookie";

const AuthContext = createContext({
  user: null,
  loading: true,
  signOutUser: async () => {},
});

export const useAuthContext = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        try {
          if (firebaseUser) {
            const token = await firebaseUser.getIdToken().catch(() => null);
            if (token) {
              setSessionCookie(token);
              // Mint authentic 14-day HttpOnly server session cookie
              fetch("/api/auth/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken: token }),
              }).catch(() => {});
            }
            if (isMounted) setUser(firebaseUser);
          } else {
            clearSessionCookie();
            fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
            if (isMounted) setUser(null);
          }
        } catch {
          if (isMounted) setUser(null);
        } finally {
          if (isMounted) setLoading(false);
        }
      },
      () => {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      }
    );

    // Refresh token every 55 minutes and keep session active
    const refreshInterval = setInterval(async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken(true);
          setSessionCookie(token);
          fetch("/api/auth/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: token }),
          }).catch(() => {});
        } catch {
          // Token refresh failure will naturally re-authenticate on next request
        }
      }
    }, 55 * 60 * 1000);

    // Fallback: If auth listener hasn't responded within 1.5s, don't keep UI blocked in loading
    const timeout = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 1500);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      clearInterval(refreshInterval);
      unsubscribe();
    };
  }, []);

  const signOutUser = async () => {
    const res = await fetch("/api/auth/session", { method: "DELETE" });
    if (!res.ok) {
      throw new Error("Failed to clear server session. Please try again.");
    }
    if (auth) {
      await signOut(auth);
    }
    clearSessionCookie();
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

