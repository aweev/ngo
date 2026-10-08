"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Download, Loader2, ScrollText, ShieldCheck, UserCheck } from "lucide-react";
import { exportAuditEventsCsv, upsertLegalEntity, upsertOrgDomain } from "@/actions/trust";
import {
    createDataSubjectRequest,
    createLegalHold,
    createRetentionPolicy,
    exportTenantData,
    releaseLegalHold,
    updateDataSubjectRequest,
    withdrawConsent,
} from "@/actions/privacy";

type Row = Record<string, unknown>;

const DSAR_TYPES = ["access", "rectification", "erasure", "portability", "restriction", "objection"] as const;
const DSAR_STATUSES = ["received", "verifying", "in_progress", "completed", "rejected", "withdrawn"] as const;
const DISPOSITIONS = ["delete", "anonymize", "review"] as const;

function str(row: Row, key: string): string {
    const value = row[key];
    return value === null || value === undefined ? "" : String(value);
}

function saveFile(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * Trust Center console (audit Wave 1): makes the trust kernel reviewable —
 * the append-only audit ledger and its export, the tenant identity/routing
 * model, and the privacy operating model (consent, retention, legal holds,
 * subject requests, tenant export). Every call goes through a server action
 * that re-checks permissions server-side.
 */
export function TrustConsole({
    auditEvents,
    legalEntity,
    domains,
    legalHolds,
    retentionPolicies,
    dataSubjectRequests,
    consentRecords,
}: {
    auditEvents: Row[];
    legalEntity: Row | null;
    domains: Row[];
    legalHolds: Row[];
    retentionPolicies: Row[];
    dataSubjectRequests: Row[];
    consentRecords: Row[];
}) {
    const t = useTranslations("Admin.Trust");
    const [busy, setBusy] = useState<string | null>(null);

    const [hoName, setHoName] = useState("");
    const [hoReason, setHoReason] = useState("");
    const [hoEntities, setHoEntities] = useState("");

    const [dsType, setDsType] = useState<string>("access");
    const [dsName, setDsName] = useState("");
    const [dsEmail, setDsEmail] = useState("");
    const [dsStatusFor, setDsStatusFor] = useState<string | null>(null);
    const [dsStatus, setDsStatus] = useState<string>("received");
    const [dsSummary, setDsSummary] = useState("");

    const [rpEntity, setRpEntity] = useState("");
    const [rpCategory, setRpCategory] = useState("");
    const [rpMonths, setRpMonths] = useState("24");
    const [rpLegalBasis, setRpLegalBasis] = useState("");
    const [rpDisposition, setRpDisposition] = useState<string>("delete");

    const [le, setLe] = useState({
        legalName: str(legalEntity ?? {}, "legal_name"),
        legalForm: str(legalEntity ?? {}, "legal_form"),
        registrationNumber: str(legalEntity ?? {}, "registration_number"),
        registrationJurisdiction: str(legalEntity ?? {}, "registration_jurisdiction"),
        country: str(legalEntity ?? {}, "country"),
        dataResidency: str(legalEntity ?? {}, "data_residency"),
        website: str(legalEntity ?? {}, "website"),
    });
    const [domDomain, setDomDomain] = useState("");
    const [domSubdomain, setDomSubdomain] = useState("");
    const [domLocale, setDomLocale] = useState("en");

    const run = async (key: string, action: () => Promise<{ error: string | null }>, success: string) => {
        setBusy(key);
        const result = await action();
        setBusy(null);
        if (result.error) toast.error(result.error);
        else toast.success(success);
        return !result.error;
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <ScrollText className="h-4 w-4 text-primary" /> {t("ledger_title")}
                    </CardTitle>
                    <CardDescription>{t("ledger_description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === "export-audit"}
                        onClick={() =>
                            run(
                                "export-audit",
                                async () => {
                                    const res = await exportAuditEventsCsv();
                                    if (res.data) saveFile("audit-events.csv", res.data, "text/csv");
                                    return { error: res.error };
                                },
                                t("ledger_exported"),
                            )
                        }
                    >
                        {busy === "export-audit" ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                            <Download className="mr-1 h-3 w-3" />
                        )}
                        {t("export_csv")}
                    </Button>

                    {auditEvents.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">{t("ledger_empty")}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-xs uppercase text-muted-foreground">
                                    <tr>
                                        <th className="py-2 pr-3">{t("col_when")}</th>
                                        <th className="py-2 pr-3">{t("col_action")}</th>
                                        <th className="py-2 pr-3">{t("col_entity")}</th>
                                        <th className="py-2 pr-3">{t("col_correlation")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditEvents.slice(0, 25).map((event, index) => (
                                        <tr key={`${str(event, "correlation_id")}-${index}`} className="border-t">
                                            <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted-foreground">
                                                {str(event, "occurred_at")}
                                            </td>
                                            <td className="py-2 pr-3 font-medium">{str(event, "action")}</td>
                                            <td className="py-2 pr-3 text-xs">
                                                {str(event, "entity_type")}
                                                {str(event, "entity_id") ? ` · ${str(event, "entity_id").slice(0, 8)}` : ""}
                                            </td>
                                            <td className="py-2 pr-3 font-mono text-[11px] text-muted-foreground">
                                                {str(event, "correlation_id") || "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <ShieldCheck className="h-4 w-4 text-primary" /> {t("identity_title")}
                    </CardTitle>
                    <CardDescription>{t("identity_description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                            <Label htmlFor="le-name">{t("legal_name")}</Label>
                            <Input
                                id="le-name"
                                value={le.legalName}
                                onChange={(e) => setLe({ ...le, legalName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="le-form">{t("legal_form")}</Label>
                            <Input
                                id="le-form"
                                value={le.legalForm}
                                onChange={(e) => setLe({ ...le, legalForm: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="le-reg">{t("registration_number")}</Label>
                            <Input
                                id="le-reg"
                                value={le.registrationNumber}
                                onChange={(e) => setLe({ ...le, registrationNumber: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="le-jur">{t("jurisdiction")}</Label>
                            <Input
                                id="le-jur"
                                value={le.registrationJurisdiction}
                                onChange={(e) => setLe({ ...le, registrationJurisdiction: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="le-country">{t("country")}</Label>
                            <Input
                                id="le-country"
                                value={le.country}
                                onChange={(e) => setLe({ ...le, country: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="le-residency">{t("data_residency")}</Label>
                            <Input
                                id="le-residency"
                                value={le.dataResidency}
                                onChange={(e) => setLe({ ...le, dataResidency: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                            <Label htmlFor="le-web">{t("website")}</Label>
                            <Input
                                id="le-web"
                                value={le.website}
                                onChange={(e) => setLe({ ...le, website: e.target.value })}
                            />
                        </div>
                    </div>
                    <Button
                        size="sm"
                        disabled={busy === "legal-entity"}
                        onClick={() => run("legal-entity", () => upsertLegalEntity(le), t("identity_saved"))}
                    >
                        {busy === "legal-entity" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                        {t("save_identity")}
                    </Button>
                    <div className="space-y-3 rounded-lg border p-4">
                        <p className="text-sm font-medium">{t("domains_title")}</p>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="space-y-1">
                                <Label htmlFor="dom-domain">{t("domain")}</Label>
                                <Input
                                    id="dom-domain"
                                    value={domDomain}
                                    onChange={(e) => setDomDomain(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="dom-sub">{t("subdomain")}</Label>
                                <Input
                                    id="dom-sub"
                                    value={domSubdomain}
                                    onChange={(e) => setDomSubdomain(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="dom-locale">{t("locale_default")}</Label>
                                <Input
                                    id="dom-locale"
                                    value={domLocale}
                                    onChange={(e) => setDomLocale(e.target.value)}
                                />
                            </div>
                        </div>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === "domain"}
                            onClick={() =>
                                run(
                                    "domain",
                                    () =>
                                        upsertOrgDomain({
                                            domain: domDomain || undefined,
                                            subdomain: domSubdomain || undefined,
                                            localeDefault: domLocale || "en",
                                        }),
                                    t("domain_saved"),
                                )
                            }
                        >
                            {busy === "domain" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                            {t("add_domain")}
                        </Button>
                        {domains.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t("domains_empty")}</p>
                        ) : (
                            <ul className="space-y-1 text-sm">
                                {domains.map((domain, index) => (
                                    <li key={`${str(domain, "id")}-${index}`} className="flex items-center gap-2">
                                        <Badge variant="outline">
                                            {str(domain, "domain") || str(domain, "subdomain")}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {str(domain, "locale_default")}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold">{t("holds_title")}</CardTitle>
                    <CardDescription>{t("holds_description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                            <Label htmlFor="ho-name">{t("hold_name")}</Label>
                            <Input id="ho-name" value={hoName} onChange={(e) => setHoName(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="ho-entities">{t("hold_entities")}</Label>
                            <Input
                                id="ho-entities"
                                value={hoEntities}
                                onChange={(e) => setHoEntities(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                            <Label htmlFor="ho-reason">{t("hold_reason")}</Label>
                            <Textarea
                                id="ho-reason"
                                rows={2}
                                value={hoReason}
                                onChange={(e) => setHoReason(e.target.value)}
                            />
                        </div>
                    </div>
                    <Button
                        size="sm"
                        disabled={busy === "hold-create"}
                        onClick={async () => {
                            const ok = await run(
                                "hold-create",
                                () =>
                                    createLegalHold({
                                        name: hoName,
                                        reason: hoReason,
                                        entityTypes: hoEntities
                                            .split(",")
                                            .map((value) => value.trim())
                                            .filter((value) => value.length > 1),
                                    }),
                                t("hold_created"),
                            );
                            if (ok) {
                                setHoName("");
                                setHoReason("");
                                setHoEntities("");
                            }
                        }}
                    >
                        {busy === "hold-create" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                        {t("create_hold")}
                    </Button>

                    {legalHolds.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("holds_empty")}</p>
                    ) : (
                        <ul className="space-y-2">
                            {legalHolds.map((hold, index) => (
                                <li
                                    key={`${str(hold, "id")}-${index}`}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                                >
                                    <span className="min-w-0">
                                        <span className="font-medium">{str(hold, "name")}</span>
                                        <span className="text-muted-foreground"> · {str(hold, "reason")}</span>
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Badge variant={str(hold, "status") === "active" ? "default" : "secondary"}>
                                            {str(hold, "status") === "active" ? t("status_active") : t("status_released")}
                                        </Badge>
                                        {str(hold, "status") === "active" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={busy === `hold-release-${str(hold, "id")}`}
                                                onClick={() =>
                                                    run(
                                                        `hold-release-${str(hold, "id")}`,
                                                        () => releaseLegalHold(str(hold, "id")),
                                                        t("hold_released"),
                                                    )
                                                }
                                            >
                                                {t("release_hold")}
                                            </Button>
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <UserCheck className="h-4 w-4 text-primary" /> {t("dsar_title")}
                    </CardTitle>
                    <CardDescription>{t("dsar_description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                            <Label htmlFor="ds-type">{t("request_type")}</Label>
                            <Select value={dsType} onValueChange={setDsType}>
                                <SelectTrigger id="ds-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DSAR_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {t(`type_${type}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="ds-name">{t("subject_name")}</Label>
                            <Input id="ds-name" value={dsName} onChange={(e) => setDsName(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="ds-email">{t("subject_email")}</Label>
                            <Input id="ds-email" value={dsEmail} onChange={(e) => setDsEmail(e.target.value)} />
                        </div>
                    </div>
                    <Button
                        size="sm"
                        disabled={busy === "dsar-create"}
                        onClick={async () => {
                            const ok = await run(
                                "dsar-create",
                                () =>
                                    createDataSubjectRequest({
                                        requestType: dsType,
                                        subjectName: dsName || null,
                                        subjectEmail: dsEmail,
                                    }),
                                t("request_created"),
                            );
                            if (ok) {
                                setDsName("");
                                setDsEmail("");
                            }
                        }}
                    >
                        {busy === "dsar-create" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                        {t("create_request")}
                    </Button>
                    {dataSubjectRequests.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("dsar_empty")}</p>
                    ) : (
                        <ul className="space-y-3">
                            {dataSubjectRequests.map((request, index) => {
                                const id = str(request, "id");
                                return (
                                    <li key={`${id}-${index}`} className="space-y-2 rounded-lg border px-3 py-3 text-sm">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span>
                                                <Badge variant="outline">{t(`type_${str(request, "request_type")}`)}</Badge>{" "}
                                                <span className="text-muted-foreground">
                                                    {str(request, "subject_email")}
                                                </span>
                                            </span>
                                            <Badge variant={str(request, "status") === "completed" ? "default" : "secondary"}>
                                                {t(`status_${str(request, "status")}`)}
                                            </Badge>
                                        </div>
                                        {dsStatusFor === id ? (
                                            <div className="space-y-2">
                                                <Select value={dsStatus} onValueChange={setDsStatus}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {DSAR_STATUSES.map((status) => (
                                                            <SelectItem key={status} value={status}>
                                                                {t(`status_${status}`)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Textarea
                                                    rows={2}
                                                    value={dsSummary}
                                                    onChange={(e) => setDsSummary(e.target.value)}
                                                    placeholder={t("response_summary")}
                                                />
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        disabled={busy === `dsar-save-${id}`}
                                                        onClick={async () => {
                                                            const ok = await run(
                                                                `dsar-save-${id}`,
                                                                () =>
                                                                    updateDataSubjectRequest(id, {
                                                                        status: dsStatus,
                                                                        responseSummary: dsSummary || null,
                                                                    }),
                                                                t("status_saved"),
                                                            );
                                                            if (ok) setDsStatusFor(null);
                                                        }}
                                                    >
                                                        {t("save_status")}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setDsStatusFor(null)}
                                                    >
                                                        {t("cancel")}
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setDsStatusFor(id);
                                                    setDsStatus(str(request, "status") || "received");
                                                    setDsSummary(str(request, "response_summary"));
                                                }}
                                            >
                                                {t("update_status")}
                                            </Button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <ScrollText className="h-4 w-4 text-primary" /> {t("retention_title")}
                    </CardTitle>
                    <CardDescription>{t("retention_description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <div className="space-y-1">
                            <Label htmlFor="rp-entity">{t("entity_type")}</Label>
                            <Input id="rp-entity" value={rpEntity} onChange={(e) => setRpEntity(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="rp-category">{t("category")}</Label>
                            <Input id="rp-category" value={rpCategory} onChange={(e) => setRpCategory(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="rp-months">{t("months")}</Label>
                            <Input
                                id="rp-months"
                                type="number"
                                min={1}
                                value={rpMonths}
                                onChange={(e) => setRpMonths(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="rp-basis">{t("legal_basis")}</Label>
                            <Input
                                id="rp-basis"
                                value={rpLegalBasis}
                                onChange={(e) => setRpLegalBasis(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="rp-disposition">{t("disposition")}</Label>
                            <Select value={rpDisposition} onValueChange={setRpDisposition}>
                                <SelectTrigger id="rp-disposition">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DISPOSITIONS.map((disposition) => (
                                        <SelectItem key={disposition} value={disposition}>
                                            {t(`disposition_${disposition}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        disabled={busy === "retention-create"}
                        onClick={async () => {
                            const ok = await run(
                                "retention-create",
                                () =>
                                    createRetentionPolicy({
                                        entityType: rpEntity,
                                        category: rpCategory,
                                        retentionPeriodMonths: Number.parseInt(rpMonths, 10) || 24,
                                        legalBasis: rpLegalBasis || null,
                                        disposition: rpDisposition,
                                    }),
                                t("retention_created"),
                            );
                            if (ok) {
                                setRpEntity("");
                                setRpCategory("");
                                setRpLegalBasis("");
                            }
                        }}
                    >
                        {busy === "retention-create" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                        {t("create_policy")}
                    </Button>

                    {retentionPolicies.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("retention_empty")}</p>
                    ) : (
                        <ul className="space-y-2">
                            {retentionPolicies.map((policy, index) => (
                                <li
                                    key={`${str(policy, "id")}-${index}`}
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                                >
                                    <span>
                                        <span className="font-medium">{str(policy, "entity_type")}</span>
                                        <span className="text-muted-foreground">
                                            {" · "}
                                            {str(policy, "category")} · {str(policy, "retention_period_months")}{" "}
                                            {t("months_short")} · {t(`disposition_${str(policy, "disposition")}`)}
                                        </span>
                                    </span>
                                    {str(policy, "legal_basis") && (
                                        <span className="text-xs text-muted-foreground">
                                            {str(policy, "legal_basis")}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <UserCheck className="h-4 w-4 text-primary" /> {t("consent_title")}
                    </CardTitle>
                    <CardDescription>{t("consent_description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === "tenant-export"}
                        onClick={() =>
                            run(
                                "tenant-export",
                                async () => {
                                    const res = await exportTenantData();
                                    if (res.data) {
                                        saveFile(
                                            "tenant-export.json",
                                            JSON.stringify(res.data, null, 2),
                                            "application/json",
                                        );
                                    }
                                    return { error: res.error };
                                },
                                t("export_done"),
                            )
                        }
                    >
                        {busy === "tenant-export" ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                            <Download className="mr-1 h-3 w-3" />
                        )}
                        {t("export_data")}
                    </Button>

                    {consentRecords.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("consent_empty")}</p>
                    ) : (
                        <ul className="space-y-2">
                            {consentRecords.map((record, index) => {
                                const id = str(record, "id");
                                return (
                                    <li
                                        key={`${id}-${index}`}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                                    >
                                        <span className="min-w-0">
                                            <span className="font-medium">{str(record, "purpose")}</span>
                                            <span className="text-muted-foreground">
                                                {" · "}
                                                {str(record, "subject_type")} · {str(record, "subject_id").slice(0, 8)} ·{" "}
                                                {t(`consent_status_${str(record, "status")}`)}
                                            </span>
                                        </span>
                                        {str(record, "status") === "granted" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={busy === `consent-withdraw-${id}`}
                                                onClick={() =>
                                                    run(
                                                        `consent-withdraw-${id}`,
                                                        () => withdrawConsent(id),
                                                        t("consent_withdrawn"),
                                                    )
                                                }
                                            >
                                                {t("withdraw_consent")}
                                            </Button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}







