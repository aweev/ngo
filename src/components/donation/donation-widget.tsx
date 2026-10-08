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

/**
 * Client-side bounds for the donation field. The ceiling matches
 * createDonationCheckout's `z.number().positive().max(1_000_000)` so a
 * paste never round-trips to a server error; the floor of 1 is a deliberate
 * UI choice (the server accepts any positive amount, including sub-unit ones).
 */
export const MIN_AMOUNT = 1;
export const MAX_AMOUNT = 1_000_000;

/** Same shape the server accepts via z.string().email().max(200). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function DonationWidget() {
    const t = useTranslations("Donation.Widget");
    const [frequency, setFrequency] = useState<"MONTHLY" | "ONE_TIME">("MONTHLY");
    const [amount, setAmount] = useState<number>(50);
    const [customAmount, setCustomAmount] = useState<string>("");
    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState("");
    const [needsReceipt, setNeedsReceipt] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [amountError, setAmountError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);

    const handleAmountSelect = (val: number) => {
        setAmount(val);
        setCustomAmount("");
        setAmountError(null);
    };

    const handleCustomAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setCustomAmount(val);
        const parsed = Number(val);
        if (val === "") {
            setAmountError(null);
            return;
        }
        if (!Number.isFinite(parsed) || parsed < MIN_AMOUNT || parsed > MAX_AMOUNT) {
            // Show why the amount was not taken, rather than silently
            // keeping the previous one while the field displays a new value.
            setAmountError(t("amount_invalid", { min: MIN_AMOUNT, max: MAX_AMOUNT }));
            return;
        }
        setAmountError(null);
        setAmount(parsed);
    };

    const getImpactText = () => {
        if (amount >= 250) return t("impact_250");
        if (amount >= 100) return t("impact_100");
        if (amount >= 50) return t("impact_50");
        if (amount >= 25) return t("impact_25");
        return t("impact_default");
    };

    /**
     * Validate before submitting. The previous version returned silently when
     * email or amount was missing, so the button appeared dead.
     */
    const validate = (): boolean => {
        const nextAmountError =
            !Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT
                ? t("amount_invalid", { min: MIN_AMOUNT, max: MAX_AMOUNT })
                : null;
        const nextEmailError = !EMAIL_RE.test(email.trim()) ? t("email_invalid") : null;
        setAmountError(nextAmountError);
        setEmailError(nextEmailError);
        return !nextAmountError && !nextEmailError;
    };

    const handleDonate = async () => {
        if (isLoading) return;
        if (!validate()) return;
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
                    <Label htmlFor="amount" className="sr-only">{t("custom_amount")}</Label>
                    <div className="relative">
                        <span aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">€</span>
                        <Input
                            id="amount"
                            name="amount"
                            type="number"
                            inputMode="decimal"
                            min={MIN_AMOUNT}
                            max={MAX_AMOUNT}
                            step="1"
                            placeholder={t("custom_amount")}
                            value={customAmount}
                            onChange={handleCustomAmount}
                            aria-describedby="donation-impact"
                            aria-invalid={amountError ? true : undefined}
                            className="pl-8 h-12 rounded-xl bg-background/50 border-border/60 focus-visible:ring-primary/20 font-bold"
                        />
                    </div>
                    {amountError && (
                        <p id="amount-error" role="alert" className="text-sm font-medium text-destructive">
                            {amountError}
                        </p>
                    )}

                    <AnimatePresence mode="wait">
                        <motion.div
                            id="donation-impact"
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
                            name="email"
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (emailError) setEmailError(null);
                            }}
                            aria-invalid={emailError ? true : undefined}
                            aria-describedby={emailError ? "email-error" : undefined}
                            className="h-12 rounded-xl"
                        />
                        {emailError && (
                            <p id="email-error" role="alert" className="text-sm font-medium text-destructive">
                                {emailError}
                            </p>
                        )}
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
                        disabled={isLoading}
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