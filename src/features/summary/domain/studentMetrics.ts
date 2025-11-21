import type { ObtainedInspectionData } from "../hooks/useInspection";
import type { MetricCardProps } from "../components/MetricCard/MetricCard";
import { evaluateMetric } from "../EvaluationHelpers";

export function buildStudentMetrics(
  summary: ObtainedInspectionData
): MetricCardProps[] {
  const { femaleStudents, maleStudents, genderGpi } = summary;

  const gpiEval = evaluateMetric("gpiLearners", Number(genderGpi));

  return [
    {
      label: "Females",
      value: femaleStudents,
      status: "info",
      statusText: "+ 20%", // need to compare with previous inspection
    },
    {
      label: "Males",
      value: maleStudents,
      status: "error",
      statusText: "- 15%",
    },
    {
      label: "Gender GPI",
      value: genderGpi.toFixed(2),
      status: gpiEval.status,
      statusText: gpiEval.statusText,
    },
  ];
}
