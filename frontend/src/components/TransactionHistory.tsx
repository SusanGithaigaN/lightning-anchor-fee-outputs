import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type BroadcastResult } from "@/lib/api";
import { ExternalLink, History } from "lucide-react";

export interface HistoryEntry {
  parentTxid: string;
  childTxid: string;
  feePaid: number;
  timestamp: Date;
}

interface TransactionHistoryProps {
  entries: HistoryEntry[];
}

export function TransactionHistory({ entries }: TransactionHistoryProps) {
  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Transaction History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parent TXID</TableHead>
              <TableHead>Child TXID</TableHead>
              <TableHead className="text-right">Fee (sats)</TableHead>
              <TableHead className="text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs">
                  <a
                    href={`https://mempool.space/tx/${entry.parentTxid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {entry.parentTxid.slice(0, 8)}…
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <a
                    href={`https://mempool.space/tx/${entry.childTxid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {entry.childTxid.slice(0, 8)}…
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </TableCell>
                <TableCell className="text-right font-mono">{entry.feePaid}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {entry.timestamp.toLocaleTimeString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
