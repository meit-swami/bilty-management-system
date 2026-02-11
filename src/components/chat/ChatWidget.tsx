import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence } from "@/hooks/use-presence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, X, Send, Paperclip, Mic, MicOff, ArrowLeft, FileText, Image as ImageIcon, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type ChatView = "users" | "conversation";

interface ChatUser {
  user_id: string;
  user_name: string;
  user_email: string | null;
  is_online: boolean;
  last_seen: string;
}

export function ChatWidget() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { users } = usePresence();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ChatView>("users");
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Build channel key for DMs
  const getConversationChannel = useCallback((otherUserId: string) => {
    if (!user) return "";
    const ids = [user.id, otherUserId].sort();
    return `dm_${ids[0]}_${ids[1]}`;
  }, [user]);

  const activeChannel = selectedUser ? getConversationChannel(selectedUser.user_id) : "general";

  // Fetch messages for current conversation
  const { data: messages = [] } = useQuery({
    queryKey: ["chat-messages", activeChannel],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase.from("chat_messages").select("*").order("created_at", { ascending: true }).limit(200);
      
      if (selectedUser) {
        // DM: messages between me and selected user
        query = query.eq("channel", activeChannel);
      } else {
        query = query.eq("channel", "general");
      }
      
      const { data } = await query;
      return data || [];
    },
    enabled: !!user && (view === "conversation" || !selectedUser),
  });

  // Realtime for messages
  useEffect(() => {
    const channel = supabase
      .channel("chat-realtime-enhanced")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Auto-scroll
  useEffect(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        const viewport = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
        if (viewport) viewport.scrollTop = viewport.scrollHeight;
      }
    }, 100);
  }, [messages, view]);

  // Send text message
  const sendMutation = useMutation({
    mutationFn: async (opts?: { attachmentUrl?: string; attachmentType?: string; attachmentName?: string }) => {
      if (!user) return;
      const text = message.trim();
      if (!text && !opts?.attachmentUrl) return;

      const payload: any = {
        sender_id: user.id,
        sender_name: user.email?.split("@")[0] || "User",
        message: text || (opts?.attachmentName || "Attachment"),
        channel: activeChannel,
        recipient_id: selectedUser?.user_id || null,
        attachment_url: opts?.attachmentUrl || null,
        attachment_type: opts?.attachmentType || null,
        attachment_name: opts?.attachmentName || null,
      };

      const { error } = await supabase.from("chat_messages").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
    },
  });

  const handleSend = () => {
    if (message.trim()) sendMutation.mutate({});
  };

  // File upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("chat-attachments").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }

    const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
    
    let attachmentType = "file";
    if (file.type.startsWith("image/")) attachmentType = "image";
    else if (file.type === "application/pdf") attachmentType = "pdf";
    else if (file.type.includes("word") || file.name.endsWith(".doc") || file.name.endsWith(".docx")) attachmentType = "document";
    else if (file.type.startsWith("audio/")) attachmentType = "voice";

    sendMutation.mutate({
      attachmentUrl: urlData.publicUrl,
      attachmentType,
      attachmentName: file.name,
    });

    e.target.value = "";
  };

  // Voice recording
  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const path = `${user!.id}/${Date.now()}.webm`;
        const { error } = await supabase.storage.from("chat-attachments").upload(path, blob);
        if (error) {
          toast({ title: "Upload failed", description: error.message, variant: "destructive" });
          return;
        }
        const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(path);
        sendMutation.mutate({
          attachmentUrl: urlData.publicUrl,
          attachmentType: "voice",
          attachmentName: "Voice Note",
        });
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  };

  const selectUser = (u: ChatUser) => {
    setSelectedUser(u);
    setView("conversation");
  };

  const goBack = () => {
    setView("users");
    setSelectedUser(null);
  };

  const timeStr = (date: string) => new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = (date: string) => new Date(date).toLocaleDateString([], { month: "short", day: "numeric" });

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  const getFileIcon = (type: string | null) => {
    if (type === "image") return <ImageIcon className="h-4 w-4" />;
    if (type === "pdf") return <FileText className="h-4 w-4" />;
    if (type === "document") return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const renderAttachment = (msg: any) => {
    if (!msg.attachment_url) return null;
    if (msg.attachment_type === "image") {
      return (
        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
          <img src={msg.attachment_url} alt={msg.attachment_name} className="max-w-[200px] rounded-md mt-1" />
        </a>
      );
    }
    if (msg.attachment_type === "voice") {
      return <audio controls src={msg.attachment_url} className="mt-1 max-w-full" />;
    }
    return (
      <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 mt-1 text-xs underline opacity-80 hover:opacity-100">
        {getFileIcon(msg.attachment_type)} {msg.attachment_name}
      </a>
    );
  };

  // Group messages by date
  const groupedMessages: { date: string; msgs: any[] }[] = [];
  messages.forEach((msg: any) => {
    const d = dateStr(msg.created_at);
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === d) last.msgs.push(msg);
    else groupedMessages.push({ date: d, msgs: [msg] });
  });

  const otherUsers = users.filter((u: ChatUser) => u.user_id !== user?.id);

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
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 h-[500px] rounded-xl border bg-background shadow-2xl flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="px-4 py-3 border-b bg-primary text-primary-foreground flex items-center gap-2">
            {view === "conversation" && (
              <button onClick={goBack} className="hover:opacity-80">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div className="flex-1">
              {view === "users" ? (
                <>
                  <h4 className="font-semibold text-sm">Team Chat</h4>
                  <p className="text-xs opacity-80">{otherUsers.filter((u: ChatUser) => u.is_online).length} online</p>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px] bg-primary-foreground/20 text-primary-foreground">
                        {getInitials(selectedUser?.user_name || "?")}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn("absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-primary", selectedUser?.is_online ? "bg-green-400" : "bg-muted-foreground/50")} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{selectedUser?.user_name}</h4>
                    <p className="text-[10px] opacity-80">{selectedUser?.is_online ? "Online" : "Offline"}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* User List View */}
          {view === "users" && (
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {/* General channel */}
                <button
                  onClick={() => { setSelectedUser(null); setView("conversation"); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">General Channel</p>
                    <p className="text-[10px] text-muted-foreground">Team-wide messages</p>
                  </div>
                </button>

                <div className="px-3 py-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Direct Messages</p>
                </div>

                {otherUsers.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-4">No other users online yet</p>
                )}

                {otherUsers.map((u: ChatUser) => (
                  <button
                    key={u.user_id}
                    onClick={() => selectUser(u)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs">{getInitials(u.user_name)}</AvatarFallback>
                      </Avatar>
                      <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background", u.is_online ? "bg-green-500" : "bg-muted-foreground/40")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.user_name}</p>
                      <p className="text-[10px] text-muted-foreground">{u.is_online ? "Online" : `Last seen ${timeStr(u.last_seen)}`}</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Conversation View */}
          {view === "conversation" && (
            <>
              <ScrollArea className="flex-1 p-3" ref={scrollRef}>
                <div className="space-y-1">
                  {messages.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-8">No messages yet. Start the conversation!</p>
                  )}
                  {groupedMessages.map((group) => (
                    <div key={group.date}>
                      <div className="flex items-center gap-2 my-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[9px] text-muted-foreground font-medium">{group.date}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      {group.msgs.map((msg: any) => {
                        const isMe = msg.sender_id === user?.id;
                        return (
                          <div key={msg.id} className={cn("flex flex-col mb-2", isMe ? "items-end" : "items-start")}>
                            <span className="text-[10px] text-muted-foreground mb-0.5 px-1">
                              {isMe ? "You" : msg.sender_name} · {timeStr(msg.created_at)}
                            </span>
                            <div className={cn(
                              "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                              isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                            )}>
                              {!msg.attachment_url && msg.message}
                              {msg.attachment_url && msg.message !== msg.attachment_name && msg.message !== "Attachment" && (
                                <p>{msg.message}</p>
                              )}
                              {renderAttachment(msg)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Input area */}
              <div className="p-3 border-t flex items-center gap-1.5">
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,audio/*" onChange={handleFileSelect} />
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className={cn("h-8 w-8 shrink-0", isRecording && "text-red-500")} onClick={toggleRecording}>
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="text-sm h-8"
                />
                <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSend} disabled={!message.trim() || sendMutation.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
