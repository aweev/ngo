"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Lock, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { createDonationCheckout } from "@/actions/public";
import { toast } from "sonner";

const PRESET_AMOUNTS = [25, 50, 100, 250];

export function DonationWidget() {
    const t = useTranslations("Donation.Widget");
    const [frequency, setFrequency] = useState<"MONTHLY" | "ONE_TIME">("MONTHLY");
    const [amount, setAmount] = useState<number>(50);
    const [customAmount, setCustomAmount] = useState<string>("");
    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState("");
    const [needsReceipt, setNeedsReceipt] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleAmountSelect = (val: number) => {
        setAmount(val);
        setCustomAmount("");
    };

    const handleCustomAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setCustomAmount(val);
        if (Number(val) > 0) setAmount(Number(val));
    };

    const getImpactText = () => {
        if (amount >= 250) return t("impact_250");
        if (amount >= 100) return t("impact_100");
        if (amount >= 50) return t("impact_50");
        if (amount >= 25) return t("impact_25");
        return t("impact_default");
    };

    const handleDonate = async () => {
        if (!email || !amount) return;
        setIsLoading(true);

        try {
            const res = await createDonationCheckout({
                amount,
                currency: "EUR",
                type: frequency === "MONTHLY" ? "recurring" : "one_time",
                email,
                fullName: fullName.trim() || undefined,
                needsReceipt,
            });

            if (!res.success) {
                throw new Error(res.error || t("error_title"));
            }

            if (res.mode === "checkout" && res.url) {
                // Hand off to the hosted Stripe Checkout page. Confirmation
                // happens server-side via the webhook — never here.
                window.location.href = res.url;
                return;
            }

            // Provider not configured: be explicit that this is a pledge
            // that still needs to be paid, not a completed donation.
            toast.success(t("pledge_title"), {
                description: t("pledge_description", { reference: res.reference ?? "" }),
            });
            setEmail("");
            setFullName("");
        } catch (err) {
            toast.error(t("error_title"), {
                description: err instanceof Error && err.message ? err.message : t("error_description"),
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-card border-2 border-border/60 rounded-[2.5rem] shadow-2xl shadow-primary/5 p-6 md:p-8 w-full relative overflow-hidden">
            <div className="absolute inset-0 bg-texture-paper opacity-50 pointer-events-none mix-blend-multiply" />

            <div className="relative z-10">
                {/* Frequency Tabs */}
                <div className="flex p-1.5 bg-muted rounded-xl mb-8">
                    {(["MONTHLY", "ONE_TIME"] as const).map((freq) => (
                        <button
                            key={freq}
                            onClick={() => setFrequency(freq)}
                            className={cn(
                                "flex-1 py-3 text-sm font-bold rounded-lg transition-all duration-300",
                                frequency === freq
                                    ? "bg-background text-primary shadow-sm ring-1 ring-black/5"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {t(`frequency_${freq.toLowerCase()}`)}
                        </button>
                    ))}
                </div>

                {/* Amount Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {PRESET_AMOUNTS.map((val) => (
                        <button
                            key={val}
                            onClick={() => handleAmountSelect(val)}
                            className={cn(
                                "py-4 rounded-xl border-2 font-bold text-xl transition-all duration-200 relative overflow-hidden group",
                                amount === val && !customAmount
                                    ? "border-primary bg-primary/5 text-primary"
                                    : "border-border hover:border-primary/30 text-muted-foreground"
                            )}
                        >
                            €{val}
                            {amount === val && !customAmount && (
                                <motion.div layoutId="active-ring" className="absolute inset-0 border-2 border-primary rounded-xl" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Custom Amount */}
                <div className="mb-8 space-y-4">
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">€</span>
                        <Input
                            type="number"
                            placeholder={t("custom_amount")}
                            value={customAmount}
                            onChange={handleCustomAmount}
                            className="pl-8 h-12 rounded-xl bg-background/50 border-border/60 focus-visible:ring-primary/20 font-bold"
                        />
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={amount}
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="flex items-start gap-3 text-sm text-primary font-medium bg-primary/5 p-4 rounded-xl border border-primary/10"
                        >
                            <Heart className="w-5 h-5 mt-0.5 fill-current shrink-0" />
                            <span>
                                <span className="font-bold block mb-1 uppercase text-xs tracking-wider opacity-70">{t("impact_label")}</span>
                                {getImpactText()}
                            </span>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Payment Fields */}
                <div className="space-y-4 mb-8">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="font-bold">{t("email_label")}</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-12 rounded-xl"
                        />
                    </div>
                    <div className="flex items-center space-x-3">
                        <Checkbox
                            id="receipt"
                            checked={needsReceipt}
                            onCheckedChange={(c) => setNeedsReceipt(!!c)}
                            className="rounded-md border-2 border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <label
                            htmlFor="receipt"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                            {t("receipt_check")}
                        </label>
                    </div>
                </div>

                {/* Submit */}
                <div className="space-y-4">
                    <Button
                        size="lg"
                        className="w-full h-14 text-lg rounded-xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform bg-linear-to-r from-primary to-accent"
                        onClick={handleDonate}
                        disabled={isLoading || !email}
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : (
                            <CreditCard className="w-5 h-5 mr-2" />
                        )}
                        {t("submit_btn", { amount })}
                    </Button>

                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        <Lock className="w-3 h-3" />
                        <span>{t("secure_footer")}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}