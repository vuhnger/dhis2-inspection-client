import React from "react";
import TopHeader from "../components/TopHeader/TopHeader";
import LevelSelector from "../components/LevelSelector/LevelSelector";
import SummarySection from "../components/SummarySection/SummarySection";
import MetricCard from "../components/MetricCard/MetricCard";
import { useInspectionSummary } from "../hooks/useInspection";
import { buildResourceMetrics } from "../domain/resourceMetrics";
import { buildStudentMetrics } from "../domain/studentMetrics";
import { buildStaffMetrics } from "../domain/staffMetrics";
import styles from "../Dashboard.module.css";

const SummaryScreen: React.FC = () => {
  const { summary, status, error } = useInspectionSummary();

  // Local editable header state
  const [displaySchoolName, setDisplaySchoolName] = React.useState("");
  const [displayDate, setDisplayDate] = React.useState("");

  React.useEffect(() => {
    if (summary) {
      setDisplaySchoolName(summary.schoolName);
      setDisplayDate(summary.inspectionDate);
    }
  }, [summary]);

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
        schoolName={displaySchoolName}
        inspectionDate={displayDate}
        onHeaderChange={(name, date) => {
          setDisplaySchoolName(name);
          setDisplayDate(date);
          // TODO: later – persist to DB / DHIS2 here
        }}
      />

      <div className={styles.content}>
        <LevelSelector />

        <SummarySection title="Resources">
          {resourceMetrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </SummarySection>

        <SummarySection title="Students">
          {studentMetrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </SummarySection>

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
