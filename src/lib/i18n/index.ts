import { vi } from "./vi";
import { en } from "./en";
import { useUIStore } from "@/store/ui.store";

export const dictionaries = { vi, en };

export const useTranslation = () => {
    const { language } = useUIStore();
    return dictionaries[language];
};
