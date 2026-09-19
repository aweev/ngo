"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, MailCheck, KeyRound, Mail } from "lucide-react";
import { resetPasswordRequest } from "@/lib/auth/supabase-auth";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// Schema
const forgotSchema = z.object({
    email: z.string().email(),
});

type FormData = z.infer<typeof forgotSchema>;

export function ForgotPasswordForm() {
    const t = useTranslations("Auth.ForgotPassword");
    const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
    const [submittedEmail, setSubmittedEmail] = useState("");
    const [resendCooldown, setResendCooldown] = useState(0);

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(forgotSchema)
    });

    // Countdown Timer Logic
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const onSubmit = async (data: FormData) => {
        setStatus("loading");

        try {
            // Supabase Auth: sends the password reset email.
            // We use a try-catch but ALWAYS show success to prevent email enumeration attacks
            await resetPasswordRequest(data.email);
        } catch (error) {
            // Log error internally, but don't show user
            console.error("Forgot password error", error);
        } finally {
            setSubmittedEmail(data.email);
            setStatus("success");
            setResendCooldown(60); // Start cooldown
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;
        // Re-trigger logic
        await onSubmit({ email: submittedEmail });
    };

    return (
        <div className="w-full relative">
            <AnimatePresence mode="wait">

                {/* STATE A: INPUT */}
                {status !== "success" && (
                    <motion.div
                        key="input"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                    >
                        {/* Header */}
                        <div className="space-y-2 text-center md:text-left">
                            <Link href="/auth/login" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-4 transition-colors">
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                {t("back_login")}
                            </Link>

                            <div className="w-12 h-12 bg-muted/50 rounded-xl flex items-center justify-center mb-4 border border-border mx-auto md:mx-0">
                                <KeyRound className="w-6 h-6 text-brand-hopeful-clay" />
                            </div>

                            <h1 className="text-3xl font-serif font-bold text-foreground">{t("title")}</h1>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                {t("subtitle")}
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <Label>{t("email_label")}</Label>
                                <Input
                                    {...register("email")}
                                    type="email"
                                    placeholder="name@example.com"
                                    className="h-12 bg-muted/30"
                                    autoFocus
                                />
                                {errors.email && <span className="text-xs text-red-500">Invalid email address</span>}
                            </div>

                            <Button type="submit" size="lg" className="w-full h-12 font-bold" disabled={status === "loading"}>
                                {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : t("submit")}
                            </Button>
                        </form>
                    </motion.div>
                )}

                {/* STATE B: SUCCESS */}
                {status === "success" && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                        className="text-center space-y-6"
                    >
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <MailCheck className="w-10 h-10 text-green-600" />
                        </div>

                        <div className="space-y-2">
                            <h2 className="text-2xl font-serif font-bold text-foreground">{t("Success.title")}</h2>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                {t.rich("Success.message", { email: submittedEmail })}
                            </p>
                        </div>

                        <div className="pt-4 space-y-3">
                            {/* Mobile Only: Open Mail App Intent */}
                            <Button className="w-full md:hidden" onClick={() => window.location.href = "mailto:"}>
                                <Mail className="w-4 h-4 mr-2" />
                                {t("Success.open_mail")}
                            </Button>

                            <Link href="/auth/login" className="block">
                                <Button variant="outline" className="w-full h-12">
                                    {t("back_login")}
                                </Button>
                            </Link>

                            <button
                                onClick={handleResend}
                                disabled={resendCooldown > 0}
                                className={cn(
                                    "text-sm font-medium hover:underline transition-colors",
                                    resendCooldown > 0 ? "text-muted-foreground cursor-not-allowed" : "text-primary"
                                )}
                            >
                                {resendCooldown > 0
                                    ? t("Success.resend_wait", { seconds: resendCooldown })
                                    : t("Success.resend")}
                            </button>
                        </div>
                    </motion.div>
                )}

            </AnimatePresence>

            {/* Footer Help */}
            <div className="mt-12 pt-6 border-t border-border text-center">
                <p className="text-xs text-muted-foreground">
                    {t("Footer.trouble")}{" "}
                    <Link href="/public/contact" className="underline hover:text-foreground">
                        {t("Footer.help_center")}
                    </Link>
                </p>
            </div>
        </div>
    );
}