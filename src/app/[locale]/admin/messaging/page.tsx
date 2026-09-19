import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getConversations } from "@/actions/messaging";
import { Plus, MessageSquare, FolderKanban, Megaphone, Users, Sparkles } from "lucide-react";
import { Link } from "@/lib/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export default async function MessagingPage() {
    const { data: conversations } = await getConversations();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Smart Program Messaging & Announcements"
                description="Organized communications automatically grouped around Projects, Campaigns, Departments, and Direct Messages with AI Summaries."
                action={
                    <Button asChild className="gap-2">
                        <Link href="/admin/messaging/new">
                            <Plus className="h-4 w-4" />
                            New Thread
                        </Link>
                    </Button>
                }
            />

            <Tabs defaultValue="programs" className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-auto">
                    <TabsTrigger value="programs" className="gap-2">
                        <FolderKanban className="h-4 w-4 text-indigo-500" />
                        Program Channels
                    </TabsTrigger>
                    <TabsTrigger value="campaigns" className="gap-2">
                        <Megaphone className="h-4 w-4 text-rose-500" />
                        Campaign Channels
                    </TabsTrigger>
                    <TabsTrigger value="departments" className="gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        Department Groups
                    </TabsTrigger>
                    <TabsTrigger value="direct">Direct Messages</TabsTrigger>
                </TabsList>

                <TabsContent value="programs" className="pt-4">
                    <div className="rounded-lg border bg-card p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="space-y-1">
                                <span className="font-semibold text-sm flex items-center gap-2">
                                    <FolderKanban className="h-4 w-4 text-indigo-500" /> Clean Water Access Project Channel
                                </span>
                                <p className="text-xs text-muted-foreground">Field team updates, logistics questions, and weekly field reports.</p>
                            </div>
                            <Badge variant="secondary" className="gap-1 text-[11px]">
                                <Sparkles className="h-3 w-3 text-purple-500" /> AI Summary Active
                            </Badge>
                        </div>

                        <div className="flex items-center justify-between border-b pb-3">
                            <div className="space-y-1">
                                <span className="font-semibold text-sm flex items-center gap-2">
                                    <FolderKanban className="h-4 w-4 text-indigo-500" /> Solar School Electrification Channel
                                </span>
                                <p className="text-xs text-muted-foreground">Equipment delivery timelines and volunteer schedule alignment.</p>
                            </div>
                            <Badge variant="outline" className="text-[11px]">Active</Badge>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="campaigns" className="pt-4">
                    <div className="rounded-lg border bg-card p-6">
                        <p className="text-xs text-muted-foreground">Campaign-specific discussion channels are organized automatically when a campaign launches.</p>
                    </div>
                </TabsContent>

                <TabsContent value="departments" className="pt-4">
                    <div className="rounded-lg border bg-card p-6">
                        <p className="text-xs text-muted-foreground">Department channels (Finance, HR, Field Ops, Executive Director Office).</p>
                    </div>
                </TabsContent>

                <TabsContent value="direct" className="pt-4">
                    <div className="rounded-lg border bg-card p-6">
                        {(!conversations || conversations.length === 0) ? (
                            <div className="text-center py-6 text-muted-foreground text-sm space-y-2">
                                <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50" />
                                <p>No direct conversations found.</p>
                            </div>
                        ) : (
                            <div className="divide-y space-y-3">
                                {conversations.map((c) => (
                                    <div key={c.id} className="pt-3 first:pt-0 flex justify-between items-center">
                                        <div>
                                            <span className="font-semibold text-sm">{c.title || "Direct Thread"}</span>
                                            <p className="text-xs text-muted-foreground">{c.last_message_preview || "No messages yet"}</p>
                                        </div>
                                        <span className="text-[11px] text-muted-foreground">
                                            {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString() : ""}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
