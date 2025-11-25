import * as React from "react";
import { useParams } from "react-router-dom";

import { getInspectionById } from "../../../shared/db";
import { getApiBase, getAuthHeader } from "../../../shared/utils/auth";

import type { Inspection, InspectionFormData, SyncStatus } from "../../../shared/types/inspection";

export type InspectionFetchStatus = "loading" | "success" | "error";

export const INSPECTION_STANDARDS = {
  seatToLearner: {
    label: "Seat-to-learner ratio",
    comparator: "equal" as const,
    target: 1, // 1:1
  },
  textbookToLearner: {
    label: "Textbook-to-learner ratio",
    comparator: "equal" as const,
    target: 1, // 1:1
  },
  learnerToClassroom: {
    label: "Learner-to-classroom ratio",
    comparator: "lessThan" as const,
    target: 53, // <53:1
  },
  learnerToTeacher: {
    label: "Learner-to-teacher ratio",
    comparator: "lessThan" as const,
    target: 45, // <45:1
  },
  learnerToToilet: {
    label: "Learner-to-toilet ratio",
    comparator: "lessThan" as const,
    target: 25, // <25:1
  },
  gpiLearners: {
    label: "Gender Parity Index (learners)",
    comparator: "equal" as const,
    target: 1, // female learners / male learners
  },
  gpiTeachers: {
    label: "Gender Parity Index (teachers)",
    comparator: "equal" as const,
    target: 1, // female teachers / male teachers
  },
}

// Type: "seatToLearner" | "textbookToLearner" | ... etc.
export type StandardKey = keyof typeof INSPECTION_STANDARDS;

// Type of one standard object
export type StandardConfig = (typeof INSPECTION_STANDARDS)[StandardKey];

export const PROGRESS_TAGS = {
  ABOVE_REQUIREMENT: {
    id: "above-requirement",
    label: "Above requirement",
  },
  MEETS_REQUIREMENT: {
    id: "meets-requirement",
    label: "Meets requirement",
  },
  BELOW_REQUIREMENT: {
    id: "below-requirement",
    label: "Below requirement",
  },
}

// Type for a tag object
export type ProgressTag =
  (typeof PROGRESS_TAGS)[keyof typeof PROGRESS_TAGS];

export type MetricStatus = "success" | "warning" | "error" | "info";

/**
 * Converts a ProgressTag into the status + statusText
 * used by MetricCard.
 */
export function mapProgressTagToMetricStatus(
  tag: ProgressTag
): { status: MetricStatus; statusText: string } {
  switch (tag.id) {
    case PROGRESS_TAGS.BELOW_REQUIREMENT.id:
      return {
        status: "error",
        statusText: "Below requirement",
      };
    case PROGRESS_TAGS.ABOVE_REQUIREMENT.id:
      return {
        status: "info",
        statusText: "Above requirement",
      };
    case PROGRESS_TAGS.MEETS_REQUIREMENT.id:
      return {
        status: "success",
        statusText: "Meets requirement",
      };
    default:
      return {
        status: "info",
        statusText: tag.label,
      };
  }
}



interface UseInspectionResult {
  inspection: Inspection | null;
  status: InspectionFetchStatus;
  error: string | null;
}

/**
 * Fetches an Inspection based on the `id` in the route params.
 * Returns the inspection (or null), plus status & error.
 */
export const useInspectionFromRoute = (): UseInspectionResult => {
  const { id } = useParams<{ id: string }>();

  const [inspection, setInspection] = React.useState<Inspection | null>(null);
  const [status, setStatus] = React.useState<InspectionFetchStatus>("loading");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!id) {
      setError("No inspection id provided in the URL.");
      setInspection(null);
      setStatus("error");
      return;
    }

    let isMounted = true;
    setStatus("loading");
    setError(null);
    setInspection(null);

    getInspectionById(id)
      .then((result: Inspection | null) => {
        if (!isMounted) return;

        if (!result) {
          setError("Inspection not found.");
          setInspection(null);
          setStatus("error");
        } else {
          setInspection(result);
          setStatus("success");
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        console.error("Failed to load inspection", err);
        setError("Failed to load inspection.");
        setInspection(null);
        setStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  return { inspection, status, error };
};


export interface ObtainedInspectionData {
  schoolName: string;
  inspectionDate: string;
  textbooks: number;
  desks: number;
  chairs: number;
  totalStudents: number;
  maleStudents: number;
  femaleStudents: number;
  genderGpi: number;
  staffCount: number;
  classrooms: number;
}

// Small helper to format like "13.sep.2025" if you want to mimic the design
function formatInspectionDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("no-NO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Builds and returns data from the Inspection object.
 * Call only when inspection is not null.
 */
export function buildObtainedInspectionData(
  inspection: Inspection,
  formDataOverride?: InspectionFormData
): ObtainedInspectionData {
  const formData = formDataOverride ?? inspection.formData;

  const schoolName = inspection.orgUnitName;
  const inspectionDate = formatInspectionDate(inspection.eventDate);

  // Resources
  const textbooks = formData.textbooks;
  const desks = (formData as any).desks ?? 0;
  const chairs = formData.chairs;

  // Students
  const totalStudents = Number(formData.totalStudents || 0);
  const maleStudents = Number(formData.maleStudents || 0);
  const femaleStudents = Number(formData.femaleStudents || 0);

  const genderGpi =
    maleStudents > 0 ? Number((femaleStudents / maleStudents).toFixed(2)) : 0;

  // Staff
  const staffCount = Number(formData.staffCount || 0);

  // Facilities
  const classrooms = Number(formData.classroomCount || 0);

  return {
    schoolName,
    inspectionDate,
    textbooks,
    desks,
    chairs,
    totalStudents,
    maleStudents,
    femaleStudents,
    genderGpi,
    staffCount,
    classrooms,
  };
}

interface UseInspectionSummaryResult {
  inspection: Inspection | null;
  summary: ObtainedInspectionData | null;
  categoryList: Array<{ id: string; name: string }>;
  activeCategoryId: string;
  setActiveCategoryId: (id: string) => void;
  activeCategorySyncStatus?: SyncStatus;
  activeCategoryEventId?: string;
  status: InspectionFetchStatus;
  error: string | null;
}

/**
 * Convenience hook for the Summary screen:
 * - Fetches inspection from the route
 * - Computes the derived/visible data
 */
export const useInspectionSummary = (): UseInspectionSummaryResult => {
  const { inspection, status, error } = useInspectionFromRoute();
  const [isOnline, setIsOnline] = React.useState<boolean>(navigator.onLine);
  const [categoryList, setCategoryList] = React.useState<Array<{ id: string; name: string }>>([]);
  const [activeCategoryId, setActiveCategoryId] = React.useState<string>("default");

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const ALLOWED_CATEGORY_GROUP_IDS = React.useMemo(
    () => new Set(["ib40OsG9QAI", "SPCm0Ts3SLR", "sSgWDKuCrmi", "UzSEGuwAfyX"]),
    []
  );

  // Fetch or derive categories
  React.useEffect(() => {
    const deriveFromLocal = () => {
      if (!inspection) return [];
      const categories =
        (inspection.orgUnitCategories || [])
          .filter((c) => ALLOWED_CATEGORY_GROUP_IDS.has(c.id)) || [];
      if (categories.length) return categories;

      if (inspection.formDataByCategory) {
        return Object.keys(inspection.formDataByCategory).map((id) => ({
          id,
          name: id,
        }));
      }
      return [];
    };

    if (!inspection) {
      setCategoryList([]);
      return;
    }

    // Offline: use local data only
    if (!isOnline) {
      const localCats = deriveFromLocal();
      setCategoryList(
        localCats.length ? localCats : [{ id: "default", name: "General" }]
      );
      return;
    }

    // Online: try fetching org unit groups
    const fetchCategories = async () => {
      try {
        const apiBase = getApiBase();
        const res = await fetch(
          `${apiBase}/organisationUnits/${inspection.orgUnit}?fields=organisationUnitGroups[id,name,displayName]`,
          { headers: { Authorization: getAuthHeader() } }
        );
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        const categories =
          (data?.organisationUnitGroups || [])
            .filter((g: any) => ALLOWED_CATEGORY_GROUP_IDS.has(g.id))
            .map((g: any) => ({
              id: g.id,
              name: g.displayName || g.name,
            })) || [];

        if (categories.length) {
          setCategoryList(categories);
          return;
        }
        const fallback = deriveFromLocal();
        setCategoryList(
          fallback.length ? fallback : [{ id: "default", name: "General" }]
        );
      } catch (err) {
        console.warn("Failed to fetch categories, using local fallback", err);
        const fallback = deriveFromLocal();
        setCategoryList(
          fallback.length ? fallback : [{ id: "default", name: "General" }]
        );
      }
    };

    fetchCategories();
  }, [inspection, isOnline, ALLOWED_CATEGORY_GROUP_IDS]);

  React.useEffect(() => {
    if (categoryList.length && !categoryList.some((c) => c.id === activeCategoryId)) {
      setActiveCategoryId(categoryList[0].id);
    }
  }, [categoryList, activeCategoryId]);

  const activeFormData: InspectionFormData | undefined = React.useMemo(() => {
    if (!inspection) return undefined;
    if (inspection.formDataByCategory && inspection.formDataByCategory[activeCategoryId]) {
      return inspection.formDataByCategory[activeCategoryId].formData;
    }
    return inspection.formData;
  }, [inspection, activeCategoryId]);

  const activeCategorySyncStatus =
    inspection?.categorySyncStatus?.[activeCategoryId] || inspection?.syncStatus;
  const activeCategoryEventId =
    inspection?.categoryEventIds?.[activeCategoryId] || inspection?.dhis2EventId;

  const summary = React.useMemo(
    () =>
      inspection && activeFormData
        ? buildObtainedInspectionData(inspection, activeFormData)
        : null,
    [inspection, activeFormData]
  );

  return {
    inspection,
    summary,
    categoryList,
    activeCategoryId,
    setActiveCategoryId,
    activeCategorySyncStatus,
    activeCategoryEventId,
    status,
    error,
  };
};
