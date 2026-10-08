import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type UXEngineMode = 'tactical_field' | 'command_center';

interface UXEngineState {
    mode: UXEngineMode;
    highContrastMode: boolean;
    compactGrid: boolean;

    setMode: (mode: UXEngineMode) => void;
    toggleHighContrast: () => void;
    toggleCompactGrid: () => void;
}

export const useUXEngineStore = create<UXEngineState>()(
    persist(
        (set) => ({
            mode: 'command_center',
            highContrastMode: false,
            compactGrid: true,

            setMode: (mode) => set({ mode }),
            toggleHighContrast: () => set((state) => ({ highContrastMode: !state.highContrastMode })),
            toggleCompactGrid: () => set((state) => ({ compactGrid: !state.compactGrid })),
        }),
        {
            name: 'ngo-ux-engine-mode',
            storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : {
                getItem: () => null,
                setItem: () => {},
                removeItem: () => {},
            })),
        },
    ),
);
