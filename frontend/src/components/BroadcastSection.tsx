import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type BroadcastResult } from "@/lib/api";
import { Loader2, Radio, ExternalLink } from "lucide-react";

interface BroadcastSectionProps {
  canBroadcast: boolean;
  onBroadcast: () => void;
  isLoading: boolean;
  result: BroadcastResult | null;
}

export function BroadcastSection({ canBroadcast, onBroadcast, isLoading, result }: BroadcastSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-primary" />
          Broadcast CPFP
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result ? (
          <Button
            onClick={onBroadcast}
            disabled={!canBroadcast || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Broadcasting...
              </>
            ) : (
              <>
                <Radio className="mr-2 h-4 w-4" />
                Broadcast CPFP Transaction
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg bg-success/10 p-4 border border-success/20">
            <p className="font-semibold text-success">✓ CPFP Transaction Broadcast!</p>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Child TXID</p>
                <p className="font-mono text-xs break-all">{result.childTxid}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fee Paid</p>
                <p className="font-mono">{result.feePaid} sats</p>
              </div>
            </div>
            <a
              href={`https://mempool.space/tx/${result.childTxid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View on mempool.space <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {!canBroadcast && !result && (
          <p className="text-sm text-muted-foreground text-center">
            Complete Lightning payment to enable broadcasting.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
