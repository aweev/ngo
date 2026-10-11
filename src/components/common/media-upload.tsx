"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Upload, X, Image as ImageIcon, Video, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MediaUploadResult {
    url: string;
    width: number;
    height: number;
    type: "image" | "video";
    focalPoint?: { x: number; y: number };
    blurDataUrl?: string;
}

interface MediaUploadProps {
    onUpload: (file: File) => Promise<MediaUploadResult>;
    accept?: string;
    maxSizeMB?: number;
    multiple?: boolean;
    className?: string;
    existingMedia?: MediaUploadResult[];
    onRemove?: (url: string) => void;
    onReorder?: (urls: string[]) => void;
    focalPointEnabled?: boolean;
}

export function MediaUpload({
    onUpload,
    accept = "image/*,video/*",
    maxSizeMB = 10,
    multiple = false,
    className = "",
    existingMedia = [],
    onRemove,
    onReorder,
    focalPointEnabled = true,
}: MediaUploadProps) {
    const t = useTranslations("MediaUpload");
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);
    const [media, setMedia] = useState<MediaUploadResult[]>(existingMedia);
    const [focalPoints, setFocalPoints] = useState<Record<string, { x: number; y: number }>>({});

    // Initialize focal points from existing media
    useState(() => {
        const points: Record<string, { x: number; y: number }> = {};
        existingMedia.forEach((m) => {
            if (m.focalPoint) points[m.url] = m.focalPoint;
        });
        setFocalPoints(points);
    });

    const validateFile = (file: File): string | null => {
        if (file.size > maxSizeMB * 1024 * 1024) {
            return t("error_size", { max: maxSizeMB });
        }
        if (!accept.split(",").some((type) => {
            if (type.endsWith("/*")) return file.type.startsWith(type.slice(0, -1));
            return file.type === type;
        })) {
            return t("error_type");
        }
        return null;
    };

    const handleFiles = async (files: FileList | File[]) => {
        const fileArray = Array.from(files);
        for (const file of fileArray) {
            const error = validateFile(file);
            if (error) {
                alert(error);
                continue;
            }
            setUploading(file.name);
            try {
                const result = await onUpload(file);
                setMedia((prev) => [...prev, result]);
                if (result.focalPoint) {
                    setFocalPoints((prev) => ({ ...prev, [result.url]: result.focalPoint! }));
                }
            } catch (err) {
                console.error("Upload failed:", err);
                alert(t("error_upload"));
            } finally {
                setUploading(null);
            }
        }
    };

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files.length > 0) {
                handleFiles(e.dataTransfer.files);
            }
        },
        []
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
            e.target.value = "";
        }
    };

    const removeMedia = (url: string) => {
        setMedia((prev) => prev.filter((m) => m.url !== url));
        setFocalPoints((prev) => {
            const next = { ...prev };
            delete next[url];
            return next;
        });
        onRemove?.(url);
    };

    const handleFocalPointClick = (url: string, e: React.MouseEvent<HTMLDivElement>) => {
        if (!focalPointEnabled) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        setFocalPoints((prev) => ({ ...prev, [url]: { x, y } }));
    };

    const handleReorder = (fromIndex: number, toIndex: number) => {
        const newMedia = [...media];
        const [removed] = newMedia.splice(fromIndex, 1);
        newMedia.splice(toIndex, 0, removed);
        setMedia(newMedia);
        onReorder?.(newMedia.map((m) => m.url));
    };

    return (
        <div className={cn("space-y-4", className)}>
            {/* Drop Zone */}
            <div
                className={cn(
                    "relative border-2 border-dashed rounded-xl p-8 text-center transition-colors",
                    isDragging
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                <input
                    type="file"
                    id="media-upload"
                    accept={accept}
                    multiple={multiple}
                    onChange={handleInputChange}
                    className="hidden"
                    disabled={uploading !== null}
                />
                <label
                    htmlFor="media-upload"
                    className="cursor-pointer flex flex-col items-center gap-4"
                >
                    <div className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-colors",
                        isDragging ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                        <Upload className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-lg font-medium text-foreground">
                            {t(multiple ? "drop_multiple" : "drop_single")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {t("formats", { accept: accept.replace(/\*/g, ""), maxSize: maxSizeMB })}
                        </p>
                    </div>
                </label>
                {uploading && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
                        <div className="flex items-center gap-3">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="text-sm font-medium">{t("uploading", { file: uploading })}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Media Grid */}
            {media.length > 0 && (
                <div className="space-y-4">
                    <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        {t("uploaded", { count: media.length })}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {media.map((item, index) => (
                            <div
                                key={item.url}
                                className="relative group"
                                draggable={onReorder !== undefined}
                                onDragStart={(e) => e.dataTransfer.setData("text/plain", index.toString())}
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("ring-2", "ring-primary"); }}
                                onDragLeave={(e) => e.currentTarget.classList.remove("ring-2", "ring-primary")}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.currentTarget.classList.remove("ring-2", "ring-primary");
                                    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
                                    if (fromIndex !== index) handleReorder(fromIndex, index);
                                }}
                                onDragEnd={(e) => e.currentTarget.classList.remove("ring-2", "ring-primary")}
                            >
                                <div className="aspect-video relative overflow-hidden rounded-lg bg-muted">
                                    {item.type === "video" ? (
                                        <video
                                            src={item.url}
                                            poster={item.blurDataUrl}
                                            className="w-full h-full object-cover"
                                            muted
                                            loop
                                            playsInline
                                        />
                                    ) : (
                                        <img
                                            src={item.url}
                                            alt=""
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    )}
                                    {focalPointEnabled && item.type === "image" && (
                                        <div
                                            className="absolute inset-0 cursor-crosshair"
                                            onClick={(e) => handleFocalPointClick(item.url, e)}
                                            title={t("set_focal_point")}
                                        >
                                            {focalPoints[item.url] && (
                                                <div
                                                    className="absolute h-3 w-3 rounded-full border-2 border-white bg-primary/50 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                                    style={{
                                                        left: `${focalPoints[item.url].x * 100}%`,
                                                        top: `${focalPoints[item.url].y * 100}%`,
                                                    }}
                                                />
                                            )}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-white hover:text-primary"
                                            onClick={(e) => { e.stopPropagation(); removeMedia(item.url); }}
                                            aria-label={t("remove")}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                {item.type === "video" && (
                                    <div className="absolute top-1 right-1 z-10">
                                        <Video className="h-3 w-3 text-white/80" />
                                    </div>
                                )}
                                {focalPoints[item.url] && (
                                    <div className="absolute bottom-1 left-1 z-10">
                                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Hidden input for form submission */}
            <input
                type="hidden"
                name="media_urls"
                value={media.map((m) => m.url).join(",")}
                readOnly
            />
            <input
                type="hidden"
                name="media_focal_points"
                value={JSON.stringify(focalPoints)}
                readOnly
            />
        </div>
    );
}