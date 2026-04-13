import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Search, ExternalLink } from "lucide-react";

interface TransactionFormProps {
  onEstimate: (txid: string, anchorIndex: number, targetFeeRate: number) => void;
  isLoading: boolean;
}

const TXID_REGEX = /^[a-fA-F0-9]{64}$/;

const FEE_PRESETS = [
  { label: "Low", value: 1 },
  { label: "Medium", value: 2 },
  { label: "High", value: 5 },
] as const;

export function TransactionForm({ onEstimate, isLoading }: TransactionFormProps) {
  const [txid, setTxid] = useState("");
  const [anchorIndex, setAnchorIndex] = useState("1");
  const [targetFeeRate, setTargetFeeRate] = useState("1");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!TXID_REGEX.test(txid)) {
      setError("Invalid TXID — must be 64 hex characters.");
      return;
    }

    const idx = parseInt(anchorIndex, 10);
    const rate = parseFloat(targetFeeRate);

    if (isNaN(idx) || idx < 0) {
      setError("Anchor output index must be a non-negative integer.");
      return;
    }
    if (isNaN(rate) || rate <= 0) {
      setError("Target fee rate must be a positive number.");
      return;
    }

    onEstimate(txid, idx, rate);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Transaction Input
        </CardTitle>
        <CardDescription>
          Enter the stuck transaction details to estimate CPFP fee bump cost
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="txid">Transaction ID (TXID)</Label>
            <div className="flex gap-2">
              <Input
                id="txid"
                placeholder="e.g. a1b2c3d4e5f6..."
                value={txid}
                onChange={(e) => setTxid(e.target.value.trim())}
                className="font-mono text-sm"
                maxLength={64}
              />
              {TXID_REGEX.test(txid) && (
                <a
                  href={`https://mempool.space/tx/${txid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md border border-border px-3 text-muted-foreground hover:text-primary transition-colors"
                  title="View on mempool.space"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="anchorIndex">Anchor Output Index</Label>
              <Input
                id="anchorIndex"
                type="number"
                min="0"
                value={anchorIndex}
                onChange={(e) => setAnchorIndex(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feeRate">Target Fee Rate (sat/vB)</Label>
              <Input
                id="feeRate"
                type="number"
                min="1"
                step="0.1"
                value={targetFeeRate}
                onChange={(e) => setTargetFeeRate(e.target.value)}
              />
              <div className="flex gap-2">
                {FEE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setTargetFeeRate(String(preset.value))}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      targetFeeRate === String(preset.value)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                    }`}
                  >
                    {preset.label} ({preset.value})
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                For local `regtest`, start with `anchor index 1` and `1 sat/vB`.
              </p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Estimating...
              </>
            ) : (
              "Estimate Cost"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
