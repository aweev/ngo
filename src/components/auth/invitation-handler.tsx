/* eslint-disable react-hooks/incompatible-library */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordStrength } from "./password-strength";
import { Loader2, AlertCircle, CheckCircle2, Building2, Lock } from "lucide-react";
import { toast } from "sonner";
import { signInWithPassword, signUpWithPassword } from "@/lib/auth/supabase-auth";
import { acceptInvitation } from "@/actions/auth";

// Types
interface InvitationData {
    valid: boolean;
    email: string;
    inviterName: string;
    organizationName: string;
    role: string;
    firstName?: string;
    lastName?: string;
    userExists: boolean;
}

// Schemas
const newUserSchema = z.object({
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    password: z.string().min(8).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
    consent: z.boolean().refine(val => val === true)
});

const existingUserSchema = z.object({
    password: z.string().min(1)
});

type NewUserFormData = z.infer<typeof newUserSchema>;
type ExistingUserFormData = z.infer<typeof existingUserSchema>;

export function InvitationHandler({ data, token }: { data: InvitationData; token: string }) {
    const t = useTranslations("Auth.Invite");
    const [isLoading, setIsLoading] = useState(false);

    // --- State D: Invalid Token ---
    if (!data.valid) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-600">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-serif font-bold text-foreground mb-2">{t("Invalid.title")}</h1>
                <p className="text-muted-foreground mb-8 max-w-sm">{t("Invalid.desc")}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                    {t("Invalid.retry")}
                </Button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Context Header */}
            <div className="mb-8 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-100">
                    <Building2 className="w-3 h-3" />
                    {data.organizationName}
                </div>
                <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
                    {/* Fixed: Ensure name is a string, not undefined */}
                    {data.userExists ? t("Existing.title", { name: data.firstName || "" }) : t("New.title")}
                </h1>
                <p className="text-muted-foreground text-sm">
                    {t("subtitle", { inviter: data.inviterName, role: data.role })}
                </p>
            </div>

            {data.userExists ? (
                <ExistingUserForm email={data.email} token={token} setIsLoading={setIsLoading} isLoading={isLoading} />
            ) : (
                <NewUserForm data={data} token={token} setIsLoading={setIsLoading} isLoading={isLoading} />
            )}

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground">
                <p>{t("Footer.help")} <a href={`mailto:admin@awe-ev.org`} className="underline hover:text-foreground">admin@awe-ev.org</a></p>
            </div>
        </div>
    );
}

// --- Sub-Form: New User ---
function NewUserForm({ data, token, isLoading, setIsLoading }: { data: InvitationData; token: string; isLoading: boolean; setIsLoading: (val: boolean) => void }) {
    const t = useTranslations("Auth.Invite.New");
    const router = useRouter();

    // Fixed: Destructure setValue from useForm
    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<NewUserFormData>({
        resolver: zodResolver(newUserSchema),
        defaultValues: { firstName: data.firstName || "", lastName: data.lastName || "", password: "", consent: false }
    });

    const onSubmit = async (formData: NewUserFormData) => {
        setIsLoading(true);
        try {
            // 1. Create the auth user in Supabase
            const { error: signUpError } = await signUpWithPassword(data.email, formData.password, {
                role: data.role,
                first_name: formData.firstName,
                last_name: formData.lastName
            });
            if (signUpError) throw new Error(signUpError);

            // 2. Establish a session (fails with "Email not confirmed" if confirmation is pending)
            const { error: signInError } = await signInWithPassword(data.email, formData.password);
            if (signInError) throw new Error(signInError);

            // 3. Claim the invited organization membership
            const accept = await acceptInvitation(token);
            if (!accept.success) throw new Error(accept.error || "Failed to accept invitation");

            router.push("/dashboard");
            router.refresh();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t("error_generic"));
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Read-only Email */}
            <div className="p-3 bg-muted/50 rounded-lg border border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-grow">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("email_verified")}</p>
                    <p className="text-sm font-medium text-foreground">{data.email}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{t("fname")}</Label>
                    <Input {...register("firstName")} placeholder="Jane" />
                    {errors.firstName && <span className="text-xs text-red-500">{t("error_required")}</span>}
                </div>
                <div className="space-y-2">
                    <Label>{t("lname")}</Label>
                    <Input {...register("lastName")} placeholder="Doe" />
                    {errors.lastName && <span className="text-xs text-red-500">{t("error_required")}</span>}
                </div>
            </div>

            <div className="space-y-2">
                <Label>{t("password")}</Label>
                <Input {...register("password")} type="password" />
                <PasswordStrength password={watch("password")} />
                {errors.password && <span className="text-xs text-red-500">{t("error_password_req")}</span>}
            </div>

            <div className="flex items-start gap-2 pt-2">
                {/* Fixed: Checkbox onCheckedChange */}
                <Checkbox
                    id="consent"
                    onCheckedChange={(c) => setValue("consent", !!c)}
                />
                <Label htmlFor="consent" className="text-xs font-normal leading-tight cursor-pointer">
                    {t("consent")}
                </Label>
            </div>

            <Button type="submit" size="lg" className="w-full font-bold" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("submit")}
            </Button>
        </form>
    );
}

// --- Sub-Form: Existing User ---
function ExistingUserForm({ email, token, isLoading, setIsLoading }: { email: string; token: string; isLoading: boolean; setIsLoading: (val: boolean) => void }) {
    const t = useTranslations("Auth.Invite.Existing");
    const { register, handleSubmit, formState: { errors } } = useForm<ExistingUserFormData>({
        resolver: zodResolver(existingUserSchema)
    });

    const onSubmit = async (formData: ExistingUserFormData) => {
        setIsLoading(true);
        try {
            // Sign in with existing credentials
            const { error: signInError } = await signInWithPassword(email, formData.password);
            if (signInError) throw new Error(signInError);

            // Grant organization membership from the invitation
            const res = await acceptInvitation(token);
            if (!res.success) throw new Error(res.error || "Failed to accept invitation");

            window.location.href = "/dashboard";
        } catch {
            toast.error(t("error_credentials"));
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {email[0].toUpperCase()}
                </div>
                <div>
                    <p className="text-sm font-medium text-foreground">{email}</p>
                    <p className="text-xs text-muted-foreground">{t("account_found")}</p>
                </div>
            </div>

            <div className="space-y-2">
                <Label>{t("password_label")}</Label>
                <div className="relative">
                    <Input {...register("password")} type="password" />
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
                {errors.password && <span className="text-xs text-red-500">{t("error_required")}</span>}
            </div>

            <Button type="submit" size="lg" className="w-full font-bold" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("submit")}
            </Button>
        </form>
    );
}