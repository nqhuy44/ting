"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUIStore } from "@/store/ui.store";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Transaction, Member, Expense, SettlementReport, Group } from "@/types";
import { toast } from "sonner";
import { Plus, Users, Receipt, PieChart, ArrowLeft, Share2, Copy, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AddMemberModal from "@/components/modals/AddMemberModal";
import AddExpenseModal from "@/components/modals/AddExpenseModal";
import EditMemberModal from "@/components/modals/EditMemberModal";
import TransactionModal from "@/components/modals/TransactionModal";
import DeleteExpenseModal from "@/components/modals/DeleteExpenseModal";
import { motion, AnimatePresence } from "framer-motion";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2, Globe } from "lucide-react";
import { useTranslation } from "@/lib/i18n";



export default function GroupPage() {
    const t = useTranslation();
    const { groupId } = useParams() as { groupId: string };
    const router = useRouter();
    const { passcode, currentGroupId, language, setLanguage } = useUIStore();

    const [showAddMember, setShowAddMember] = useState(false);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [copied, setCopied] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    const handleShare = () => {
        if (!group) return;
        const shareText = `Join my Ting group: ${group.name}\nGroup ID: ${groupId}\nPasscode: ${group.passcode}\nLink: ${window.location.origin}/group/${groupId}`;

        if (navigator.share) {
            navigator.share({
                title: `Ting - ${group.name}`,
                text: shareText,
                url: `${window.location.origin}/group/${groupId}`,
            }).catch(() => {
                navigator.clipboard.writeText(shareText);
                toast.success("Copied to clipboard!");
            });
        } else {
            navigator.clipboard.writeText(shareText);
            toast.success("Copied to clipboard!");
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    useEffect(() => {
        if (typeof window !== "undefined" && (currentGroupId !== groupId || !passcode)) {
            router.push(`/?join=${groupId}`);
        }
    }, [groupId, currentGroupId, passcode, router]);

    const { data: group, isLoading: loadingGroup } = useQuery({
        queryKey: ["group", groupId],
        queryFn: async () => {
            const { data } = await axios.get(`/api/groups/${groupId}`, {
                headers: { "x-passcode": passcode }
            });
            return data as Group;
        },
        enabled: !!groupId && !!passcode,
    });

    const { data: report, isLoading: loadingReport, refetch: refetchReport } = useQuery({
        queryKey: ["report", groupId],
        queryFn: async () => {
            const { data } = await axios.get(`/api/groups/${groupId}/report`, {
                headers: { "x-passcode": passcode }
            });
            return data as { expenses: Expense[], settlement: SettlementReport };
        },
        enabled: !!groupId && !!passcode,
    });

    const { data: members, isLoading: loadingMembers, refetch: refetchMembers } = useQuery({
        queryKey: ["members", groupId],
        queryFn: async () => {
            const { data } = await axios.get(`/api/groups/${groupId}/members`, {
                headers: { "x-passcode": passcode }
            });
            return data as Member[];
        },
        enabled: !!groupId && !!passcode,
    });

    if (!isHydrated || loadingGroup || loadingReport || loadingMembers) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <p className="text-muted-foreground animate-pulse font-heading">{t.common.loading}</p>
            </div>
        );
    }

    if (!group || !report || !members) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center bg-background p-6 text-center gap-4">
                <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
                    <Receipt className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold font-heading">{t.common.error}</h2>
                <p className="text-muted-foreground text-sm max-w-xs text-balance">
                    {t.landing.invalidAuth}
                </p>
                <Button onClick={() => window.location.reload()} className="rounded-full px-8">
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-2xl items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="rounded-full h-10 w-10">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-lg font-heading font-bold max-w-[150px] sm:max-w-none truncate">{group?.name}</h1>
                            <p className="text-[10px] text-muted-foreground font-mono opacity-50 uppercase tracking-tighter">ID: {groupId.slice(0, 8)}...</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex gap-1 mr-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className={`rounded-full h-8 px-3 text-xs font-bold leading-none ${language === 'vi' ? 'bg-primary/20 text-primary border border-primary/20' : 'opacity-40'}`}
                                onClick={() => setLanguage('vi')}
                            >
                                VI
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={`rounded-full h-8 px-3 text-xs font-bold leading-none ${language === 'en' ? 'bg-primary/20 text-primary border border-primary/20' : 'opacity-40'}`}
                                onClick={() => setLanguage('en')}
                            >
                                EN
                            </Button>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">{t.landing.passcode}</span>
                            <span className="text-xl font-heading font-black tracking-[0.2em] text-primary leading-none">{group?.passcode}</span>
                        </div>
                        <Button
                            variant="default"
                            size="icon"
                            onClick={handleShare}
                            className="rounded-full shadow-lg h-10 w-10 bg-primary hover:bg-primary/90 transition-all active:scale-95"
                        >
                            {copied ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>
            </header>


            <main className="mx-auto max-w-2xl p-4">
                <Tabs defaultValue="activity" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 h-14 p-1.5 bg-muted/40 rounded-2xl">
                        <TabsTrigger value="activity" className="rounded-xl data-[state=active]:shadow-md gap-2">
                            <Receipt className="h-4 w-4" />
                            <span className="font-semibold text-xs tracking-tight">{t.group.activity}</span>
                        </TabsTrigger>
                        <TabsTrigger value="people" className="rounded-xl data-[state=active]:shadow-md gap-2">
                            <Users className="h-4 w-4" />
                            <span className="font-semibold text-xs tracking-tight">{t.group.people}</span>
                        </TabsTrigger>
                        <TabsTrigger value="settle" className="rounded-xl data-[state=active]:shadow-md gap-2">
                            <PieChart className="h-4 w-4" />
                            <span className="font-semibold text-xs tracking-tight">{t.group.settle}</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="activity" className="space-y-4 outline-none">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-lg font-semibold font-heading">{t.group.expenses}</h2>
                            <Button size="sm" onClick={() => setShowAddExpense(true)} className="rounded-full gap-2 h-9 px-4 font-bold">
                                <Plus className="h-4 w-4" />
                                {t.common.add}
                            </Button>
                        </div>

                        {!report.expenses || report.expenses.length === 0 ? (
                            <div className="py-20 text-center flex flex-col items-center gap-4 bg-muted/20 rounded-[2rem] border border-dashed border-muted">
                                <Receipt className="h-12 w-12 text-muted-foreground/30" />
                                <p className="text-muted-foreground text-sm font-medium">{t.group.noExpenses}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {report.expenses.map((exp) => (
                                    <Card key={exp.id} className="border-none shadow-sm bg-card hover:translate-y-[-2px] transition-all rounded-2xl">
                                        <CardContent className="px-4 flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center">
                                                    <Receipt className="h-5 w-5 text-primary/60" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">{exp.description}</p>
                                                    <p className="text-[12px] text-muted-foreground capitalize">
                                                        {t.group.paidBy} <span className="font-semibold text-foreground/80">{members?.find((m) => m.id === exp.paidBy)?.name}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="font-bold text-sm">
                                                        {exp.amount.toLocaleString()} <span className="text-[10px] font-normal opacity-60 font-mono">{group?.currency}</span>
                                                    </p>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="rounded-2xl min-w-[120px]">
                                                        <DropdownMenuItem onClick={() => setExpenseToEdit(exp)} className="rounded-lg gap-2 cursor-pointer font-medium py-2">
                                                            <Pencil className="h-4 w-4 text-blue-500" />
                                                            {t.common.edit}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setExpenseToDelete(exp)} className="rounded-lg gap-2 text-red-500 cursor-pointer font-medium py-2">
                                                            <Trash2 className="h-4 w-4" />
                                                            {t.common.delete}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="people" className="space-y-4 outline-none">
                        <div className="flex justify-between items-center px-1">
                            <h2 className="text-lg font-semibold font-heading">{t.group.people}</h2>
                            <Button size="sm" variant="outline" onClick={() => setShowAddMember(true)} className="rounded-full gap-2 h-9 px-4">
                                <Plus className="h-4 w-4" />
                                {t.common.add}
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {members?.map((member) => (
                                <Card
                                    key={member.id}
                                    onClick={() => setSelectedMember(member)}
                                    className="border-none shadow-sm bg-card rounded-2xl hover:ring-2 hover:ring-primary/10 transition-all cursor-pointer"
                                >
                                    <CardContent className="p-4">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary mb-3">
                                            {member.name[0].toUpperCase()}
                                        </div>
                                        <p className="text-sm font-semibold truncate mb-1">{member.name}</p>
                                        <p className="text-[10px] text-muted-foreground truncate opacity-60">
                                            {member.paymentInfo?.bankName || "No bank details"}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="settle" className="space-y-4 outline-none">
                        <h2 className="text-lg font-semibold font-heading px-1">{t.group.payback}</h2>
                        <Card className="border-none shadow-sm bg-primary/5 rounded-[2rem] overflow-hidden">
                            <CardContent className="px-4">
                                {!report?.settlement.plan || report.settlement.plan.length === 0 ? (
                                    <div className="py-10 text-center flex flex-col items-center gap-3">
                                        <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                                            <Check className="h-6 w-6 text-green-600" />
                                        </div>
                                        <p className="text-sm font-semibold">{t.group.everyoneSquare}</p>
                                    </div>
                                ) : (
                                    <ul className="space-y-6">
                                        {report.settlement.plan.map((tx, idx) => (
                                            <li
                                                key={idx}
                                                className="flex items-center justify-between cursor-pointer hover:bg-white/10 p-2 -mx-2 rounded-2xl transition-all"
                                                onClick={() => setSelectedTransaction(tx)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-full bg-background flex items-center justify-center font-bold text-primary shadow-sm ring-1 ring-primary/5 relative">
                                                        {tx.from[0].toUpperCase()}
                                                        {tx.status === 'completed' && (
                                                            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-background">
                                                                <Check className="h-2 w-2 text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-m font-semibold">{tx.from}</p>
                                                            {tx.status === 'completed' && <span className="text-[8px] bg-green-500/20 text-green-600 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter">{t.group.paid}</span>}
                                                        </div>
                                                        <p className="text-[12px] text-muted-foreground flex items-center gap-1">
                                                            {t.group.pays} <span className="font-medium text-foreground/70">{tx.to}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <p className={`font-bold text-lg ${tx.status === 'completed' ? 'text-muted-foreground line-through opacity-50' : 'text-primary'}`}>
                                                    {tx.amount.toLocaleString()} <span className="text-xs font-normal opacity-60 font-mono">{group?.currency}</span>
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>

            <AddMemberModal
                groupId={groupId}
                open={showAddMember}
                onOpenChange={setShowAddMember}
                onSuccess={refetchMembers}
            />
            <AddExpenseModal
                expense={expenseToEdit}
                groupId={groupId}
                members={members || []}
                open={showAddExpense || !!expenseToEdit}
                onOpenChange={(open: boolean) => {
                    if (!open) {
                        setShowAddExpense(false);
                        setExpenseToEdit(null);
                    }
                }}
                onSuccess={refetchReport}
            />
            <DeleteExpenseModal
                groupId={groupId}
                expense={expenseToDelete}
                open={!!expenseToDelete}
                onOpenChange={(open) => !open && setExpenseToDelete(null)}
                onSuccess={refetchReport}
            />
            <EditMemberModal
                groupId={groupId}
                member={selectedMember}
                open={!!selectedMember}
                onOpenChange={(open) => !open && setSelectedMember(null)}
                onSuccess={refetchMembers}
            />
            <TransactionModal
                groupId={groupId}
                transaction={selectedTransaction}
                members={members || []}
                open={!!selectedTransaction}
                onOpenChange={(open) => !open && setSelectedTransaction(null)}
                onSuccess={refetchReport}
            />
        </div >
    );
}

