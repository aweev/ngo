"use client";

import { useTranslations } from "next-intl";
import { Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/navigation";
import { toast } from "sonner";

export function StoryActionBar({ name, program }: { name: string; program: string }) {
    const t = useTranslations("Stories.Detail.Action");

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success(t("share_success"));
    };

    return (
        <div className="bg-card border-t border-border p-4 md:p-6 fixed bottom-0 left-0 right-0 z-40 md:static md:border md:rounded-2xl md:shadow-lg md:mb-12">
            <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-left">
                    <h3 className="font-serif font-bold text-lg md:text-xl text-foreground">
                        {t("title", { name: name.split(' ')[0] })}
                    </h3>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <Button variant="outline" size="lg" className="flex-1 md:flex-none" onClick={handleShare}>
                        <Share2 className="w-4 h-4 mr-2" />
                        {t("share")}
                    </Button>
                    <Button asChild size="lg" className="flex-1 md:flex-none shadow-xl shadow-primary/20">
                        <Link href={`/public/get-involved/donate?fund=${program}`}>
                            <Heart className="w-4 h-4 mr-2 fill-current" />
                            {t("donate", { program: program.replace('-', ' ') })}
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}