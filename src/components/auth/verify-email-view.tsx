"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { Mail, ArrowLeft } from "lucide-react";
import { ResendVerificationForm } from "@/components/auth/resend-verification-form";
import { motion } from "framer-motion";

interface VerifyEmailViewProps {
    isNewRegistration: boolean;
}

export function VerifyEmailView({ isNewRegistration }: VerifyEmailViewProps) {
    const t = useTranslations("Auth.VerifyEmailInstruction");

    return (
        <div className="w-full max-w-md mx-auto relative min-h-[400px]">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="text-center space-y-6"
            >
                {/* Icon */}
                <div className="w-20 h-20 bg-brand-radiant-gold/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-radiant-gold/30">
                    <Mail className="w-10 h-10 text-brand-hopeful-clay" />
                </div>

                {/* Headers */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-serif font-bold text-foreground">
                        {isNewRegistration ? t("New.title") : t("Default.title")}
                    </h1>
                    <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                        {isNewRegistration ? t("New.subtitle") : t("Default.subtitle")}
                    </p>
                </div>

                {/* Resend Form */}
                <div className="pt-4">
                    <ResendVerificationForm />
                </div>

                {/* Footer Link */}
                <div className="pt-6 border-t border-border">
                    <Link
                        href="/auth/login"
                        className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="w-3 h-3 mr-2" />
                        {t("back_login")}
                    </Link>
                </div>

                {/* Footer Tagline */}
                <div className="absolute -bottom-16 left-0 right-0 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                    {t("footer_security")}
                </div>
            </motion.div>
        </div>
    );
}