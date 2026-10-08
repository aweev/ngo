"use client";

import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DataExportButtonProps {
    data: Record<string, unknown>[];
    filename?: string;
}

export function DataExportButton({ data, filename = "export" }: DataExportButtonProps) {
    const t = useTranslations("Admin.Common");

    const exportCSV = () => {
        if (!data || data.length === 0) return;
        const headers = Object.keys(data[0]).join(",");
        const rows = data.map((row) =>
            Object.values(row)
                .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
                .join(",")
        );
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportJSON = () => {
        if (!data || data.length === 0) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const link = document.createElement("a");
        link.setAttribute("href", dataStr);
        link.setAttribute("download", `${filename}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    <span>{t("export")}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportCSV} className="gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    <span>{t("export_csv")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportJSON} className="gap-2">
                    <FileJson className="h-4 w-4 text-blue-600" />
                    <span>{t("export_json")}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
