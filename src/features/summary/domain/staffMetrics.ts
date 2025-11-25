import { evaluateMetric } from "../EvaluationHelpers";

import type { MetricCardProps } from "../components/MetricCard/MetricCard";
import type { ObtainedInspectionData } from "../hooks/useInspection";

/**
 * Build staff-related MetricCards.
 * Uses learner-to-teacher ratio standard, but displays raw staff count.
 */
export function buildStaffMetrics(
  summary: ObtainedInspectionData
): MetricCardProps[] {
  const { totalStudents, staffCount } = summary;

  // Learner-to-teacher ratio (lower is better, target < 45:1)
  const learnerToTeacher =
    staffCount > 0 ? totalStudents / staffCount : 0;

  const evaluated = evaluateMetric("learnerToTeacher", learnerToTeacher);

  return [
    {
      label: "Staff",
      value: staffCount,
      status: evaluated.status,
      statusText: evaluated.statusText,
    },
  ];
}