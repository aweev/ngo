"use client";

import * as React from "react";
import { Moon, Sun, Monitor, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import {
    buttonVariants,
    dropdownVariants,
    itemVariants,
} from "@/lib/animations";


interface ThemeOption {
    value: string;
    label: string;
    icon: React.ReactNode;
    description: string;
}

interface ThemeToggleProps {
    variant?: "default" | "simple" | "dropdown";
    showLabel?: boolean;
    size?: "sm" | "md" | "lg";
}

const themeIconVariants: Variants = {
    light: {
        rotate: 0,
        scale: 1,
        transition: { duration: 0.3, ease: "easeOut" },
    },
    dark: {
        rotate: 180,
        scale: 1,
        transition: { duration: 0.3, ease: "easeOut" },
    },
    entering: {
        scale: 0,
        rotate: -90,
        transition: { duration: 0.2 },
    },
    exiting: {
        scale: 0,
        rotate: 90,
        transition: { duration: 0.2 },
    },
};

export function ThemeToggle({
    variant = "default",
    showLabel = false,
    size = "md",
}: ThemeToggleProps) {
    const t = useTranslations("ThemeToggle");
    const { theme, setTheme, resolvedTheme, systemTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);
    const [isOpen, setIsOpen] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const themeOptions: ThemeOption[] = [
        {
            value: "light",
            label: t("light.label"),
            icon: <Sun className="h-4 w-4" />,
            description: t("light.description"),
        },
        {
            value: "dark",
            label: t("dark.label"),
            icon: <Moon className="h-4 w-4" />,
            description: t("dark.description"),
        },
        {
            value: "system",
            label: t("system.label"),
            icon: <Monitor className="h-4 w-4" />,
            description: t("system.description"),
        },
    ];

    const sizeClasses = {
        sm: "w-8 h-8",
        md: "w-9 h-9",
        lg: "w-10 h-10",
    };

    const iconSizes = {
        sm: "h-3.5 w-3.5",
        md: "h-4 w-4",
        lg: "h-5 w-5",
    };

    if (!mounted) {
        return (
            <Button
                variant="outline"
                size="icon"
                className={`${sizeClasses[size]} border-border/60`}
                disabled
            >
                <Sun className={iconSizes[size]} />
                <span className="sr-only">{t("loading")}</span>
            </Button>
        );
    }

    if (variant === "simple") {
        const toggleTheme = () => {
            setTheme(resolvedTheme === "dark" ? "light" : "dark");
        };
        const isDark = resolvedTheme === "dark";

        return (
            <motion.div
                variants={buttonVariants}
                initial="idle"
                whileHover="hover"
                whileTap="tap"
            >
                <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleTheme}
                    className={`${sizeClasses[size]} relative overflow-hidden border-border/60 hover:border-primary/40 hover:bg-primary/5 group transition-all duration-300`}
                >
                    <div className="relative">
                        <AnimatePresence mode="wait" initial={false}>
                            {isDark ? (
                                <motion.div
                                    key="moon"
                                    variants={themeIconVariants}
                                    initial="entering"
                                    animate="dark"
                                    exit="exiting"
                                    className="absolute inset-0 flex items-center justify-center"
                                >
                                    <Moon className={`${iconSizes[size]} text-primary`} />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="sun"
                                    variants={themeIconVariants}
                                    initial="entering"
                                    animate="light"
                                    exit="exiting"
                                    className="absolute inset-0 flex items-center justify-center"
                                >
                                    <Sun className={`${iconSizes[size]} text-primary`} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <span className="sr-only">{t("toggle")}</span>
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10"
                        initial={{ x: "-100%" }}
                        whileHover={{ x: "100%" }}
                        transition={{ duration: 0.6 }}
                    />
                </Button>
            </motion.div>
        );
    }

    if (variant === "dropdown") {
        const currentTheme = themeOptions.find((option) => option.value === theme);

        return (
            <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                <DropdownMenuTrigger asChild>
                    <motion.div
                        variants={buttonVariants}
                        initial="idle"
                        whileHover="hover"
                        whileTap="tap"
                    >
                        <Button
                            variant="outline"
                            size={showLabel ? "default" : "icon"}
                            className={`${!showLabel ? sizeClasses[size] : "px-3"
                                } border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 gap-2 relative overflow-hidden group`}
                        >
                            <motion.div
                                animate={{ rotate: isOpen ? 180 : 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                {currentTheme?.icon || <Palette className={iconSizes[size]} />}
                            </motion.div>
                            {showLabel && (
                                <span className="text-sm font-medium">
                                    {currentTheme?.label || t("label")}
                                </span>
                            )}
                            <span className="sr-only">{t("change")}</span>
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5"
                                initial={{ scale: 0 }}
                                whileHover={{ scale: 1 }}
                                transition={{ duration: 0.3 }}
                            />
                        </Button>
                    </motion.div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[200px] p-1">
                    <motion.div
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        {themeOptions.map((option) => (
                            <motion.div key={option.value} variants={itemVariants}>
                                <DropdownMenuItem
                                    onClick={() => setTheme(option.value)}
                                    className={`cursor-pointer transition-all duration-200 rounded-md p-3 hover:bg-primary/5 group ${theme === option.value
                                        ? "bg-gradient-to-r from-primary/10 to-accent/5 text-primary border border-primary/20"
                                        : "hover:border hover:border-primary/10"
                                        }`}
                                >
                                    <div className="flex items-center gap-3 w-full">
                                        <motion.div
                                            whileHover={{ scale: 1.1 }}
                                            transition={{ type: "spring", duration: 0.3 }}
                                            className={`p-1.5 rounded-lg transition-colors duration-200 ${theme === option.value
                                                ? "bg-primary/15 text-primary"
                                                : "bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                                }`}
                                        >
                                            {option.icon}
                                        </motion.div>
                                        <div className="flex-1">
                                            <div className="font-medium text-sm group-hover:text-primary transition-colors duration-200">
                                                {option.label}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {option.description}
                                            </div>
                                        </div>
                                        {theme === option.value && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: "spring", duration: 0.3 }}
                                                className="w-2 h-2 bg-primary rounded-full"
                                            />
                                        )}
                                    </div>
                                </DropdownMenuItem>
                            </motion.div>
                        ))}
                        <DropdownMenuSeparator className="my-2" />
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                            {t("currentMode", {
                                mode: resolvedTheme === "dark" ? t("modes.dark") : t("modes.light"),
                            })}
                            {theme === "system" && systemTheme && (
                                <span className="block mt-1">
                                    {t("systemPrefix")} {systemTheme}
                                </span>
                            )}
                        </div>
                    </motion.div>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    // Default variant
    const toggleTheme = () => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
    };
    const isDark = resolvedTheme === "dark";

    return (
        <motion.div
            variants={buttonVariants}
            initial="idle"
            whileHover="hover"
            whileTap="tap"
        >
            <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                className={`${sizeClasses[size]} relative overflow-hidden border-border/60 hover:border-primary/40 hover:bg-primary/5 group transition-all duration-300`}
            >
                <div className="relative">
                    <AnimatePresence mode="wait" initial={false}>
                        {isDark ? (
                            <motion.div
                                key="moon"
                                variants={themeIconVariants}
                                initial="entering"
                                animate="dark"
                                exit="exiting"
                                className="absolute inset-0 flex items-center justify-center"
                            >
                                <Moon
                                    className={`${iconSizes[size]} text-primary transition-all duration-300 group-hover:text-primary/80`}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="sun"
                                variants={themeIconVariants}
                                initial="entering"
                                animate="light"
                                exit="exiting"
                                className="absolute inset-0 flex items-center justify-center"
                            >
                                <Sun
                                    className={`${iconSizes[size]} text-primary transition-all duration-300 group-hover:text-primary/80`}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <span className="sr-only">{t("toggle")}</span>
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 rounded-md"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.6 }}
                />
                <motion.div
                    className="absolute inset-0 rounded-md"
                    initial={{ boxShadow: "0 0 0 0 rgba(217, 93, 57, 0)" }}
                    whileHover={{ boxShadow: "0 0 0 1px rgba(217, 93, 57, 0.1)" }}
                    transition={{ duration: 0.3 }}
                />
            </Button>
        </motion.div>
    );
}

// Export preset configurations
export const SimpleThemeToggle = (props: Omit<ThemeToggleProps, "variant">) => (
    <ThemeToggle variant="simple" {...props} />
);

export const DropdownThemeToggle = (
    props: Omit<ThemeToggleProps, "variant">
) => <ThemeToggle variant="dropdown" {...props} />;