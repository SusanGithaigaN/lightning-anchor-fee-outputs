import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type Invoice } from "@/lib/api";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

interface InvoiceDisplayProps {
  invoice: Invoice | null;
  onGenerate: () => void;
  isLoading: boolean;
  canGenerate: boolean;
  readinessMessage?: string;
}

export function InvoiceDisplay({
  invoice,
  onGenerate,
  isLoading,
  canGenerate,
  readinessMessage,
}: InvoiceDisplayProps) {
  const copyInvoice = () => {
    if (invoice) {
      navigator.clipboard.writeText(invoice.invoice);
      toast.success("Invoice copied to clipboard");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Lightning Invoice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!invoice ? (
          <>
            <Button
              onClick={onGenerate}
              disabled={isLoading || !canGenerate}
              className="w-full bg-secondary hover:bg-secondary/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Generate Lightning Invoice
                </>
              )}
            </Button>
            {readinessMessage && (
              <p className="text-xs text-muted-foreground">{readinessMessage}</p>
            )}
          </>
        ) : (
          <>
            <div className="flex justify-center rounded-lg bg-foreground/5 p-6">
              <QRCodeSVG
                value={invoice.invoice}
                size={200}
                bgColor="transparent"
                fgColor="hsl(33, 93%, 54%)"
                level="M"
              />
            </div>

            <div className="space-y-2">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-mono font-semibold">{invoice.amountSats} sats</p>
              </div>

              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs text-muted-foreground">Payment Hash</p>
                <p className="font-mono text-xs break-all">{invoice.paymentHash}</p>
              </div>

              <Button variant="outline" onClick={copyInvoice} className="w-full">
                <Copy className="mr-2 h-4 w-4" />
                Copy Invoice
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
