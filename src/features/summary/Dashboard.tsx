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

type SectionStatus = "no progress" | "improved" | "decline";
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
  status: "no progress" | "improved" | "decline";
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
  status: "no progress" | "improved" | "decline";
  children: React.ReactNode;
}

interface SchoolInspectorDashboardProps {
  inspection: Inspection;
}

interface BaseMetric {
  label: string;
  value: number;
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


/* Section Badge */
const StatusBadge: React.FC<SectionStatusProps> = ({title, status, count}) => {

    // Henter status og tiklhørende bakgrunnsfarge
    const getStatusColor = (status: string) => {
        switch (status) {
        case "no progress":
            return styles.statusNoProgress;
        case "improved":
            return styles.statusImproved;
        case "decline":
            return styles.statusDecline;
        default:
            return "";
        }
    };

  return (
    <div className={`${styles.statusBadge} ${getStatusColor(status)}`}>
      <span className={styles.statusLabel}>{status}</span>
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

const toNumber = (v: number | string | undefined): number => {
  if (typeof v === "number") return v;
  if (!v) return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
};

// Rank worst to best
const metricStatusRank: Record<MetricStatus, number> = {
  error: 0,
  warning: 1,
  info: 2,
  success: 3,
};

// Sort metrics by progress (worst first so issues are most visuible)
const sortMetricsByProgress = (metrics: MetricCardProps[]): MetricCardProps[] =>
  [...metrics].sort(
    (a, b) => metricStatusRank[a.status] - metricStatusRank[b.status]
  );


// Obtain section status from containing metrics
const getSectionStatusFromMetrics = (
  metrics: MetricCardProps[]
): SectionStatus => {
  const hasError = metrics.some((m) => m.status === "error");
  const hasWarningOrInfo = metrics.some(
    (m) => m.status === "warning" || m.status === "info"
  );
  const allSuccess = metrics.every((m) => m.status === "success");

  if (hasError) return "decline";
  if (allSuccess) return "improved";
  if (hasWarningOrInfo) return "no progress";

  // Fallback
  return "no progress";
};



/**
 * Build MetricCardProps from raw values using generic rules:
 * - If all values are 0 → info: "No data recorded"
 * - If value === 0    → error: "No data recorded"
 * - If value >= average of non-zero values → success: "At or above section average"
 * - If value < average → warning: "Below section average"
 */
const buildMetricsFromValues = (
  values: BaseMetric[],
  sectionName: string
): MetricCardProps[] => {
  if (values.length === 0) return [];

  const nonZero = values.filter((v) => v.value > 0);
  const allZero = nonZero.length === 0;

  if (allZero) {
    // No data at all in this section
    return values.map((v) => ({
      label: v.label,
      value: v.value,
      status: "info",
      statusText: `No data recorded for ${sectionName.toLowerCase()}`,
    }));
  }

  const avg =
    nonZero.reduce((sum, m) => sum + m.value, 0) / nonZero.length;

  return values.map((m) => {
    if (m.value === 0) {
      return {
        label: m.label,
        value: m.value,
        status: "error",
        statusText: "No data recorded",
      };
    }

    if (m.value >= avg) {
      return {
        label: m.label,
        value: m.value,
        status: "success",
        statusText: "At or above section average",
      };
    }

    return {
      label: m.label,
      value: m.value,
      status: "warning",
      statusText: "Below section average",
    };
  });
};


/* Main Summary Screen*/
const SchoolInspectorDashboard: React.FC = () => {

  const { id } = useParams<{ id: string }>();
  const [inspection, setInspection] = React.useState<Inspection | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!id) {
      setLoadError("No inspection id provided in the URL.");
      setLoading(false);
      return;
    }

  let isMounted = true;

  getInspectionById(id)
      .then((result: Inspection | null) => {
        if (!isMounted) return;
        if (!result) {
          setLoadError("Inspection not found.");
        } else {
          setInspection(result);
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        console.error("Failed to load inspection", err);
        setLoadError("Failed to load inspection.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

      return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return <div className={styles.dashboardContainer}>Loading inspection...</div>;
  }

  if (loadError || !inspection) {
    return (
      <div className={styles.dashboardContainer}>
        <TopHeader
          schoolName="Unknown school"
          inspectionDate=""
          logoSrc={undefined}
          pageTitle="Inspection Summary"
        />
        <div className={styles.content}>
          <p>{loadError ?? "Inspection could not be loaded."}</p>
        </div>
        <BottomNavBar />
      </div>
    );
  }

  if (loading) {
    return <div className={styles.dashboardContainer}>Loading inspection...</div>;
  }

  console.log("Dashboard loaded for inspection", inspection.id);

  const { formData } = inspection;

  // Header data from inspection
  const schoolName = inspection.orgUnitName;
  const inspectionDate = new Date(inspection.eventDate).toLocaleDateString();

  // Resources
  const textbooks = formData.textbooks;
  const desks = formData.desks;
  const chairs = formData.chairs;

  // Students
  const totalStudents = toNumber(formData.totalStudents);
  const maleStudents = toNumber(formData.maleStudents);
  const femaleStudents = toNumber(formData.femaleStudents);
  const genderGpi =
    maleStudents > 0 ? Number((femaleStudents / maleStudents).toFixed(2)) : 0;

  // Staff
  const staffCount = toNumber(formData.staffCount);

  // Facilities
  const classrooms = toNumber(formData.classroomCount);

  // 1) Build base metrics from Inspection.formData
  const resourceBase: BaseMetric[] = [
    { label: "Textbooks", value: toNumber(textbooks) },
    { label: "Desks", value: toNumber(desks) },
    { label: "Chairs", value: toNumber(chairs) },
  ];

  const facilitiesBase: BaseMetric[] = [
    { label: "Classrooms", value: classrooms },
  ];

  const studentBase: BaseMetric[] = [
    { label: "Females", value: femaleStudents },
    { label: "Males", value: maleStudents },
    { label: "Gender GPI", value: genderGpi },
  ];

  const staffBase: BaseMetric[] = [
    { label: "Staff", value: staffCount },
  ];

  // 2) Build MetricCardProps per section
  const resourceMetrics = buildMetricsFromValues(resourceBase, "Resources");
  const facilitiesMetrics = buildMetricsFromValues(facilitiesBase, "Facilities");
  const studentMetrics = buildMetricsFromValues(studentBase, "Students");
  const staffMetrics = buildMetricsFromValues(staffBase, "Staff");

  // 3) Sort each section by progress
  const sortedResourceMetrics = sortMetricsByProgress(resourceMetrics);
  const sortedFacilitiesMetrics = sortMetricsByProgress(facilitiesMetrics);
  const sortedStudentMetrics = sortMetricsByProgress(studentMetrics);
  const sortedStaffMetrics = sortMetricsByProgress(staffMetrics);

  // 4) Derive section status from sorted metrics
  const resourcesSectionStatus =
    getSectionStatusFromMetrics(sortedResourceMetrics);
  const facilitiesSectionStatus =
    getSectionStatusFromMetrics(sortedFacilitiesMetrics);
  const studentsSectionStatus =
    getSectionStatusFromMetrics(sortedStudentMetrics);
  const staffSectionStatus =
    getSectionStatusFromMetrics(sortedStaffMetrics);

  // 5) One reusable sections array driving the UI
  const sections: SectionConfig[] = [
    {
      key: "resources",
      title: "Resources",
      metrics: sortedResourceMetrics,
      status: resourcesSectionStatus,
    },
    {
      key: "facilities",
      title: "Facilities",
      metrics: sortedFacilitiesMetrics,
      status: facilitiesSectionStatus,
    },
    {
      key: "students",
      title: "Students",
      metrics: sortedStudentMetrics,
      status: studentsSectionStatus,
    },
    {
      key: "staff",
      title: "Staff",
      metrics: sortedStaffMetrics,
      status: staffSectionStatus,
    },
  ];


  return (
      <div className={styles.dashboardContainer}>
      <TopHeader
        schoolName={schoolName}
        inspectionDate={inspectionDate}
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
            <div className={styles.cardGrid}>
              {section.metrics.map((metric) => (
                <MetricCard key={metric.label} {...metric} />
              ))}
            </div>
          </SectionContainer>
      ))}
      </div>

      <BottomNavBar />
    </div>
  );

}


export default SchoolInspectorDashboard; 



