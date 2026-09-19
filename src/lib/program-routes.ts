import type { ProgramCategory } from '@/lib/program-themes';

export function programsPath(): string {
    return '/public/programs';
}

export function programCategoryPath(category: ProgramCategory): string {
    return `${programsPath()}/${category}`;
}

export function projectPath(category: ProgramCategory, slug: string): string {
    return `${programCategoryPath(category)}/${encodeURIComponent(slug)}`;
}

export function donationPath(query: { project?: string; fund?: ProgramCategory; amount?: number }): string {
    const params = new URLSearchParams();
    if (query.project) params.set('project', query.project);
    if (query.fund) params.set('fund', query.fund);
    if (query.amount !== undefined) params.set('amount', String(query.amount));
    const suffix = params.toString();
    return `/public/get-involved/donate${suffix ? `?${suffix}` : ''}`;
}

export function volunteerPath(query: { project?: string; interest?: ProgramCategory }): string {
    const params = new URLSearchParams();
    if (query.project) params.set('project', query.project);
    if (query.interest) params.set('interest', query.interest);
    const suffix = params.toString();
    return `/public/get-involved/volunteer${suffix ? `?${suffix}` : ''}`;
}

export function applicationPath(category: ProgramCategory, slug: string): string {
    return `${projectPath(category, slug)}/apply`;
}