"use client";

import { Globe, Check } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { useBrandConfig } from "@/providers/brand-provider";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  buttonVariants,
  dropdownVariants,
  itemVariants,
} from "@/lib/animations";

// Typed constant map
const LOCALE_DETAILS_MAP = {
  en: { name: "English", nativeName: "English", flag: "🇺🇸", shortCode: "EN" },
  de: { name: "German", nativeName: "Deutsch", flag: "🇩🇪", shortCode: "DE" },
  fr: { name: "French", nativeName: "Français", flag: "🇫🇷", shortCode: "FR" },
  es: { name: "Spanish", nativeName: "Español", flag: "🇪🇸", shortCode: "ES" },
  ar: { name: "Arabic", nativeName: "العربية", flag: "🇸🇦", shortCode: "AR" },
} as const;

type LocaleCode = keyof typeof LOCALE_DETAILS_MAP;

interface LanguageSwitcherProps {
  variant?: "default" | "compact" | "minimal";
  showFlag?: boolean;
  showNativeName?: boolean;
}

function setLocaleCookie(locale: string) {
  const maxAgeSeconds = 60 * 60 * 24 * 365;
  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function LanguageSwitcher({
  variant = "default",
  showFlag = true,
  showNativeName = false,
}: LanguageSwitcherProps) {
  const { enabledLocales } = useBrandConfig();
  const router = useRouter();
  const pathname = usePathname();
  const activeLocale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const availableLocales = useMemo(() => {
    return enabledLocales
      .filter((code): code is LocaleCode => code in LOCALE_DETAILS_MAP)
      .map((code) => ({
        code,
        ...LOCALE_DETAILS_MAP[code],
      }));
  }, [enabledLocales]);

  const currentLocaleDetails = useMemo(() => {
    return availableLocales.find((l) => l.code === activeLocale);
  }, [availableLocales, activeLocale]);

  const handleLocaleChange = async (newLocale: string) => {
    if (newLocale === activeLocale || isTransitioning) return;

    setIsTransitioning(true);
    setIsOpen(false);

    // Simulate small delay for UI feedback
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Handle Admin/Member routes differently (Cookie based re-render)
    const isPrivate = pathname.startsWith("/admin") || pathname.startsWith("/members");
    if (isPrivate) {
      setLocaleCookie(newLocale);
      router.refresh();
      setTimeout(() => setIsTransitioning(false), 500);
      return;
    }

    // Handle Public routes (URL segment replacement)
    const pathSegments = pathname.split("/").filter(Boolean);
    // Remove existing locale if present (assuming prefix strategy)
    if (enabledLocales.includes(pathSegments[0])) {
      pathSegments.shift();
    }
    const newPath = `/${newLocale}/${pathSegments.join("/")}`;
    const search = typeof window !== "undefined" ? window.location.search : "";

    router.replace(`${newPath}${search}`);

    setTimeout(() => setIsTransitioning(false), 500);
  };

  // --- Variant: Minimal (Globe Icon Only) ---
  if (variant === "minimal") {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        {/* FIX: Move motion.div OUTSIDE DropdownMenuTrigger */}
        <motion.div variants={buttonVariants} initial="idle" whileHover="hover" whileTap="tap">
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-primary/10 relative" disabled={isTransitioning}>
              <motion.div animate={isTransitioning ? { rotate: 360 } : { rotate: 0 }} transition={{ duration: 0.5 }}>
                <Globe className="h-4 w-4" />
              </motion.div>
              <span className="sr-only">Change language</span>
            </Button>
          </DropdownMenuTrigger>
        </motion.div>

        <DropdownMenuContent align="end" className="min-w-[120px]">
          <AnimatePresence>
            {isOpen && (
              <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit">
                {availableLocales.map((localeOption) => (
                  <motion.div key={localeOption.code} variants={itemVariants}>
                    <DropdownMenuItem
                      onClick={() => handleLocaleChange(localeOption.code)}
                      className={`cursor-pointer transition-colors duration-200 ${activeLocale === localeOption.code ? "bg-primary/10 text-primary" : ""}`}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {showFlag && <span>{localeOption.flag}</span>}
                        <span className="flex-1">{localeOption.shortCode}</span>
                        {activeLocale === localeOption.code && <Check className="h-3 w-3" />}
                      </div>
                    </DropdownMenuItem>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // --- Variant: Compact (Flag + Code) ---
  if (variant === "compact") {
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        {/* FIX: Move motion.div OUTSIDE DropdownMenuTrigger */}
        <motion.div variants={buttonVariants} initial="idle" whileHover="hover" whileTap="tap">
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 px-3 gap-2 font-medium hover:border-primary/40 hover:bg-primary/5 transition-all duration-300" disabled={isTransitioning}>
              <motion.div animate={isTransitioning ? { rotate: 360 } : { rotate: 0 }} transition={{ duration: 0.5 }}>
                {showFlag && currentLocaleDetails?.flag && <span className="text-sm">{currentLocaleDetails.flag}</span>}
                {!showFlag && <Globe className="h-4 w-4" />}
              </motion.div>
              <span className="text-xs font-semibold tracking-wide">{currentLocaleDetails?.shortCode || "EN"}</span>
            </Button>
          </DropdownMenuTrigger>
        </motion.div>

        <DropdownMenuContent align="end" className="min-w-[160px]">
          <AnimatePresence>
            {isOpen && (
              <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit">
                {availableLocales.map((localeOption) => (
                  <motion.div key={localeOption.code} variants={itemVariants}>
                    <DropdownMenuItem onClick={() => handleLocaleChange(localeOption.code)} className={`cursor-pointer transition-all duration-200 hover:bg-primary/5 ${activeLocale === localeOption.code ? "bg-primary/10 text-primary border-l-2 border-primary" : ""}`}>
                      <div className="flex items-center gap-3 w-full py-1">
                        {showFlag && <span className="text-lg">{localeOption.flag}</span>}
                        <div className="flex-1">
                          <div className="font-medium text-sm">{localeOption.name}</div>
                          {showNativeName && <div className="text-xs text-muted-foreground">{localeOption.nativeName}</div>}
                        </div>
                        {activeLocale === localeOption.code && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.3 }}><Check className="h-4 w-4 text-primary" /></motion.div>}
                      </div>
                    </DropdownMenuItem>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // --- Variant: Default (Icon Button with Hover Gradient) ---
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      {/* FIX: Move motion.div OUTSIDE DropdownMenuTrigger */}
      <motion.div variants={buttonVariants} initial="idle" whileHover="hover" whileTap="tap">
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 relative overflow-hidden group" disabled={isTransitioning}>
            <motion.div animate={isTransitioning ? { rotate: 360 } : { rotate: 0 }} transition={{ duration: 0.5 }} className="relative z-10"><Globe className="h-[1.2rem] w-[1.2rem] transition-transform duration-300 group-hover:scale-110" /></motion.div>
            <span className="sr-only">Change language</span>
            <motion.div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10" initial={{ x: "-100%" }} whileHover={{ x: "100%" }} transition={{ duration: 0.6 }} />
          </Button>
        </DropdownMenuTrigger>
      </motion.div>

      <DropdownMenuContent align="end" className="min-w-[200px] p-1">
        <AnimatePresence>
          {isOpen && (
            <motion.div variants={dropdownVariants} initial="hidden" animate="visible" exit="exit">
              {availableLocales.map((localeOption) => (
                <motion.div key={localeOption.code} variants={itemVariants}>
                  <DropdownMenuItem onClick={() => handleLocaleChange(localeOption.code)} className={`cursor-pointer transition-all duration-200 rounded-md p-3 hover:bg-primary/5 group ${activeLocale === localeOption.code ? "bg-gradient-to-r from-primary/10 to-accent/5 text-primary border border-primary/20" : "hover:border hover:border-primary/10"}`}>
                    <div className="flex items-center gap-3 w-full">
                      {showFlag && <motion.span className="text-lg" whileHover={{ scale: 1.1 }} transition={{ type: "spring", duration: 0.3 }}>{localeOption.flag}</motion.span>}
                      <div className="flex-1">
                        <div className="font-medium text-sm group-hover:text-primary transition-colors duration-200">{localeOption.name}</div>
                        {showNativeName && <div className="text-xs text-muted-foreground">{localeOption.nativeName}</div>}
                      </div>
                      <AnimatePresence>
                        {activeLocale === localeOption.code && <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 90 }} transition={{ type: "spring", duration: 0.4 }}><Check className="h-4 w-4 text-primary" /></motion.div>}
                      </AnimatePresence>
                    </div>
                  </DropdownMenuItem>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}