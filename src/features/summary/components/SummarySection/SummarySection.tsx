import React from "react";
import styles from "./SummarySection.module.css";

interface SummarySectionProps {
  title: string;
  children: React.ReactNode; // MetricCards
}

const SummarySection: React.FC<SummarySectionProps> = ({ title, children }) => {
  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
      </header>

      <div className={styles.cardsRow}>
        {children}
      </div>
    </section>
  );
};

export default SummarySection;
