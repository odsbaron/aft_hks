import Link from "next/link";
import { MarketStatus, MarketInfo } from "~~/types/sidebet";
import { Address } from "@scaffold-ui/components";

interface MarketCardProps {
  address: string;
  info: MarketInfo;
  status: MarketStatus;
  progress: number;
}

const STATUS_CONFIG = {
  [MarketStatus.Open]: { label: "Open", color: "badge-success" },
  [MarketStatus.Proposed]: { label: "Proposed", color: "badge-warning" },
  [MarketStatus.Resolved]: { label: "Resolved", color: "badge-neutral" },
  [MarketStatus.Disputed]: { label: "Disputed", color: "badge-error" },
  [MarketStatus.Cancelled]: { label: "Cancelled", color: "badge-neutral" },
};

export function MarketCard({ address, info, status, progress }: MarketCardProps) {
  const statusConfig = STATUS_CONFIG[status];
  const formatAmount = (amount: bigint) => (Number(amount) / 1e18).toFixed(2);
  const formatDate = (timestamp: bigint) => new Date(Number(timestamp) * 1000).toLocaleDateString();

  return (
    <Link href={`/market/${address}`}>
      <div className="card bg-base-100 hover:bg-base-200 transition-all cursor-pointer border border-base-300 hover:border-primary h-full">
        <div className="card-body p-4">
          <div className="flex justify-between items-start mb-2">
            <span className={`badge ${statusConfig.color} badge-sm`}>{statusConfig.label}</span>
            <span className="text-xs text-base-content/50">{formatDate(info.createdAt)}</span>
          </div>
          <h3 className="card-title text-base font-semibold mb-3 line-clamp-2">{info.topic}</h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center">
              <div className="text-xs text-base-content/60">Participants</div>
              <div className="text-lg font-bold">{info.totalParticipants.toString()}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-base-content/60">Total Staked</div>
              <div className="text-lg font-bold">{formatAmount(info.totalStaked)}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-base-content/60">Threshold</div>
              <div className="text-lg font-bold">{Number(info.thresholdPercent) / 100}%</div>
            </div>
          </div>
          {status === MarketStatus.Proposed && (
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-base-content/60">Progress</span>
                <span className="font-semibold">{progress.toFixed(0)}%</span>
              </div>
              <progress className="progress progress-primary w-full" value={progress} max={100}></progress>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-base-content/60">
            <span>Token:</span>
            <Address address={info.token} size="xs" />
          </div>
        </div>
      </div>
    </Link>
  );
}
