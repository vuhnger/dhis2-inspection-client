import type { ObtainedInspectionData } from "../hooks/useInspection";
import type { MetricCardProps } from "../components/MetricCard/MetricCard";
import { evaluateMetric } from "../EvaluationHelpers";


function getPercentDiff(current: number, previous?: number): number {
  if (!previous || previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}


function getStatusForStudentChange(percent: number): MetricCardProps["status"] {
  if (percent <= -20) return "error";     // big drop
  if (percent < 0) return "warning";      // small drop
  if (percent === 0) return "info";       // unchanged
  return "success";                       // increase
}


export function buildStudentMetrics(
  summary: ObtainedInspectionData,
  previous?: ObtainedInspectionData
): MetricCardProps[] {
  const { femaleStudents, maleStudents, genderGpi } = summary;

  const prevFemale = previous?.femaleStudents ?? femaleStudents;
  const prevMale = previous?.maleStudents ?? maleStudents;
  const prevGpi = previous?.genderGpi ?? genderGpi;

  // 1. Percent diffs
  const femaleDiff = getPercentDiff(femaleStudents, prevFemale);
  const maleDiff = getPercentDiff(maleStudents, prevMale);
  const gpiDiff = getPercentDiff(genderGpi, prevGpi);

  // 2. Status colors
  const femaleStatus = getStatusForStudentChange(femaleDiff);
  const maleStatus = getStatusForStudentChange(maleDiff);

  // 3. Evaluate GPI by your DHIS2 standard logic
  const gpiEval = evaluateMetric("gpiLearners", Number(genderGpi));

  return [
    {
      label: "Females",
      value: femaleStudents,
      status: femaleStatus,
      statusText:
        femaleDiff > 0 ? `+${femaleDiff}%` : `${femaleDiff}%`,
    },
    {
      label: "Males",
      value: maleStudents,
      status: maleStatus,
      statusText:
        maleDiff > 0 ? `+${maleDiff}%` : `${maleDiff}%`,
    },
    {
      label: "Gender GPI",
      value: genderGpi.toFixed(2),
      status: gpiEval.status,
      statusText: gpiEval.statusText, // keep standard system for GPI
    },
  ];
}
