import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function ChatPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card className="card-glow" data-testid="card-chat">
          <CardHeader className="flex flex-col items-center text-center gap-4 space-y-0 pb-4">
            <div className="w-full flex flex-col items-center gap-3">
              <MessageSquare className="h-8 w-8" />
              <div className="text-center">
                <CardTitle className="glow-text text-foreground">Messages</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">Chat with your contacts</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Messages Yet</h3>
              <p className="text-sm text-muted-foreground">
                Your conversations will appear here
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
