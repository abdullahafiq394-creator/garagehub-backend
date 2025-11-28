import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/contexts/SocketContext";
import { Send, ArrowLeft, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ChatThread {
  workshopId: string;
  workshopName: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount?: number;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  imageUrl?: string;
  createdAt: Date;
}

interface SupplierChatPanelProps {
  supplierId: string;
  userId: string;
}

export default function SupplierChatPanel({ supplierId, userId }: SupplierChatPanelProps) {
  const { toast } = useToast();
  const { socket, isConnected } = useSocket();
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string | null>(null);
  const [composeValue, setComposeValue] = useState("");

  const { data: threads = [], isLoading: loadingThreads } = useQuery<ChatThread[]>({
    queryKey: ['/api/marketplace/chat/threads'],
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery<ChatMessage[]>({
    queryKey: ['/api/marketplace/chat/messages', selectedWorkshopId],
    queryFn: async () => {
      if (!selectedWorkshopId) return [];
      const res = await fetch(`/api/marketplace/chat/messages/${selectedWorkshopId}`);
      return res.json();
    },
    enabled: !!selectedWorkshopId,
    placeholderData: [],
  });

  // Socket.IO real-time message listener
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewMessage = (newMessage: ChatMessage) => {
      console.log("[SupplierChat] New message received:", newMessage);
      
      // Invalidate queries to refetch threads and messages
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/chat/threads'] });
      
      // If the message is for the currently selected conversation, refetch messages
      if (selectedWorkshopId) {
        queryClient.invalidateQueries({ queryKey: ['/api/marketplace/chat/messages', selectedWorkshopId] });
      }
    };

    socket.on("chat.new_message", handleNewMessage);

    return () => {
      socket.off("chat.new_message", handleNewMessage);
    };
  }, [socket, isConnected, selectedWorkshopId]);

  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      return apiRequest('POST', `/api/marketplace/chat/workshops/${selectedWorkshopId}/messages`, {
        message: messageText,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/chat/messages', selectedWorkshopId] });
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/chat/threads'] });
      setComposeValue("");
      toast({ title: "Success", description: "Message sent successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    },
  });

  const handleSendMessage = () => {
    if (!composeValue.trim()) return;
    sendMessageMutation.mutate(composeValue);
  };

  const selectedThread = threads.find(t => t.workshopId === selectedWorkshopId);

  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-16rem)]">
      <Card className={`${selectedWorkshopId ? 'hidden md:block' : ''}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-20rem)]">
            {loadingThreads ? (
              <div className="p-4 text-center text-muted-foreground" data-testid="text-loading-threads">
                Loading conversations...
              </div>
            ) : threads.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground" data-testid="text-no-threads">
                No messages yet
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {threads.map((thread) => (
                  <button
                    key={thread.workshopId}
                    onClick={() => setSelectedWorkshopId(thread.workshopId)}
                    className={`w-full text-left p-3 rounded-md transition-colors hover-elevate ${
                      selectedWorkshopId === thread.workshopId ? 'bg-accent' : ''
                    }`}
                    data-testid={`thread-${thread.workshopId}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-medium truncate" data-testid={`thread-name-${thread.workshopId}`}>
                        {thread.workshopName}
                      </div>
                      {thread.unreadCount && thread.unreadCount > 0 && (
                        <Badge variant="default" className="shrink-0" data-testid={`thread-unread-${thread.workshopId}`}>
                          {thread.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground truncate mt-1" data-testid={`thread-preview-${thread.workshopId}`}>
                      {thread.lastMessage}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1" data-testid={`thread-time-${thread.workshopId}`}>
                      {formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true })}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className={`flex flex-col ${!selectedWorkshopId ? 'hidden md:flex' : ''}`}>
        {selectedWorkshopId ? (
          <>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSelectedWorkshopId(null)}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <CardTitle data-testid="text-selected-workshop">{selectedThread?.workshopName || "Chat"}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4 gap-4">
              <ScrollArea className="flex-1">
                {loadingMessages ? (
                  <div className="text-center text-muted-foreground" data-testid="text-loading-messages">
                    Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-muted-foreground" data-testid="text-no-messages">
                    No messages yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      const isSupplier = msg.senderId === userId;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isSupplier ? 'justify-end' : 'justify-start'}`}
                          data-testid={`message-${msg.id}`}
                        >
                          <div className={`max-w-[80%] ${isSupplier ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg p-3`}>
                            <div className="text-xs font-medium mb-1" data-testid={`message-sender-${msg.id}`}>
                              {msg.senderName}
                            </div>
                            {msg.imageUrl && (
                              <img
                                src={msg.imageUrl}
                                alt="Attached"
                                className="rounded mb-2 max-w-full"
                                data-testid={`message-image-${msg.id}`}
                              />
                            )}
                            <div className="text-sm" data-testid={`message-text-${msg.id}`}>
                              {msg.message}
                            </div>
                            <div className={`text-xs mt-1 ${isSupplier ? 'text-primary-foreground/70' : 'text-muted-foreground'}`} data-testid={`message-time-${msg.id}`}>
                              {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message..."
                  value={composeValue}
                  onChange={(e) => setComposeValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="resize-none"
                  rows={2}
                  data-testid="input-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!composeValue.trim() || sendMessageMutation.isPending}
                  size="icon"
                  data-testid="button-send"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground" data-testid="text-select-conversation">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Select a conversation to start messaging</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
