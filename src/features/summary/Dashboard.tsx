// Dashboard.tsx (SummaryScreen)
import React from "react";
import TopHeader from "./TopHeader";
import LevelSelector from "./LevelSelector";
import SummarySection from "./SummarySection";
import MetricCard from "./MetricCard";
import { useInspectionSummary } from "./useInspection";
import { buildResourceMetrics } from "./resourceMetrics";
import { buildStudentMetrics } from "./studentMetrics";
import { buildStaffMetrics } from "./staffMetrics";
import styles from "./Dashboard.module.css";

const SummaryScreen: React.FC = () => {
  const { summary, status, error } = useInspectionSummary();

  if (status === "loading") {
    return <div>Loading inspection…</div>;
  }

  if (status === "error" || !summary) {
    return <div>{error || "Unable to load inspection."}</div>;
  }

  const resourceMetrics = buildResourceMetrics(summary);
  const studentMetrics = buildStudentMetrics(summary);
  const staffMetrics = buildStaffMetrics(summary); 

  return (
    <div className={styles.summaryContainer}>
      <TopHeader
        schoolName={summary.schoolName}
        inspectionDate={summary.inspectionDate}
      />

      <div className={styles.content}>
        <LevelSelector />

        {/* Resources */}
        <SummarySection title="Resources">
          {resourceMetrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </SummarySection>

        {/* Students */}
        <SummarySection title="Students">
          {studentMetrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </SummarySection>

        {/* Staff */}
        <SummarySection title="Staff">
          {staffMetrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </SummarySection>
      </div>
    </div>
  );
};

export default SummaryScreen;
