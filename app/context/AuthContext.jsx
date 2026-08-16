"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/app/lib/firebase/client";

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

    const setSessionCookie = (token) => {
      const secureFlag = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Lax${secureFlag}`;
    };

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
            document.cookie = "__session=; path=/; max-age=0";
            if (isMounted) setUser(null);
          }
        } catch (err) {
          console.error("Auth state change error:", err);
          if (isMounted) setUser(null);
        } finally {
          if (isMounted) setLoading(false);
        }
      },
      (error) => {
        console.error("onAuthStateChanged error:", error);
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
        } catch (e) {
          console.error("Token refresh error:", e);
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
    } catch (e) {
      console.error("Sign out error:", e);
    }
    document.cookie = "__session=; path=/; max-age=0";
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

