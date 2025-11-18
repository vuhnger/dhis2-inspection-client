import React from "react";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Layers,
} from "lucide-react";
import styles from './Dashboard.module.css';
import BottomNavBar from "./BottomNavBar"; 


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


const TopHeader: React.FC<HeaderProps> = ({schoolName, inspectionDate, logoSrc, pageTitle = "Inspection Summary"}) => {
  return (
    <div className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.headerIcon}>
          {logoSrc ? (<img src={logoSrc} alt="School logo" />) :
           ( <Layers size={32} color="white" /> )}
        </div>
        <div className={styles.headerText}>
          <h1 className={styles.headerTitle}>{pageTitle}</h1>
          <p className={styles.schoolName}>{schoolName}</p>
          <p className={styles.inspectionDate}>{inspectionDate}</p>
        </div>
      </div>
    </div>
  );
};


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

// Section Container - Groups cards with a title and status badge
interface SectionContainerProps {
  title: string;
  status: "no progress" | "improved" | "decline";
  children: React.ReactNode;
}

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


const SchoolInspectorDashboard: React.FC = () => {

  console.log("Dashboard loaded")
  // Dummy/hardcoda data
  const schoolData = {
    schoolName: "Edutopia school 1",
    inspectionDate: "04.11.2025",
    logoSrc: undefined, // Use default icon
  };

  return (
    <div className={styles.dashboardContainer}>
      <TopHeader
        schoolName={schoolData.schoolName}
        inspectionDate={schoolData.inspectionDate}
        logoSrc={schoolData.logoSrc}
      />

      
      <div className={styles.content}>
        
        <SectionContainer title="Resources" status="no progress">
          <div className={styles.cardGrid}>
            <MetricCard
              label="Textbooks"
              value={35}
              status="success"
              statusText="Status: Meets Minimum 1:1"
            />
            <MetricCard
              label="Desks"
              value={24}
              status="error"
              statusText="Status: Large deviations >1"
            />
            <MetricCard
              label="Chairs"
              value={65}
              status="info"
              statusText="Status: Below standard"
            />
          </div>
        </SectionContainer>

        
        <SectionContainer title="Facilities" status="improved">
          <div className={styles.cardGrid}>
            <MetricCard
              label="Toilets"
              value={5}
              status="success"
              statusText="Status: Ratio <25:1"
            />
          </div>
        </SectionContainer>

        
        <SectionContainer title="Students" status="decline">
          <div className={styles.cardGrid}>
            <MetricCard
              label="Females"
              value={35}
              status="success"
              statusText="Status: Within range"
            />
            <MetricCard
              label="Males"
              value={24}
              status="error"
              statusText="Status: Below target"
            />
            <MetricCard
              label="Gender GPI"
              value={0.82}
              status="info"
              statusText="Ratio metric"
            />
          </div>
        </SectionContainer>


        <SectionContainer title="Staff" status="improved">
          <div className={styles.cardGrid}>
            <MetricCard
              label="Teachers"
              value={10}
              status="success"
              statusText="Status: Ratio <45:1"
            />
            <MetricCard
              label="Females"
              value={5}
              status="success"
              statusText="Status: +30%"
            />
            <MetricCard
              label="Males"
              value={24}
              status="error"
              statusText="Status: -15%"
            />
            <MetricCard
              label="Gender GPI"
              value={0.82}
              status="info"
              statusText="Status: Below standard"
            />
          </div>
        </SectionContainer>

        
      </div>
      <BottomNavBar/>
    </div>
  )

}


export default SchoolInspectorDashboard; 




