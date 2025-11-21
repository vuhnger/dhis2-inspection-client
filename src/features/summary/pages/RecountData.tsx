import React, { useState, useEffect } from "react";
import { Info, CheckCircle2, XCircle, AlertTriangle, } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "../RecountData.module.css";
import { Button, TextArea } from "@dhis2/ui";

import BottomNavBar from "../components/BottomNavBar/BottomNavBar";
import TopHeader from "../components/TopHeader/TopHeader";
import LevelSelector from "../components/LevelSelector/LevelSelector";

import { getInspectionById } from "../../../shared/db";
import type { Inspection } from "../../../shared/types/inspection";


type RowStatus = "ok" | "warning" | "error";

interface ResourceRowProps {
  item: string;
  previous: number;
  recount: number;
  status: RowStatus;
  onRecountChange: (newRecount: number) => void;
}

interface ResourceItem {
  item: string;
  previous: number;
  recount: number;
  status: RowStatus;
}

interface ResourceRecountTableProps {
  data: ResourceItem[];
}

/* ----- Status helpers ----- */

function getStatusFromPercentDiff(percentDiff: number): RowStatus {
  // percentDiff is e.g. -25, +5, 0
  if (percentDiff <= -20) return "error";   // big drop
  if (percentDiff < 0) return "warning";    // small drop
  return "ok";                              // same or increase
}

const getStatusIcon = (status: RowStatus) => {
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

/* ----- Single table row ----- */

const ResourceRow: React.FC<ResourceRowProps> = ({
  item,
  previous,
  recount,
  status,
  onRecountChange,
}) => {
  const rawDiff =
    previous > 0 ? ((recount - previous) / previous) * 100 : 0; // in %
  const roundedDiff = Math.round(rawDiff);
  const formattedDiff =
    roundedDiff > 0 ? `+${roundedDiff}%` : `${roundedDiff}%`;

  const diffClass =
    roundedDiff > 0
      ? styles.diffPositive
      : roundedDiff < 0
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
          value={Number.isNaN(recount) ? "" : recount}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;
            if (val === "") {
              onRecountChange(NaN);
              return;
            }
            const num = Number(val);
            if (!Number.isNaN(num)) onRecountChange(num);
          }}
        />
      </td>

      <td className={`${styles.numberCell} ${diffClass}`}>
        {formattedDiff}
      </td>
      <td className={styles.statusCell}>{getStatusIcon(status)}</td>
    </tr>
  );
};

/* ----- Table ----- */

const ResourceRecountTable: React.FC<ResourceRecountTableProps> = ({
  data,
}) => {
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ResourceItem[]>(data);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const handleRecountChange = (index: number, newRecount: number) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;

        const prevVal = row.previous;
        const percentDiff =
          prevVal > 0 ? ((newRecount - prevVal) / prevVal) * 100 : 0;
        const status = getStatusFromPercentDiff(percentDiff);

        return { ...row, recount: newRecount, status };
      })
    );
  };

  const handleSave = () => {
    if (!id) {
      console.error(
        "No inspection id in URL, cannot navigate to submitted view."
      );
      return;
    }

    navigate(`/summary/${id}/RecountDataSubmitted`, {
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
              key={resource.item}
              {...resource}
              onRecountChange={(newVal) => handleRecountChange(index, newVal)}
            />
          ))}
        </tbody>
      </table>

      <div className={styles.notesSection}>
        <div className={styles.notesLabelRow}>
          <span className={styles.notesLabelMain}>Summary note</span>
          <span className={styles.notesLabelOptional}>Optional</span>
        </div>

        <TextArea
          name="notes"
          value={notes}
          onChange={({ value }) => setNotes(value ?? "")}
          placeholder="Additional note."
        />

        <div className={styles.saveButtonWrapper}>
          <Button
            primary
            className={styles.roundSaveButton}
            onClick={handleSave}
          >
            Save summary
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ----- Fetch Inspection and build initial data ----- */
const RecountDataScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Local editable header state
  const [displaySchoolName, setDisplaySchoolName] = useState("");
  const [displayDate, setDisplayDate] = useState("");

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

          // Initialize editable header fields
          setDisplaySchoolName(result.orgUnitName);
          const formattedDate = new Date(
            result.eventDate
          ).toLocaleDateString();
          setDisplayDate(formattedDate);
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
    return (
      <div className={styles.dashboardContainer}>Loading inspection...</div>
    );
  }

  if (loadError || !inspection) {
    return (
      <div className={styles.dashboardContainer}>
        <TopHeader
          schoolName={displaySchoolName || "Unknown school"}
          inspectionDate={displayDate}
          pageTitle="Recount Data"
          onHeaderChange={(name, date) => {
            setDisplaySchoolName(name);
            setDisplayDate(date);
          }}
        />
        <div className={styles.content}>
          <p>{loadError ?? "Inspection could not be loaded."}</p>
        </div>
        
      </div>
    );
  }

  const { formData } = inspection;

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
        schoolName={displaySchoolName}
        inspectionDate={displayDate}
        pageTitle="Summary"
        onHeaderChange={(name, date) => {
          setDisplaySchoolName(name);
          setDisplayDate(date);
          // TODO: later – persist to DB / DHIS2 here as well
        }}
      />

      <div className={styles.levelRow}>
        <LevelSelector />
      </div>

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
};

export default RecountDataScreen;




/*
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

  if (loading) {
    return (
      <div className={styles.dashboardContainer}>
        Loading inspection...
      </div>
    );
  }

  if (loadError || !inspection) {
    return (
      <div className={styles.dashboardContainer}>
        <TopHeader
          schoolName="Unknown school"
          inspectionDate=""
          pageTitle="Recount Data"
        />
        <div className={styles.content}>
          <p>{loadError ?? "Inspection could not be loaded."}</p>
        </div>
        <BottomNavBar />
      </div>
    );
  }

  const { formData } = inspection;
  const schoolName = inspection.orgUnitName;
  const inspectionDate = new Date(inspection.eventDate).toLocaleDateString();

  // TODO: hook this up to a *previous* inspection.
  // For now, "previous" == current values, but the structure
  // makes it easy to swap in real previous values later.
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
        pageTitle="Summary"
      />

      <div className={styles.levelRow}>
        <LevelSelector />
      </div>

      <div className={styles.content}>
        <div className={styles.contentInner}>
          <div className={styles.recountHeaderRow}>
            <h2 className={styles.recountTitle}>Resource recount</h2>
            <Info size={16} className={styles.infoIcon} />
          </div>

          <ResourceRecountTable data={resourceData} />
        </div>
      </div>

    </div>
  );
};

export default RecountDataScreen;

*/
