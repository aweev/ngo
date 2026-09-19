"use client";

import { useState } from "react";
import { Link } from "@/lib/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropdownItem {
    label: string;
    desc: string;
    href: string;
    icon: LucideIcon;
}

interface NavDropdownProps {
    label: string;
    items: DropdownItem[];
    isActive: boolean;
}

export function NavDropdown({ label, items, isActive }: NavDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div
            className="relative group"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button
                className={cn(
                    "flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    isActive || isOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
            >
                {label}
                <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 mt-2 w-80 p-2 bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-xl z-50 overflow-hidden"
                    >
                        <div className="flex flex-col gap-1">
                            {items.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="group/item flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                                >
                                    <div className="mt-1 p-2 bg-primary/10 rounded-lg text-primary group-hover/item:bg-primary group-hover/item:text-white transition-colors">
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-foreground group-hover/item:text-primary transition-colors">
                                            {item.label}
                                        </div>
                                        <div className="text-xs text-muted-foreground leading-tight">
                                            {item.desc}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}