import { useState, useMemo } from "react";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Wallet as WalletIcon, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Lazy load Stripe - only when component mounts
const getStripePromise = (): Promise<Stripe | null> | null => {
  const stripePublicKey = import.meta.env.MODE === 'development'
    ? (import.meta.env.VITE_TESTING_STRIPE_PUBLIC_KEY || import.meta.env.VITE_STRIPE_PUBLIC_KEY)
    : import.meta.env.VITE_STRIPE_PUBLIC_KEY;

  if (!stripePublicKey) {
    console.error('Missing Stripe public key');
    return null;
  }

  return loadStripe(stripePublicKey);
};

const TopupForm = ({ clientSecret }: { clientSecret: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/wallet-success`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
        data-testid="button-confirm-payment"
      >
        {isProcessing ? "Processing..." : "Confirm Payment"}
      </Button>
    </form>
  );
};

export default function WalletTopup() {
  const [amount, setAmount] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stripeLoadError, setStripeLoadError] = useState<string | null>(null);
  const { toast } = useToast();

  const quickAmounts = [10, 20, 50, 100, 200, 500];

  // Lazy load Stripe only when component mounts
  const stripePromise = useMemo(() => {
    try {
      const promise = getStripePromise();
      if (!promise) {
        setStripeLoadError("Stripe public key not configured");
        return null;
      }
      // Catch Stripe loading errors
      promise.catch((error) => {
        console.error("Failed to load Stripe.js:", error);
        setStripeLoadError("Failed to load payment service. Please refresh the page.");
      });
      return promise;
    } catch (error) {
      console.error("Error initializing Stripe:", error);
      setStripeLoadError("Failed to initialize payment service");
      return null;
    }
  }, []);

  const handleCreatePayment = async () => {
    const numAmount = parseFloat(amount);
    
    if (!numAmount || numAmount < 1) {
      toast({
        title: "Invalid Amount",
        description: "Minimum top-up amount is RM 1.00",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/stripe/create-payment-intent", { amount: numAmount });
      const data = await response.json() as { clientSecret: string; paymentIntentId: string };
      setClientSecret(data.clientSecret);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initialize payment",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (clientSecret) {
    // Show error if Stripe failed to load
    if (stripeLoadError || !stripePromise) {
      return (
        <div className="container mx-auto p-8 max-w-2xl">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/" data-testid="link-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          
          <Alert variant="destructive" data-testid="alert-stripe-error">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Payment Service Error</AlertTitle>
            <AlertDescription>
              {stripeLoadError || "Payment service not configured properly."}
              <div className="mt-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.reload()}
                  data-testid="button-retry-stripe"
                >
                  Retry
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    
    return (
      <div className="container mx-auto p-8 max-w-2xl">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/" data-testid="link-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Complete Payment</CardTitle>
            <CardDescription>
              Top-up Amount: RM {parseFloat(amount).toFixed(2)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <TopupForm clientSecret={clientSecret} />
            </Elements>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/" data-testid="link-back-to-dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
              <WalletIcon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Top-up Wallet</CardTitle>
              <CardDescription>Add funds to your GarageHub wallet</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="amount">Enter Amount (RM)</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              data-testid="input-amount"
            />
          </div>

          <div className="space-y-2">
            <Label>Quick Select</Label>
            <div className="grid grid-cols-3 gap-3">
              {quickAmounts.map((quickAmount) => (
                <Button
                  key={quickAmount}
                  type="button"
                  variant="outline"
                  onClick={() => setAmount(String(quickAmount))}
                  data-testid={`button-quick-${quickAmount}`}
                >
                  RM {quickAmount}
                </Button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleCreatePayment}
            disabled={!amount || isLoading}
            className="w-full"
            data-testid="button-proceed-payment"
          >
            {isLoading ? "Processing..." : "Proceed to Payment"}
          </Button>

          <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
            <p className="font-semibold mb-2">Payment Information:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Minimum top-up: RM 1.00</li>
              <li>Secure payment via Stripe</li>
              <li>Funds added instantly to your wallet</li>
              <li>No additional fees</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
