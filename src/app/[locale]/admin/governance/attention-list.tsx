import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, GitBranch, Inbox } from "lucide-react";
import { Link } from "@/lib/navigation";

export function AttentionList({
    pendingCount,
    waitingCount,
    failureCount,
}: {
    pendingCount: number;
    waitingCount: number;
    failureCount: number;
}) {
    const items = [
        { count: pendingCount, label: "pending approvals", href: "/admin/governance", icon: Inbox },
        { count: waitingCount, label: "workflows awaiting decision", href: "/admin/governance", icon: GitBranch },
        { count: failureCount, label: "failed automation runs", href: "/admin/automations", icon: AlertTriangle },
    ];
    return (
        <div className="grid gap-3 sm:grid-cols-3">
            {items.map((it) => (
                <Link key={it.label} href={it.href}>
                    <Card className={`transition-colors hover:border-primary/40 ${it.count > 0 ? "border-amber-300/60" : ""}`}>
                        <CardContent className="flex items-center gap-3 p-4">
                            <it.icon className={`h-5 w-5 ${it.count > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
                            <div>
                                <p className="text-2xl font-bold leading-none">{it.count}</p>
                                <p className="text-xs text-muted-foreground">{it.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    );
}
