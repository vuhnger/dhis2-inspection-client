import type { ObtainedInspectionData } from "../hooks/useInspection";
import { evaluateMetric } from "../EvaluationHelpers";
import type { MetricCardProps } from "../components/MetricCard/MetricCard";
import type { StandardKey } from "../hooks/useInspection";

type ResourceMetricConfig =
  | {
      key: StandardKey;
      value: number;
      displayValue: number;
      overrideLabel: string; 
    }
  | {
      key: null;
      label: string;
      value: number;
      displayValue: number;
      manualStatus: {
        status: MetricCardProps["status"];
        statusText: string;
      };
    };

export function buildResourceMetrics(
  summary: ObtainedInspectionData
): MetricCardProps[] {
  const { textbooks, desks, chairs, totalStudents } = summary;

  const textbookToLearner =
    totalStudents > 0 ? textbooks / totalStudents : 0;

  const seatToLearner =
    totalStudents > 0 ? desks / totalStudents : 0;

  const metrics: ResourceMetricConfig[] = [
    {
      key: "textbookToLearner",
      value: textbookToLearner,
      displayValue: textbooks,
      overrideLabel: "Textbooks",  
    },
    {
      key: "seatToLearner",
      value: seatToLearner,
      displayValue: desks,
      overrideLabel: "Desks",    
    },
    {
      key: null,
      label: "Chairs",
      value: chairs,
      displayValue: chairs,
      manualStatus: {
        status: "warning",
        statusText: "Below standard",
      },
    },
  ];

  return metrics.map((m) => {
    if (m.key !== null) {
      const evaluated = evaluateMetric(m.key, Number(m.value));
      return {
        label: m.overrideLabel,     
        value: m.displayValue,
        status: evaluated.status,
        statusText: evaluated.statusText,
      };
    }

    return {
      label: m.label!,
      value: m.displayValue,
      status: m.manualStatus!.status,
      statusText: m.manualStatus!.statusText,
    };
  });
}
