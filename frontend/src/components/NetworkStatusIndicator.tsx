import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Wifi, WifiOff } from "lucide-react";

export function NetworkStatusIndicator() {
  const { data, isError } = useQuery({
    queryKey: ["blockchain-info"],
    queryFn: api.getBlockchainInfo,
    refetchInterval: 30000,
    retry: 1,
  });

  const synced = !!data && !isError;

  return (
    <div className="flex items-center gap-2 text-sm">
      {synced ? (
        <>
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
          </span>
          <Wifi className="h-4 w-4 text-success" />
          <span className="text-muted-foreground">Synced</span>
        </>
      ) : (
        <>
          <span className="relative flex h-2.5 w-2.5">
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
          </span>
          <WifiOff className="h-4 w-4 text-destructive" />
          <span className="text-muted-foreground">Not synced</span>
        </>
      )}
    </div>
  );
}
