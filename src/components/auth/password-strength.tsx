"use client";

import { cn } from "@/lib/utils";

export function PasswordStrength({ password }: { password: string }) {
    // Logic: 0 = Empty, 1 = Weak, 2 = Medium, 3 = Strong
    const getStrength = (pass: string) => {
        let score = 0;
        if (!pass) return 0;
        if (pass.length > 8) score++;
        if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score++;
        if (/[^A-Za-z0-9]/.test(pass)) score++;
        return score;
    };

    const strength = getStrength(password);

    return (
        <div className="flex gap-1.5 mt-2">
            {[1, 2, 3].map((level) => (
                <div
                    key={level}
                    className={cn(
                        "h-1 w-full rounded-full transition-all duration-300",
                        level <= strength
                            ? strength === 1 ? "bg-red-500"
                                : strength === 2 ? "bg-yellow-500"
                                    : "bg-green-500"
                            : "bg-muted"
                    )}
                />
            ))}
        </div>
    );
}