"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Search, UserCheck, FileText, Download, UserCog, Mail } from "lucide-react";
import { toast } from "sonner";
import { signInWithOtp } from "@/lib/auth/supabase-auth";
import { motion, AnimatePresence } from "framer-motion";

// Schema for Step A
const searchSchema = z.object({
    identifier: z.string().min(3) // Email or ID
});

type SearchFormData = z.infer<typeof searchSchema>;

interface FoundUser {
    firstName: string;
    maskedEmail: string;
    id: string;
}

export function ClaimHandler() {
    const t = useTranslations("Auth.Claim");

    // States: 'search' | 'found' | 'no_match' | 'success'
    const [step, setStep] = useState<"search" | "found" | "no_match" | "success">("search");
    const [isLoading, setIsLoading] = useState(false);
    const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
    const [lastEmail, setLastEmail] = useState("");

    const { register, handleSubmit, formState: { errors } } = useForm<SearchFormData>({
        resolver: zodResolver(searchSchema)
    });

    // Step A: Send claim link (privacy-first: we never reveal whether an account exists)
    const onSearch = async (data: SearchFormData) => {
        setIsLoading(true);
        setLastEmail(data.identifier);
        try {
            const { error } = await signInWithOtp(data.identifier, `${window.location.origin}/auth/claim`);
            if (error) throw new Error(error);
            setStep("success");
        } catch {
            setStep("no_match");
        } finally {
            setIsLoading(false);
        }
    };

    // Step B: Re-send the claim link
    const onSendActivation = async () => {
        if (!lastEmail) return;
        setIsLoading(true);
        try {
            const { error } = await signInWithOtp(lastEmail, `${window.location.origin}/auth/claim`);
            if (error) throw new Error(error);
            setStep("success");
            toast.success(t("Success.toast"));
        } catch {
            toast.error(t("error_generic"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto relative min-h-[400px]">
            <AnimatePresence mode="wait">

                {/* 1. SEARCH STATE */}
                {step === "search" && (
                    <motion.div
                        key="search"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                    >
                        <div className="text-center md:text-left">
                            <h1 className="text-3xl font-serif font-bold text-foreground mb-2">{t("Search.title")}</h1>
                            <p className="text-muted-foreground text-sm">{t("Search.subtitle")}</p>
                        </div>

                        <form onSubmit={handleSubmit(onSearch)} className="space-y-6">
                            <div className="space-y-2">
                                <Label>{t("Search.label")}</Label>
                                <div className="relative">
                                    <Input
                                        {...register("identifier")}
                                        placeholder="jane@example.com / MEM-2024-X"
                                        className="pl-10 h-12"
                                    />
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                </div>
                                {errors.identifier && <span className="text-xs text-red-500">{t("error_required")}</span>}
                            </div>

                            <Button type="submit" size="lg" className="w-full font-bold h-12" disabled={isLoading}>
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("Search.submit")}
                            </Button>
                        </form>

                        {/* Value Prop Box */}
                        <div className="bg-muted/30 border border-border rounded-xl p-6 space-y-4">
                            <h4 className="font-bold text-sm text-foreground">{t("Benefits.title")}</h4>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <FileText className="w-4 h-4 text-primary" /> {t("Benefits.point_1")}
                                </li>
                                <li className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <Download className="w-4 h-4 text-primary" /> {t("Benefits.point_2")}
                                </li>
                                <li className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <UserCog className="w-4 h-4 text-primary" /> {t("Benefits.point_3")}
                                </li>
                            </ul>
                        </div>
                    </motion.div>
                )}

                {/* 2. FOUND STATE */}
                {step === "found" && foundUser && (
                    <motion.div
                        key="found"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-6"
                    >
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                            <UserCheck className="w-10 h-10" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-serif font-bold text-foreground">
                                {t("Found.title", { name: foundUser.firstName })}
                            </h2>
                            <p className="text-muted-foreground mt-2 text-sm">
                                {t("Found.subtitle", { email: foundUser.maskedEmail })}
                            </p>
                        </div>

                        <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-800 text-left">
                            {t("Found.privacy_note")}
                        </div>

                        <div className="space-y-3 pt-2">
                            <Button
                                onClick={onSendActivation}
                                size="lg"
                                className="w-full font-bold h-12"
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("Found.submit")}
                            </Button>
                            <button
                                onClick={() => setStep("search")}
                                className="text-sm text-muted-foreground hover:text-foreground underline"
                            >
                                {t("back_search")}
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* 3. NO MATCH STATE */}
                {step === "no_match" && (
                    <motion.div
                        key="no_match"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-8"
                    >
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                            <Search className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-serif font-bold text-foreground">{t("NoMatch.title")}</h2>
                            <p className="text-muted-foreground mt-2 text-sm max-w-xs mx-auto">
                                {t("NoMatch.desc")}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <Button onClick={() => setStep("search")} variant="outline" className="w-full">
                                {t("NoMatch.retry")}
                            </Button>
                            <Button asChild variant="secondary" className="w-full bg-brand-hopeful-clay/10 text-primary hover:bg-brand-hopeful-clay/20">
                                <Link href="/auth/register">{t("NoMatch.create_new")}</Link>
                            </Button>
                        </div>

                        <div className="pt-4 border-t border-border">
                            <a href="mailto:support@awe-ev.org" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
                                <Mail className="w-4 h-4" />
                                {t("NoMatch.contact_support")}
                            </a>
                        </div>
                    </motion.div>
                )}

                {/* 4. SUCCESS STATE */}
                {step === "success" && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center space-y-6"
                    >
                        <div className="w-20 h-20 bg-brand-radiant-gold/20 rounded-full flex items-center justify-center mx-auto text-brand-radiant-gold-darker">
                            <Mail className="w-10 h-10" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-serif font-bold text-foreground">{t("Success.title")}</h2>
                            <p className="text-muted-foreground mt-2 text-sm">
                                {t("Success.desc")}
                            </p>
                        </div>
                        <Button asChild className="w-full mt-4">
                            <Link href="/auth/login">{t("Success.login_btn")}</Link>
                        </Button>
                    </motion.div>
                )}

            </AnimatePresence>

            {/* Footer */}
            <div className="absolute -bottom-16 left-0 right-0 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("footer_services")}
            </div>
        </div>
    );
}