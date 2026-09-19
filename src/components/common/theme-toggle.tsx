"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/lib/animations";

interface ThemeToggleProps {
  variant?: "default" | "simple";
  size?: "sm" | "md" | "lg";
}

export function ThemeToggle({ size = "md" }: ThemeToggleProps) {
  const t = useTranslations("ThemeToggle");
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

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
        className={`${sizeClasses[size]} border-border/60 opacity-50`}
        disabled
      >
        <span className="sr-only">Loading...</span>
      </Button>
    );
  }

  const toggleTheme = () => {
    // Only toggles between light and dark, ignoring system preference after first set
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
        variant="ghost" // Changed to ghost for cleaner header look
        size="icon"
        onClick={toggleTheme}
        className={`${sizeClasses[size]} relative overflow-hidden rounded-full hover:bg-muted transition-colors`}
        aria-label={t("toggle")}
      >
        <div className="relative z-10">
          <AnimatePresence mode="wait" initial={false}>
            {isDark ? (
              <motion.div
                key="moon"
                initial={{ rotate: -90, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                exit={{ rotate: 90, scale: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center"
              >
                <Moon className={`${iconSizes[size]} text-foreground`} />
              </motion.div>
            ) : (
              <motion.div
                key="sun"
                initial={{ rotate: 90, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                exit={{ rotate: -90, scale: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center"
              >
                <Sun className={`${iconSizes[size]} text-amber-500 fill-amber-500`} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Button>
    </motion.div>
  );
}

// Export preset
export const SimpleThemeToggle = (props: ThemeToggleProps) => (
  <ThemeToggle {...props} />
);