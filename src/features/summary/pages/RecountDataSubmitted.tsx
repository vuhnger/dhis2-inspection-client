import React from "react";
import { useLocation, useNavigate, } from "react-router-dom";
import { Card, Button, Tag, colors, IconCheckmarkCircle24, IconArrowLeft24, } from "@dhis2/ui";
import styles from "../RecountDataSubmitted.module.css";
import TopHeader from "../components/TopHeader/TopHeader";

interface SubmittedItemRowProps {
    item: string;
    previous: number;
    recount: number;
    status: string;
}

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
            <h2>Submitted Metrics</h2>
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

  const schoolName = state?.schoolName ?? "Unknown school";
  const inspectionDate = state?.inspectionDate ?? "";

    return (
        <div className={styles.container}>
            <TopHeader
                schoolName={schoolName}
                inspectionDate={inspectionDate}
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
                    className={styles.backButton}
                    icon={<IconArrowLeft24 />}
                    onClick={() => navigate("/")}>
                    Back to Inspection Homepage
                </Button>
            </div>

        </div>
    );
};

export default RecountDataSubmitted;
