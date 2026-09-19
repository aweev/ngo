"use client";

import Image from "next/image";

export function AuthorBio({ author }: { author: { name: string; avatar?: string; role?: string; bio?: string } }) {
    if (!author.bio) return null;

    return (
        <div className="mt-16 p-8 bg-background border border-border rounded-2xl flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
            <div className="relative w-20 h-20 flex-shrink-0 rounded-full overflow-hidden border-2 border-border">
                {author.avatar && (
                    <Image src={author.avatar} alt={author.name} fill className="object-cover" />
                )}
            </div>
            <div>
                <h4 className="text-lg font-bold text-foreground">{author.name}</h4>
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">{author.role}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                    {author.bio}
                </p>
            </div>
        </div>
    );
}