import { AlertCircle } from "lucide-react";

interface PublicDataNoticeProps {
    title: string;
    description: string;
}

export function PublicDataNotice({ title, description }: PublicDataNoticeProps) {
    return (
        <div className="container mx-auto px-4 pt-6" role="status" aria-live="polite">
            <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div>
                    <p className="font-semibold text-foreground">{title}</p>
                    <p className="mt-1 text-muted-foreground">{description}</p>
                </div>
            </div>
        </div>
    );
}
