import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatWidget() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["chat-messages"],
    queryFn: async () => {
      const { data } = await supabase.from("chat_messages").select("*").eq("channel", "general").order("created_at", { ascending: true }).limit(100);
      return data || [];
    },
  });

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("chat-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!message.trim() || !user) return;
      const { error } = await supabase.from("chat_messages").insert({
        sender_id: user.id,
        sender_name: user.email?.split("@")[0] || "User",
        message: message.trim(),
        channel: "general",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
    },
  });

  const handleSend = () => {
    if (message.trim()) sendMutation.mutate();
  };

  const timeStr = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all",
          "bg-primary text-primary-foreground hover:scale-105"
        )}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 h-[450px] rounded-xl border bg-background shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b bg-primary text-primary-foreground">
            <h4 className="font-semibold text-sm">Team Chat</h4>
            <p className="text-xs opacity-80">General channel</p>
          </div>

          <ScrollArea className="flex-1 p-3" ref={scrollRef as any}>
            <div className="space-y-3">
              {messages.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-8">No messages yet. Start the conversation!</p>
              )}
              {messages.map((msg: any) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                    <span className="text-[10px] text-muted-foreground mb-0.5 px-1">
                      {isMe ? "You" : msg.sender_name} · {timeStr(msg.created_at)}
                    </span>
                    <div className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                      isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      {msg.message}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="p-3 border-t flex gap-2">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="text-sm"
            />
            <Button size="icon" onClick={handleSend} disabled={!message.trim() || sendMutation.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
