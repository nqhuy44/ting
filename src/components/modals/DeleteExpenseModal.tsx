"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Expense } from "@/types";
import { useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import { Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useUIStore } from "@/store/ui.store";

export default function DeleteExpenseModal({
    groupId,
    expense,
    open,
    onOpenChange,
    onSuccess,
}: {
    groupId: string;
    expense: Expense | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const t = useTranslation();
    const { passcode } = useUIStore();
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (!expense) return;
        setLoading(true);
        try {
            await axios.delete(`/api/groups/${groupId}/expenses/${expense.id}`, {
                headers: { "x-passcode": passcode }
            });
            toast.success(t.common.success);
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(t.expense.failedUpdate);
        } finally {
            setLoading(false);
        }
    };

    if (!expense) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md rounded-3xl">
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <Trash2 className="h-6 w-6 text-red-600" />
                    </div>
                    <DialogTitle className="text-center font-heading">{t.expense.deleteConfirm}</DialogTitle>
                    <DialogDescription className="text-center">
                        {t.expense.deleteDesc.replace("{description}", expense.description)}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-col sm:flex-col gap-2 pt-4">
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        className="w-full rounded-xl h-11 font-bold"
                        disabled={loading}
                    >
                        {loading ? t.common.loading : t.expense.yesDelete}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="w-full rounded-xl h-11 font-medium"
                        disabled={loading}
                    >
                        {t.common.cancel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
