"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target } from "lucide-react";
import type { ImpactMetric } from "@/types/domain/impact";

interface ImpactMetricCardProps {
    metric: ImpactMetric;
}

export function ImpactMetricCard({ metric }: ImpactMetricCardProps) {
    const percentage = metric.target_value
        ? Math.min(100, Math.round((metric.current_value / metric.target_value) * 100))
        : 0;

    return (
        <Card className="flex flex-col justify-between">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">
                        {metric.current_value.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{metric.unit}</span>
                    </span>
                    {metric.target_value && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Target className="h-3 w-3" /> Target: {metric.target_value.toLocaleString()}
                        </span>
                    )}
                </div>

                {metric.target_value && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span>Progress</span>
                            <span>{percentage}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
