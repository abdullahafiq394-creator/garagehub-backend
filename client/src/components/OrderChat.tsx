import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/hooks/useSocket";
import type { ChatMessage } from "@shared/schema";
import { Link } from "wouter";

interface OrderChatProps {
  orderId: string;
  currentUserId: string;
  orderTitle?: string;
  supplierId?: string; // For linking product codes to supplier store
}

/**
 * Linkify product codes in chat messages
 * Converts #001-#9999+ patterns into clickable links to product pages
 */
function linkifyProductCodes(text: string | null, supplierId?: string): React.ReactNode {
  if (!text || !supplierId) {
    return text || ""; // No linkification without supplier context or empty message
  }

  // Match #001-#9999+ (3+ digits with leading zeros)
  const codeRegex = /#(\d{3,})\b/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeRegex.exec(text)) !== null) {
    const fullMatch = match[0]; // e.g., "#001"
    const codeNumber = match[1]; // e.g., "001"
    const matchStart = match.index;

    // Add text before the match
    if (matchStart > lastIndex) {
      parts.push(text.substring(lastIndex, matchStart));
    }

    // Add clickable link for the product code
    parts.push(
      <Link
        key={`code-${matchStart}-${codeNumber}`}
        href={`/store/${supplierId}?code=${fullMatch}`}
        className="underline font-medium hover:opacity-80 transition-opacity"
        data-testid={`link-product-code-${codeNumber}`}
      >
        {fullMatch}
      </Link>
    );

    lastIndex = matchStart + fullMatch.length;
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export function OrderChat({ orderId, currentUserId, orderTitle, supplierId }: OrderChatProps) {
  const [message, setMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { socket } = useSocket();

  // Fetch chat messages
  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat", orderId],
    refetchOnWindowFocus: false,
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (messageData: { message: string; receiverId?: string }) => {
      return apiRequest(`/api/chat/${orderId}`, {
        method: "POST",
        body: JSON.stringify(messageData),
      });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat", orderId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Mark messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/chat/${orderId}/mark-read`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat", orderId] });
    },
  });

  // Socket.io: Listen for new messages
  useEffect(() => {
    if (!socket) return;

    socket.emit("join_order_chat", orderId);

    const handleNewMessage = (newMessage: ChatMessage) => {
      queryClient.setQueryData<ChatMessage[]>(["/api/chat", orderId], (old = []) => {
        return [...old, newMessage];
      });

      // Mark as read if message is for current user
      if (newMessage.receiverId === currentUserId) {
        markAsReadMutation.mutate();
      }

      // Scroll to bottom
      setTimeout(scrollToBottom, 100);
    };

    socket.on("chat.new_message", handleNewMessage);

    return () => {
      socket.emit("leave_order_chat", orderId);
      socket.off("chat.new_message", handleNewMessage);
    };
  }, [socket, orderId, currentUserId]);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    sendMutation.mutate({ message: message.trim() });
  };

  const getUserInitials = (senderId: string) => {
    return senderId === currentUserId ? "You" : "Them";
  };

  if (isLoading) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col" data-testid="card-order-chat">
      <CardHeader className="pb-3">
        <CardTitle>Order Chat</CardTitle>
        {orderTitle && <CardDescription>{orderTitle}</CardDescription>}
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea ref={scrollAreaRef} className="h-full px-6" data-testid="scroll-chat-messages">
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => {
                const isOwnMessage = msg.senderId === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isOwnMessage ? "justify-end" : "justify-start"}`}
                    data-testid={`message-${msg.id}`}
                  >
                    {!isOwnMessage && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {getUserInitials(msg.senderId)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        isOwnMessage
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {linkifyProductCodes(msg.message, supplierId)}
                      </p>
                      <p className={`text-xs mt-1 ${isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {msg.createdAt && new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {isOwnMessage && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-accent text-accent-foreground">
                          You
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="border-t pt-4">
        <form onSubmit={handleSendMessage} className="flex w-full gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="min-h-[60px] max-h-[120px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            data-testid="input-chat-message"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!message.trim() || sendMutation.isPending}
            className="h-[60px] w-[60px] shrink-0"
            data-testid="button-send-message"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
