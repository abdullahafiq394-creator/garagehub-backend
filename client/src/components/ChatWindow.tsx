import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Image as ImageIcon, X } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { ChatMessage } from "@shared/schema";

interface ChatWindowProps {
  orderId: string;
  orderTitle?: string;
  onClose?: () => void;
}

export function ChatWindow({ orderId, orderTitle, onClose }: ChatWindowProps) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch chat messages
  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat', orderId],
    queryFn: async () => {
      const res = await fetch(`/api/chat/${orderId}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message?: string; imageUrl?: string }) => {
      return apiRequest(`/api/chat/${orderId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat', orderId] });
      setMessage("");
      setSelectedImage(null);
      setImagePreview(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Upload image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`/api/chat/${orderId}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    onSuccess: (data) => {
      sendMessageMutation.mutate({ imageUrl: data.imageUrl });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    },
  });

  // Socket.io real-time updates
  useEffect(() => {
    if (!socket || !orderId) return;

    // Join chat room
    socket.emit("chat.join", { orderId, userId: user?.id });

    // Listen for new messages
    socket.on("chat.new_message", (newMessage: ChatMessage) => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat', orderId] });
      
      // Show toast notification for messages from others
      if (newMessage.senderId !== user?.id) {
        toast({
          title: "New message",
          description: newMessage.message || "Image received",
        });
        
        // Play notification sound
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {
          // Ignore autoplay errors
        });
      }
      
      // Auto scroll to bottom
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });

    // Listen for typing indicator
    socket.on("chat.user_typing", (data: { userId: string; userName: string }) => {
      // Could implement typing indicator UI here
      console.log(`${data.userName} is typing...`);
    });

    return () => {
      socket.emit("chat.leave", { orderId, userId: user?.id });
      socket.off("chat.new_message");
      socket.off("chat.user_typing");
    };
  }, [socket, orderId, user?.id, toast]);

  // Mark messages as read when opening chat
  useEffect(() => {
    if (orderId && user?.id) {
      fetch(`/api/chat/${orderId}/mark-read`, {
        method: 'POST',
      }).catch(console.error);
    }
  }, [orderId, user?.id]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() && !selectedImage) return;

    if (selectedImage) {
      uploadImageMutation.mutate(selectedImage);
    } else {
      sendMessageMutation.mutate({ message: message.trim() });
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">
          {orderTitle || `Order Chat ${orderId.slice(0, 8)}`}
        </CardTitle>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-close-chat"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      
      <CardContent className="flex flex-col flex-1 p-0 overflow-hidden">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages-container">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = msg.senderId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  data-testid={`message-${msg.id}`}
                >
                  <div className={`flex gap-2 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {isOwnMessage ? 'You' : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <div
                        className={`rounded-lg p-3 ${
                          isOwnMessage
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {msg.message && (
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        )}
                        {msg.imageUrl && (
                          <img
                            src={msg.imageUrl}
                            alt="Chat image"
                            className="mt-2 rounded max-w-full h-auto"
                            data-testid={`image-${msg.id}`}
                          />
                        )}
                      </div>
                      <span className={`text-xs text-muted-foreground mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                        {format(new Date(msg.createdAt || ''), 'HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Image preview */}
        {imagePreview && (
          <div className="px-4 py-2 border-t">
            <div className="relative inline-block">
              <img src={imagePreview} alt="Preview" className="h-20 rounded" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={() => {
                  setSelectedImage(null);
                  setImagePreview(null);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={sendMessageMutation.isPending || uploadImageMutation.isPending}
              data-testid="button-upload-image"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sendMessageMutation.isPending || uploadImageMutation.isPending}
              data-testid="input-chat-message"
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={(!message.trim() && !selectedImage) || sendMessageMutation.isPending || uploadImageMutation.isPending}
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
