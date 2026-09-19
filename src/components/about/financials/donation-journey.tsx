"use client";

import { useTranslations, useFormatter } from "next-intl";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { FinancialSummary } from "@/types/domain-adapters";

const COLORS = {
    program: "#D95D39", // Brand Primary
    management: "#1D2129", // Secondary
    fundraising: "#F0A202" // Accent
};

export function DonationJourney({ data }: { data: FinancialSummary }) {
    const t = useTranslations("Financials.Journey");
    const format = useFormatter();

    const chartData = [
        { name: t("program"), value: data.expenses.program, color: COLORS.program },
        { name: t("management"), value: data.expenses.management, color: COLORS.management },
        { name: t("fundraising"), value: data.expenses.fundraising, color: COLORS.fundraising },
    ];
    const totalExpenses = chartData.reduce((total, item) => total + item.value, 0);

    return (
        <section className="py-16 bg-muted/20">
            <div className="container mx-auto px-4">
                <div className="grid lg:grid-cols-2 gap-12 items-center">

                    {/* Text Context */}
                    <div className="space-y-6">
                        <h2 className="text-3xl font-serif font-bold text-foreground">
                            {t("title")}
                        </h2>
                        <p className="text-muted-foreground">{t("subtitle")}</p>

                        <ul className="space-y-4">
                            {chartData.map((item) => (
                                <li key={item.name} className="flex items-center justify-between p-4 bg-background rounded-xl border border-border/50 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="font-medium">{item.name}</span>
                                    </div>
                                    <span className="font-bold tabular-nums">
                                        {format.number(totalExpenses > 0 ? item.value / totalExpenses : 0, { style: 'percent' })}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Chart */}
                    <div className="h-[400px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={140}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => format.number(value, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Center Label */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                            <span className="block text-3xl font-bold text-primary">
                                {format.number(data.efficiencyRatio, { style: 'percent' })}
                            </span>
                            <span className="text-xs uppercase tracking-wider text-muted-foreground">{t("efficiency")}</span>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}