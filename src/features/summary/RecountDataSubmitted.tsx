import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    Card,
    Button,
    Tag,
    colors,
    spacers,
} from "@dhis2/ui";

import {
    IconCheckmarkCircle24,
    IconArrowLeft24,
    IconApps24,
} from "@dhis2/ui";

import {
  Layers,
} from "lucide-react";

import styles from "./RecountDataSubmitted.module.css";
import BottomNavBar from "./BottomNavBar";

interface HeaderProps {
    schoolName: string;
    inspectionDate: string;
    logoSrc?: string;
    pageTitle?: string;
}

interface SubmittedItemRowProps {
    item: string;
    previous: number;
    recount: number;
    status: string;
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

const SubmittedItemRow: React.FC<SubmittedItemRowProps> = ({
    item,
    previous,
    recount,
    status,
}) => {
    const difference = recount - previous;

    const getTag = () => {
        switch (status) {
            case "ok":
                return <Tag positive>OK</Tag>;
            case "warning":
                return <Tag neutral>Warning</Tag>;
            case "error":
                return <Tag negative>Error</Tag>;
        }
    };

    return (
        <div className={styles.row}>
            <div className={styles.rowLeft}>
                <strong>{item}</strong>
                <p>
                    Previous: {previous} → Recount: {recount}
                </p>
            </div>
            <div className={styles.rowRight}>
                {difference !== 0 && (
                    <span className={styles.diff}>
                        {difference > 0 ? "+" : ""}
                        {difference}
                    </span>
                )}
                {getTag()}
            </div>
        </div>
    );
};

const SubmittedItemsList: React.FC<{ data: any[] }> = ({ data }) => {
    return (
        <Card className={styles.card}>
            <h2>Submitted items</h2>
            {data.map((r, i) => (
                <SubmittedItemRow key={i} {...r} />
            ))}
        </Card>
    );
};


const RecountDataSubmitted: React.FC = () => {
    const navigate = useNavigate();

    // data passed from RecountData screen
    const { state } = useLocation();
    const submittedData = state?.data ?? [];
    const notes = state?.notes ?? "";

    const schoolData = {
        schoolName: "Edutopia school 1",
        inspectionDate: "04.11.2025",
    };

    return (
        <div className={styles.container}>
            <TopHeader
                schoolName={schoolData.schoolName}
                inspectionDate={schoolData.inspectionDate}
                pageTitle="Recount Submitted"
            />

            <div className={styles.content}>
                <Card className={styles.successCard}>
                    <IconCheckmarkCircle24
                        color={colors.teal700}
                    />
                    <h2>Recount saved successfully!</h2>
                    <p>Your updated numbers have been submitted.</p>
                </Card>

                <SubmittedItemsList data={submittedData} />

                {notes && (
                    <Card className={styles.card}>
                        <h2>Notes</h2>
                        <p>{notes}</p>
                    </Card>
                )}

                <Button
                    secondary
                    icon={<IconArrowLeft24 />}
                    onClick={() => navigate("/dashboard")}
                >
                    Back to Dashboard
                </Button>
            </div>

            <BottomNavBar />
        </div>
    );
};

export default RecountDataSubmitted;
