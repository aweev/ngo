"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import { Facebook, Linkedin, Twitter, Link as LinkIcon, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ShareBar({ title }: { title: string }) {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        toast.success("Link copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSocial = (platform: string) => {
        const url = encodeURIComponent(window.location.href);
        const text = encodeURIComponent(title);
        let shareUrl = "";

        if (platform === 'linkedin') shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        if (platform === 'twitter') shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
        if (platform === 'facebook') shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;

        window.open(shareUrl, '_blank', 'width=600,height=400');
    };

    return (
        <>
            {/* Top Progress Bar */}
            <motion.div
                className="fixed top-0 left-0 right-0 h-1 bg-primary origin-left z-50"
                style={{ scaleX }}
            />

            {/* Floating Share Dock (Desktop: Left Sticky, Mobile: Bottom Fixed) */}
            <div className="fixed left-4 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-4 z-40">
                <div className="bg-background/80 backdrop-blur-md p-3 rounded-full border border-border shadow-lg flex flex-col gap-4">
                    <button onClick={() => handleSocial('linkedin')} className="p-2 text-muted-foreground hover:text-[#0077b5] transition-colors">
                        <Linkedin className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleSocial('twitter')} className="p-2 text-muted-foreground hover:text-black transition-colors">
                        <Twitter className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleSocial('facebook')} className="p-2 text-muted-foreground hover:text-[#1877F2] transition-colors">
                        <Facebook className="w-5 h-5" />
                    </button>
                    <div className="w-full h-px bg-border" />
                    <button onClick={handleCopy} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                        {copied ? <Check className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </>
    );
}