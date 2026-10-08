import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPerformanceReviews } from "@/actions/governance";
import { Plus, Award, Star } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function PerformanceReviewsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Reviews" });
    const { data: reviews } = await getPerformanceReviews();

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("title")}
                description={t("description")}
                action={
                    <Button asChild className="gap-2">
                        <Link href="/admin/reviews/new">
                            <Plus className="h-4 w-4" />
                            {t("submit_review")}
                        </Link>
                    </Button>
                }
            />

            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("cols.title")}</TableHead>
                            <TableHead>{t("cols.scope")}</TableHead>
                            <TableHead>{t("cols.rating")}</TableHead>
                            <TableHead>{t("cols.strengths")}</TableHead>
                            <TableHead>{t("cols.visibility")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!reviews || reviews.length === 0) ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                                    {t("empty")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            reviews.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell className="font-semibold text-sm">
                                        <div className="flex items-center gap-2">
                                            <Award className="h-4 w-4 text-amber-500 shrink-0" />
                                            <span>{r.title}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="capitalize text-xs font-mono">{r.subject_type}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                                            <Star className="h-3 w-3 fill-amber-500" />
                                            <span>{t("rating_value", { rating: r.rating })}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {r.strengths?.slice(0, 2).join(", ") || t("general_performance")}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={r.is_private ? "secondary" : "outline"}>
                                            {r.is_private ? t("private_ed") : t("public")}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
