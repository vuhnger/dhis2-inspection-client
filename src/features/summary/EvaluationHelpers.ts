import { 
    INSPECTION_STANDARDS, 
    PROGRESS_TAGS,
    mapProgressTagToMetricStatus, 
    type StandardKey 
} from "./hooks/useInspection";
import type { ProgressTag } from "./hooks/useInspection";
import type { MetricCardProps } from "./components/MetricCard/MetricCard";

export function evaluateMetric(
  key: StandardKey,
  actualValue: number
): {
  tag: ProgressTag;
  status: MetricCardProps["status"];
  statusText: string;
  target: number;
  value: number;
  label: string;
} {
  const config = INSPECTION_STANDARDS[key];

  if (!config) {
    throw new Error(`No standard found for metric: ${key}`);
  }

  const { comparator, target, label } = config;

  let meets = false;

  switch (comparator) {
    case "equal":
      meets = actualValue === target;
      break;
    case "lessThan":
      meets = actualValue < target;
      break;
  }

  let tag: ProgressTag;

  if (meets) {
    tag = PROGRESS_TAGS.MEETS_REQUIREMENT;
  } else if (comparator === "equal") {
    tag =
      actualValue > target
        ? PROGRESS_TAGS.ABOVE_REQUIREMENT
        : PROGRESS_TAGS.BELOW_REQUIREMENT;
  } else {
    tag =
      actualValue < target
        ? PROGRESS_TAGS.ABOVE_REQUIREMENT
        : PROGRESS_TAGS.BELOW_REQUIREMENT;
  }

  const mapped = mapProgressTagToMetricStatus(tag);

  return {
    label,
    value: actualValue,
    target,
    tag,
    status: mapped.status,
    statusText: mapped.statusText,
  };
}
