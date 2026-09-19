"use client";

import { useTranslations } from "next-intl";
import { FileText, Download } from "lucide-react";
import { FinancialDocument } from "@/types/domain-adapters";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DocumentRepository({ documents }: { documents: FinancialDocument[] }) {
    const t = useTranslations("Financials.Documents");

    // Group by year
    const years = Array.from(new Set(documents.map(d => d.year))).sort((a, b) => b - a);

    if (years.length === 0) return null;

    return (
        <section className="py-24 bg-background">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-serif font-bold text-foreground">{t("title")}</h2>
                    <p className="text-muted-foreground">{t("subtitle")}</p>
                </div>

                <Tabs defaultValue={String(years[0])} className="w-full">
                    <div className="flex justify-center mb-8">
                        <TabsList>
                            {years.map(year => (
                                <TabsTrigger key={year} value={String(year)} className="px-6">
                                    {year}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    {years.map(year => (
                        <TabsContent key={year} value={String(year)} className="space-y-4">
                            {documents.filter(d => d.year === year).map((doc) => (
                                <div
                                    key={doc.id}
                                    className="flex items-center justify-between p-4 md:p-6 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{doc.title}</h4>
                                            <p className="text-xs text-muted-foreground">
                                                {t("size", { size: doc.size })} • {doc.category}
                                            </p>
                                        </div>
                                    </div>

                                    <Button variant="ghost" size="sm" asChild>
                                        <a href={doc.url} download target="_blank" rel="noreferrer">
                                            <Download className="w-4 h-4 mr-2" />
                                            <span className="hidden sm:inline">{t("download")}</span>
                                        </a>
                                    </Button>
                                </div>
                            ))}
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </section>
    );
}