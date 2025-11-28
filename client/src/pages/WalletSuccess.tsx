import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export default function WalletSuccess() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Invalidate wallet balance to fetch updated balance
    queryClient.invalidateQueries({ queryKey: ["/api/wallet/balance"] });
    queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
  }, [queryClient]);

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Card className="text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-500">
              <CheckCircle className="h-8 w-8" />
            </div>
          </div>
          <CardTitle className="text-2xl">Top-up Successful!</CardTitle>
          <CardDescription>
            Your wallet has been credited successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The funds have been added to your wallet. You can now use them for orders and services.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild data-testid="button-view-wallet">
              <Link href="/">View Wallet</Link>
            </Button>
            <Button asChild variant="outline" data-testid="button-back-dashboard">
              <Link href="/">Back to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
