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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { submitPublicForm } from "@/actions/public";
import { toast } from "sonner";
import { Loader2, Send, Info } from "lucide-react";
import { Link } from "@/lib/navigation";

// Schema
const formSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    topic: z.string(),
    company: z.string().optional(), // Dynamic
    message: z.string().min(10),
    consent: z.boolean().refine(val => val === true)
});

type FormData = z.infer<typeof formSchema>;

export function SmartContactForm() {
    const t = useTranslations("Contact.Form");
    const [topic, setTopic] = useState("general");
    const [isSuccess, setIsSuccess] = useState(false);

    const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: { topic: "general" }
    });

    const onSubmit = async (data: FormData) => {
        try {
            const res = await submitPublicForm("contact-form", data);
            if (!res.success) throw new Error(res.error || "Submission failed");
            setIsSuccess(true);
            toast.success(t("success_title"), { description: t("success_desc") });
        } catch {
            toast.error("Failed to send message");
        }
    };

    if (isSuccess) {
        return (
            <div className="bg-emerald-50 p-12 rounded-2xl text-center border border-emerald-100 h-full flex flex-col justify-center items-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
                    <Send className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-emerald-900 mb-2">{t("success_title")}</h3>
                <p className="text-emerald-700">{t("success_desc")}</p>
            </div>
        );
    }

    return (
        <div className="bg-card p-8 md:p-10 rounded-3xl border border-border shadow-sm">
            <h2 className="text-2xl font-serif font-bold mb-8">{t("title")}</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                {/* Topic Selector */}
                <div className="space-y-2">
                    <Label>{t("fields.topic")}</Label>
                    <Select onValueChange={(val) => { setValue("topic", val); setTopic(val); }}>
                        <SelectTrigger>
                            <SelectValue placeholder={t("Topics.general")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="general">{t("Topics.general")}</SelectItem>
                            <SelectItem value="donation">{t("Topics.donation")}</SelectItem>
                            <SelectItem value="volunteer">{t("Topics.volunteer")}</SelectItem>
                            <SelectItem value="partner">{t("Topics.partner")}</SelectItem>
                            <SelectItem value="report">{t("Topics.report")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Logic: Volunteering Hint */}
                {topic === 'volunteer' && (
                    <div className="bg-blue-50 text-blue-700 p-4 rounded-xl text-sm flex gap-3 items-start">
                        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                            {t("hints.volunteer")} <Link href="/public/get-involved/volunteer" className="underline font-bold">Visit Portal</Link>
                        </div>
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>{t("fields.name")}</Label>
                        <Input {...register("name")} />
                        {errors.name && <span className="text-xs text-red-500">Required</span>}
                    </div>

                    <div className="space-y-2">
                        <Label>{t("fields.email")}</Label>
                        <Input {...register("email")} type="email" />
                        {errors.email && <span className="text-xs text-red-500">Invalid Email</span>}
                    </div>
                </div>

                {/* Logic: Partnership Extra Field */}
                {topic === 'partner' && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <Label>{t("fields.company")}</Label>
                        <Input {...register("company")} />
                    </div>
                )}

                <div className="space-y-2">
                    <Label>{t("fields.message")}</Label>
                    <Textarea {...register("message")} className="min-h-[150px]" />
                    {errors.message && <span className="text-xs text-red-500">Min 10 chars</span>}
                </div>

                <div className="flex items-center space-x-2">
                    <Checkbox id="consent" onCheckedChange={(c) => setValue("consent", !!c)} />
                    <label htmlFor="consent" className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {t("fields.consent")}
                    </label>
                </div>
                {errors.consent && <span className="text-xs text-red-500 block">Required</span>}

                <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {t("submit")}
                </Button>
            </form>
        </div>
    );
}