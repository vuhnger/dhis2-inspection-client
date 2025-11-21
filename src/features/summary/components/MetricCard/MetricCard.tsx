import React from "react";
import styles from "./MetricCard.module.css";
import {
  Check,
  X,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

export type MetricVisualStatus = "success" | "warning" | "error" | "info";

export interface MetricCardProps {
  label: string;
  value: number | string;
  status: MetricVisualStatus;
  statusText: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  status,
  statusText,
}) => {
  const renderStatusIcon = () => {
    switch (status) {
      case "success":
        return (
          <div className={`${styles.statusIcon} ${styles.statusSuccess}`}>
            <Check size={18} />
          </div>
        );
      case "error":
        return (
          <div className={`${styles.statusIcon} ${styles.statusError}`}>
            <X size={18} />
          </div>
        );
      case "warning":
        return (
          <div className={`${styles.statusIcon} ${styles.statusWarning}`}>
            <AlertCircle size={18} />
          </div>
        );
      case "info":
      default:
        return (
          <div className={`${styles.statusIcon} ${styles.statusInfo}`}>
            <TrendingUp size={18} />
          </div>
        );
    }
  };

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <span className={styles.label}>{label}</span>
      </header>

      <div className={styles.mainRow}>
        <span className={styles.value}>{value}</span>
        {renderStatusIcon()}
      </div>

      <footer className={styles.footer}>
        <span className={styles.statusLabel}>Status:</span>
        <span className={styles.statusText}>{statusText}</span>
      </footer>
    </article>
  );
};

export default MetricCard;
