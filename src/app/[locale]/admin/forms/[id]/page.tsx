import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormBuilder } from "@/components/admin/form-builder";
import { DataExportButton } from "@/components/admin/data-export-button";
import { getFormDefinition, getFormSubmissions } from "@/actions/forms";

export const dynamic = "force-dynamic";

export default async function FormDetailPage({
    params,
}: {
    params: Promise<{ locale: string; id: string }>;
}) {
    const { locale, id } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Forms" });
    const [{ data: form }, { data: submissions }] = await Promise.all([
        getFormDefinition(id),
        getFormSubmissions(id),
    ]);

    if (!form) notFound();

    const exportRows = (submissions ?? []).map((s) => ({
        id: s.id,
        submitter_email: s.submitter_email ?? "",
        submitted_at: s.submitted_at,
        ...s.data,
    }));

    return (
        <div className="space-y-8">
            <PageHeader
                title={form.title}
                description={t("submissions.summary", {
                    fields: form.fields?.length ?? 0,
                    submissions: submissions?.length ?? 0,
                    status: form.status,
                })}
                action={exportRows.length > 0 ? <DataExportButton data={exportRows} filename={form.slug} /> : undefined}
            />

            <FormBuilder
                formId={form.id}
                initial={{
                    title: form.title,
                    slug: form.slug,
                    description: form.description ?? "",
                    status: form.status,
                    fields: form.fields ?? [],
                    submit_button_text: form.submit_button_text,
                    success_message: form.success_message,
                    is_public: form.is_public,
                }}
            />

            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("submissions.title")}
                </h3>
                <div className="rounded-lg border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("submissions.submitter")}</TableHead>
                                <TableHead>{t("submissions.submitted_at")}</TableHead>
                                <TableHead>{t("submissions.answers")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(!submissions || submissions.length === 0) ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-sm">
                                        {t("submissions.empty")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                submissions.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="text-xs">{s.submitter_email ?? t("submissions.anonymous")}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {new Date(s.submitted_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono">
                                                {t("submissions.fields_count", { count: Object.keys(s.data ?? {}).length })}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
