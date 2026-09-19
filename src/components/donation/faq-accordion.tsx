"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useTranslations } from "next-intl";

export function DonationFAQ() {
    const t = useTranslations("Donation.FAQ");

    return (
        <Accordion type="single" collapsible className="w-full max-w-2xl">
            {['q1', 'q2', 'q3'].map((key) => (
                <AccordionItem key={key} value={key} className="border-b border-border/60">
                    <AccordionTrigger className="text-left font-bold text-lg py-6 hover:text-primary transition-colors">
                        {t(key)}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed text-base pb-6">
                        {t(key.replace('q', 'a'))}
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
}