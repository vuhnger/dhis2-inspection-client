import { 
    INSPECTION_STANDARDS, 
    PROGRESS_TAGS,
    mapProgressTagToMetricStatus, 
    type StandardKey 
} from "./hooks/useInspection";

import type { MetricCardProps } from "./components/MetricCard/MetricCard"; // adjust path
import type { ProgressTag } from "./hooks/useInspection";

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

  // 1) Check if it meets the requirement
  let meets = false;

  switch (comparator) {
    case "equal":
      meets = actualValue === target;
      break;
    case "lessThan":
      meets = actualValue < target;
      break;
  }

  // 2) Decide Above / Meets / Below
  let tag: ProgressTag;

  if (meets) {
    tag = PROGRESS_TAGS.MEETS_REQUIREMENT;
  } else if (comparator === "equal") {
    // For "equal" metrics, higher than target = above, lower = below
    tag =
      actualValue > target
        ? PROGRESS_TAGS.ABOVE_REQUIREMENT
        : PROGRESS_TAGS.BELOW_REQUIREMENT;
  } else {
    // comparator === "lessThan"
    // For "lessThan" metrics, much smaller than target is "above" requirement (better),
    // otherwise it's "below".
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
