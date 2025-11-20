import React from "react";
import TopHeader from "./TopHeader";
import LevelSelector from "./LevelSelector";
import SummarySection from "./SummarySection";
import MetricCard from "./MetricCard";
import { useInspectionSummary } from "./useInspection";
import { buildResourceMetrics } from "./resourceMetrics";
import { buildStudentMetrics } from "./studentMetrics";

const SummaryScreen: React.FC = () => {
  const { summary, status, error } = useInspectionSummary();

  if (status === "loading") {
    return <div>Loading inspection…</div>;
  }

  if (status === "error" || !summary) {
    return <div>{error || "Unable to load inspection."}</div>;
  }

  // At this point we have real inspection data in `summary`
  const resourceMetrics = buildResourceMetrics(summary);
  const studentMetrics = buildStudentMetrics(summary);
  // const facilitiesMetrics = buildFacilitiesMetrics(summary); // when you add toilets etc.
  // const staffMetrics = buildStaffMetrics(summary); // when you want staff section

  return (
    <div>
      <TopHeader
        schoolName={summary.schoolName}
        inspectionDate={summary.inspectionDate}
      />

      <LevelSelector />

      {/* Resources section */}
      <SummarySection title="Resources">
        {resourceMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </SummarySection>

      {/* Students section */}
      <SummarySection title="Students">
        {studentMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </SummarySection>

      {/* Later: Facilities */}
      {/* <SummarySection title="Facilities">
        {facilitiesMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </SummarySection> */}

      {/* Later: Staff */}
      {/* <SummarySection title="Staff">
        {staffMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </SummarySection> */}
    </div>
  );
};

export default SummaryScreen;
