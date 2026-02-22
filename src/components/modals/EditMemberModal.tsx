"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";
import { Member, PaymentInfo } from "@/types";
import { useTranslation } from "@/lib/i18n";
import { useUIStore } from "@/store/ui.store";

export default function EditMemberModal({
    groupId,
    member,
    open,
    onOpenChange,
    onSuccess,
}: {
    groupId: string;
    member: Member | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const t = useTranslation();
    const { passcode } = useUIStore();
    const [loading, setLoading] = useState(false);
    const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
        bankName: "",
        accountName: "",
        accountNumber: "",
        qrCode: "",
        note: "",
    });

    useEffect(() => {
        if (member?.paymentInfo) {
            setPaymentInfo(member.paymentInfo);
        } else {
            setPaymentInfo({
                bankName: "",
                accountName: "",
                accountNumber: "",
                qrCode: member?.paymentInfo?.qrCode || "",
                note: "",
            });
        }
    }, [member]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPaymentInfo({ ...paymentInfo, qrCode: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!member) return;

        setLoading(true);
        try {
            await axios.put(`/api/groups/${groupId}/members/${member.id}`, { paymentInfo }, {
                headers: { "x-passcode": passcode }
            });
            toast.success("Payment info updated!");
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error("Failed to update payment info");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="font-heading">Edit {member?.name}</DialogTitle>
                    <DialogDescription>
                        Update payment information for this member.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="bankName">Bank Name / App</Label>
                        <Input
                            id="bankName"
                            value={paymentInfo.bankName}
                            onChange={(e) => setPaymentInfo({ ...paymentInfo, bankName: e.target.value })}
                            placeholder="Vietcombank, MoMo, etc."
                            className="rounded-xl"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="accountName">{t.member.accountName}</Label>
                        <Input
                            id="accountName"
                            value={paymentInfo.accountName}
                            onChange={(e) => setPaymentInfo({ ...paymentInfo, accountName: e.target.value })}
                            placeholder="NGUYEN VAN A"
                            className="rounded-xl"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="accountNumber">Account Number</Label>
                        <Input
                            id="accountNumber"
                            value={paymentInfo.accountNumber}
                            onChange={(e) => setPaymentInfo({ ...paymentInfo, accountNumber: e.target.value })}
                            placeholder="0123456789"
                            className="rounded-xl"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Payment QR Code</Label>
                        <div className="flex flex-col items-center gap-3 p-4 border-2 border-dashed rounded-2xl bg-muted/30">
                            {paymentInfo.qrCode ? (
                                <div className="relative group">
                                    <img src={paymentInfo.qrCode} alt="QR Code" className="h-32 w-32 object-contain rounded-lg" />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => setPaymentInfo({ ...paymentInfo, qrCode: "" })}
                                    >
                                        ×
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground mb-2">Upload your bank QR code</p>
                                </div>
                            )}
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                                id="qr-upload"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => document.getElementById('qr-upload')?.click()}
                                className="rounded-xl w-full"
                            >
                                {paymentInfo.qrCode ? "Change QR Code" : "Upload QR Code"}
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="note">Transfer Note</Label>
                        <Input
                            id="note"
                            value={paymentInfo.note}
                            onChange={(e) => setPaymentInfo({ ...paymentInfo, note: e.target.value })}
                            placeholder="Ting Ting"
                            className="rounded-xl"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                            {loading ? "Updating..." : "Update Details"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
