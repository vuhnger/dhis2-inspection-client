import React, { useState } from "react";
import {
  Layers,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "./RecountData.module.css";
import { Button, InputField, TextArea } from '@dhis2/ui';
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
  onRecountChange: (newRecount: number) => void;
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

const ResourceRow: React.FC<ResourceRowProps> = ({ item, previous, recount, status, onRecountChange }) => {
  const difference = recount - previous;
  const formattedDiff = difference > 0 ? `+${difference}` : `${difference}`;

  return (
    <tr>
      <td>{item}</td>
      <td>{previous}</td>
      <td>
        <InputField
        type="number"
        dense
        className={styles.recountInput}
        value={String(recount)}
        onChange={({value}) =>{
            const num = Number(value ?? 0);
            onRecountChange(Number.isNaN(num)? 0 : num)
        }}
        ></InputField>
      </td>

      <td>{formattedDiff}</td>
      <td>{getStatusIcon(status)}</td>
    </tr>
  );
};


const ResourceRecountTable: React.FC<ResourceRecountTableProps> = ({ data }) => {
    const [notes, setNotes] = useState("");
    const [rows, setRows] = useState<ResourceItem[]>(data);
    const navigate = useNavigate();

    const handleRecountChange = (index: number, newRecount: number) => {
        setRows((prev) =>
        prev.map((row, i) =>
            i === index ? { ...row, recount: newRecount } : row
            )
        );
    };

    const handleSave = () => {
    navigate("/summary/RecountDatasubmitted", {
        state: {
            notes,
            data: rows,
        },
    });
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
            {rows.map((resource, index) => (
            <ResourceRow 
            key={index} 
            {...resource}
            onRecountChange={(newVal) => handleRecountChange(index, newVal)}
            />
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
