"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";
import { Member, Expense } from "@/types";
import { useTranslation } from "@/lib/i18n";
import { useUIStore } from "@/store/ui.store";

export default function AddExpenseModal({
    expense,
    groupId,
    members,
    open,
    onOpenChange,
    onSuccess,
}: {
    expense?: Expense | null;
    groupId: string;
    members: Member[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const t = useTranslation();
    const { passcode } = useUIStore();
    const [loading, setLoading] = useState(false);
    const [selectedSharers, setSelectedSharers] = useState<string[]>([]);
    const [displayAmount, setDisplayAmount] = useState("");
    const [description, setDescription] = useState("");
    const [paidBy, setPaidBy] = useState("");

    useEffect(() => {
        if (open) {
            if (expense) {
                setDescription(expense.description);
                setDisplayAmount(new Intl.NumberFormat("de-DE").format(expense.amount));
                setPaidBy(expense.paidBy);
                setSelectedSharers(expense.sharedBy);
            } else {
                setDescription("");
                setDisplayAmount("");
                setPaidBy(members[0]?.id || "");
                setSelectedSharers(members.map((m) => m.id));
            }
        }
    }, [open, members, expense]);

    const toggleSharer = (id: string) => {
        setSelectedSharers((prev) =>
            prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
        );
    };

    const formatNumber = (val: string) => {
        const num = val.replace(/\D/g, "");
        if (!num) return "";
        return new Intl.NumberFormat("de-DE").format(parseInt(num));
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value;
        setDisplayAmount(formatNumber(rawValue));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (selectedSharers.length === 0) {
            toast.error(t.expense.sharedBy + " " + t.common.required);
            return;
        }

        setLoading(true);
        const amount = displayAmount.replace(/\./g, "");

        try {
            if (expense) {
                await axios.put(`/api/groups/${groupId}/expenses/${expense.id}`, {
                    description,
                    amount,
                    paidBy,
                    sharedBy: selectedSharers,
                    currency: "VND",
                }, {
                    headers: { "x-passcode": passcode }
                });
                toast.success(t.expense.expenseUpdated);
            } else {
                await axios.post(`/api/groups/${groupId}/expenses`, {
                    description,
                    amount,
                    paidBy,
                    sharedBy: selectedSharers,
                    currency: "VND",
                }, {
                    headers: { "x-passcode": passcode }
                });
                toast.success(t.expense.expenseAdded);
            }
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(expense ? t.expense.failedUpdate : t.expense.failedAdd);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-heading">{expense ? t.expense.editExpense : t.expense.addExpense}</DialogTitle>
                    <DialogDescription>
                        {expense ? t.expense.modifyDetails : t.expense.whatFor}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="description">{t.expense.desc}</Label>
                        <Input
                            id="description"
                            name="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Lunch at KFC"
                            required
                            className="rounded-xl"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="amount">{t.expense.amount}</Label>
                        <Input
                            id="amount"
                            name="amount"
                            value={displayAmount}
                            onChange={handleAmountChange}
                            inputMode="numeric"
                            placeholder="0"
                            required
                            className="rounded-xl font-mono text-lg"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="paidBy">{t.expense.paidBy}</Label>
                        <select
                            id="paidBy"
                            name="paidBy"
                            value={paidBy}
                            onChange={(e) => setPaidBy(e.target.value)}
                            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            required
                        >
                            {members.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label>{t.expense.sharedBy}</Label>
                        <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-1 border rounded-xl bg-muted/20">
                            {members.map((m) => (
                                <div key={m.id} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        id={`sharer-${m.id}`}
                                        checked={selectedSharers.includes(m.id)}
                                        onChange={() => toggleSharer(m.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <label htmlFor={`sharer-${m.id}`} className="text-sm truncate">
                                        {m.name}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                            {loading ? t.common.saving : expense ? t.expense.updateExpense : t.expense.saveExpense}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
