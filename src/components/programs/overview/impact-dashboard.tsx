"use client";

import { useTranslations } from "next-intl";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Link } from "@/lib/navigation";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface DashboardProps {
    data: {
        programsDelivered: number;
        activeProjects: number;
        regions: number;
    };
}

export function AggregatedImpact({ data }: DashboardProps) {
    const t = useTranslations("Programs.Overview.Impact");

    // Visualization Config
    const charts = [
        {
            key: "metric_1", // Programs Delivered
            value: data.programsDelivered,
            total: 1000, // Denominator for visual "fullness"
            color: "#D95D39", // Primary
        },
        {
            key: "metric_2", // Active Projects
            value: data.activeProjects,
            total: 50,
            color: "#F0A202", // Accent
        },
        {
            key: "metric_3", // Regions
            value: data.regions,
            total: 20,
            color: "#1D2129", // Secondary
        }
    ];

    return (
        <section className="py-24 bg-muted/20">
            <div className="container mx-auto px-4">
                <div className="grid lg:grid-cols-4 gap-12 items-center">

                    {/* Left: Text Context */}
                    <div className="lg:col-span-1 space-y-6">
                        <h2 className="text-3xl font-serif font-bold text-foreground">
                            {t("title")}
                        </h2>
                        <Link
                            href="/public/about/financials"
                            className="inline-flex items-center font-bold text-primary hover:underline underline-offset-4 group"
                        >
                            {t("transparency_link")}
                            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>

                    {/* Right: Visualizations */}
                    <div className="lg:col-span-3 grid md:grid-cols-3 gap-8">
                        {charts.map((chart, i) => {
                            const chartData = [
                                { value: chart.value, color: chart.color },
                                { value: chart.total - chart.value, color: "rgba(0,0,0,0.05)" } // Subtle track
                            ];

                            return (
                                <motion.div
                                    key={chart.key}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.2 }}
                                    className="bg-background p-8 rounded-2xl border border-border shadow-sm flex flex-col items-center"
                                >
                                    <div className="h-48 w-48 relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={chartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={65}
                                                    outerRadius={85}
                                                    startAngle={90}
                                                    endAngle={-270}
                                                    dataKey="value"
                                                    stroke="none"
                                                    cornerRadius={5}
                                                >
                                                    {chartData.map((entry, idx) => (
                                                        <Cell key={idx} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>

                                        {/* Center Number */}
                                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                                            <span className="text-4xl font-bold text-foreground font-serif">
                                                {chart.value}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="mt-4 text-sm font-bold uppercase tracking-widest text-muted-foreground text-center">
                                        {t(chart.key)}
                                    </p>
                                </motion.div>
                            );
                        })}
                    </div>

                </div>
            </div>
        </section>
    );
}