"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useUIStore } from "@/store/ui.store";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { Globe } from "lucide-react";
import packageJson from "../../package.json";

export default function LandingPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
            <LandingPageContent />
        </Suspense>
    );
}

function LandingPageContent() {
    const t = useTranslation();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("join");
    const [joinGroupId, setJoinGroupId] = useState("");
    const { setCurrentGroupId, setPasscode, language, setLanguage } = useUIStore();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const join = searchParams.get("join");
        if (join) {
            setJoinGroupId(join);
            setActiveTab("join");
        }
    }, [searchParams]);

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;
        const currency = formData.get("currency") as string;

        try {
            const { data } = await axios.post("/api/groups", { name, currency });
            setCurrentGroupId(data.id);
            setPasscode(data.passcode);
            toast.success(t.common.success, {
                description: `${t.landing.creating} ${data.passcode}.`,
            });
            router.push(`/group/${data.id}`);
        } catch (error: any) {
            toast.error(t.common.error, {
                description: error.response?.data?.error || t.landing.failedAdd,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);
        const id = formData.get("id") as string;
        const code = formData.get("passcode") as string;

        try {
            const { data } = await axios.get(`/api/groups/${id}`, {
                headers: { "x-passcode": code }
            });
            setCurrentGroupId(data.id);
            setPasscode(data.passcode || code);
            router.push(`/group/${data.id}`);
        } catch (error: any) {
            toast.error(t.landing.authFailed, {
                description: error.response?.data?.error || t.landing.invalidAuth,
            });
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="flex min-h-dvh flex-col bg-background p-4">
            <div className="flex-1 flex flex-col items-center justify-center w-full">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    <div className="mb-8 text-center relative">
                        <div className="absolute top-0 right-0 flex gap-2">
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
                        <h1 className="text-4xl font-heading font-bold tracking-tight text-primary">{t.landing.title}</h1>
                        <p className="text-muted-foreground">{t.landing.subtitle}</p>
                    </div>

                    <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <CardHeader>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="join">{t.landing.joinGroup}</TabsTrigger>
                                    <TabsTrigger value="create">{t.landing.newGroup}</TabsTrigger>
                                </TabsList>
                            </CardHeader>

                            <TabsContent value="join">
                                <form onSubmit={handleJoin}>
                                    <CardContent className="space-y-4 pt-4 pb-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="id">{t.landing.groupId}</Label>
                                            <Input
                                                id="id"
                                                name="id"
                                                value={joinGroupId}
                                                onChange={(e) => setJoinGroupId(e.target.value)}
                                                placeholder={t.landing.groupIdPlaceholder}
                                                required
                                                className="bg-background/50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="passcode">{t.landing.passcode}</Label>
                                            <Input
                                                id="passcode"
                                                name="passcode"
                                                type="text"
                                                inputMode="numeric"
                                                pattern="\d{4}"
                                                maxLength={4}
                                                placeholder={t.landing.passcodePlaceholder}
                                                required
                                                className="bg-background/50 font-mono tracking-widest"
                                            />
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button type="submit" className="w-full font-semibold" disabled={loading}>
                                            {loading ? t.landing.verifying : t.landing.enterGroup}
                                        </Button>
                                    </CardFooter>
                                </form>
                            </TabsContent>

                            <TabsContent value="create">
                                <form onSubmit={handleCreate}>
                                    <CardContent className="space-y-4 pt-4 pb-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">{t.landing.groupName}</Label>
                                            <Input id="name" name="name" placeholder={t.landing.groupNamePlaceholder} required className="bg-background/50" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="currency">{t.landing.baseCurrency}</Label>
                                            <Input id="currency" name="currency" defaultValue="VND" required className="bg-background/50" />
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button type="submit" className="w-full font-semibold" disabled={loading}>
                                            {loading ? t.landing.creating : t.landing.createGroup}
                                        </Button>
                                    </CardFooter>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </Card>
                </motion.div>
            </div>

            <footer className="py-6 text-center opacity-50">
                <p className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">
                    ting • v{packageJson.version}
                </p>
            </footer>
        </div>
    );
}
