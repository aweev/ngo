import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
    // Entity-wide status labels
    active: "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    inactive: "border-transparent bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
    pending: "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    on_leave: "border-transparent bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400",
    terminated: "border-transparent bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
    prospect: "border-transparent bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400",
    lapsed: "border-transparent bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
    draft: "border-transparent bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
    planning: "border-transparent bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400",
    paused: "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    completed: "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    cancelled: "border-transparent bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
    subscribed: "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    on_break: "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    former: "border-transparent bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
};

interface StatusBadgeProps {
    status: string;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const variant = STATUS_COLORS[status]
        ? "border-transparent"
        : undefined;

    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap",
                variant,
                STATUS_COLORS[status] ?? "border-transparent bg-muted text-muted-foreground",
                className
            )}
        >
            {status.replace(/_/g, " ")}
        </span>
    );
}