import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { api, type FeeEstimate, type Invoice, type BroadcastResult, type LightningReadiness } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { TransactionForm } from "@/components/TransactionForm";
import { FeeEstimateDisplay } from "@/components/FeeEstimateDisplay";
import { InvoiceDisplay } from "@/components/InvoiceDisplay";
import { PaymentTracker } from "@/components/PaymentTracker";
import { BroadcastSection } from "@/components/BroadcastSection";
import { StatusDashboard } from "@/components/StatusDashboard";
import { TransactionHistory, type HistoryEntry } from "@/components/TransactionHistory";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import Footer from "@/components/landing/footer";

export default function Index() {
  const [txid, setTxid] = useState("");
  const [anchorIndex, setAnchorIndex] = useState(1);
  const [targetFeeRate, setTargetFeeRate] = useState(1);

  const [estimate, setEstimate] = useState<FeeEstimate | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<BroadcastResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lndReadiness, setLndReadiness] = useState<LightningReadiness | null>(null);

  const [estimating, setEstimating] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  const refreshReadiness = useCallback(async () => {
    try {
      const readiness = await api.getLightningReadiness();
      setLndReadiness(readiness);
      return readiness;
    } catch {
      const fallback = {
        readyForInvoices: false,
        syncedToChain: false,
        reason: "Unable to reach Lightning readiness endpoint",
      } as LightningReadiness;
      setLndReadiness(fallback);
      return fallback;
    }
  }, []);

  useEffect(() => {
    void refreshReadiness();
    const intervalId = window.setInterval(() => {
      void refreshReadiness();
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [refreshReadiness]);

  const handleEstimate = async (tid: string, idx: number, rate: number) => {
    setTxid(tid);
    setAnchorIndex(idx);
    setTargetFeeRate(rate);
    setEstimate(null);
    setInvoice(null);
    setIsPaid(false);
    setBroadcastResult(null);
    setEstimating(true);

    try {
      const result = await api.estimateFee(tid, idx, rate);
      setEstimate(result);
      toast.success("Fee estimate ready");
    } catch (err: any) {
      toast.error(err.message || "Failed to estimate fee");
    } finally {
      setEstimating(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!estimate) return;

    const readiness = await refreshReadiness();
    if (!readiness.readyForInvoices) {
      toast.error(readiness.reason || "Lightning node is not ready to create invoices yet");
      return;
    }

    setGeneratingInvoice(true);

    try {
      const inv = await api.createInvoice(
        Math.max(1, estimate.childFeeNeeded),
        `CPFP fee bump for ${txid.slice(0, 8)}...`
      );
      setInvoice(inv);
      toast.success("Invoice generated — scan to pay");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate invoice");
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handlePaid = useCallback(() => {
    setIsPaid(true);
    toast.success("Payment received!");
  }, []);

  const handleBroadcast = async () => {
    if (!invoice) return;
    setBroadcasting(true);

    try {
      const result = await api.broadcastFeeBump(txid, anchorIndex, targetFeeRate, invoice.paymentHash);
      setBroadcastResult(result);
      setHistory((prev) => [
        {
          parentTxid: txid,
          childTxid: result.childTxid,
          feePaid: result.feePaid,
          timestamp: new Date(),
        },
        ...prev,
      ]);
      toast.success("CPFP transaction broadcast!");
    } catch (err: any) {
      toast.error(err.message || "Failed to broadcast");
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
              <Link to="/">
                <Zap className="h-6 w-6 text-primary" />
              </Link>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Lightning Fee Bumper</h1>
              <p className="hidden md:block md:text-sm text-muted-foreground">CPFP Fee Bumping on the Lightning Network</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NetworkStatusIndicator />
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild>
              <Link to="/">← Home</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-6 md:py-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column — main workflow */}
          <div className="lg:col-span-2 space-y-6">
            <TransactionForm onEstimate={handleEstimate} isLoading={estimating} />

            {estimate && <FeeEstimateDisplay estimate={estimate} />}

            {estimate && estimate.feasible && (
              <InvoiceDisplay
                invoice={invoice}
                onGenerate={handleGenerateInvoice}
                isLoading={generatingInvoice}
                canGenerate={Boolean(lndReadiness?.readyForInvoices)}
                readinessMessage={
                  lndReadiness?.readyForInvoices
                    ? `Lightning ready at block ${lndReadiness.blockHeight ?? "-"}`
                    : lndReadiness?.reason || "Lightning node is still syncing. Mine a few blocks and try again."
                }
              />
            )}

            {invoice && (
              <PaymentTracker paymentHash={invoice.paymentHash} onPaid={handlePaid} />
            )}

            {invoice && (
              <BroadcastSection
                canBroadcast={isPaid}
                onBroadcast={handleBroadcast}
                isLoading={broadcasting}
                result={broadcastResult}
              />
            )}

            <TransactionHistory entries={history} />
          </div>

          {/* Right column — dashboard */}
          <div className="space-y-6">
            <StatusDashboard />

            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h3 className="font-semibold text-sm">How it works</h3>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Enter your stuck transaction's TXID</li>
                <li>Get a fee estimate for the CPFP child</li>
                <li>Pay via Lightning Network invoice</li>
                <li>Broadcast the fee-bumping transaction</li>
              </ol>
              <p className="text-xs text-muted-foreground/70 pt-2 border-t border-border">
                This service uses <strong>anchor outputs</strong> (330 sats) to create Child-Pays-For-Parent transactions, accelerating stuck Bitcoin transactions.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
