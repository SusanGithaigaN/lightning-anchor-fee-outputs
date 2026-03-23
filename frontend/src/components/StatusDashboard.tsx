import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Activity, Box } from "lucide-react";

export function StatusDashboard() {
  const { data: blockchain } = useQuery({
    queryKey: ["blockchain-info"],
    queryFn: api.getBlockchainInfo,
    refetchInterval: 30000,
    retry: 1,
  });

  const { data: monitor } = useQuery({
    queryKey: ["monitor-status"],
    queryFn: api.getMonitorStatus,
    refetchInterval: 10000,
    retry: 1,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Status Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-lg bg-muted p-3">
          <div className="flex items-center gap-2">
            <Box className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Block Height</span>
          </div>
          <span className="font-mono text-sm font-semibold">
            {blockchain?.blocks ?? "—"}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted p-3">
          <span className="text-sm">Network</span>
          <Badge variant="outline" className="font-mono">
            {blockchain?.chain ?? "—"}
          </Badge>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted p-3">
          <span className="text-sm">Mempool Monitor</span>
          {monitor?.active ? (
            <Badge className="bg-success text-success-foreground">Active</Badge>
          ) : (
            <Badge variant="outline">Inactive</Badge>
          )}
        </div>

        {monitor?.trackedTransactions !== undefined && (
          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <span className="text-sm">Tracked TXs</span>
            <span className="font-mono text-sm font-semibold">{monitor.trackedTransactions}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
