'use client';

import React, { useState } from 'react';
import { Bot, Sparkles, ShieldAlert, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import { generateGrantNarrative, type GrantProposalOutput } from '@/actions/ai-copilot';

/**
 * Honest AI copilot surface (audit Wave 0, item 4).
 * Every output carries provenance and a "requires human review" marker.
 * When the deployment has no provider configured, the server returns the
 * disabled error, which is shown verbatim instead of fake output.
 */
export function AIGrantCopilot() {
    const t = useTranslations('Admin.AiCopilot');
    const [projectName, setProjectName] = useState('');
    const [targetAudience, setTargetAudience] = useState('');
    const [grantAmount, setGrantAmount] = useState('');
    const [funderFocus, setFunderFocus] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [proposal, setProposal] = useState<GrantProposalOutput | null>(null);

    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        const res = await generateGrantNarrative(
            projectName,
            targetAudience,
            Number(grantAmount) || 0,
            funderFocus,
        );
        setIsLoading(false);
        if (res.error) {
            setError(res.error);
            setProposal(null);
            return;
        }
        if (res.data) setProposal(res.data);
    };

    return (
        <Card className="shadow-lg border-border">
            <CardHeader>
                <div className="flex items-center gap-2 text-primary">
                    <Bot className="h-5 w-5" />
                    <CardTitle className="text-lg font-bold">{t('title')}</CardTitle>
                </div>
                <CardDescription>{t('description')}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                        <Label htmlFor="copilot-project" className="text-xs font-medium text-muted-foreground">
                            {t('projectLabel')}
                        </Label>
                        <Input
                            id="copilot-project"
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder={t('projectPlaceholder')}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="copilot-audience" className="text-xs font-medium text-muted-foreground">
                            {t('audienceLabel')}
                        </Label>
                        <Input
                            id="copilot-audience"
                            type="text"
                            value={targetAudience}
                            onChange={(e) => setTargetAudience(e.target.value)}
                            placeholder={t('audiencePlaceholder')}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="copilot-amount" className="text-xs font-medium text-muted-foreground">
                            {t('amountLabel')}
                        </Label>
                        <Input
                            id="copilot-amount"
                            type="number"
                            min="0"
                            value={grantAmount}
                            onChange={(e) => setGrantAmount(e.target.value)}
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label htmlFor="copilot-funder" className="text-xs font-medium text-muted-foreground">
                            {t('funderLabel')}
                        </Label>
                        <Input
                            id="copilot-funder"
                            type="text"
                            value={funderFocus}
                            onChange={(e) => setFunderFocus(e.target.value)}
                            placeholder={t('funderPlaceholder')}
                            className="mt-1"
                        />
                    </div>
                </div>

                <Button size="sm" onClick={handleGenerate} disabled={isLoading} className="w-full">
                    <Sparkles className="mr-2 h-4 w-4" /> {isLoading ? t('generating') : t('generate')}
                </Button>

                {error && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}


                {proposal && (
                    <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300">
                                <ShieldAlert className="mr-1 h-3 w-3" /> {t('reviewRequired')}
                            </Badge>
                            <Badge variant="secondary">
                                {t('providerLabel')}: {proposal.provenance.provider}
                            </Badge>
                            <Badge variant="secondary" className="gap-1">
                                <Clock className="h-3 w-3" /> {t('generatedAtLabel')}: {new Date(proposal.provenance.generatedAt).toLocaleString()}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{t('draftNotice')}</p>
                        <div>
                            <h4 className="text-xs font-bold text-foreground">{t('summaryTitle')}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">{proposal.executiveSummary}</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-foreground">{t('problemTitle')}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">{proposal.problemStatement}</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-foreground">{t('solutionTitle')}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">{proposal.proposedSolution}</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-foreground">{t('impactTitle')}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">{proposal.expectedImpact}</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-foreground">{t('budgetTitle')}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">{proposal.requestedBudget}</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
