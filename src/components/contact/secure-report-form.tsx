"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitPublicForm } from "@/actions/public";
import { toast } from "sonner";
import { Loader2, Lock, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Helper function remains outside component
const generateFallbackId = () => `CASE-${Date.now().toString().slice(-6)}`;

export function SecureReportForm() {
    const t = useTranslations("Safeguarding.Form");
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [refId, setRefId] = useState("");

    // Schema is now created inside the component to access 't'
    const schema = z.object({
        isAnonymous: z.boolean(),
        name: isAnonymous
            ? z.string().optional()
            : z.string().min(2, t("validation.name_required")),
        email: isAnonymous
            ? z.string().optional()
            : z.string().email(t("validation.email_invalid")),
        category: z.string().min(1, t("validation.category_required")),
        message: z.string().min(20, t("validation.message_min"))
    });

    type FormData = z.infer<typeof schema>;

    const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { isAnonymous: false, name: "", email: "", category: "", message: "" }
    });

    const onSubmit = async (data: FormData) => {
        try {
            const res = await submitPublicForm("safeguarding", data);
            if (!res.success) throw new Error(res.error || "Submission failed");

            const fallbackId = generateFallbackId();
            setRefId(res.id || fallbackId);
            setIsSuccess(true);
        } catch {
            toast.error(t("error_submission")); // Make sure to add this key or use a generic one
        }
    };

    if (isSuccess) {
        return (
            <div className="bg-slate-50 dark:bg-card border border-slate-200 dark:border-border rounded-xl p-12 text-center max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-slate-200 dark:bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock className="w-8 h-8 text-slate-700 dark:text-foreground" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-foreground mb-2">{t("success_title")}</h3>
                <p className="text-muted-foreground mb-6">
                    {t("success_desc", { refId })}
                </p>
                <div className="p-4 bg-background border border-border rounded-lg inline-block text-sm font-mono text-muted-foreground">
                    ID: {refId}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-2xl shadow-xl border border-border p-8 md:p-12 relative overflow-hidden">
            {/* Top Bar indicating Security */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-red-600" />

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 relative z-10">

                {/* Anonymity Toggle */}
                <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                    <Checkbox
                        id="anon"
                        checked={isAnonymous}
                        onCheckedChange={(c) => {
                            setIsAnonymous(!!c);
                            setValue("isAnonymous", !!c);
                        }}
                        className="mt-1"
                    />
                    <div>
                        <label htmlFor="anon" className="text-sm font-bold text-foreground cursor-pointer select-none">
                            {t("anonymous_label")}
                        </label>
                        <p className="text-xs text-muted-foreground">{t("anonymous_hint")}</p>
                    </div>
                </div>

                <AnimatePresence>
                    {!isAnonymous && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="grid md:grid-cols-2 gap-6 overflow-hidden"
                        >
                            <div className="space-y-2 py-1">
                                <Label>{t("name_label")}</Label>
                                <Input
                                    {...register("name")}
                                    placeholder={t("name_placeholder")}
                                />
                                {errors.name && <span className="text-xs text-red-500">{String(errors.name.message)}</span>}
                            </div>
                            <div className="space-y-2 py-1">
                                <Label>{t("email_label")}</Label>
                                <Input
                                    {...register("email")}
                                    type="email"
                                    placeholder={t("email_placeholder")}
                                />
                                <p className="text-xs text-muted-foreground">{t("email_hint")}</p>
                                {errors.email && <span className="text-xs text-red-500">{String(errors.email.message)}</span>}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="space-y-2">
                    <Label>{t("category_label")}</Label>
                    <Select onValueChange={(val) => setValue("category", val)}>
                        <SelectTrigger>
                            <SelectValue placeholder={t("select_placeholder")} />
                        </SelectTrigger>
                        <SelectContent>
                            {["fraud", "safeguarding", "harassment", "security", "other"].map(key => (
                                <SelectItem key={key} value={key}>
                                    {t(`Categories.${key}`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.category && <span className="text-xs text-red-500">{t("validation.category_required")}</span>}
                </div>

                <div className="space-y-2">
                    <Label>{t("message_label")}</Label>
                    <Textarea
                        {...register("message")}
                        placeholder={t("message_placeholder")}
                        className="min-h-[200px] resize-none"
                    />
                    {errors.message && <span className="text-xs text-red-500">{String(errors.message.message)}</span>}
                </div>

                <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-foreground text-background hover:bg-foreground/90"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <><Loader2 className="w-4 h-4 animate-spin mr-2" /> {t("submitting")}</>
                    ) : (
                        <><Lock className="w-4 h-4 mr-2" /> {t("submit")}</>
                    )}
                </Button>

                <div className="text-center">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        {t("ssl_secure")}
                    </p>
                </div>

            </form>
        </div>
    );
}