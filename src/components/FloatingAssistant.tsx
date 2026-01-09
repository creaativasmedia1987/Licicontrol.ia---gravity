import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, Bot, User, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
    role: "user" | "assistant";
    content: string;
}

export default function FloatingAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: "Olá! Sou a assistente IA da Licicontrol. Sou especialista em licitações e controle interno. Como posso ajudar você hoje?",
        },
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke("ai-assistant", {
                body: { messages: [...messages, userMessage] },
            });

            if (error) throw error;

            const assistantMessage: Message = {
                role: "assistant",
                content: data.choices[0].message.content,
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error: any) {
            console.error("Error calling AI assistant:", error);
            toast({
                title: "Erro na IA",
                description: "Não foi possível obter resposta da assistente. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(true); // Wait a bit for UI feeling
            setTimeout(() => setIsLoading(false), 300);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        size="icon"
                        className="h-14 w-14 rounded-full shadow-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 hover:scale-110 transition-transform duration-300 border-2 border-white/20"
                    >
                        {isOpen ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    side="top"
                    align="end"
                    className="w-[380px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl animate-in slide-in-from-bottom-2"
                >
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-500 p-4 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-2 rounded-lg">
                                <Bot className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">Assistente Licicontrol</h3>
                                <p className="text-[10px] opacity-80">Especialista em Licitações & Gestão</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/10 h-8 w-8"
                            onClick={() => setIsOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <ScrollArea className="h-[400px] bg-slate-50 p-4">
                        <div className="space-y-4" ref={scrollRef}>
                            {messages.map((m, i) => (
                                <div
                                    key={i}
                                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${m.role === "user"
                                                ? "bg-indigo-600 text-white rounded-tr-none"
                                                : "bg-white text-slate-800 rounded-tl-none border border-slate-200"
                                            }`}
                                    >
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white text-slate-800 rounded-2xl rounded-tl-none border border-slate-200 px-4 py-2 shadow-sm animate-pulse">
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <div className="p-3 bg-white border-t flex gap-2">
                        <Input
                            placeholder="Tire sua dúvida sobre o sistema ou legislação..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            className="rounded-xl border-slate-200 focus-visible:ring-indigo-500"
                        />
                        <Button
                            size="icon"
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 rounded-xl shrink-0"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
