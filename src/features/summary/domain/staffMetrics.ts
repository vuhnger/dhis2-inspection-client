import { evaluateMetric } from "../EvaluationHelpers";
import type { MetricCardProps } from "../components/MetricCard/MetricCard";
import type { ObtainedInspectionData } from "../hooks/useInspection";
export function buildStaffMetrics(
  summary: ObtainedInspectionData
): MetricCardProps[] {
  const { totalStudents, staffCount } = summary;

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
