import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Settings {
  showTimezones: boolean;
  localName: string;
  tz1Name: string;
  tz1Zone: string;
  tz2Name: string;
  tz2Zone: string;
  titleColor: string;
  keepKeywords: boolean;
  isShiny: boolean;
  isVu: boolean;
  notificationsEnabled: boolean;
  repeatNotifHours: number;
  dismissedUpdateVersion: string;
}

interface SettingsStore extends Settings {
  update: (updates: Partial<Settings>) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      showTimezones: false,
      localName: "LOCAL",
      tz1Name: "TZ1",
      tz1Zone: "America/New_York",
      tz2Name: "TZ2",
      tz2Zone: "Europe/London",
      titleColor: "#52D7C6",
      keepKeywords: false,
      isShiny: false,
      isVu: false,
      notificationsEnabled: true,
      repeatNotifHours: 1,
      dismissedUpdateVersion: "",
      update: (updates) => set((s) => ({ ...s, ...updates })),
    }),
    {
      name: "assistask-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const ALL_TIMEZONES: string[] = Intl.supportedValuesOf("timeZone");

export function formatInZone(zone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: zone,
  }).format(new Date());
}

export const LOCAL_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
