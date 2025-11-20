import * as React from "react";
import { useParams } from "react-router-dom";
import { getInspectionById } from "../../shared/db";
import type { Inspection } from "../../shared/types/inspection";

export type InspectionFetchStatus = "loading" | "success" | "error";

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
  inspection: Inspection
): ObtainedInspectionData {
  const { formData } = inspection;

  const schoolName = inspection.orgUnitName;
  const inspectionDate = formatInspectionDate(inspection.eventDate);

  // Resources
  const textbooks = formData.textbooks;
  const desks = formData.desks;
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

  const summary = React.useMemo(
    () => (inspection ? buildObtainedInspectionData(inspection) : null),
    [inspection]
  );

  return { inspection, summary, status, error };
};

