import React, { useState, useEffect } from "react";
import {
    Info,
    CheckCircle2,
    XCircle,
    AlertTriangle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "../RecountData.module.css";
import { Button, TextArea } from "@dhis2/ui";

import TopHeader from "../components/TopHeader/TopHeader";
import LevelSelector from "../components/LevelSelector/LevelSelector";

import { getInspectionById } from "../../../shared/db";
import type { Inspection } from "../../../shared/types/inspection";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

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
    schoolName: string;
    inspectionDate: string;
    activeCategoryId: string;
}

type CategoryCode = "LBE" | "UBE" | "ECD" | "TERTIARY" | "GENERAL";

interface CategoryMeta {
    id: string;              // may be code or some other key
    code: CategoryCode;
    displayName: string;
    source: "per-category" | "legacy";
    syncStatus?: string;
    eventId?: string;
    fromServer?: boolean;
}

/* ------------------------------------------------------------------ */
/* Category helpers                                                   */
/* ------------------------------------------------------------------ */

const CATEGORY_DISPLAY_NAME: Record<CategoryCode, string> = {
    LBE: "LBE",
    UBE: "UBE",
    ECD: "ECD",
    TERTIARY: "Tertiary",
    GENERAL: "General",
};

const CATEGORY_ORDER: CategoryCode[] = [
    "LBE",
    "UBE",
    "ECD",
    "TERTIARY",
    "GENERAL",
];

/**
 * Build the list of categories for an inspection.
 * - If `formDataByCategory` exists, we use those keys.
 * - Otherwise, we fall back to a single GENERAL category using legacy formData.
 * - Sync info is sourced from `categorySyncStatus` / `categoryEventIds`.
 *
 * NOTE: The inspection form should already have resolved categories from
 * org unit groups, so we simply reuse that information here instead of
 * doing new network calls.
 */
function buildCategoriesFromInspection(inspection: Inspection): CategoryMeta[] {
    const {
        formDataByCategory,
        categorySyncStatus,
        categoryEventIds,
    } = inspection as any;

    // No per-category data => single GENERAL bucket
    if (!formDataByCategory || Object.keys(formDataByCategory).length === 0) {
        return [
            {
                id: "GENERAL",
                code: "GENERAL",
                displayName: CATEGORY_DISPLAY_NAME.GENERAL,
                source: "legacy",
                syncStatus: categorySyncStatus?.GENERAL,
                eventId: categoryEventIds?.GENERAL,
                fromServer: categorySyncStatus?.GENERAL === "SERVER",
            },
        ];
    }

    const cats: CategoryMeta[] = Object.keys(formDataByCategory).map(
        (key) => {
            // Treat key as a category code when possible, otherwise fall back
            const upperKey = key.toUpperCase();
            const code: CategoryCode =
                upperKey === "LBE" ||
                upperKey === "UBE" ||
                upperKey === "ECD" ||
                upperKey === "TERTIARY"
                    ? (upperKey as CategoryCode)
                    : "GENERAL";

            return {
                id: key,
                code,
                displayName:
                    CATEGORY_DISPLAY_NAME[code] ??
                    CATEGORY_DISPLAY_NAME.GENERAL,
                source: "per-category",
                syncStatus: categorySyncStatus?.[key],
                eventId: categoryEventIds?.[key],
                fromServer: categorySyncStatus?.[key] === "SERVER",
            };
        }
    );

    // Sort into a stable UX order
    cats.sort((a, b) => {
        const aIdx = CATEGORY_ORDER.indexOf(a.code);
        const bIdx = CATEGORY_ORDER.indexOf(b.code);
        return aIdx - bIdx;
    });

    return cats;
}

/* ------------------------------------------------------------------ */
/* Status helpers                                                     */
/* ------------------------------------------------------------------ */

function getStatusFromPercentDiff(percentDiff: number): RowStatus {
    if (percentDiff <= -20) return "error"; // big drop
    if (percentDiff < 0) return "warning"; // small drop
    return "ok"; // same or increase
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

/* ------------------------------------------------------------------ */
/* Category tabs component                                            */
/* ------------------------------------------------------------------ */

interface CategoryTabsProps {
    categories: CategoryMeta[];
    activeId: string;
    onChange: (id: string) => void;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({
    categories,
    activeId,
    onChange,
}) => {
    if (categories.length <= 1) return null; // no tabs for single category

    return (
        <div className={styles.categoryTabs}>
            {categories.map((cat) => (
                <button
                    key={cat.id}
                    type="button"
                    className={
                        cat.id === activeId
                            ? `${styles.categoryPill} ${styles.categoryPillActive}`
                            : styles.categoryPill
                    }
                    onClick={() => onChange(cat.id)}
                >
                    {cat.displayName}
                </button>
            ))}
        </div>
    );
};

/* ------------------------------------------------------------------ */
/* Single table row                                                   */
/* ------------------------------------------------------------------ */

const ResourceRow: React.FC<ResourceRowProps> = ({
    item,
    previous,
    recount,
    status,
    onRecountChange,
}) => {
    const rawDiff =
        previous > 0 ? ((recount - previous) / previous) * 100 : 0; // %
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

/* ------------------------------------------------------------------ */
/* Table + note + save                                                */
/* ------------------------------------------------------------------ */

const ResourceRecountTable: React.FC<ResourceRecountTableProps> = ({
    data,
    schoolName,
    inspectionDate,
    activeCategoryId,
}) => {
    const [notes, setNotes] = useState("");
    const [rows, setRows] = useState<ResourceItem[]>(data);
    const [saved, setSaved] = useState(false);
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    useEffect(() => {
        // when category changes, reset table rows + note + saved state
        setRows(data);
        setSaved(false);
    }, [data]);

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
        setSaved(false);
    };

    const handleSave = () => {
        if (!id) {
            console.error(
                "No inspection id in URL, cannot navigate to submitted view."
            );
            return;
        }

        setSaved(true);
    };

    return (
        <>
            {/* Resources card – ONLY the table */}
            <div className={styles.resourceRecountCard}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.itemHead}></th>
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
                                onRecountChange={(newVal) =>
                                    handleRecountChange(index, newVal)
                                }
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Notes & button BELOW the card */}
            <div className={styles.notesSection}>
                <div className={styles.notesLabelRow}>
                    <span className={styles.notesLabelMain}>Recount note</span>
                    <span className={styles.notesLabelOptional}>Optional</span>
                </div>

                <TextArea
                    name="notes"
                    value={notes}
                    onChange={({ value }) => {
                        setNotes(value ?? "");
                        setSaved(false);
                    }}
                    placeholder="Additional note."
                    className={styles.notesTextArea}
                />

                <div className={styles.saveButtonWrapper}>
                    {saved ? (
                        <div className={styles.saveSuccessPill}>
                            <CheckCircle2
                                size={16}
                                className={styles.saveSuccessIcon}
                            />
                            <span>Count updated</span>
                        </div>
                    ) : (
                        <Button
                            primary
                            className={styles.roundSaveButton}
                            onClick={handleSave}
                        >
                            Save recount
                        </Button>
                    )}
                </div>
            </div>
        </>
    );
};

/* ------------------------------------------------------------------ */
/* Fetch inspection + per-category data                               */
/* ------------------------------------------------------------------ */

const RecountDataScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    const [inspection, setInspection] = useState<Inspection | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [displaySchoolName, setDisplaySchoolName] = useState("");
    const [displayDate, setDisplayDate] = useState("");

    const [categories, setCategories] = useState<CategoryMeta[]>([]);
    const [activeCategoryId, setActiveCategoryId] = useState<string>("GENERAL");

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

                    setDisplaySchoolName(result.orgUnitName);
                    const formattedDate = new Date(
                        result.eventDate
                    ).toLocaleDateString();
                    setDisplayDate(formattedDate);

                    const cats = buildCategoriesFromInspection(result);
                    setCategories(cats);
                    if (cats.length > 0) {
                        setActiveCategoryId(cats[0].id);
                    }
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
                    pageTitle="Recount"
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

    // Determine the active category and its form data
    const activeCategory =
        categories.find((c) => c.id === activeCategoryId) ?? categories[0];

    const { formData, formDataByCategory } = inspection as any;

    const currentFormData =
        formDataByCategory && activeCategory
            ? formDataByCategory[activeCategory.id] ?? formData
            : formData;

    const resourceData: ResourceItem[] = [
        {
            item: "Textbooks",
            previous: currentFormData.textbooks,
            recount: currentFormData.textbooks,
            status: "ok",
        },
        {
            item: "Chairs",
            previous: currentFormData.chairs,
            recount: currentFormData.chairs,
            status: "ok",
        },
        {
            item: "Teachers",
            previous: Number(currentFormData.staffCount ?? 0),
            recount: Number(currentFormData.staffCount ?? 0),
            status: "ok",
        },
    ];

    const syncLabel =
        activeCategory?.fromServer || activeCategory?.syncStatus === "SERVER"
            ? "From server"
            : activeCategory?.syncStatus || "";

    return (
        <div className={styles.dashboardContainer}>
            <TopHeader
                schoolName={displaySchoolName}
                inspectionDate={displayDate}
                pageTitle="Recount"
                onHeaderChange={(name, date) => {
                    setDisplaySchoolName(name);
                    setDisplayDate(date);
                }}
            />

            {/* Category sync info row, near header */}
            <div className={styles.categoryStatusRow}>
                {activeCategory && (
                    <div className={styles.categoryStatusChip}>
                        <span className={styles.categoryStatusCategory}>
                            {activeCategory.displayName}
                        </span>
                        {syncLabel && (
                            <span className={styles.categoryStatusLabel}>
                                {syncLabel}
                            </span>
                        )}
                        {activeCategory.eventId && (
                            <span className={styles.categoryStatusEvent}>
                                • {activeCategory.eventId}
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className={styles.content}>
                <div className={styles.contentInner}>
                    <div className={styles.recountHeaderRow}>
                        <h2 className={styles.recountTitle}>Resources</h2>
                        <Info size={16} className={styles.infoIcon} />
                    </div>

                    {/* Category pills below section header */}
                    <CategoryTabs
                        categories={categories}
                        activeId={activeCategoryId}
                        onChange={setActiveCategoryId}
                    />

                    <ResourceRecountTable
                        data={resourceData}
                        schoolName={displaySchoolName}
                        inspectionDate={displayDate}
                        activeCategoryId={activeCategoryId}
                    />
                </div>
            </div>
        </div>
    );
};

export default RecountDataScreen;
