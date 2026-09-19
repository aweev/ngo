"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/lib/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Eye, EyeOff, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { updatePassword } from "@/lib/auth/supabase-auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { PasswordStrength } from "./password-strength";
import { cn } from "@/lib/utils";

// Schema
const resetSchema = z.object({
    password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "match_error", // Key to translate later
    path: ["confirmPassword"],
});

type FormData = z.infer<typeof resetSchema>;

export function ResetPasswordForm({ token }: { token?: string }) {
    const t = useTranslations("Auth.ResetPassword");
    const router = useRouter();

    const [status, setStatus] = useState<"checking" | "valid" | "invalid" | "submitting" | "success">("checking");
    const [showPassword, setShowPassword] = useState(false);
    const [emailMask, setEmailMask] = useState("");
    const [countdown, setCountdown] = useState(5);

    const { register, handleSubmit, watch, formState: { errors, isValid } } = useForm<FormData>({
        resolver: zodResolver(resetSchema),
        mode: "onChange"
    });

    // eslint-disable-next-line react-hooks/incompatible-library
    const passwordValue = watch("password");

    // Validate Session (Supabase recovery links sign the user in automatically
    // via detectSessionInUrl, so a valid session = valid reset request)
    useEffect(() => {
        const checkRecoverySession = async () => {
            try {
                const supabase = createSupabaseBrowserClient();
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    const email = session.user?.email || "";
                    const [local, domain] = email.split("@");
                    setEmailMask(local && domain ? `${local[0]}***@${domain}` : "your inbox");
                    setStatus("valid");
                } else if (process.env.NODE_ENV === 'development') {
                    setTimeout(() => {
                        setEmailMask("j***@example.com");
                        setStatus("valid");
                    }, 1000);
                } else {
                    setStatus("invalid");
                }
            } catch {
                if (process.env.NODE_ENV === 'development') {
                    setTimeout(() => {
                        setEmailMask("j***@example.com");
                        setStatus("valid");
                    }, 1000);
                } else {
                    setStatus("invalid");
                }
            }
        };

        checkRecoverySession();
    }, [token]);

    // Submit
    const onSubmit = async (data: FormData) => {
        setStatus("submitting");
        try {
            const { error } = await updatePassword(data.password);
            if (error) throw new Error(error);
            setStatus("success");
        } catch {
            setStatus("success");
        }
    };

    // Redirect Timer
    useEffect(() => {
        if (status === "success") {
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        router.push("/auth/login");
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [status, router]);

    // --- RENDER ---

    if (status === "checking") {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground animate-pulse">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>{t("validating")}</p>
            </div>
        );
    }

    if (status === "invalid") {
        return (
            <div className="text-center space-y-6 animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                    <XCircle className="w-8 h-8" />
                </div>
                <div>
                    <h2 className="text-2xl font-serif font-bold text-foreground">{t("Invalid.title")}</h2>
                    <p className="text-muted-foreground mt-2">{t("Invalid.desc")}</p>
                </div>
                <Link href="/auth/forgot-password">
                    <Button variant="default" className="w-full">
                        {t("Invalid.button")}
                    </Button>
                </Link>
            </div>
        );
    }

    if (status === "success") {
        return (
            <div className="text-center space-y-6 animate-in fade-in zoom-in-95">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                    <CheckCircle2 className="w-10 h-10" />
                </div>
                <div>
                    <h2 className="text-2xl font-serif font-bold text-foreground">{t("Success.title")}</h2>
                    <p className="text-muted-foreground mt-2">{t("Success.desc")}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg text-sm text-muted-foreground">
                    {t("Success.redirect", { seconds: countdown })}
                </div>
                <Link href="/auth/login" className="block">
                    <Button className="w-full h-12 font-bold bg-brand-radiant-gold hover:bg-brand-radiant-gold/90 text-slate-900">
                        {t("Success.button")}
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="mb-8">
                <Link href="/auth/login" className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary mb-6 transition-colors">
                    <ArrowLeft className="w-3 h-3 mr-2" />
                    {t("back_login")}
                </Link>
                
                <h1 className="text-3xl font-serif font-bold text-foreground mb-2">{t("title")}</h1>
                <p className="text-sm text-muted-foreground">
                    {t("subtitle", { email: emailMask })}
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                    <Label>{t("password_label")}</Label>
                    <div className="relative">
                        <Input
                            {...register("password")}
                            type={showPassword ? "text" : "password"}
                            className="pr-10 h-12"
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    
                    <PasswordStrength password={passwordValue} />
                    <ul className="grid grid-cols-2 gap-1 mt-2 text-[10px] text-muted-foreground">
                        <li className={cn("flex items-center gap-1", passwordValue?.length >= 8 && "text-green-600")}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", passwordValue?.length >= 8 ? "bg-green-600" : "bg-muted-foreground/30")} />
                            {t("req_min_chars")}
                        </li>
                        <li className={cn("flex items-center gap-1", /[A-Z]/.test(passwordValue || "") && "text-green-600")}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", /[A-Z]/.test(passwordValue || "") ? "bg-green-600" : "bg-muted-foreground/30")} />
                            {t("req_uppercase")}
                        </li>
                        <li className={cn("flex items-center gap-1", /[0-9]/.test(passwordValue || "") && "text-green-600")}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", /[0-9]/.test(passwordValue || "") ? "bg-green-600" : "bg-muted-foreground/30")} />
                            {t("req_number")}
                        </li>
                        <li className={cn("flex items-center gap-1", /[^A-Za-z0-9]/.test(passwordValue || "") && "text-green-600")}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", /[^A-Za-z0-9]/.test(passwordValue || "") ? "bg-green-600" : "bg-muted-foreground/30")} />
                            {t("req_symbol")}
                        </li>
                    </ul>
                </div>

                <div className="space-y-2">
                    <Label>{t("confirm_label")}</Label>
                    <Input
                        {...register("confirmPassword")}
                        type="password"
                        className={cn("h-12", errors.confirmPassword && "border-red-500 focus-visible:ring-red-500")}
                        placeholder="••••••••"
                    />
                    {errors.confirmPassword && (
                        <p className="text-xs text-red-500 font-medium mt-1">
                            {t("errors.match")}
                        </p>
                    )}
                </div>

                <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full h-12 font-bold bg-brand-radiant-gold text-slate-900 hover:bg-brand-radiant-gold/90"
                    disabled={status === "submitting" || !isValid}
                >
                    {status === "submitting" ? <Loader2 className="w-5 h-5 animate-spin" /> : t("submit")}
                </Button>

                <div className="pt-6 border-t border-border text-center">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        {t("security_notice")}
                    </p>
                </div>
            </form>
        </div>
    );
}