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

        {estimate.parentFeeRate !== undefined && (
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">Parent Fee Rate</p>
            <p className="font-mono">{estimate.parentFeeRate} sat/vB</p>
          </div>
        )}

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
            The 330-sat anchor output is insufficient for this fee bump. A higher anchor value may be needed.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
