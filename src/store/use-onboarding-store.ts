import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 1. Define the Shape of the Data
interface OnboardingFormData {
    // Volunteer specific
    skills: string[];
    availability: string[]; // e.g. ["weekends", "evenings"]
    experience: string;

    // Compliance
    waiverSigned: boolean;
    gdprConsent: boolean;

    // Donor specific (optional)
    preferredCauses?: string[];
}

interface OnboardingState {
    currentStep: number;
    role: 'volunteer' | 'donor' | null;
    completed: boolean;
    formData: OnboardingFormData;

    // Actions
    setStep: (step: number) => void;
    setRole: (role: 'volunteer' | 'donor') => void;
    setCompleted: (completed: boolean) => void;
    updateForm: (data: Partial<OnboardingFormData>) => void;
    reset: () => void;
}

// 2. Create the Store with Persistence
export const useOnboardingStore = create<OnboardingState>()(
    persist(
        (set) => ({
            // Initial State
            currentStep: 1,
            role: null,
            completed: false,
            formData: {
                skills: [],
                availability: [],
                experience: '',
                waiverSigned: false,
                gdprConsent: false,
            },

            // Actions
            setStep: (step) => set({ currentStep: step }),

            setRole: (role) => set({ role }),

            setCompleted: (completed) => set({ completed }),

            updateForm: (data) =>
                set((state) => ({
                    formData: { ...state.formData, ...data }
                })),

            reset: () =>
                set({
                    currentStep: 1,
                    role: null,
                    completed: false,
                    formData: {
                        skills: [],
                        availability: [],
                        experience: '',
                        waiverSigned: false,
                        gdprConsent: false,
                    }
                }),
        }),
        {
            name: 'awe-onboarding-storage', // Unique key in localStorage
            storage: createJSONStorage(() => localStorage), // Use browser storage

            // Optional: Versioning if you change the schema later
            version: 1,
        }
    )
);