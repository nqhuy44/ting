import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
    currentGroupId: string | null;
    setCurrentGroupId: (id: string | null) => void;
    passcode: string | null;
    setPasscode: (passcode: string | null) => void;
    language: 'vi' | 'en';
    setLanguage: (lang: 'vi' | 'en') => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            currentGroupId: null,
            setCurrentGroupId: (id) => set({ currentGroupId: id }),
            passcode: null,
            setPasscode: (passcode) => set({ passcode }),
            language: 'vi',
            setLanguage: (lang) => set({ language: lang }),
        }),
        {
            name: "ting-ui-storage",
        }
    )
);
