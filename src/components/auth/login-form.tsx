"use client";

import { useState } from "react";
import { signInWithPassword, signInWithOtp, signInWithOAuth, listMFAFactors } from "@/lib/auth/supabase-auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Wand2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().optional(),
});

type FormData = z.infer<typeof loginSchema>;

export function LoginForm() {
    const t = useTranslations("Auth.Login");
    const router = useRouter();
    const searchParams = useSearchParams();

    const [isLoading, setIsLoading] = useState(false);
    const [useMagicLink, setUseMagicLink] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");

    const rawCallbackUrl = searchParams.get("callbackUrl") || "/dashboard";

    // Only relative same-origin paths may be used as a post-login target.
    // Anything else (absolute URL, protocol-relative, backslash tricks)
    // falls back to the dashboard. Mirrors sanitizeCallbackUrl() in proxy.ts.
    function sanitizeCallbackUrl(value: string): string {
        if (!value.startsWith("/")) return "/dashboard";
        if (value.startsWith("//")) return "/dashboard";
        if (value.includes("\\")) return "/dashboard";
        try {
            const parsed = new URL(value, "http://localhost");
            const normalized = parsed.pathname + parsed.search + parsed.hash;
            return normalized.startsWith("/") ? normalized : "/dashboard";
        } catch {
            return "/dashboard";
        }
    }

    const callbackUrl = sanitizeCallbackUrl(rawCallbackUrl);
    const contextAction = searchParams.get("action");

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(loginSchema)
    });

    const onSubmit = async (data: FormData) => {
        setIsLoading(true);
        setError("");

        try {
            if (useMagicLink) {
                const { error } = await signInWithOtp(data.email);
                if (error) throw new Error(error);
                toast.success("Check your inbox!", { description: "We sent you a magic link." });
            } else {
                if (!data.password) {
                    setError(t("errors.credentials"));
                    return;
                }

                const { error } = await signInWithPassword(data.email, data.password);

                if (error) {
                    setError(t("errors.credentials"));
                } else {
                    // If the user has MFA enabled, require the second factor
                    const { factors } = await listMFAFactors();
                    const hasMFA = factors.some((f) => f.status === "verified");

                    if (hasMFA) {
                        router.push(`/auth/mfa?callbackUrl=${encodeURIComponent(callbackUrl)}`);
                        return;
                    }

                    router.push(callbackUrl);
                }
            }
        } catch {
            setError(t("errors.generic"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
                    <ShieldCheck className="w-3 h-3" /> {t("secure_badge")}
                </div>
                <h1 className="text-3xl font-serif font-bold text-foreground">{t("title")}</h1>
                <p className="text-muted-foreground">{t("subtitle")}</p>

                {contextAction && (
                    <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-100 flex items-center justify-center">
                        {t("context_banner", { action: contextAction })}
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-600 animate-in slide-in-from-top-2">
                        <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                )}

                <div className="space-y-2">
                    <Label>{t("email_label")}</Label>
                    <Input
                        {...register("email")}
                        placeholder="name@example.com"
                        className="h-12 bg-muted/30"
                        autoFocus
                    />
                    {errors.email && <span className="text-xs text-red-500">Invalid email</span>}
                </div>

                {!useMagicLink && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between">
                            <Label>{t("password_label")}</Label>
                            <Link href="/auth/forgot-password" className="text-xs text-primary font-medium hover:underline">
                                {t("forgot_password")}
                            </Link>
                        </div>
                        <div className="relative">
                            <Input
                                {...register("password")}
                                type={showPassword ? "text" : "password"}
                                className="h-12 bg-muted/30 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                )}

                <Button type="submit" size="lg" className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : useMagicLink ? t("magic_link_btn") : t("submit")}
                </Button>

                <div className="text-center">
                    <button
                        type="button"
                        onClick={() => setUseMagicLink(!useMagicLink)}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2 w-full py-2"
                    >
                        <Wand2 className="w-3 h-3" />
                        {useMagicLink ? "Use Password Instead" : t("magic_link_toggle")}
                    </button>
                </div>
            </form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                        {t("or_divider")}
                    </span>
                </div>
            </div>

            <div className="grid gap-3">
                <Button variant="outline" onClick={() => signInWithOAuth("google")} className="h-11 font-medium">
                    {/* Google SVG */}
                    {t("google_btn")}
                </Button>
                <Button variant="outline" onClick={() => signInWithOAuth("facebook")} className="h-11 font-medium">
                    {/* Facebook SVG */}
                    {t("facebook_btn")}
                </Button>
            </div>

            <div className="text-center text-sm">
                <p className="text-muted-foreground">
                    {t("no_account")}{" "}
                    <Link href="/auth/register" className="font-bold text-primary hover:underline">
                        {t("create_account")}
                    </Link>
                </p>
            </div>
        </div>
    );
}