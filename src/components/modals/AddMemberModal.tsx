"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";
import { useTranslation } from "@/lib/i18n";
import { useUIStore } from "@/store/ui.store";

export default function AddMemberModal({
    groupId,
    open,
    onOpenChange,
    onSuccess,
}: {
    groupId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}) {
    const t = useTranslation();
    const { passcode } = useUIStore();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;

        try {
            await axios.post(`/api/groups/${groupId}/members`, { name }, {
                headers: { "x-passcode": passcode }
            });
            toast.success(t.member.memberAdded);
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
            <DialogContent className="sm:max-w-md rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="font-heading">{t.member.addMember}</DialogTitle>
                    <DialogDescription>
                        {t.member.addMemberBtn}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="memberName">{t.member.name}</Label>
                        <Input id="memberName" name="name" placeholder="John Doe" required className="rounded-xl" />
                    </div>
                    <DialogFooter>
                        <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                            {loading ? t.common.loading : t.member.addMemberBtn}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
