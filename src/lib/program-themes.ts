export type ProgramCategory = 'education' | 'health' | 'economic-empowerment' | 'social-integration';

export const PROGRAM_THEMES: Record<ProgramCategory, {
    primary: string; // Text color (e.g., text-blue-600)
    bg: string;      // Light background (e.g., bg-blue-50)
    border: string;  // Border color (e.g., border-blue-200)
    gradient: string; // Gradient class (e.g., from-blue-600/10)
    fill: string;    // SVG Fill (e.g., fill-blue-600)
    shadow: string;  // Shadow color
}> = {
    education: {
        primary: "text-blue-600",
        bg: "bg-blue-50/50",
        border: "border-blue-200",
        gradient: "from-blue-600/20 to-transparent",
        fill: "fill-blue-600",
        shadow: "shadow-blue-500/10"
    },
    health: {
        primary: "text-rose-600",
        bg: "bg-rose-50/50",
        border: "border-rose-200",
        gradient: "from-rose-600/20 to-transparent",
        fill: "fill-rose-600",
        shadow: "shadow-rose-500/10"
    },
    "economic-empowerment": {
        primary: "text-amber-600",
        bg: "bg-amber-50/50",
        border: "border-amber-200",
        gradient: "from-amber-600/20 to-transparent",
        fill: "fill-amber-600",
        shadow: "shadow-amber-500/10"
    },
    "social-integration": {
        primary: "text-emerald-600",
        bg: "bg-emerald-50/50",
        border: "border-emerald-200",
        gradient: "from-emerald-600/20 to-transparent",
        fill: "fill-emerald-600",
        shadow: "shadow-emerald-500/10"
    }
};