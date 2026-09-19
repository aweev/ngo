import { ReactNode } from "react";

interface PageHeaderProps {
    title: string;
    description?: string;
    action?: ReactNode;
    children?: ReactNode;
}

export function PageHeader({ title, description, action, children }: PageHeaderProps) {
    return (
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}
            </div>
            {(action || children) && (
                <div className="flex items-center gap-2 shrink-0">
                    {action}
                    {children}
                </div>
            )}
        </div>
    );
}