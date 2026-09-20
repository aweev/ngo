"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Building2, Loader2, LogOut, MailCheck } from "lucide-react";
import { bootstrapOrganization } from "@/actions/bootstrap";
import { signOut } from "@/lib/auth/supabase-auth";

export function SetupWizard({ organizationExists }: { organizationExists: boolean }) {
    const t = useTranslations("Auth.Setup");
    const router = useRouter();
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const create = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        const result = await bootstrapOrganization({ name });
        if (result.success) {
            router.push("/admin");
            router.refresh();
        } else {
            setError(result.error || t("error_generic"));
            setIsLoading(false);
        }
    };

    const leave = async () => {
        await signOut();
        router.push("/auth/login");
        router.refresh();
    };

    // Workspace exists but this account is not linked yet — invite flow owns
    // the next step; this screen only explains and offers a clean exit.
    if (organizationExists) {
        return (
            <div className="mx-auto w-full max-w-md space-y-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <MailCheck className="h-7 w-7" />
                </div>
                <div className="space-y-2">
                    <h1 className="font-serif text-3xl font-bold text-foreground">{t("pending_title")}</h1>
                    <p className="text-sm text-muted-foreground">{t("pending_desc")}</p>
                </div>
                <Button variant="outline" className="w-full" onClick={leave}>
                    <LogOut className="mr-2 h-4 w-4" /> {t("sign_out")}
                </Button>
            </div>
        );
    }

    // Fresh workspace — the first user names the organization and becomes owner.
    return (
        <div className="mx-auto w-full max-w-md space-y-6">
            <div className="space-y-2 text-center md:text-left">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                    <Building2 className="h-3 w-3" /> {t("badge")}
                </div>
                <h1 className="font-serif text-3xl font-bold text-foreground">{t("create_title")}</h1>
                <p className="text-sm text-muted-foreground">{t("create_subtitle")}</p>
            </div>

            <form onSubmit={create} className="space-y-4">
                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
                )}
                <div className="space-y-2">
                    <Label>{t("org_name_label")}</Label>
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t("org_name_placeholder")}
                        className="h-12 bg-muted/30"
                        autoFocus
                        maxLength={120}
                    />
                </div>
                <Button type="submit" size="lg" className="h-12 w-full font-bold" disabled={isLoading || name.trim().length < 2}>
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : t("submit")}
                </Button>
            </form>

            <div className="text-center">
                <button type="button" onClick={leave} className="text-sm text-muted-foreground underline hover:text-foreground">
                    {t("sign_out")}
                </button>
            </div>
        </div>
    );
}
