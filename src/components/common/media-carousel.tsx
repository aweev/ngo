"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Expand, Loader2 } from "lucide-react";

interface MediaItem {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    focalPoint?: { x: number; y: number }; // 0-1, center = 0.5, 0.5
    caption?: string;
    type?: "image" | "video";
    videoPoster?: string;
}

interface MediaCarouselProps {
    items: MediaItem[];
    initialIndex?: number;
    aspectRatio?: "16/9" | "4/3" | "1/1" | "3/2" | "auto";
    showThumbnails?: boolean;
    autoPlay?: boolean;
    autoPlayInterval?: number;
    className?: string;
    onIndexChange?: (index: number) => void;
}

export function MediaCarousel({
    items,
    initialIndex = 0,
    aspectRatio = "16/9",
    showThumbnails = true,
    autoPlay = false,
    autoPlayInterval = 5000,
    className = "",
    onIndexChange,
}: MediaCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [loadedItems, setLoadedItems] = useState<Set<number>>(new Set());
    const locale = useLocale();
    const isRTL = locale === "ar";
    const t = useTranslations("MediaCarousel");

    const goTo = useCallback(
        (index: number, direction?: number) => {
            if (isAnimating || index === currentIndex || index < 0 || index >= items.length) return;
            setIsAnimating(true);
            setCurrentIndex(index);
            onIndexChange?.(index);
            // Reset animation flag after transition
            setTimeout(() => setIsAnimating(false), 300);
        },
        [currentIndex, items.length, isAnimating, onIndexChange]
    );

    const goNext = useCallback(() => {
        goTo((currentIndex + 1) % items.length, 1);
    }, [currentIndex, items.length, goTo]);

    const goPrev = useCallback(() => {
        goTo((currentIndex - 1 + items.length) % items.length, -1);
    }, [currentIndex, items.length, goTo]);

    // Auto-play
    useEffect(() => {
        if (!autoPlay || items.length <= 1) return;
        const timer = setInterval(goNext, autoPlayInterval);
        return () => clearInterval(timer);
    }, [autoPlay, autoPlayInterval, items.length, goNext]);

    // Pause auto-play on hover
    const [isHovered, setIsHovered] = useState(false);
    useEffect(() => {
        if (!autoPlay) return;
    }, [autoPlay]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") {
                isRTL ? goPrev() : goNext();
            } else if (e.key === "ArrowLeft") {
                isRTL ? goNext() : goPrev();
            } else if (e.key === "Escape" && isExpanded) {
                setIsExpanded(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [goNext, goPrev, isRTL, isExpanded]);

    // Touch/swipe support
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.touches[0].clientX);
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStart === null) return;
        const diff = e.changedTouches[0].clientX - touchStart;
        if (Math.abs(diff) > 50) {
            if (isRTL) {
                diff > 0 ? goPrev() : goNext();
            } else {
                diff > 0 ? goNext() : goPrev();
            }
        }
        setTouchStart(null);
    };

    const aspectClass = {
        "16/9": "aspect-video",
        "4/3": "aspect-[4/3]",
        "1/1": "aspect-square",
        "3/2": "aspect-[3/2]",
        auto: "",
    }[aspectRatio];

    const direction = isRTL ? -1 : 1;

    return (
        <div
            className={cn("relative w-full overflow-hidden bg-muted/20", aspectClass, className)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Main Viewport */}
            <div
                className="relative w-full h-full"
                role="region"
                aria-label={t("carousel_label")}
                aria-roledescription="carousel"
            >
                {items.map((item, index) => {
                    const isActive = index === currentIndex;
                    const translateX = (index - currentIndex) * 100 * direction;

                    return (
                        <div
                            key={index}
                            className={cn(
                                "absolute inset-0 transition-transform duration-300 ease-out flex items-center justify-center",
                                isActive ? "z-10 opacity-100" : "z-0 opacity-0 pointer-events-none",
                                isAnimating && "transition-none"
                            )}
                            style={{ transform: `translateX(${translateX}%)` }}
                            aria-hidden={!isActive}
                            aria-current={isActive ? "true" : "false"}
                        >
                            {item.type === "video" ? (
                                <div className="relative w-full h-full">
                                    <video
                                        src={item.src}
                                        poster={item.videoPoster}
                                        controls
                                        className="w-full h-full object-cover"
                                        aria-label={item.alt}
                                    />
                                </div>
                            ) : (
                                <div className="relative w-full h-full">
                                    <Image
                                        src={item.src}
                                        alt={item.alt}
                                        fill
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        className={cn(
                                            "object-cover transition-opacity duration-300",
                                            loadedItems.has(index) ? "opacity-100" : "opacity-0"
                                        )}
                                        onLoad={() => setLoadedItems((prev) => new Set(prev).add(index))}
                                        onError={(e) => {
                                            console.error(`Failed to load image: ${item.src}`);
                                            e.currentTarget.style.display = "none";
                                        }}
                                        style={
                                            item.focalPoint
                                                ? {
                                                      objectPosition: `${item.focalPoint.x * 100}% ${item.focalPoint.y * 100}%`,
                                                  }
                                                : undefined
                                        }
                                    />
                                    {!loadedItems.has(index) && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                                            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                                        </div>
                                    )}
                                </div>
                            )}
                            {item.caption && (
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white text-sm">
                                    {item.caption}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Navigation Arrows */}
                {items.length > 1 && (
                    <>
                        <button
                            onClick={goPrev}
                            disabled={isAnimating}
                            className={cn(
                                "absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-background border border-border/50 transition-colors",
                                isRTL && "left-auto right-4"
                            )}
                            aria-label={t("previous")}
                            aria-disabled={isAnimating}
                        >
                            <ChevronLeft className={cn("h-5 w-5", isRTL && "rotate-180")} />
                        </button>
                        <button
                            onClick={goNext}
                            disabled={isAnimating}
                            className={cn(
                                "absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-background border border-border/50 transition-colors",
                                isRTL && "right-auto left-4"
                            )}
                            aria-label={t("next")}
                            aria-disabled={isAnimating}
                        >
                            <ChevronRight className={cn("h-5 w-5", isRTL && "rotate-180")} />
                        </button>
                    </>
                )}

                {/* Expand Button */}
                {items.length > 0 && (
                    <button
                        onClick={() => setIsExpanded(true)}
                        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-background border border-border/50 transition-colors"
                        aria-label={t("expand")}
                    >
                        <Expand className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* Thumbnails */}
            {showThumbnails && items.length > 1 && (
                <div
                    className="flex gap-2 mt-4 justify-center overflow-x-auto pb-2 scrollbar-hide"
                    role="tablist"
                    aria-label={t("thumbnails_label")}
                >
                    {items.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => goTo(index)}
                            className={cn(
                                "relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                                index === currentIndex
                                    ? "border-primary ring-2 ring-primary/20"
                                    : "border-transparent hover:border-primary/50"
                            )}
                            role="tab"
                            aria-selected={index === currentIndex}
                            aria-label={`${t("slide")} ${index + 1}${item.caption ? `: ${item.caption}` : ""}`}
                        >
                            <Image
                                src={item.src}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="80px"
                            />
                            {index === currentIndex && (
                                <div className="absolute inset-0 bg-primary/20" />
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Pagination Dots (fallback when no thumbnails) */}
            {!showThumbnails && items.length > 1 && (
                <div className="flex gap-2 justify-center mt-4" role="tablist" aria-label={t("pagination_label")}>
                    {items.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goTo(index)}
                            className={cn(
                                "h-2 rounded-full transition-all duration-300",
                                index === currentIndex ? "w-8 bg-primary" : "w-2 bg-border hover:bg-primary/50"
                            )}
                            role="tab"
                            aria-selected={index === currentIndex}
                            aria-label={`${t("slide")} ${index + 1}`}
                        />
                    ))}
                </div>
            )}

            {/* Expanded Modal */}
            {isExpanded && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
                    onClick={() => setIsExpanded(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label={t("expanded_label")}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        aria-label={t("close")}
                    >
                        <ChevronRight className="h-6 w-6 rotate-45" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); goPrev(); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        aria-label={t("previous")}
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); goNext(); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        aria-label={t("next")}
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>
                    <div className="relative w-full max-w-5xl h-[80vh] max-h-[80vh] mx-4">
                        {items[currentIndex].type === "video" ? (
                            <video
                                src={items[currentIndex].src}
                                poster={items[currentIndex].videoPoster}
                                controls
                                autoPlay
                                className="w-full h-full object-contain"
                                aria-label={items[currentIndex].alt}
                            />
                        ) : (
<Image
                src={items[currentIndex].src}
                alt={items[currentIndex].alt}
                fill
                className="object-contain"
                priority
                sizes="100vw"
                style={
                    items[currentIndex].focalPoint
                        ? { objectPosition: `${items[currentIndex].focalPoint!.x * 100}% ${items[currentIndex].focalPoint!.y * 100}%` }
                        : undefined
                }
            />
                        )}
                        {items[currentIndex].caption && (
                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white text-center">
                                {items[currentIndex].caption}
                            </div>
                        )}
                    </div>
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2" role="tablist">
                        {items.map((_, index) => (
                            <button
                                key={index}
                                onClick={(e) => { e.stopPropagation(); goTo(index); }}
                                className={cn(
                                    "h-2 rounded-full transition-all duration-300",
                                    index === currentIndex ? "w-8 bg-white" : "w-2 bg-white/50 hover:bg-white/70"
                                )}
                                role="tab"
                                aria-selected={index === currentIndex}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Convenience component for single image with focal point
export function ResponsiveImage({
    src,
    alt,
    width,
    height,
    focalPoint,
    sizes,
    className = "",
    priority = false,
    placeholder = "blur",
    blurDataURL,
}: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    focalPoint?: { x: number; y: number };
    sizes?: string;
    className?: string;
    priority?: boolean;
    placeholder?: "blur" | "empty";
    blurDataURL?: string;
}) {
    return (
        <div className={cn("relative overflow-hidden", className)}>
            <Image
                src={src}
                alt={alt}
                width={width}
                height={height}
                sizes={sizes || "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"}
                priority={priority}
                placeholder={placeholder}
                blurDataURL={blurDataURL}
                className={cn(
                    "transition-opacity duration-300",
                    focalPoint ? "object-cover" : ""
                )}
                style={
                    focalPoint
                        ? { objectPosition: `${focalPoint.x * 100}% ${focalPoint.y * 100}%` }
                        : undefined
                }
            />
        </div>
    );
}