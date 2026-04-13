import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type FeeEstimate } from "@/lib/api";
import { CheckCircle2, XCircle, Zap } from "lucide-react";

interface FeeEstimateDisplayProps {
  estimate: FeeEstimate;
}

export function FeeEstimateDisplay({ estimate }: FeeEstimateDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-secondary" />
          Fee Estimation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">Child Fee Needed</p>
            <p className="text-lg font-semibold font-mono">{estimate.childFeeNeeded} <span className="text-sm text-muted-foreground">sats</span></p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">Total Fee Needed</p>
            <p className="text-lg font-semibold font-mono">{estimate.totalFeeNeeded} <span className="text-sm text-muted-foreground">sats</span></p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {estimate.parentFeeRate !== undefined && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Parent Fee Rate</p>
              <p className="font-mono">{estimate.parentFeeRate} sat/vB</p>
            </div>
          )}

          {estimate.anchorValue !== undefined && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Selected Output Value</p>
              <p className="font-mono">{estimate.anchorValue} sats</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">330-sat anchor feasible:</span>
          {estimate.feasible ? (
            <Badge className="bg-success text-success-foreground gap-1">
              <CheckCircle2 className="h-3 w-3" /> Feasible
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" /> Not Feasible
            </Badge>
          )}
        </div>

        {!estimate.feasible && (
          <p className="text-sm text-destructive">
            {estimate.isAnchorOutput === false
              ? `The selected output is ${estimate.anchorValue ?? 0} sats, not a 330-sat anchor. Try the correct output index for the commitment tx.`
              : `At this target rate, the 330-sat anchor is short by ${estimate.additionalInputsNeeded ?? 0} sats. On local regtest, try 1 sat/vB.`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
