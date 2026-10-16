/** Horizontal delivery stage flow with live counts; bottlenecked stages highlight orange. */
export interface NotificationPipelineProps {
  /** In order: e.g. Queued, Throttled, Sent, Delivered, Failed */
  stages?: Array<{ label: string; count: string | number; bottleneck?: boolean }>;
  /** Click a stage to filter the table beneath */
  onStage?: (label: string) => void;
  style?: React.CSSProperties;
  className?: string;
}
