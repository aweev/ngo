"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
    Menu, X, Heart, LogIn, ChevronRight,
    BookOpen, Users, ShieldCheck, Share2,
    HandHeart, Briefcase, Sparkles
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/common/brand-logo";
import { LanguageSwitcher } from "@/components/common/lang-switcher";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { BrandThemeToggle } from "@/components/common/brand-theme-toggle";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { mobileMenuVariants, containerVariants, itemVariants } from "@/lib/animations";
import { NavDropdown } from "./nav-dropdown";

export function PublicHeader() {
    const t = useTranslations("Navigation");
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const { scrollY } = useScroll();

    // Scroll Effects
    const headerBackgroundOpacity = useTransform(scrollY, [0, 50], [0, 0.95]);
    const headerBorderOpacity = useTransform(scrollY, [0, 50], [0, 1]);
    const headerShadow = useTransform(scrollY, [0, 50], ["none", "0 4px 6px -1px rgb(0 0 0 / 0.05)"]);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const unsubscribe = scrollY.on("change", (latest) => setIsScrolled(latest > 20));
        return () => unsubscribe();
    }, [scrollY]);

    // Close mobile menu on route change
    useEffect(() => {
        const timer = setTimeout(() => setIsMobileMenuOpen(false), 0);
        return () => clearTimeout(timer);
    }, [pathname]);

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "unset";
        return () => { document.body.style.overflow = "unset"; };
    }, [isMobileMenuOpen]);

    const isActive = (href: string) => {
        // pathname includes locale prefix (e.g. /en/public/about) — strip it for comparison
        const cleaned = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
        return cleaned === href || (href !== "/" && cleaned.startsWith(href));
    };

    // --- Navigation Configuration ---
    // Public routes live under /[locale]/public/* — hrefs must include the /public prefix.

    const aboutItems = [
        { label: t("about_items.story.label"), desc: t("about_items.story.desc"), href: "/public/about", icon: BookOpen },
        { label: t("about_items.team.label"), desc: t("about_items.team.desc"), href: "/public/about/team", icon: Users },
        { label: t("about_items.financials.label"), desc: t("about_items.financials.desc"), href: "/public/about/financials", icon: ShieldCheck },
        { label: t("about_items.partners.label"), desc: t("about_items.partners.desc"), href: "/public/about/partners", icon: Share2 },
    ];

    const involvedItems = [
        { label: t("involved_items.volunteer.label"), desc: t("involved_items.volunteer.desc"), href: "/public/get-involved/volunteer", icon: HandHeart },
        { label: t("involved_items.corporate.label"), desc: t("involved_items.corporate.desc"), href: "/public/get-involved/corporate", icon: Briefcase },
        { label: t("involved_items.hub.label"), desc: t("involved_items.hub.desc"), href: "/public/get-involved", icon: Sparkles },
    ];

    return (
        <>
            <motion.header
                className="fixed top-0 left-0 right-0 z-50 w-full"
                style={{
                    backgroundColor: `rgba(var(--background-rgb), ${headerBackgroundOpacity})`,
                    borderBottomColor: `rgba(var(--border-rgb), ${headerBorderOpacity})`,
                    boxShadow: headerShadow
                }}
            >
                {/* Backdrop Filter for Glassmorphism */}
                <motion.div
                    className="absolute inset-0 bg-background/80 backdrop-blur-md -z-10"
                    style={{ opacity: headerBackgroundOpacity }}
                />

                <div className={cn("container mx-auto px-4 transition-all duration-300", isScrolled ? "py-3" : "py-5")}>
                    <div className="flex items-center justify-between">
                        {/* 1. Brand */}
                        <div className="flex-shrink-0 z-20">
                            <BrandLogo size={isScrolled ? "sm" : "md"} variant="default" showSparkles={!isScrolled} />
                        </div>

                        {/* 2. Desktop Nav */}
                        <nav className="hidden lg:flex items-center gap-1">
                            <NavDropdown
                                label={t("about")}
                                items={aboutItems}
                                isActive={isActive("/public/about")}
                            />

                            <Link href="/public/programs" className={cn("px-4 py-2 rounded-full text-sm font-medium transition-colors", isActive("/public/programs") ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                                {t("programs")}
                            </Link>

                            <Link href="/public/stories" className={cn("px-4 py-2 rounded-full text-sm font-medium transition-colors", isActive("/public/stories") ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                                {t("stories")}
                            </Link>

                            <NavDropdown
                                label={t("get_involved")}
                                items={involvedItems}
                                isActive={isActive("/public/get-involved")}
                            />

                            <Link href="/public/news" className={cn("px-4 py-2 rounded-full text-sm font-medium transition-colors", isActive("/public/news") ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                                {t("news")}
                            </Link>
                        </nav>

                        {/* 3. Utilities */}
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex items-center gap-2 bg-muted/50 rounded-full px-2 py-1 border border-border/50">
                                <LanguageSwitcher variant="minimal" />
                                <div className="w-px h-4 bg-border" />
                                <BrandThemeToggle size="sm" />
                                <div className="w-px h-4 bg-border" />
                                <ThemeToggle variant="simple" size="sm" />
                            </div>

                            <div className="hidden xl:block">
                                <Button variant="ghost" asChild className="rounded-full text-muted-foreground hover:text-primary">
                                    <Link href="/auth/login"><LogIn className="w-4 h-4 mr-2" />{t("login")}</Link>
                                </Button>
                            </div>

                            <Button asChild size={isScrolled ? "sm" : "default"} className="rounded-full bg-brand-radiant-gold hover:bg-brand-radiant-gold/90 text-primary-foreground font-bold shadow-md hover:shadow-lg transition-all">
                                <Link href="/public/get-involved/donate">
                                    <Heart className={cn("fill-current mr-2", isScrolled ? "w-3 h-3" : "w-4 h-4")} />
                                    {t("donate")}
                                </Link>
                            </Button>

                            <Button variant="ghost" size="icon" className="lg:hidden ml-1" onClick={() => setIsMobileMenuOpen(true)}>
                                <Menu className="h-6 w-6" />
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.header>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileMenuOpen(false)} />
                        <motion.div className="fixed inset-y-0 right-0 w-[85vw] max-w-[400px] bg-background z-50 lg:hidden shadow-2xl flex flex-col" variants={mobileMenuVariants} initial="hidden" animate="visible" exit="hidden">

                            {/* Mobile Header */}
                            <div className="flex items-center justify-between p-6 border-b">
                                <BrandLogo size="sm" asLink={false} />
                                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}><X className="h-5 w-5" /></Button>
                            </div>

                            {/* Mobile Content */}
                            <div className="flex-1 overflow-y-auto py-6 px-6">
                                <motion.nav className="flex flex-col gap-6" variants={containerVariants}>

                                    {/* About Group */}
                                    <motion.div variants={itemVariants}>
                                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                                            <BookOpen className="w-3 h-3" /> {t("about")}
                                        </div>
                                        <div className="grid gap-1 pl-2 border-l-2 border-border/50">
                                            {aboutItems.map((item) => (
                                                <Link key={item.href} href={item.href} className={cn("block py-2 px-3 rounded-lg text-sm transition-colors", isActive(item.href) ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted")}>
                                                    {item.label}
                                                </Link>
                                            ))}
                                        </div>
                                    </motion.div>

                                    {/* Get Involved Group */}
                                    <motion.div variants={itemVariants}>
                                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
                                            <HandHeart className="w-3 h-3" /> {t("get_involved")}
                                        </div>
                                        <div className="grid gap-1 pl-2 border-l-2 border-border/50">
                                            {involvedItems.map((item) => (
                                                <Link key={item.href} href={item.href} className={cn("block py-2 px-3 rounded-lg text-sm transition-colors", isActive(item.href) ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted")}>
                                                    {item.label}
                                                </Link>
                                            ))}
                                        </div>
                                    </motion.div>

                                    {/* Main Links */}
                                    <div className="space-y-2">
                                        {[
                                            { href: "/public/programs", label: t("programs") },
                                            { href: "/public/stories", label: t("stories") },
                                            { href: "/public/news", label: t("news") },
                                        ].map(item => (
                                            <motion.div key={item.href} variants={itemVariants}>
                                                <Link href={item.href} className="flex items-center justify-between p-4 rounded-xl hover:bg-muted text-foreground border border-border/50 bg-card/50">
                                                    <span className="text-lg font-serif font-medium">{item.label}</span>
                                                    <ChevronRight className="w-5 h-5 opacity-50" />
                                                </Link>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.nav>
                            </div>

                            {/* Mobile Footer */}
                            <div className="p-6 border-t bg-muted/20 space-y-4">
                                <div className="flex justify-between items-center gap-2 flex-wrap">
                                    <LanguageSwitcher variant="compact" />
                                    <div className="flex items-center gap-2">
                                        <BrandThemeToggle size="sm" />
                                        <ThemeToggle variant="simple" size="sm" />
                                    </div>
                                </div>

                                {/* LOGIN BUTTON ADDED HERE */}
                                <Button variant="outline" asChild className="w-full h-12 rounded-xl text-base font-medium border-border/50 bg-background/50">
                                    <Link href="/auth/login">
                                        <LogIn className="w-4 h-4 mr-2" />
                                        {t("login")}
                                    </Link>
                                </Button>

                                <Button asChild className="w-full h-12 rounded-xl text-base font-bold shadow-md">
                                    <Link href="/public/get-involved/donate">{t("donate")}</Link>
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}