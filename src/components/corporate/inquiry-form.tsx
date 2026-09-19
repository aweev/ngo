"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Download, Loader2, CheckCircle } from "lucide-react";
import { submitPublicForm } from "@/actions/public";

const formSchema = z.object({
    companyName: z.string().min(2),
    contactPerson: z.string().min(2),
    email: z.string().email(),
    industry: z.string().min(2),
    budget: z.string(),
    goals: z.string().min(10)
});

type FormData = z.infer<typeof formSchema>;

export function InquiryForm() {
    const t = useTranslations("Corporate.Form");
    const tDown = useTranslations("Corporate.Downloads");
    const [isSuccess, setIsSuccess] = useState(false);

    const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(formSchema)
    });

    const onSubmit = async (data: FormData) => {
        try {
            const res = await submitPublicForm("corporate-inquiry", data);
            if (!res.success) throw new Error(res.error || "Submission failed");
            setIsSuccess(true);
        } catch (error) {
            console.error("Form error", error);
        }
    };

    if (isSuccess) {
        return (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-12 rounded-xl text-center border border-emerald-100 dark:border-emerald-900 max-w-2xl mx-auto my-12">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-emerald-900 dark:text-emerald-200 mb-2">{t("success_title")}</h3>
                <p className="text-emerald-700 dark:text-emerald-400">{t("success_desc")}</p>
            </div>
        );
    }

    return (
        // Light mode: Dark section. Dark mode: Standard background with border
        <section id="inquiry-form" className="py-24 bg-slate-900 dark:bg-background text-white dark:text-foreground border-t dark:border-border transition-colors">
            <div className="container mx-auto px-4">
                <div className="grid lg:grid-cols-12 gap-16">

                    {/* Left: Downloads */}
                    <div className="lg:col-span-4 space-y-8">
                        <div>
                            <h2 className="text-3xl font-serif font-bold mb-4 text-white dark:text-foreground">{t("title")}</h2>
                            <p className="text-slate-400 dark:text-muted-foreground leading-relaxed">{t("subtitle")}</p>
                        </div>

                        <div className="space-y-4 pt-8 border-t border-slate-800 dark:border-border">
                            {/* Buttons adapt to look ghost-like on dark backgrounds or standard on card */}
                            <a href="#" className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 dark:bg-card dark:hover:bg-muted dark:border dark:border-border transition-colors group">
                                <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center text-primary group-hover:text-white dark:group-hover:text-primary-foreground group-hover:bg-primary transition-colors">
                                    <Download className="w-5 h-5" />
                                </div>
                                <span className="font-medium text-sm text-slate-200 dark:text-foreground">{tDown("deck")}</span>
                            </a>
                            <a href="#" className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 dark:bg-card dark:hover:bg-muted dark:border dark:border-border transition-colors group">
                                <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center text-primary group-hover:text-white dark:group-hover:text-primary-foreground group-hover:bg-primary transition-colors">
                                    <Download className="w-5 h-5" />
                                </div>
                                <span className="font-medium text-sm text-slate-200 dark:text-foreground">{tDown("report")}</span>
                            </a>
                        </div>
                    </div>

                    {/* Right: Form */}
                    <div className="lg:col-span-8 bg-card text-card-foreground p-8 md:p-12 rounded-2xl shadow-2xl dark:shadow-none dark:border dark:border-border">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>{t("fields.company")}</Label>
                                    <Input {...register("companyName")} placeholder="Acme Corp" className="bg-background" />
                                    {errors.companyName && <span className="text-xs text-red-500">{errors.companyName.message}</span>}
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("fields.contact")}</Label>
                                    <Input {...register("contactPerson")} placeholder="Jane Doe" className="bg-background" />
                                    {errors.contactPerson && <span className="text-xs text-red-500">{errors.contactPerson.message}</span>}
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>{t("fields.email")}</Label>
                                    <Input {...register("email")} type="email" placeholder="jane@acme.com" className="bg-background" />
                                    {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("fields.budget")}</Label>
                                    <Select onValueChange={(val) => setValue("budget", val)}>
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="Select Range" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5-10k">€5k - €10k</SelectItem>
                                            <SelectItem value="10-50k">€10k - €50k</SelectItem>
                                            <SelectItem value="50k+">€50k+</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>{t("fields.industry")}</Label>
                                <Input {...register("industry")} placeholder="Technology, Finance, etc." className="bg-background" />
                            </div>

                            <div className="space-y-2">
                                <Label>{t("fields.goals")}</Label>
                                <Textarea
                                    {...register("goals")}
                                    placeholder="We want to support education initiatives..."
                                    className="min-h-[120px] bg-background"
                                />
                                {errors.goals && <span className="text-xs text-red-500">{errors.goals.message}</span>}
                            </div>

                            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                {t("submit")}
                            </Button>
                        </form>
                    </div>

                </div>
            </div>
        </section>
    );
}