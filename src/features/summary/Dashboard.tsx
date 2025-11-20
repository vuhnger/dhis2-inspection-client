// SummaryScreen.tsx
import React from "react";
import TopHeader from "./TopHeader";
import LevelSelector from "./LevelSelector";
import SummarySection from "./SummarySection";
import MetricCard, { MetricCardProps } from "./MetricCard";
import { useInspectionSummary } from "./useInspection";
import { ObtainedInspectionData } from "./useInspection";

// Very small & readable logic; you can refine these later
export function buildResourceMetrics(
  summary: ObtainedInspectionData
): MetricCardProps[] {
  const { textbooks, desks, chairs, totalStudents } = summary;

  // Example: textbooks vs learners (1:1 requirement)
  const textbookRatio =
    totalStudents > 0 ? textbooks / totalStudents : 0;
  const textbooksMeet = textbookRatio >= 1;

  return [
    {
      label: "Textbooks",
      value: textbooks,
      status: textbooksMeet ? "success" : "warning",
      statusText: textbooksMeet
        ? "Meets Minimum 1:1"
        : "Below 1:1",
    },
    {
      label: "Desks",
      value: desks,
      // Placeholder logic – adjust to match your standard
      status: "error",
      statusText: "Large deviations >1",
    },
    {
      label: "Chairs",
      value: chairs,
      // Placeholder logic – adjust to match your standard
      status: "warning",
      statusText: "Below standard",
    },
  ];
}

function buildStudentMetrics(
  summary: ObtainedInspectionData
): MetricCardProps[] {
  const { femaleStudents, maleStudents, genderGpi } = summary;

  // Simple % change placeholders; replace with real comparison later
  return [
    {
      label: "Females",
      value: femaleStudents,
      status: "info",
      statusText: "+ 20%", // todo: compute vs previous inspection
    },
    {
      label: "Males",
      value: maleStudents,
      status: "error",
      statusText: "- 15%", // todo: compute vs previous inspection
    },
    {
      label: "Gender GPI",
      value: genderGpi.toFixed(2),
      status: genderGpi === 1 ? "success" : "warning",
      statusText: genderGpi === 1 ? "At parity" : "Below standard",
    },
  ];
}

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

      <SummarySection title="Resources">
        {resourceMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </SummarySection>

      {/* Facilities - placeholder until you add toilets etc. */}
      {/* <SummarySection title="Facilities">
        {facilitiesMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </SummarySection> */}

      <SummarySection title="Students">
        {studentMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </SummarySection>

      {/* Staff section when ready */}
      {/* <SummarySection title="Staff">
        {staffMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </SummarySection> */}
    </div>
  );
};

export default SummaryScreen;
