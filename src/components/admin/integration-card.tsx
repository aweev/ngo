"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Puzzle, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

interface IntegrationCardProps {
    provider: string;
    name: string;
    description?: string;
    status: 'active' | 'inactive' | 'error' | 'pending';
    lastSyncedAt?: string | null;
    onToggle?: () => void;
}

export function IntegrationCard({
    provider,
    name,
    description,
    status,
    lastSyncedAt,
    onToggle,
}: IntegrationCardProps) {
    const isConnected = status === 'active';

    return (
        <Card className="flex flex-col justify-between">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted">
                        <Puzzle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-semibold">{name}</CardTitle>
                        <p className="text-xs text-muted-foreground capitalize">{provider}</p>
                    </div>
                </div>
                <Badge variant={isConnected ? "default" : "outline"} className="capitalize">
                    {isConnected ? (
                        <CheckCircle2 className="mr-1 h-3 w-3 text-emerald-400 inline" />
                    ) : (
                        <AlertCircle className="mr-1 h-3 w-3 text-amber-400 inline" />
                    )}
                    {status}
                </Badge>
            </CardHeader>
            <CardContent className="py-2 text-xs text-muted-foreground">
                <p>{description || `Connect ${name} to automate data sync and workflows.`}</p>
                {lastSyncedAt && (
                    <p className="mt-2 text-[11px] text-muted-foreground/80 flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" /> Last synced: {new Date(lastSyncedAt).toLocaleString()}
                    </p>
                )}
            </CardContent>
            <CardFooter className="pt-2">
                <Button
                    variant={isConnected ? "destructive" : "default"}
                    size="sm"
                    className="w-full"
                    onClick={onToggle}
                >
                    {isConnected ? "Disconnect" : "Connect Integration"}
                </Button>
            </CardFooter>
        </Card>
    );
}
