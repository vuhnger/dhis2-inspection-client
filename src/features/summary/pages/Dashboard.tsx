import React from "react";

import MetricCard from "../components/MetricCard/MetricCard";
import SummarySection from "../components/SummarySection/SummarySection";
import TopHeader from "../components/TopHeader/TopHeader";
import styles from "../Dashboard.module.css";
import { buildResourceMetrics } from "../domain/resourceMetrics";
import { buildStaffMetrics } from "../domain/staffMetrics";
import { buildStudentMetrics } from "../domain/studentMetrics";
import { useInspectionSummary } from "../hooks/useInspection";

const SummaryScreen: React.FC = () => {
  const {
    summary,
    status,
    error,
    categoryList,
    activeCategoryId,
    setActiveCategoryId,
    activeCategorySyncStatus,
    activeCategoryEventId,
    inspection,
  } = useInspectionSummary();

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
  // const studentMetrics = buildStudentMetrics(summary, previousSummary); // need to fecth previous (as of now, this parameter is optional as displays 0% change as default)
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
        {categoryList.length > 0 && (
          <div className={styles.tabRow}>
            {categoryList.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`${styles.tab} ${
                  activeCategoryId === cat.id ? styles.tabActive : ""
                }`}
                onClick={() => setActiveCategoryId(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        <div className={styles.syncMeta}>
          <span className={styles.syncMetaStatus}>
            Status: {activeCategorySyncStatus || "unknown"}
          </span>
          {activeCategoryEventId ? (
            <span className={styles.syncMetaEvent}>Event ID: {activeCategoryEventId}</span>
          ) : null}
          {inspection?.source === "server" ? (
            <span className={styles.syncMetaSource}>From server</span>
          ) : null}
        </div>

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
