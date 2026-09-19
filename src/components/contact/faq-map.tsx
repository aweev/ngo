"use client";

import { useTranslations } from "next-intl";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Clock, Phone } from "lucide-react";
import Image from "next/image";

export function FAQAndMap() {
    const t = useTranslations("Contact");

    return (
        <div className="space-y-12">

            {/* FAQ Accordion */}
            <div className="bg-muted/30 p-8 rounded-3xl border border-border/50">
                <h3 className="font-serif font-bold text-xl mb-6 text-foreground">{t("FAQ.title")}</h3>
                <Accordion type="single" collapsible className="w-full">
                    {['q1', 'q2', 'q3'].map((key) => (
                        <AccordionItem key={key} value={key} className="border-b border-border/50">
                            <AccordionTrigger className="text-left font-semibold hover:text-primary transition-colors py-4 text-foreground">
                                {t(`FAQ.${key}`)}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground pb-4">
                                {t(`FAQ.${key.replace('q', 'a')}`)}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>

            {/* Map Container */}
            <div className="relative aspect-square md:aspect-[4/3] rounded-3xl overflow-hidden shadow-lg border border-border">
                {/* 
                   Static Map Image
                */}
                <div className="absolute inset-0 bg-slate-200">
                    <Image
                        src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1600"
                        alt="Map"
                        fill
                        className="object-cover opacity-80 grayscale hover:grayscale-0 transition-all duration-700"
                    />
                    {/* Pin */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 bg-primary rounded-full animate-ping absolute" />
                        <div className="w-4 h-4 bg-primary rounded-full relative border-2 border-white shadow-lg" />
                    </div>
                </div>

                {/* Floating Info Card - FORCED LIGHT THEME for readability over map image */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-lg text-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <div>
                            <p className="font-bold text-xs uppercase tracking-wider text-slate-500">{t("Map.hours_label")}</p>
                            <p className="text-slate-900 font-medium">{t("Map.hours_value")}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-primary" />
                        <div>
                            <p className="font-bold text-xs uppercase tracking-wider text-slate-500">{t("Map.phone_label")}</p>
                            <p className="text-slate-900 font-medium">+49 (0) 30 123 456</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}