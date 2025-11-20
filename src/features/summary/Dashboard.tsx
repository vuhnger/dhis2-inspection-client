import React from "react";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Layers,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import styles from './Dashboard.module.css';
import BottomNavBar from "./BottomNavBar"; 
import { getInspectionById } from "../../shared/db";
import type { Inspection } from "../../shared/types/inspection";

type SectionStatus =
  | "below requirement"
  | "meets requirement"
  | "above requirement";

type MetricStatus = "success" | "warning" | "error" | "info";

/* Interfaces */
interface HeaderProps {
  schoolName: string;
  inspectionDate: string;
  logoSrc?: string;
  pageTitle?: string;
}

interface SectionStatusProps {
  title: string;
  status: SectionStatus;  
  count?: number;
}

interface MetricCardProps {
  label: string;
  value: number;
  status: "success" | "warning" | "error" | "info";
  statusText: string;
}

interface SectionContainerProps {
  title: string;
  status: SectionStatus;   // <-- use the type alias
  children: React.ReactNode;
}

interface SectionConfig {
  key: string;
  title: string;
  metrics: MetricCardProps[];
  status: SectionStatus;
}


/* Header */

const TopHeader: React.FC<HeaderProps> = ({schoolName, inspectionDate, logoSrc, pageTitle = "Inspection Summary"}) => {
  const navigate = useNavigate();

  return (
    <div className={styles.header}>
      <div className={styles.headerContent}>

        {/* Venstre siden */}
        <div className={styles.headerIcon}>
          {logoSrc ? (<img src={logoSrc} alt="School logo" />) :
           ( <Layers size={32} color="white" /> )}
        </div>

        <div className={styles.headerText}>
          <h1 className={styles.headerTitle}>{pageTitle}</h1>
          <p className={styles.schoolName}>{schoolName}</p>
          <p className={styles.inspectionDate}>{inspectionDate}</p>
        </div>

        {/* Høyre siden */}
        {/* TODO: endre navigation til korrekt path så det ikke blir noe knot */}
        <button className={styles.editButton} onClick={() => navigate("inspection")}>
          Back To Inspection
        </button>

      </div>
    </div>
  );
};


const StatusBadge: React.FC<SectionStatusProps> = ({ title, status, count }) => {
  const getStatusColor = (status: SectionStatus) => {
    switch (status) {
      case "below requirement":
        return styles.statusDecline;      // red
      case "meets requirement":
        return styles.statusNoProgress;   // yellow
      case "above requirement":
        return styles.statusImproved;     // green
      default:
        return "";
    }
  };


    const getStatusLabel = (status: SectionStatus) => {
    switch (status) {
      case "below requirement":
        return "Below Requirements";
      case "meets requirement":
        return "Meets Requirements";
      case "above requirement":
        return "Above Requirements";
      default:
        return "";
    }
  };

  return (
    <div className={`${styles.statusBadge} ${getStatusColor(status)}`}>
      <span className={styles.statusLabel}>{getStatusLabel(status)}</span>
      {count && <span className={styles.statusCount}>{count}</span>}
    </div>
  );
};

/* Metric card */
// Kortet som inneholder navn på elementet, antall elementer og status
const MetricCard: React.FC<MetricCardProps> = ({label, value, status, statusText}) => {

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle size={24} className={styles.iconSuccess} />;
      case "error":
        return <XCircle size={24} className={styles.iconError} />;
      case "warning":
        return <AlertCircle size={24} className={styles.iconWarning} />;
      case "info":
        return <AlertCircle size={24} className={styles.iconInfo} />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.metricCard}>
      <h3 className={styles.metricLabel}>{label}</h3>
      <div className={styles.metricContent}>
        <span className={styles.metricValue}>{value}</span>
        <div className={styles.metricIcon}>{getStatusIcon(status)}</div>
      </div>
      <p className={styles.metricStatus}>{statusText}</p>
    </div>
  );
};

/* Section Container - Groups cards with a title and status badge */
const SectionContainer: React.FC<SectionContainerProps> = ({
  title,
  status,
  children,
}) => {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <StatusBadge title={title} status={status} />
      </div>
      <div className={styles.sectionContent}>{children}</div>
    </div>
  );
};



/* Helpers for process logic */

/*
-- Standards --
Seat-to-learner ratio is 1:1
Textbook-to-learner ratio across all levels and subjects is 1:1
Learner-to-classroom ratio is <53:1
Learner-to-teacher ratio across all levels is <45:1
Learner-to-toilet ratio is <25:1

Gender Parity Index (GPI): 
- the number of female learners divided by males 
- and the number of female teachers divided by males

-- Tags and Progress Suggestions --
Above requirement
Meets requirement
Below requirement

-- Comparising --
Could compare with the school overtime
Could compare with other schools in the cluster
Could compare with the standards
Or all of these

-- Inspection Object --
interface Inspection {
    // Primary key - auto-generated UUID
    id: string

    // School/org unit information
    orgUnit: string
    orgUnitName: string

    // Scheduling information
    eventDate: string // ISO 8601 format
    scheduledStartTime?: string // e.g., "16:00"
    scheduledEndTime?: string // e.g., "17:30"

    // Status tracking
    status: InspectionStatus
    syncStatus: SyncStatus

    // Form data - all inspection fields
    formData: InspectionFormData

    // Metadata
    createdAt: string // ISO 8601 format
    updatedAt: string // ISO 8601 format

    // DHIS2 integration
    dhis2EventId?: string // If synced to DHIS2
}

interface InspectionFormData {
    // Resources
    textbooks: number
    desks: number
    chairs: number
    testFieldNotes: string

    // Students
    totalStudents: string
    maleStudents: string
    femaleStudents: string

    // Staff
    staffCount: string

    // Facilities
    classroomCount: string
}

*/

// Inspections Standards
const INSPECTION_STANDARDS = {
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

type StandardKey = keyof typeof INSPECTION_STANDARDS;
type StandardConfig = (typeof INSPECTION_STANDARDS)[StandardKey];
type ProgressTag = (typeof PROGRESS_TAGS)[keyof typeof PROGRESS_TAGS];


// Progress tags
const PROGRESS_TAGS = {
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

interface EvaluatedMetric {
  key: StandardKey;
  label: string;
  value: number;
  target: number;
  tag: ProgressTag;
}

function mapProgressTagToMetricStatus(
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

interface SectionDefinition {
  key: string;
  title: string;
  metricKeys: StandardKey[];
}

const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    key: "resources",
    title: "Resources",
    metricKeys: ["seatToLearner", "textbookToLearner"],
  },
  {
    key: "learningEnvironment",
    title: "Learning Environment",
    metricKeys: ["learnerToClassroom", "learnerToToilet"],
  },
  {
    key: "staffing",
    title: "Staffing & Teaching",
    metricKeys: ["learnerToTeacher"],
  },
  {
    key: "genderParity",
    title: "Gender Parity",
    metricKeys: ["gpiLearners"],
  },
];

function getSectionStatusFromMetrics(
  metrics: EvaluatedMetric[]
): SectionStatus {
  const hasBelow = metrics.some(
    (m) => m.tag.id === PROGRESS_TAGS.BELOW_REQUIREMENT.id
  );
  const hasMeets = metrics.some(
    (m) => m.tag.id === PROGRESS_TAGS.MEETS_REQUIREMENT.id
  );
  const hasAbove = metrics.some(
    (m) => m.tag.id === PROGRESS_TAGS.ABOVE_REQUIREMENT.id
  );

  if (hasBelow) return "below requirement";
  if (hasMeets) return "meets requirement";
  if (hasAbove) return "above requirement";

  // Fallback (shouldn't really happen)
  return "meets requirement";
}



// Fetches Inspection object
type InspectionFetchStatus = "loading" | "success" | "error";

interface UseInspectionResult {
  inspection: Inspection | null;
  status: InspectionFetchStatus;
  error: string | null;
}

// Fetches an Inspection based on the 'id' in the route
// Returns the inspection or null if it fails, 
// As well as a status indicator.
const fetchInspection = (): UseInspectionResult => {
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

interface ObtainedInspectionData {
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

// Builds and returns data from the Inspection object, if and only if it is not null
// Have an if statement before calling this method 
function buildObtainedInspectionData(
  inspection : Inspection
): ObtainedInspectionData {

  const { formData } = inspection;

  const schoolName = inspection.orgUnitName;
  const inspectionDate = new Date(inspection.eventDate).toLocaleDateString();

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

// Helper methods for comparing
interface RetrievedMetrics {
  seatToLearner: number;
  textbookToLearner: number;
  learnerToClassroom: number;
  learnerToTeacher: number;
  gpiLearners: number;
}

function buildRetrivedInspectionMetrics(data: ObtainedInspectionData) {
  return {
    seatToLearner: data.chairs > 0 ? data.totalStudents / data.chairs : 0,
    textbookToLearner: data.textbooks > 0 ? data.totalStudents / data.textbooks : 0,
    learnerToClassroom: data.classrooms > 0 ? data.totalStudents / data.classrooms : 0,
    learnerToTeacher: data.staffCount > 0 ? data.totalStudents / data.staffCount : 0,
    gpiLearners: data.genderGpi,
  };
}

// Metric evaluator
function evaluateMetric(value: number, standard: StandardConfig) {
  switch (standard.comparator) {
    case "equal":
      if (value === standard.target) return PROGRESS_TAGS.MEETS_REQUIREMENT;
      if (value > standard.target) return PROGRESS_TAGS.ABOVE_REQUIREMENT;
      return PROGRESS_TAGS.BELOW_REQUIREMENT;

    case "lessThan":
      if (value < standard.target) return PROGRESS_TAGS.MEETS_REQUIREMENT;
      return PROGRESS_TAGS.BELOW_REQUIREMENT;

    default:
      return PROGRESS_TAGS.BELOW_REQUIREMENT;
  }
}

// Evaluating all metrics
function evaluateAllInspectionMetrics(
  metrics: RetrievedMetrics
): EvaluatedMetric[] {
  const results: EvaluatedMetric[] = [];

  (Object.keys(INSPECTION_STANDARDS) as StandardKey[]).forEach((key) => {
    const standard = INSPECTION_STANDARDS[key];
    const value = (metrics as any)[key] ?? 0;

    results.push({
      key,
      label: standard.label,
      value,
      target: standard.target,
      tag: evaluateMetric(value, standard),
    });
  });

  return results;
}


// Logic for displaying the metrocs based in requirements/standards
/*
  1. Below standards
  2. Above standards
  3. Meet standards
*/

interface EvaluatedMetric {
  key: StandardKey;
  label: string;
  value: number;
  target: number;
  tag: ProgressTag;
}

function sortEvaluatedMetrics(evaluated: EvaluatedMetric[]): EvaluatedMetric[] {
  const PRIORITY: Record<string, number> = {
    "below-requirement": 0,
    "meets-requirement": 1,
    "above-requirement": 2,
  };

  return [...evaluated].sort((a, b) => {
    const pa = PRIORITY[a.tag.id] ?? 99;
    const pb = PRIORITY[b.tag.id] ?? 99;

    if (pa !== pb) return pa - pb;

    // If same status, sort alphabetically by label
    return a.label.localeCompare(b.label);
  });
}


function buildSortedInspectionMetrics(
  inspection: Inspection
): EvaluatedMetric[] {
  const obtained = buildObtainedInspectionData(inspection);
  const metrics = buildRetrivedInspectionMetrics(obtained);
  const evaluated = evaluateAllInspectionMetrics(metrics);
  return sortEvaluatedMetrics(evaluated);
}

function buildDashboardSections(
  evaluatedMetrics: EvaluatedMetric[]
): SectionConfig[] {
  // 1. Build all sections
  const sections: SectionConfig[] = SECTION_DEFINITIONS.map((sectionDef) => {
    const sectionMetrics = evaluatedMetrics.filter((m) =>
      sectionDef.metricKeys.includes(m.key)
    );

    if (sectionMetrics.length === 0) {
      return null;
    }

    // Sort metrics inside this section
    const sortedMetrics = sortEvaluatedMetrics(sectionMetrics);

    // Compute section status based on its sorted metrics
    const sectionStatus = getSectionStatusFromMetrics(sortedMetrics);

    // Convert evaluated metrics → MetricCardProps for UI
    const metricCards: MetricCardProps[] = sortedMetrics.map((m) => {
      const { status, statusText } = mapProgressTagToMetricStatus(m.tag);

      return {
        label: m.label,
        value: Number(m.value.toFixed(2)),
        status,
        statusText,
      };
    });

    return {
      key: sectionDef.key,
      title: sectionDef.title,
      metrics: metricCards,
      status: sectionStatus,
    };
  }).filter((s): s is SectionConfig => s !== null);

  // 2. Sort the SECTIONS by their status
  const SECTION_PRIORITY: Record<SectionStatus, number> = {
    "below requirement": 0,
    "meets requirement": 1,
    "above requirement": 2,
  };

  sections.sort((a, b) => {
    const pa = SECTION_PRIORITY[a.status];
    const pb = SECTION_PRIORITY[b.status];
    return pa - pb;
  });

  return sections;
}



/* Main Summary Screen*/
const SchoolInspectorDashboard: React.FC = () => {
  const { inspection, status, error } = fetchInspection();

  if (status === "loading") {
    return (
      <div className={styles.dashboardContainer}>
        Loading inspection...
      </div>
    );
  }

  if (status === "error" || !inspection) {
    return (
      <div className={styles.dashboardContainer}>
        <TopHeader
          schoolName="Unknown school"
          inspectionDate=""
          logoSrc={undefined}
          pageTitle="Inspection Summary"
        />
        <div className={styles.content}>
          <p>{error ?? "Inspection could not be loaded."}</p>
        </div>
        <BottomNavBar />
      </div>
    );
  }

  // Build all the data pipeline for this inspection
  const obtained = buildObtainedInspectionData(inspection);
  const metrics = buildRetrivedInspectionMetrics(obtained);
  const evaluated = evaluateAllInspectionMetrics(metrics);
  const sections = buildDashboardSections(evaluated);

  return (
    <div className={styles.dashboardContainer}>
      <TopHeader
        schoolName={obtained.schoolName}
        inspectionDate={obtained.inspectionDate}
        logoSrc={undefined}
        pageTitle="Inspection Summary"
      />

      <div className={styles.content}>
        {sections.map((section) => (
          <SectionContainer
            key={section.key}
            title={section.title}
            status={section.status}
          >
            {section.metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                status={metric.status}
                statusText={metric.statusText}
              />
            ))}
          </SectionContainer>
        ))}
      </div>

      <BottomNavBar />
    </div>
  );

}

export default SchoolInspectorDashboard; 



