"use client";

import { createContext, useContext, useMemo } from "react";
import { SessionProvider, useSession, signOut } from "next-auth/react";

const AuthContext = createContext({
  user: null,
  loading: true,
  signOutUser: async () => {},
});

export const useAuthContext = () => useContext(AuthContext);

function InnerAuthProvider({ children }) {
  const { data: session, status } = useSession();

  const user = useMemo(() => {
    if (!session?.user) return null;
    return {
      uid: session.user.id || "",
      id: session.user.id || "",
      email: session.user.email || "",
      displayName: session.user.name || "",
      name: session.user.name || "",
      photoURL: session.user.image || null,
      image: session.user.image || null,
    };
  }, [session]);

  const signOutUser = async () => {
    // Navigate ourselves with a relative path: Auth.js builds its redirect URL
    // from NEXTAUTH_URL (localhost), which is unreachable from a phone on the LAN.
    await signOut({ redirect: false });
    window.location.assign("/");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: status === "loading",
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }) {
  return (
    <SessionProvider>
      <InnerAuthProvider>{children}</InnerAuthProvider>
    </SessionProvider>
  );
}
