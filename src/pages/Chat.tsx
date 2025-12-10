import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { evolutionChatService, ChatThread } from "@/services/EvolutionChatService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle, SendHorizonal, Zap, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const Highlight = ({ children }: { children: React.ReactNode }) => (
  <span className="relative inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-primary/15 via-primary/5 to-secondary/10 text-xs font-medium text-primary">
    <Sparkles className="h-3 w-3" />
    {children}
  </span>
);

const ChatPage = () => {
  const [selectedChat, setSelectedChat] = useState<ChatThread | null>(null);
  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: chats = [],
    isLoading: chatsLoading,
    refetch: refetchChats,
  } = useQuery({
    queryKey: ["evolution-chats"],
    queryFn: () => evolutionChatService.listChats(),
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!selectedChat && chats.length > 0) {
      setSelectedChat(chats[0]);
    }
  }, [chats, selectedChat]);

  const filteredChats = useMemo(() => {
    if (!search) {
      return chats;
    }
    const term = search.toLowerCase();
    return chats.filter((chat) =>
      chat.name.toLowerCase().includes(term) ||
      chat.remoteJid.toLowerCase().includes(term) ||
      (chat.leadName && chat.leadName.toLowerCase().includes(term))
    );
  }, [chats, search]);

  const {
    data: messages = [],
    isFetching: messagesLoading,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["evolution-messages", selectedChat?.remoteJid, selectedChat?.instanceName],
    queryFn: () =>
      selectedChat
        ? evolutionChatService.getMessages(selectedChat.remoteJid, selectedChat.instanceName, 80)
        : [],
    enabled: !!selectedChat,
    refetchInterval: 12000,
  });

  const handleSend = async () => {
    if (!selectedChat || !messageText.trim()) {
      return;
    }
    setSending(true);
    await evolutionChatService.sendMessage({
      instanceName: selectedChat.instanceName,
      remoteJid: selectedChat.remoteJid,
      message: messageText.trim(),
    });
    setMessageText("");
    await refetchMessages();
    await refetchChats();
    queryClient.invalidateQueries({ queryKey: ["evolution-chats"] });
    setSending(false);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.08),transparent_25%),radial-gradient(circle_at_50%_80%,rgba(236,72,153,0.07),transparent_30%)] animate-pulse" />
          <CardHeader className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/80 via-primary to-secondary text-primary-foreground grid place-items-center shadow-lg shadow-primary/30 animate-[pulse_4s_ease-in-out_infinite]">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-2xl">Chat WhatsApp</CardTitle>
                  <Highlight>Experiência inspirada no ReactBits</Highlight>
                </div>
                <p className="text-muted-foreground">
                  Acompanhe conversas, envie respostas rápidas e visualize o histórico em tempo real.
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="col-span-1 border-border/80 shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Conversas</CardTitle>
                <Badge variant="secondary" className="gap-1">
                  <Zap className="h-4 w-4 text-primary" />
                  {chats.length}
                </Badge>
              </div>
              <Input
                placeholder="Buscar por nome ou número"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-muted/60 border-border focus-visible:ring-primary"
              />
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[70vh]">
                {chatsLoading ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando chats...
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">Nenhum chat encontrado</div>
                ) : (
                  <div className="space-y-1 px-4 pb-4">
                    {filteredChats.map((chat) => {
                      const lastMessageTime = chat.lastMessageAt
                        ? formatDistanceToNow(new Date(chat.lastMessageAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })
                        : "";
                      const initials = (chat.name || "C").slice(0, 2).toUpperCase();
                      const isActive = selectedChat?.remoteJid === chat.remoteJid;

                      return (
                        <button
                          key={chat.id}
                          onClick={() => setSelectedChat(chat)}
                          className={cn(
                            "w-full text-left rounded-2xl border p-3 transition-all duration-200 bg-card/60 hover:bg-primary/5 hover:border-primary/40",
                            "flex items-start gap-3 shadow-sm",
                            isActive && "border-primary/70 bg-primary/10 shadow-lg shadow-primary/20 scale-[1.01]"
                          )}
                        >
                          <Avatar className="h-10 w-10 bg-primary/10">
                            <AvatarFallback className="bg-transparent text-primary text-sm font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold truncate">{chat.name}</p>
                              {chat.unreadCount > 0 && (
                                <Badge className="bg-primary text-primary-foreground rounded-full">
                                  {chat.unreadCount}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{chat.lastMessage || "Sem mensagens"}</p>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span className="truncate">{chat.leadName || chat.phone || chat.remoteJid}</span>
                              <span>{lastMessageTime}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="col-span-2 border-border/80 shadow-sm">
            <CardHeader className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Histórico</CardTitle>
                {selectedChat && (
                  <Badge variant="outline" className="border-primary/40 text-primary">
                    {selectedChat.instanceName}
                  </Badge>
                )}
              </div>
              {selectedChat && (
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 bg-primary/10">
                    <AvatarFallback className="bg-transparent text-primary font-semibold">
                      {(selectedChat.name || "C").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <p className="text-xl font-semibold leading-none">{selectedChat.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedChat.leadName || selectedChat.remoteJid}
                    </p>
                  </div>
                </div>
              )}
            </CardHeader>
            <Separator />
            <CardContent className="p-0 flex flex-col h-[70vh]">
              {selectedChat ? (
                <>
                  <ScrollArea className="flex-1 px-6 py-4">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando mensagens...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-10">Nenhuma mensagem ainda</div>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((message) => {
                          const timeLabel = formatDistanceToNow(new Date(message.timestamp), {
                            addSuffix: true,
                            locale: ptBR,
                          });
                          const isMine = message.fromMe;
                          return (
                            <div
                              key={message.id}
                              className={cn(
                                "flex w-full",
                                isMine ? "justify-end" : "justify-start"
                              )}
                            >
                              <div
                                className={cn(
                                  "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm transition-all duration-200",
                                  isMine
                                    ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-primary/30"
                                    : "bg-muted/70 text-foreground border border-border"
                                )}
                              >
                                <p className="text-sm leading-relaxed">{message.content}</p>
                                <span className="text-[11px] text-primary-foreground/80 block mt-1">
                                  {timeLabel}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                  <div className="border-t border-border/80 p-4 bg-card/60 backdrop-blur">
                    <div className="flex items-center gap-3">
                      <Input
                        placeholder="Digite sua resposta..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        className="bg-muted/60 border-border focus-visible:ring-primary"
                      />
                      <Button
                        onClick={handleSend}
                        disabled={sending || !messageText.trim()}
                        className="gap-2"
                      >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
                        Enviar
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-3">
                  <MessageCircle className="h-8 w-8" />
                  <p>Selecione um chat para visualizar o histórico</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ChatPage;

