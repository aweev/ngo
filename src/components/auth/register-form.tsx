"use client";

import { useState } from "react";
import { signUpWithPassword, signInWithOAuth } from "@/lib/auth/supabase-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation"; // Using your custom Link wrapper
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { HandHeart, Coins, GraduationCap, Loader2, Lock, Eye, EyeOff, Info } from "lucide-react";
import { toast } from "sonner";
import { PasswordStrength } from "./password-strength";
import { cn } from "@/lib/utils";

// Valid roles type definition
type UserRole = "volunteer" | "donor" | "alumni";

// Schema
const registerSchema = z.object({
    role: z.enum(["volunteer", "donor", "alumni"]),
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    email: z.string().email(),
    password: z.string()
        .min(12) // <<< Changed from 8 to 12
        .regex(/[0-9]/, "Password must contain at least one number") // Added specific error messages for clarity
        .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"), // Added specific error messages
    terms: z.boolean().refine(val => val === true, "You must accept the terms and conditions"), // Added specific error messages
    gdpr: z.boolean().refine(val => val === true, "You must consent to GDPR"), // Added specific error messages
    newsletter: z.boolean().optional()
});

type FormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
    const t = useTranslations("Auth.Register");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isCorporateEmail, setIsCorporateEmail] = useState(false);

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: { role: "volunteer", newsletter: false }
    });

    const selectedRole = watch("role");

    // Removed unused 'emailValue' variable here

    // Corporate Detection (Simple Heuristic)
    const checkCorporate = (email: string) => {
        const commonProviders = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'icloud.com'];
        if (email && email.includes('@')) {
            const domain = email.split('@')[1];
            setIsCorporateEmail(!commonProviders.includes(domain));
        } else {
            setIsCorporateEmail(false);
        }
    };

    const onSubmit = async (data: FormData) => {
        setIsLoading(true);
        try {
            const email = data.email.trim().toLowerCase();
            const locale = window.location.pathname.split('/')[1] || 'en';

            // Create the auth user in Supabase (confirmation email is sent automatically)
            const { error } = await signUpWithPassword(email, data.password, {
                role: data.role,
                first_name: data.firstName,
                last_name: data.lastName,
                terms_accepted: data.terms,
                gdpr_consent: data.gdpr,
                newsletter_opt_in: data.newsletter || false,
            }, `${window.location.origin}/${locale}/auth/callback`);

            if (error) {
                throw new Error(error);
            }

            // Redirect to Verify Email page
            window.location.href = "/auth/verify-email?new=true";
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown signup error";
            // Log full detail server-side only pattern: keep browser console clean of PII.
            if (process.env.NODE_ENV === "development") {
                console.error("Signup failed");
            }

            const normalizedMessage = message.toLowerCase();
            if (normalizedMessage.includes("already registered") || normalizedMessage.includes("already exists")) {
                toast.error("An account with this email already exists. Try signing in instead.");
            } else if (normalizedMessage.includes("rate limit") || normalizedMessage.includes("too many requests")) {
                toast.error("Too many signup attempts. Please wait a few minutes and try again.");
            } else if (normalizedMessage.includes("invalid email") || normalizedMessage.includes("email address")) {
                toast.error("Please enter a valid email address without spaces.");
            } else {
                // Generic message: never interpolate raw provider error (prevents email enumeration).
                toast.error("Could not create your account. Please check your details and try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const roles: { key: UserRole; icon: typeof HandHeart }[] = [
        { key: "volunteer", icon: HandHeart },
        { key: "donor", icon: Coins },
        { key: "alumni", icon: GraduationCap },
    ];

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="space-y-2 text-center md:text-left">
                <h1 className="text-3xl font-serif font-bold text-foreground">{t("title")}</h1>
                <p className="text-muted-foreground text-sm">
                    {t("subtitle")} <Link href="/auth/login" className="text-primary hover:underline">{t("login_link")}</Link>
                </p>
            </div>

            {/* Step 1: Role Selector */}
            <div className="grid grid-cols-3 gap-3">
                {roles.map((r) => (
                    <button
                        key={r.key}
                        type="button"
                        // FIX: Explicitly cast key to UserRole to satisfy TypeScript
                        onClick={() => setValue("role", r.key)}
                        className={cn(
                            "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200",
                            selectedRole === r.key
                                ? "border-brand-radiant-gold bg-brand-radiant-gold/5 text-primary"
                                : "border-border bg-background text-muted-foreground hover:border-primary/30"
                        )}
                    >
                        <r.icon className={cn("w-6 h-6 mb-2", selectedRole === r.key ? "text-brand-radiant-gold" : "opacity-50")} />
                        <span className="text-xs font-bold uppercase tracking-wide">{t(`Roles.${r.key}`)}</span>
                    </button>
                ))}
            </div>

            {/* Socials */}
            <div className="grid gap-3">
                <Button variant="outline" onClick={() => signInWithOAuth("google")} className="h-11 font-medium">
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                    {t("Social.google")}
                </Button>
                <Button variant="outline" onClick={() => signInWithOAuth("facebook")} className="h-11 font-medium">
                    <svg className="mr-2 h-4 w-4" fill="#1877F2" viewBox="0 0 24 24"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036c-2.148 0-2.797 1.657-2.797 3.393v.577h4.601l-.675 3.667h-3.926v7.98H9.101Z" /></svg>
                    {t("Social.facebook")}
                </Button>
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">{t("Social.divider")}</span></div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t("Fields.first_name")}</Label>
                        <Input {...register("firstName")} placeholder="Jane" />
                        {errors.firstName && <span className="text-xs text-red-500">Required</span>}
                    </div>
                    <div className="space-y-2">
                        <Label>{t("Fields.last_name")}</Label>
                        <Input {...register("lastName")} placeholder="Doe" />
                        {errors.lastName && <span className="text-xs text-red-500">Required</span>}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>{t("Fields.email")}</Label>
                    <Input
                        {...register("email")}
                        type="email"
                        placeholder="you@example.com"
                        onBlur={(e) => checkCorporate(e.target.value)}
                    />
                    {errors.email && <span className="text-xs text-red-500">Invalid Email</span>}
                    {isCorporateEmail && (
                        <div className="flex gap-2 p-2 bg-blue-50 text-blue-700 text-xs rounded-lg items-start">
                            <Info className="w-4 h-4 shrink-0" />
                            {t("Fields.email_tip")}
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <Label>{t("Fields.password")}</Label>
                    <div className="relative">
                        <Input
                            {...register("password")}
                            type={showPassword ? "text" : "password"}
                            className="pr-10"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    <PasswordStrength password={watch("password") || ""} />
                    <p className="text-xs text-muted-foreground">{t("Fields.password_req")}</p>
                </div>

                {/* Legal Box */}
                <div className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-3">
                    <div className="flex items-start space-x-2">
                        <Checkbox id="terms" onCheckedChange={(c) => setValue("terms", !!c)} />
                        <Label htmlFor="terms" className="text-xs font-normal leading-tight cursor-pointer">
                            {/* FIX: Use keys corresponding to the updated JSON */}
                            {t.rich("Legal.terms_statement", {
                                terms: (chunks) => <Link href="/legal/terms" target="_blank" className="underline hover:text-primary">{chunks}</Link>,
                                privacy: (chunks) => <Link href="/legal/privacy" target="_blank" className="underline hover:text-primary">{chunks}</Link>
                            })}
                        </Label>
                    </div>
                    <div className="flex items-start space-x-2">
                        <Checkbox id="gdpr" onCheckedChange={(c) => setValue("gdpr", !!c)} />
                        <Label htmlFor="gdpr" className="text-xs font-normal leading-tight cursor-pointer">
                            {t("Legal.gdpr")}
                        </Label>
                    </div>
                    <div className="flex items-start space-x-2">
                        <Checkbox id="news" onCheckedChange={(c) => setValue("newsletter", !!c)} />
                        <Label htmlFor="news" className="text-xs font-normal leading-tight cursor-pointer text-muted-foreground">
                            {t("Legal.newsletter")}
                        </Label>
                    </div>
                </div>

                {/* Submit */}
                <Button type="submit" size="lg" className="w-full font-bold h-12" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : t("submit")}
                </Button>

                <div className="text-center space-y-4">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                        <Lock className="w-3 h-3" />
                        {t("security_note")}
                    </p>
                    <Link href="/public/contact" className="block text-xs text-muted-foreground underline hover:text-foreground">
                        {t("safeguarding")}
                    </Link>
                </div>

            </form>
        </div>
    );
}