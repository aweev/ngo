"use client";

import { useState, useRef } from "react";
import { verifyMfaCode } from "@/lib/auth/mfa";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, ShieldCheck, Smartphone, KeyRound, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function MFAForm({ callbackUrl }: { callbackUrl: string }) {
    const t = useTranslations("Auth.MFA");
    const router = useRouter();

    // States
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [isLoading, setIsLoading] = useState(false);
    const [trustDevice, setTrustDevice] = useState(false);
    const [useRecovery, setUseRecovery] = useState(false);
    const [recoveryCode, setRecoveryCode] = useState("");
    const [isError, setIsError] = useState(false);

    // Refs for auto-focus
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Handle OTP Input
    const handleOtpChange = (index: number, value: string) => {
        if (isNaN(Number(value))) return;

        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);
        setIsError(false);

        // Auto-advance
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-Submit on full
        const combined = newOtp.join("");
        if (combined.length === 6 && index === 5 && value) {
            handleSubmit(combined);
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const data = e.clipboardData.getData("text").trim().slice(0, 6);
        if (!/^\d+$/.test(data)) return;

        const chars = data.split("");
        const newOtp = [...otp];
        chars.forEach((c, i) => { if (i < 6) newOtp[i] = c; });
        setOtp(newOtp);

        // Focus last filled
        if (chars.length === 6) {
            inputRefs.current[5]?.focus();
            handleSubmit(data);
        } else {
            inputRefs.current[chars.length]?.focus();
        }
    };

    // Unified Submit Logic
    const handleSubmit = async (code: string) => {
        setIsLoading(true);
        setIsError(false);

        try {
            // Supabase MFA: challenge the enrolled factor and verify the code
            // (TOTP or recovery code - Supabase accepts both via verify)
            const res = await (async () => {
                const { error } = await verifyMfaCode(code);
                return { error };
            })();

            if (res?.error) {
                setIsError(true);
                toast.error(t("errors.invalid"));
                // Clear input on error for UX
                if (!useRecovery) setOtp(["", "", "", "", "", ""]);
            } else {
                toast.success(t("success"));
                router.push(callbackUrl);
            }
        } catch {
            setIsError(true);
            toast.error(t("errors.generic"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-8">
                <Link href="/auth/login" className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary mb-6 transition-colors">
                    <ArrowLeft className="w-3 h-3 mr-2" />
                    {t("back_login")}
                </Link>

                <h1 className="text-3xl font-serif font-bold text-foreground mb-2">{t("title")}</h1>
                <p className="text-sm text-muted-foreground">
                    {useRecovery ? t("subtitle_recovery") : t("subtitle_app")}
                </p>
            </div>

            <div className="space-y-8">
                <AnimatePresence mode="wait">

                    {/* MODE A: OTP INPUT */}
                    {!useRecovery ? (
                        <motion.div
                            key="otp"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-6"
                        >
                            <div className="flex gap-2 justify-center sm:justify-start">
                                {otp.map((digit, i) => (
                                    <div key={i} className={cn("relative", i === 3 && "ml-4")}>
                                        <input
                                            ref={el => { inputRefs.current[i] = el }}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(i, e)}
                                            onPaste={handlePaste}
                                            disabled={isLoading}
                                            className={cn(
                                                "w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 bg-background focus:outline-none focus:ring-0 transition-all",
                                                isError
                                                    ? "border-red-500 text-red-600 animate-shake"
                                                    : "border-border focus:border-brand-hopeful-clay"
                                            )}
                                        />
                                        {/* Divider Logic is handled by margin on index 3 */}
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="trust"
                                    checked={trustDevice}
                                    onCheckedChange={(c) => setTrustDevice(!!c)}
                                />
                                <Label htmlFor="trust" className="text-sm font-medium cursor-pointer">
                                    {t("trust_device")}
                                </Label>
                            </div>

                            <Button
                                onClick={() => handleSubmit(otp.join(""))}
                                className="w-full h-12 font-bold"
                                disabled={isLoading || otp.join("").length !== 6}
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t("verify_btn")}
                            </Button>
                        </motion.div>
                    ) : (

                        /* MODE B: RECOVERY CODE */
                        <motion.div
                            key="recovery"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <Label>{t("recovery_label")}</Label>
                                <Input
                                    placeholder="XXXX-XXXX-XXXX"
                                    value={recoveryCode}
                                    onChange={(e) => {
                                        setRecoveryCode(e.target.value.toUpperCase());
                                        setIsError(false);
                                    }}
                                    className={cn("h-12 font-mono uppercase tracking-widest", isError && "border-red-500")}
                                />
                            </div>

                            <Button
                                onClick={() => handleSubmit(recoveryCode)}
                                className="w-full h-12 font-bold"
                                disabled={isLoading || recoveryCode.length < 8}
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t("verify_recovery_btn")}
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Switcher & Footer */}
                <div className="space-y-4 pt-4 border-t border-border">
                    <button
                        onClick={() => {
                            setUseRecovery(!useRecovery);
                            setIsError(false);
                        }}
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                    >
                        {useRecovery ? (
                            <><Smartphone className="w-4 h-4" /> {t("switch_to_app")}</>
                        ) : (
                            <><KeyRound className="w-4 h-4" /> {t("switch_to_recovery")}</>
                        )}
                    </button>

                    <Link href="/public/contact?topic=security" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-red-600 transition-colors">
                        <HelpCircle className="w-4 h-4" />
                        {t("lost_device")}
                    </Link>
                </div>

                <div className="text-center pt-2">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex justify-center items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-brand-hopeful-clay" />
                        {t("secure_context")}
                    </p>
                </div>
            </div>
        </div>
    );
}