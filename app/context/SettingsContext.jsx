"use client";

import { createContext, useContext } from "react";

// Lets any page (Profile, sidebar, etc.) open the settings sheet that AppShell hosts.
export const SettingsContext = createContext({ openSettings: () => {} });
export const useSettings = () => useContext(SettingsContext);
