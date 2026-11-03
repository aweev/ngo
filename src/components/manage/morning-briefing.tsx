import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBriefing, type BriefingItem, type BriefingItemId } from "@/actions/briefing";
import {
    AlertTriangle, ArrowUpRight, Bell, CheckCircle2, GitBranch, Pause, Sparkles, TrendingUp, UserPlus, Wallet,
    type LucideIcon,
} from "lucide-react";

const ITEM_ICON: Record<BriefingItemId, LucideIcon> = {
    failed_automations: AlertTriangle,
    paused_automations: Pause,
    pending_workflows: GitBranch,
    unread_notifications: Bell,
    pending_access_requests: UserPlus,
    expenses_approval: Wallet,
    field_reports_review: TrendingUp,
};

/**
 * Role-adaptive "morning briefing" (ADR-0001, Slice C). Rendered at the top of
 * both /dashboard and /admin; the queue is computed from the caller's effective
 * permissions, so the same component gives the executive director, a manager,
 * a finance reviewer, or a field member the right set of things to act on.
 */
export async function MorningBriefing({ locale }: { locale: string }) {
    const t = await getTranslations({ locale, namespace: "Briefing" });
    const { data } = await getBriefing();
    if (!data) return null;

    const hour = new Date().getHours();
    const greetingKey = hour < 12 ? "greeting_morning" : hour < 18 ? "greeting_afternoon" : "greeting_evening";
    const name = data.name?.trim() || t("someone");
    const dateLabel = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date());

    return (
        <section className="space-y-4">
            <div>
                <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
                    {t(greetingKey, { name })}
                </h1>
                <p className="text-sm text-muted-foreground">{t("subtitle", { date: dateLabel })}</p>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                        {t("attention_title")}
                    </CardTitle>
                    <CardDescription className="text-xs">{t("attention_desc")}</CardDescription>
                </CardHeader>
                <CardContent>
                    {data.items.length === 0 ? (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                            {t("all_clear")}
                        </p>
                    ) : (
                        <ul className="grid gap-2 sm:grid-cols-2">
                            {data.items.map((item: BriefingItem) => {
                                const Icon = ITEM_ICON[item.id];
                                return (
                                    <li key={item.id}>
                                        <Link
                                            href={item.href}
                                            className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted"
                                        >
                                            <span className="flex min-w-0 items-center gap-2">
                                                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                                <span className="truncate">{t(`items.${item.id}`)}</span>
                                            </span>
                                            <span className="flex shrink-0 items-center gap-2">
                                                <Badge variant={item.tone === "danger" ? "destructive" : "secondary"}>
                                                    {item.count}
                                                </Badge>
                                                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                                            </span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </section>
    );
}
