import React, { useState } from "react";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Layers,
} from "lucide-react";
import styles from "./RecountData.module.css";
import { Button, TextArea } from '@dhis2/ui';
import BottomNavBar from "./BottomNavBar"; 


interface HeaderProps {
  schoolName: string;
  inspectionDate: string;
  logoSrc?: string;
  pageTitle?: string;
}

interface ResourceRowProps {
  item: string;
  previous: number;
  recount: number;
  status: "ok" | "warning" | "error";
}

interface ResourceItem {
  item: string;
  previous: number;
  recount: number;
  status: "ok" | "warning" | "error";
}

interface ResourceRecountTableProps {
  data: ResourceItem[];
}

// Dummy data
const resourceData: ResourceItem[] = [
  { item: "Textbooks", previous: 120, recount: 95, status: "error" },
  { item: "Desks", previous: 40, recount: 45, status: "ok" },
  { item: "Chairs", previous: 45, recount: 38, status: "warning" },
  { item: "Teachers", previous: 40, recount: 40, status: "ok" },
];


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


const getStatusIcon = (status: ResourceRowProps["status"]) => {
  switch (status) {
    case "ok":
      return "✅";
    case "warning":
      return "⚠️";
    case "error":
      return "❌";
    default:
      return "";
  }
};

const ResourceRow: React.FC<ResourceRowProps> = ({ item, previous, recount, status }) => {
  const difference = recount - previous;
  const formattedDiff = difference > 0 ? `+${difference}` : `${difference}`;

  return (
    <tr>
      <td>{item}</td>
      <td>{previous}</td>
      <td>{recount}</td>
      <td>{formattedDiff}</td>
      <td>{getStatusIcon(status)}</td>
    </tr>
  );
};


const ResourceRecountTable: React.FC<ResourceRecountTableProps> = ({ data }) => {
    const [notes, setNotes] = useState("");

    const handleSave = () => {
    console.log("Saving data...");
    console.log("Notes:", notes);
    console.log("Resources:", data);
    // Replace this with proper code
  };

    return (
    <div className={styles.resourceRecountCard}>
        <h2>Resource recount</h2>
        <table className={styles.table}>
        <thead>
            <tr>
            <th>Item</th>
            <th>Previous</th>
            <th>Recount</th>
            <th>Difference</th>
            <th>Status</th>
            </tr>
        </thead>
        <tbody>
            {data.map((resource, index) => (
            <ResourceRow key={index} {...resource} />
            ))}
        </tbody>
        </table>


        <div className={styles.notesSection}>
            <label htmlFor="notes">Notes (optional)</label>
            <TextArea
            name="notes"
            value={notes}
            onChange={({value}) => setNotes(value ?? "")}
            placeholder="Add any comments or observations..."
            />
            <Button primary onClick={handleSave}>
            Save
            </Button>
        </div>
    </div>
  );
};



const RecountDataScreen: React.FC = () => {
    // Dummy hardkoda data
  const schoolData = {
    schoolName: "Edutopia school 1",
    inspectionDate: "04.11.2025",
    logoSrc: undefined,
  };

  return (
    <div className={styles.dashboardContainer}>
      <TopHeader
        schoolName={schoolData.schoolName}
        inspectionDate={schoolData.inspectionDate}
        logoSrc={schoolData.logoSrc}
        pageTitle="Recount Data"
      />
      <div className={styles.content}>
        {/* Recount-specific content here */}

        <ResourceRecountTable data={resourceData} />

      </div>
      <BottomNavBar/>
    </div>
  );
};

export default RecountDataScreen;
