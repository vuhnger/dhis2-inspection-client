import React, { useState, useEffect } from "react";
import { Layers, Info, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./RecountData.module.css";
import { Button, TextArea } from '@dhis2/ui';
import BottomNavBar from "./BottomNavBar"; 

import { getInspectionById } from "../../shared/db";
import type { Inspection } from "../../shared/types/inspection";

/* Interfaces */
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
  onRecountChange: (newRecount: number ) => void;
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

/* Header */
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

/* Row Status Icon*/
const getStatusIcon = (status: ResourceRowProps["status"]) => {
  switch (status) {
    case "ok":
      return (
        <div className={`${styles.statusIcon} ${styles.statusOk}`}>
          <CheckCircle2 size={16} />
        </div>
      );
    case "warning":
      return (
        <div className={`${styles.statusIcon} ${styles.statusWarning}`}>
          <AlertTriangle size={16} />
        </div>
      );
    case "error":
      return (
        <div className={`${styles.statusIcon} ${styles.statusError}`}>
          <XCircle size={16} />
        </div>
      );
    default:
      return null;
  }
};

/* Table Row */
const ResourceRow: React.FC<ResourceRowProps> = ({ item, previous, recount, status, onRecountChange }) => {
  const difference = recount - previous;
  const formattedDiff = difference > 0 ? `+${difference}` : `${difference}`;

  const diffClass =
    difference > 0
      ? styles.diffPositive
      : difference < 0
      ? styles.diffNegative
      : styles.diffNeutral;

  return (
    <tr className={styles.row}>
      <td className={styles.itemCell}>{item}</td>

      <td className={styles.numberCell}>
        <div className={styles.valueChip}>{previous}</div>
        </td>

      <td className={styles.numberCell}>
        <input
          type="number"
          className={styles.recountInput}
          value={recount}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;

            if (val === "") {
                onRecountChange(null as any);
                return
            } 
            
            const num = Number(val);
            if (!Number.isNaN(num)) onRecountChange(num)

          }}
        />
      </td>

      <td className={`${styles.numberCell} ${diffClass}`}>{formattedDiff}</td>
      <td className={styles.statusCell}>{getStatusIcon(status)}</td>
    </tr>
  );
};

/* Table */ 
const ResourceRecountTable: React.FC<ResourceRecountTableProps> = ({ data }) => {
    const [notes, setNotes] = useState("");
    const [rows, setRows] = useState<ResourceItem[]>(data);
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>(); 

    const handleRecountChange = (index: number, newRecount: number) => {
        setRows((prev) =>
        prev.map((row, i) =>
            i === index ? { ...row, recount: newRecount } : row
            )
        );
    };

    const handleSave = () => {
      if (!id) {
          console.error("No inspection id in URL, cannot navigate to submitted view.");
          return;
        }


    navigate(`/summary/${id}/RecountDataSubmitted`,  {
        state: {
            notes,
            data: rows,
        },
    });
  };

    return (
    <div className={styles.resourceRecountCard}>
        
        <table className={styles.table}>
        <thead>
            <tr>
            <th className={styles.itemHead}>Item</th>
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
            <label htmlFor="notes" className={styles.notesLabel}>
                Notes (optional)
            </label>
            <TextArea
            name="notes"
            value={notes}
            onChange={({value}) => setNotes(value ?? "")}
            placeholder="Add any comments or observations..."
            />

            <div className={styles.saveButtonWrapper}>
                <Button primary className={styles.roundSaveButton} onClick={handleSave}>
                Save
                </Button>

            </div>
        </div>
    </div>
  );
};


/* Fetch Inspection and build data  */

const RecountDataScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
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

  // Loading / error UI
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
          pageTitle="Recount Data"
        />
        <div className={styles.content}>
          <p>{loadError ?? "Inspection could not be loaded."}</p>
        </div>
        <BottomNavBar />
      </div>
    );
  }

  // We now have the SAME inspection object that Dashboard uses
  const { formData } = inspection;

  const schoolName = inspection.orgUnitName;
  const inspectionDate = new Date(inspection.eventDate).toLocaleDateString();

  // Build resource rows from inspection data
  // (previous = original value, recount = same at start; user can change recount)
  const resourceData: ResourceItem[] = [
    {
      item: "Textbooks",
      previous: formData.textbooks,
      recount: formData.textbooks,
      status: "ok",
    },
    {
      item: "Desks",
      previous: formData.desks,
      recount: formData.desks,
      status: "ok",
    },
    {
      item: "Chairs",
      previous: formData.chairs,
      recount: formData.chairs,
      status: "ok",
    },
    {
      item: "Teachers",
      previous: Number(formData.staffCount ?? 0),
      recount: Number(formData.staffCount ?? 0),
      status: "ok",
    },
  ];

  return (
    <div className={styles.dashboardContainer}>
      <TopHeader
        schoolName={schoolName}
        inspectionDate={inspectionDate}
        logoSrc={undefined}
        pageTitle="Recount Data"
      />

      <div className={styles.content}>
        <div className={styles.contentInner}>
          <div className={styles.recountHeaderRow}>
            <h2 className={styles.recountTitle}>Resource recount</h2>
            <Info size={16} className={styles.infoIcon} />
          </div>

          <ResourceRecountTable data={resourceData} />
        </div>
      </div>

      <BottomNavBar />
    </div>
  );
}

export default RecountDataScreen;
