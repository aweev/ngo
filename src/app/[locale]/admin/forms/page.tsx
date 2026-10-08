import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getForms } from "@/actions/forms";
import { Plus, ClipboardList } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function FormsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Forms" });
    const { data: forms } = await getForms();

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("title")}
                description={t("description")}
                action={
                    <Button asChild className="gap-2">
                        <Link href="/admin/forms/new">
                            <Plus className="h-4 w-4" />
                            {t("new_form")}
                        </Link>
                    </Button>
                }
            />

            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("cols.title")}</TableHead>
                            <TableHead>{t("cols.fields")}</TableHead>
                            <TableHead>{t("cols.access")}</TableHead>
                            <TableHead>{t("cols.status")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!forms || forms.length === 0) ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                                    {t("empty")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            forms.map((form) => (
                                <TableRow key={form.id}>
                                    <TableCell className="font-semibold text-sm">
                                        <Link href={`/admin/forms/${form.id}`} className="flex items-center gap-2 hover:underline">
                                            <ClipboardList className="h-4 w-4 text-emerald-500 shrink-0" />
                                            <span>{form.title}</span>
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-xs font-mono">{t("fields_count", { count: form.fields?.length || 0 })}</TableCell>
                                    <TableCell className="text-xs">
                                        <Badge variant={form.is_public ? "default" : "outline"}>
                                            {form.is_public ? t("public") : t("internal")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="capitalize">{form.status}</Badge>
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
