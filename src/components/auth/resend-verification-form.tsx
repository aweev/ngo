"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { resendVerificationEmail } from "@/lib/auth/supabase-auth";
import { motion, AnimatePresence } from "framer-motion";

const resendSchema = z.object({
    email: z.string().email()
});

type FormData = z.infer<typeof resendSchema>;

export function ResendVerificationForm() {
    const t = useTranslations("Auth.ResendForm");
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(resendSchema)
    });

    const onSubmit = async (data: FormData) => {
        setIsLoading(true);
        try {
            const res = await resendVerificationEmail(data.email);
            if (res.error) throw new Error(res.error);

            setIsSent(true);
            toast.success(t("toast_sent"));
        } catch {
            toast.error(t("toast_error"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full">
            <AnimatePresence mode="wait">
                {isSent ? (
                    <motion.div
                        key="sent"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-green-50 border border-green-100 rounded-xl text-center space-y-2"
                    >
                        <div className="flex items-center justify-center gap-2 text-green-700 font-bold text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            {t("success_title")}
                        </div>
                        <p className="text-xs text-green-800/80">
                            {t("success_desc")}
                        </p>
                        <button
                            onClick={() => setIsSent(false)}
                            className="text-xs font-bold uppercase tracking-wider text-green-700 hover:text-green-900 underline mt-2"
                        >
                            {t("try_different")}
                        </button>
                    </motion.div>
                ) : (
                    <motion.form
                        key="form"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-4 text-left"
                    >
                        <div className="space-y-2">
                            <Label className="sr-only">{t("email_label")}</Label>
                            <Input
                                {...register("email")}
                                placeholder={t("email_placeholder")}
                                className="h-12 bg-muted/30 border-border focus:bg-background transition-colors"
                            />
                            {errors.email && <span className="text-xs text-red-500">{t("error_email")}</span>}
                        </div>

                        <Button
                            type="submit"
                            variant="outline"
                            className="w-full h-12 font-bold border-2 hover:bg-muted/50 hover:text-primary transition-colors"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Send className="w-4 h-4 mr-2" />
                            )}
                            {t("submit_btn")}
                        </Button>
                    </motion.form>
                )}
            </AnimatePresence>
        </div>
    );
}