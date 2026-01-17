interface ProgressBarProps {
  progress: number;
  threshold: number;
  label?: string;
  showValues?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = { sm: "h-2", md: "h-4", lg: "h-6" };

export function ProgressBar({ progress, threshold, label, showValues = true, size = "md" }: ProgressBarProps) {
  const isThresholdMet = progress >= threshold;
  const heightClass = SIZE_CLASSES[size];

  return (
    <div className="w-full">
      {(label || showValues) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium">{label}</span>}
          {showValues && (
            <span className={`text-sm ${isThresholdMet ? "text-success" : ""}`}>
              {progress.toFixed(0)}% / {threshold}% required
            </span>
          )}
        </div>
      )}
      <div className={`relative ${heightClass} bg-base-300 rounded-full overflow-hidden`}>
        <div className="absolute top-0 bottom-0 w-0.5 bg-error z-10" style={{ left: `${threshold}%` }}></div>
        <div
          className={`h-full transition-all duration-500 rounded-full ${isThresholdMet ? "bg-success" : "bg-primary"}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}
