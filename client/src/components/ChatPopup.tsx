import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { X, Send, Upload, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ChatMessage, User } from "@shared/schema";

interface ChatPopupProps {
  supplierId: string;
  supplierName: string;
  workshopId: string;
  onClose: () => void;
}

export function ChatPopup({ supplierId, supplierName, workshopId, onClose }: ChatPopupProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get current user to determine message direction
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  // Fetch chat messages
  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat', supplierId, workshopId],
    queryFn: async () => {
      const res = await fetch(`/api/chat/supplier/${supplierId}/workshop/${workshopId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message?: string; imageFile?: File }) => {
      if (data.imageFile) {
        // Send image message
        const formData = new FormData();
        formData.append("supplierId", supplierId);
        formData.append("workshopId", workshopId);
        formData.append("image", data.imageFile);
        if (data.message) {
          formData.append("message", data.message);
        }
        return apiRequest("/api/chat/upload", {
          method: "POST",
          body: formData,
        });
      } else {
        // Send text message
        return apiRequest("/api/chat/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierId,
            workshopId,
            message: data.message,
          }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat', supplierId, workshopId] });
      setMessage("");
      setImageFile(null);
    },
    onError: () => {
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!message.trim() && !imageFile) return;

    sendMessageMutation.mutate({
      message: message.trim() || undefined,
      imageFile: imageFile || undefined,
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setImageFile(file);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Card className="fixed bottom-4 right-4 w-96 h-[500px] shadow-lg flex flex-col z-50" data-testid="chat-popup">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b">
        <CardTitle className="text-lg flex items-center gap-2" data-testid="text-chat-title">
          <MessageCircle className="w-5 h-5" />
          {supplierName}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-chat">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No messages yet. Start a conversation!
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              // Determine if message is from current user
              const isMyMessage = currentUser && msg.senderId === currentUser.id;
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                  data-testid={`message-${msg.id}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      isMyMessage
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt="Message attachment"
                        className="rounded mb-2 max-w-full"
                        data-testid={`image-${msg.id}`}
                      />
                    )}
                    {msg.message && <p className="text-sm">{msg.message}</p>}
                    <p className="text-xs mt-1 opacity-70">
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : 'Just now'}
                    </p>
                  </div>
                </div>
              );
            })}
          </>
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      <div className="border-t p-3 space-y-2">
        {imageFile && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded">
            <Badge variant="secondary">{imageFile.name}</Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setImageFile(null)}
              data-testid="button-remove-image"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            data-testid="input-message"
          />
          <input
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            id="chat-image-upload"
            data-testid="input-chat-image"
          />
          <label htmlFor="chat-image-upload">
            <Button variant="outline" size="icon" asChild data-testid="button-upload-image">
              <span>
                <Upload className="w-4 h-4" />
              </span>
            </Button>
          </label>
          <Button
            onClick={handleSendMessage}
            disabled={sendMessageMutation.isPending || (!message.trim() && !imageFile)}
            data-testid="button-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
