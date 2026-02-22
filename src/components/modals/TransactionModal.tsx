"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Transaction, Member } from "@/types";
import { CheckCircle2, QrCode, CreditCard, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import { useTranslation } from "@/lib/i18n";
import { useUIStore } from "@/store/ui.store";

export default function TransactionModal({
    groupId,
    transaction,
    members,
    open,
    onOpenChange,
    onSuccess,
}: {
    groupId: string;
    transaction: Transaction | null;
    members: Member[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const t = useTranslation();
    const { passcode } = useUIStore();
    const [loading, setLoading] = useState(false);
    if (!transaction) return null;

    const toMember = members.find(m => m.id === transaction.toId);
    const isCompleted = transaction.status === 'completed';

    const handleMarkAsPaid = async () => {
        setLoading(true);
        try {
            await axios.post(`/api/groups/${groupId}/settlements/${transaction.id}/complete`, {}, {
                headers: { "x-passcode": passcode }
            });
            toast.success(t.common.success);
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(t.common.error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-3xl overflow-hidden p-0 border-none shadow-2xl">
                <div className="bg-primary/5 p-6 pb-20 relative">
                    <DialogHeader className="items-center text-center">
                        <DialogTitle className="text-2xl font-extrabold tracking-tight">{t.group.payback}</DialogTitle>
                        <DialogDescription className="text-primary/60 font-medium">
                            {t.transaction.payer
                                .replace("{name}", transaction.from)
                                .replace("{to}", transaction.to)}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-6 text-center">
                        <p className="text-4xl font-extrabold font-heading text-primary">
                            {transaction.amount.toLocaleString()} <span className="text-sm font-mono opacity-50 font-normal">VND</span>
                        </p>
                    </div>

                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 h-20 w-20 rounded-full bg-background flex items-center justify-center shadow-lg border-4 border-background">
                        {isCompleted ? <CheckCircle2 className="h-10 w-10 text-green-500" /> : <CreditCard className="h-10 w-10 text-primary/40" />}
                    </div>
                </div>

                <div className="p-6 pt-14 space-y-6">
                    {toMember?.paymentInfo ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-3">
                                <div className="p-4 rounded-2xl bg-muted/30 border border-muted flex flex-col items-center">
                                    <span className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{t.member.bankName}</span>
                                    <p className="font-bold text-sm">{toMember.paymentInfo.bankName || t.group.noBankDetails}</p>
                                    <p className="font-mono text-lg tracking-wider text-primary">{toMember.paymentInfo.accountNumber || "—"}</p>
                                    <p className="text-xs opacity-60 uppercase font-medium">{toMember.paymentInfo.accountName}</p>
                                </div>

                                {toMember.paymentInfo.qrCode && (
                                    <div className="p-4 rounded-2xl bg-muted/30 border border-muted flex flex-col items-center">
                                        <span className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Scan to Pay</span>
                                        <img src={toMember.paymentInfo.qrCode} alt="QR Code" className="h-40 w-40 object-contain rounded-lg shadow-sm bg-white p-2" />
                                    </div>
                                )}
                            </div>

                            {toMember.paymentInfo.note && (
                                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    <p className="text-xs text-primary/80 italic">Note: {toMember.paymentInfo.note}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-10 text-center opacity-40 italic text-sm">
                            <QrCode className="h-12 w-12 mx-auto mb-3" />
                            <p>No payment information provided by {transaction.to}</p>
                        </div>
                    )}

                    <DialogFooter className="flex-col sm:flex-col gap-3">
                        {!isCompleted ? (
                            <div className="space-y-3 w-full">
                                <Button
                                    onClick={handleMarkAsPaid}
                                    className="w-full rounded-2xl h-12 font-bold shadow-lg shadow-primary/20"
                                    disabled={loading}
                                >
                                    {loading ? t.common.loading : t.transaction.markAsPaid}
                                </Button>
                                <p className="text-[10px] text-center text-muted-foreground px-4 italic">
                                    {t.transaction.warning}
                                </p>
                            </div>
                        ) : (
                            <div className="w-full p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-center">
                                <p className="text-green-600 font-bold flex items-center justify-center gap-2">
                                    <CheckCircle2 className="h-4 w-4" /> {t.group.paid} {new Date(transaction.paidAt!).toLocaleString()}
                                </p>
                            </div>
                        )}
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
