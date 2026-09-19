"use client";

import { useTranslations } from "next-intl";
import { FileText, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoryDeepDiveViewModel } from "@/types/domain-adapters";
import { useState, useRef } from "react";

export function MediaPlayer({ story }: { story: StoryDeepDiveViewModel }) {
    const t = useTranslations("Stories.Detail.Player");
    const [isPlaying, setIsPlaying] = useState(false);
    const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);

    // If text-only story, don't render player
    if (!story.mediaUrl) return null;

    const togglePlay = () => {
        if (!mediaRef.current) return;
        if (isPlaying) {
            mediaRef.current.pause();
        } else {
            mediaRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <section className="container mx-auto px-4 -mt-20 relative z-20 mb-16">
            <div className="bg-card rounded-3xl overflow-hidden shadow-2xl border border-border/50">

                {story.type === 'video' ? (
                    <div className="relative aspect-video bg-black group cursor-pointer" onClick={togglePlay}>
                        <video
                            ref={mediaRef as React.RefObject<HTMLVideoElement>}
                            src={story.mediaUrl}
                            className="w-full h-full"
                            controls={false} // Custom controls
                        />
                        {/* Custom Controls Overlay */}
                        <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity duration-300 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                            <button
                                className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50 hover:scale-110 transition-transform"
                            >
                                {isPlaying ? <Pause className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white ml-1" />}
                            </button>
                        </div>
                    </div>
                ) : story.type === 'audio' ? (
                    <div className="p-8 flex flex-col md:flex-row items-center gap-6">
                        <button
                            onClick={togglePlay}
                            className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform flex-shrink-0"
                        >
                            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                        </button>

                        <div className="flex-grow w-full space-y-2">
                            {/* Hardcoded "Audio Story" is acceptable as UI label if simple, but better localized */}
                            <h3 className="text-lg font-bold text-foreground">Audio Story</h3>
                            {/* Fake Waveform Visual */}
                            <div className="h-12 w-full flex items-center gap-1 opacity-50">
                                {[...Array(40)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="w-1 bg-foreground rounded-full animate-pulse"
                                        style={{
                                            height: `${Math.max(20, (Math.sin(i) * 50) + 50)}%`,
                                            animationDelay: `${i * 0.05}s`
                                        }}
                                    />
                                ))}
                            </div>
                            <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} src={story.mediaUrl} />
                        </div>

                        {story.transcriptUrl && (
                            <Button variant="outline" className="gap-2" asChild>
                                <a href={story.transcriptUrl} download>
                                    <FileText className="w-4 h-4" />
                                    {t("transcript")}
                                </a>
                            </Button>
                        )}
                    </div>
                ) : null}
            </div>
        </section>
    );
}