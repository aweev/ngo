"use client";

import Link from "next/link";
import { HeartHandshake, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useBrandConfig } from "@/providers/brand-provider";

import {
  containerVariants,
  iconVariants,
  sparkleVariants,
} from "@/lib/animations";

// FIX 1: Added 'dimensions' to strictly enforce size on both Images and Icons
const sizeConfig = {
  xs: {
    container: "gap-2",
    iconWrapper: "p-1 rounded-lg",
    icon: "h-4 w-4",
    dimensions: "h-6 w-6", // 16px icon + 4px padding * 2 = ~24px
    text: "text-sm font-bold",
    sparkle: "h-2 w-2"
  },
  sm: {
    container: "gap-2.5",
    iconWrapper: "p-1.5 rounded-lg",
    icon: "h-5 w-5",
    dimensions: "h-8 w-8", // 20px icon + 6px padding * 2 = ~32px
    text: "text-base font-bold",
    sparkle: "h-2.5 w-2.5"
  },
  md: {
    container: "gap-3",
    iconWrapper: "p-2 rounded-xl",
    icon: "h-6 w-6",
    dimensions: "h-10 w-10", // 24px icon + 8px padding * 2 = ~40px (Standard Header)
    text: "text-xl font-bold",
    sparkle: "h-3 w-3"
  },
  lg: {
    container: "gap-3.5",
    iconWrapper: "p-2.5 rounded-2xl",
    icon: "h-7 w-7",
    dimensions: "h-12 w-12", // 28px icon + 10px padding * 2 = ~48px
    text: "text-2xl font-bold",
    sparkle: "h-3.5 w-3.5"
  },
  xl: {
    container: "gap-4",
    iconWrapper: "p-3 rounded-2xl",
    icon: "h-8 w-8",
    dimensions: "h-14 w-14", // 32px icon + 12px padding * 2 = ~56px
    text: "text-3xl font-bold",
    sparkle: "h-4 w-4"
  },
};

const variantConfig = {
  default: {
    container: "group transition-all duration-300 hover:scale-[1.02] cursor-pointer",
    iconWrapper: "bg-gradient-to-br from-primary/10 via-primary/8 to-primary/5 group-hover:from-primary/20 group-hover:via-primary/15 group-hover:to-primary/10 transition-all duration-300 border border-primary/5 group-hover:border-primary/15 relative overflow-hidden",
    icon: "text-primary transition-all duration-300 group-hover:scale-110 group-hover:text-primary/90 relative z-10",
    text: "text-foreground group-hover:text-primary transition-all duration-300 font-serif tracking-tight",
    blur: false,
  },
  footer: {
    container: "group w-fit cursor-pointer",
    iconWrapper: "bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 group-hover:from-primary/25 group-hover:via-primary/20 group-hover:to-primary/15 transition-all duration-500 relative overflow-hidden border border-primary/10 group-hover:border-primary/20",
    icon: "text-primary transition-all duration-500 group-hover:scale-110 group-hover:text-primary/90 relative z-10",
    text: "bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent group-hover:from-primary/95 group-hover:via-primary/85 group-hover:to-primary/75 transition-all duration-500 font-serif tracking-tight",
    blur: true,
  },
  mobile: {
    container: "group cursor-pointer",
    iconWrapper: "bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/15 group-hover:to-primary/10 transition-all duration-300 border border-primary/5 group-hover:border-primary/15",
    icon: "text-primary transition-all duration-300 group-hover:scale-110 relative z-10",
    text: "text-foreground group-hover:text-primary transition-all duration-300 font-serif tracking-tight",
    blur: false,
  },
  minimal: {
    container: "group cursor-pointer",
    iconWrapper: "transition-all duration-300 group-hover:bg-primary/5 border border-transparent group-hover:border-primary/10 rounded-lg",
    icon: "text-primary transition-all duration-300 group-hover:scale-105",
    text: "text-foreground transition-all duration-300 font-serif tracking-tight group-hover:text-primary/90",
    blur: false,
  },
  hero: {
    container: "group cursor-pointer transform-gpu",
    iconWrapper: "bg-gradient-to-br from-primary/20 via-primary/15 to-primary/10 group-hover:from-primary/30 group-hover:via-primary/25 group-hover:to-primary/20 transition-all duration-500 relative overflow-hidden border-2 border-primary/15 group-hover:border-primary/25 shadow-lg group-hover:shadow-xl group-hover:shadow-primary/20",
    icon: "text-primary transition-all duration-500 group-hover:scale-125 group-hover:text-primary/90 relative z-10 drop-shadow-sm",
    text: "bg-gradient-to-r from-foreground via-foreground/95 to-foreground/90 bg-clip-text text-transparent group-hover:from-primary group-hover:via-primary/90 group-hover:to-primary/80 transition-all duration-500 font-serif tracking-tight drop-shadow-sm",
    blur: true,
  },
  admin: {
    container: "group cursor-pointer",
    iconWrapper: "bg-gradient-to-br from-accent/10 to-accent/5 group-hover:from-accent/20 group-hover:to-accent/10 transition-all duration-300 border border-accent/20 group-hover:border-accent/40 rounded-xl",
    icon: "text-accent transition-all duration-300 group-hover:scale-110",
    text: "text-foreground transition-all duration-300 font-serif tracking-tight group-hover:text-accent/90",
    blur: false,
  },
  members: {
    container: "group cursor-pointer",
    iconWrapper: "bg-gradient-to-br from-secondary/10 to-secondary/5 group-hover:from-secondary/20 group-hover:to-secondary/10 transition-all duration-300 border border-secondary/20 group-hover:border-secondary/40 rounded-xl",
    icon: "text-secondary transition-all duration-300 group-hover:scale-110",
    text: "text-foreground transition-all duration-300 font-serif tracking-tight group-hover:text-secondary/90",
    blur: false,
  },
  icon: {
    container: "group cursor-pointer",
    iconWrapper: "bg-transparent group-hover:bg-primary/10 transition-colors duration-300",
    icon: "text-primary transition-transform duration-300 group-hover:scale-110",
    text: "",
    blur: false,
  },
};

interface BrandLogoProps {
  size?: keyof typeof sizeConfig;
  variant?: keyof typeof variantConfig;
  href?: string;
  brandName?: string;
  showText?: boolean;
  className?: string;
  onClick?: () => void;
  asLink?: boolean;
  showSparkles?: boolean;
  enableAnimations?: boolean;
}

export function BrandLogo({
  size = "md",
  variant = "default",
  href = "/",
  brandName,
  showText = true,
  className,
  onClick,
  asLink = true,
  showSparkles = false,
  enableAnimations = true,
}: BrandLogoProps) {
  const { name: configBrandName, logoUrl, logoDarkUrl } = useBrandConfig();
  const { resolvedTheme } = useTheme();

  const finalBrandName = brandName || configBrandName || "AWE e.V.";
  const currentLogo = resolvedTheme === 'dark' && logoDarkUrl ? logoDarkUrl : logoUrl;

  const sizeStyles = sizeConfig[size];
  const variantStyles = variantConfig[variant];

  // Logic: Decide if we render an Image or the SVG Icon
  const logoContent = currentLogo ? (
    // FIX 2: Apply sizeStyles.dimensions to the wrapper to force the size
    <div className={cn("relative overflow-hidden", sizeStyles.iconWrapper, sizeStyles.dimensions)}>
      {/* FIX 3: Use width/height=0 + sizes + CSS to make image adaptive to container */}
      <Image
        src={currentLogo}
        alt={`${finalBrandName} logo`}
        width={0}
        height={0}
        sizes="100vw"
        className="w-full h-full object-contain"
        priority
      />
    </div>
  ) : (
    // Fallback Icon Logic
    <>
      <div
        className={cn(
          "relative",
          sizeStyles.iconWrapper,
          variantStyles.iconWrapper,
          // Ensure fallback has same dimensions logic if needed, though padding usually handles it
          // sizeStyles.dimensions 
        )}
      >
        <motion.div
          variants={enableAnimations ? iconVariants : undefined}
          initial="initial"
          whileHover={enableAnimations ? "hover" : undefined}
          className="relative z-10"
        >
          <HeartHandshake className={cn(sizeStyles.icon, variantStyles.icon)} />
        </motion.div>

        <AnimatePresence>
          {showSparkles && (
            <>
              <motion.div
                className="absolute -top-1 -right-1"
                variants={sparkleVariants}
                initial="initial"
                animate="animate"
              >
                <Sparkles className={cn(sizeStyles.sparkle, "text-accent")} />
              </motion.div>
              <motion.div
                className="absolute -bottom-1 -left-1"
                variants={sparkleVariants}
                initial="initial"
                animate="animate"
                style={{ animationDelay: "1s" }}
              >
                <Sparkles className={cn(sizeStyles.sparkle, "text-primary")} />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {variantStyles.blur && (
          <motion.div
            className="absolute inset-0 bg-primary/20 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ zIndex: -1 }}
          />
        )}

        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-[shimmer_1s_ease-out]"
          style={{ transform: "translateX(-100%)" }}
        />
      </div>

      {showText && (
        <motion.span
          className={cn(sizeStyles.text, variantStyles.text)}
          initial={{ opacity: 1 }}
          whileHover={enableAnimations ? { scale: 1.02 } : undefined}
          transition={{ duration: 0.3 }}
        >
          {finalBrandName}
        </motion.span>
      )}
    </>
  );

  const containerClasses = cn(
    "flex items-center select-none",
    sizeStyles.container,
    variantStyles.container,
    className
  );

  if (!asLink) {
    return (
      <motion.div
        className={containerClasses}
        onClick={onClick}
        variants={enableAnimations ? containerVariants : undefined}
        initial={enableAnimations ? "initial" : undefined}
        whileHover={enableAnimations ? "hover" : undefined}
        whileTap={enableAnimations ? "tap" : undefined}
      >
        {logoContent}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={enableAnimations ? containerVariants : undefined}
      initial={enableAnimations ? "initial" : undefined}
      whileHover={enableAnimations ? "hover" : undefined}
      whileTap={enableAnimations ? "tap" : undefined}
    >
      <Link href={href} className={containerClasses} onClick={onClick}>
        {logoContent}
      </Link>
    </motion.div>
  );
}

// ... Exports (HeaderLogo, FooterLogo, etc) remain unchanged
export const HeaderLogo = (props: Omit<BrandLogoProps, "size" | "variant">) => (
  <BrandLogo size="md" variant="default" {...props} />
);

export const FooterLogo = (props: Omit<BrandLogoProps, "size" | "variant">) => (
  <BrandLogo size="lg" variant="footer" {...props} />
);

export const MobileLogo = (props: Omit<BrandLogoProps, "size" | "variant">) => (
  <BrandLogo size="md" variant="mobile" {...props} />
);

export const MinimalLogo = (
  props: Omit<BrandLogoProps, "size" | "variant">
) => <BrandLogo size="sm" variant="minimal" {...props} />

export const HeroLogo = (props: Omit<BrandLogoProps, "size" | "variant">) => (
  <BrandLogo size="xl" variant="hero" showSparkles {...props} />
);