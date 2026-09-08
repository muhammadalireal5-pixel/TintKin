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
            // Force refresh to get a fresh token every time auth state changes
            const token = await firebaseUser.getIdToken(true).catch(() => null);
            if (token) {
              setSessionCookie(token);
            }
            if (isMounted) setUser(firebaseUser);
          } else {
            clearSessionCookie();
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

    // Refresh the token every 55 minutes to prevent expiry (tokens last 60 min)
    const refreshInterval = setInterval(async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken(true);
          setSessionCookie(token);
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
    try {
      if (auth) {
        await signOut(auth);
      }
    } catch {
      // Best-effort sign out
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

