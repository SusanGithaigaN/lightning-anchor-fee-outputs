import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { CheckCircle2, Loader2, Clock, PartyPopper } from "lucide-react";

interface PaymentTrackerProps {
  paymentHash: string | null;
  onPaid: () => void;
}

export function PaymentTracker({ paymentHash, onPaid }: PaymentTrackerProps) {
  const [paid, setPaid] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [error, setError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!paymentHash || paid) return;

    const poll = async () => {
      try {
        const status = await api.checkPayment(paymentHash);
        if (status.paid) {
          setPaid(true);
          setShowCelebration(true);
          onPaid();
          if (intervalRef.current) clearInterval(intervalRef.current);
          setTimeout(() => setShowCelebration(false), 3000);
        }
      } catch {
        setError("Failed to check payment status");
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paymentHash, paid, onPaid]);

  if (!paymentHash) return null;

  return (
    <Card className={showCelebration ? "ring-2 ring-success animate-pulse" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {paid ? (
            showCelebration ? (
              <PartyPopper className="h-5 w-5 text-success" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-success" />
            )
          ) : (
            <Clock className="h-5 w-5 text-primary" />
          )}
          Payment Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive mb-2">{error}</p>}

        {paid ? (
          <div className="flex items-center gap-3 rounded-lg bg-success/10 p-4 border border-success/20">
            {showCelebration && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
                <div className="absolute top-0 left-1/4 text-2xl animate-bounce">🎉</div>
                <div className="absolute top-0 right-1/4 text-2xl animate-bounce" style={{ animationDelay: "0.2s" }}>⚡</div>
                <div className="absolute top-0 left-1/2 text-2xl animate-bounce" style={{ animationDelay: "0.4s" }}>🎊</div>
              </div>
            )}
            <CheckCircle2 className="h-6 w-6 text-success" />
            <div>
              <p className="font-semibold text-success">Payment Received!</p>
              <p className="text-sm text-muted-foreground">You can now broadcast the CPFP transaction.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg bg-secondary/10 p-4 border border-secondary/20">
            <Loader2 className="h-6 w-6 text-secondary animate-spin" />
            <div>
              <p className="font-semibold">Waiting for payment...</p>
              <p className="text-sm text-muted-foreground">Scan the QR code or paste the invoice into your Lightning wallet.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
