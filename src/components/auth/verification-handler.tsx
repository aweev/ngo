"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, Info, RefreshCw, ArrowRight } from "lucide-react";
import { resendVerificationEmail } from "@/lib/auth/supabase-auth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type VerificationStatus = "success" | "expired" | "invalid" | "already_verified" | "error";

export function VerificationHandler({ initialStatus }: { initialStatus: VerificationStatus }) {
    const t = useTranslations("Auth.VerifyEmail");
    const router = useRouter();
    
    // States for "Resend" flow
    const [resendEmail, setResendEmail] = useState("");
    const [isResending, setIsResending] = useState(false);
    const [countdown, setCountdown] = useState(5);

    // Auto-Redirect on Success
    useEffect(() => {
        if (initialStatus === "success" || initialStatus === "already_verified") {
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        router.push("/auth/onboarding/welcome");
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [initialStatus, router]);

    // Resend Handler
    const handleResend = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsResending(true);
        try {
            const res = await resendVerificationEmail(resendEmail);
            if (res.error) throw new Error(res.error);
            toast.success(t("Resend.success"));
        } catch {
            toast.error(t("Resend.error"));
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto text-center">
            
            <AnimatePresence mode="wait">
                
                {/* 1. SUCCESS STATE */}
                {initialStatus === "success" && (
                    <motion.div 
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-6"
                    >
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-serif font-bold text-foreground mb-2">{t("Success.title")}</h1>
                            <p className="text-muted-foreground">{t("Success.subtitle")}</p>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg text-sm font-medium">
                            {t("Success.redirect", { seconds: countdown })}
                        </div>
                        <Button 
                            className="w-full h-12 font-bold bg-brand-radiant-gold text-slate-900 hover:bg-brand-radiant-gold/90"
                            onClick={() => router.push("/auth/onboarding/welcome")}
                        >
                            {t("Success.button")}
                        </Button>
                    </motion.div>
                )}

                {/* 2. ALREADY VERIFIED */}
                {initialStatus === "already_verified" && (
                    <motion.div 
                        key="already"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-6"
                    >
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600">
                            <Info className="w-10 h-10" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-serif font-bold text-foreground mb-2">{t("Already.title")}</h1>
                            <p className="text-muted-foreground">{t("Already.subtitle")}</p>
                        </div>
                        <Button 
                            className="w-full h-12 font-bold"
                            onClick={() => router.push("/dashboard")}
                        >
                            {t("Already.button")}
                        </Button>
                    </motion.div>
                )}

                {/* 3. ERROR / EXPIRED STATE (With Resend Form) */}
                {(initialStatus === "expired" || initialStatus === "invalid" || initialStatus === "error") && (
                    <motion.div 
                        key="error"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-8"
                    >
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                            <XCircle className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-serif font-bold text-foreground mb-2">
                                {initialStatus === "expired" ? t("Error.expired_title") : t("Error.invalid_title")}
                            </h1>
                            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                                {initialStatus === "expired" ? t("Error.expired_desc") : t("Error.invalid_desc")}
                            </p>
                        </div>

                        {/* Resend Form */}
                        <div className="bg-card border border-border p-6 rounded-xl shadow-sm text-left">
                            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 text-primary" />
                                {t("Resend.title")}
                            </h3>
                            <form onSubmit={handleResend} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>{t("Resend.email_label")}</Label>
                                    <Input 
                                        type="email" 
                                        placeholder="name@example.com" 
                                        value={resendEmail}
                                        onChange={(e) => setResendEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={isResending}>
                                    {isResending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("Resend.button")}
                                </Button>
                            </form>
                        </div>

                        <div className="text-center">
                            <Link href="/auth/login" className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors inline-flex items-center">
                                {t("back_login")} <ArrowRight className="w-4 h-4 ml-1" />
                            </Link>
                        </div>
                    </motion.div>
                )}

            </AnimatePresence>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-border text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("footer_identity")}
            </div>
        </div>
    );
}