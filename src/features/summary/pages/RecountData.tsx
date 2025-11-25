import i18n from '@dhis2/d2-i18n'
import { Button, TextArea } from "@dhis2/ui";
import { Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getAllInspections, getInspectionById } from "../../../shared/db";
import TopHeader from "../components/TopHeader/TopHeader";
import styles from "../RecountData.module.css";



import type { Inspection, InspectionFormData } from "../../../shared/types/inspection";

type RowStatus = "up" | "down" | "neutral";

interface ResourceRowProps {
    item: string;
    previous: number;
    recount: number;
    inputValue: string;
    error?: string;
    status: RowStatus;
    onRecountChange: (raw: string) => void;
    onRecountBlur: () => void;
}

interface ResourceItem {
    item: string;
    previous: number;
    recount: number;
    inputValue: string;
    error?: string;
    status: RowStatus;
}

interface ResourceRecountTableProps {
    data: ResourceItem[];
    schoolName: string;
    inspectionDate: string;
    activeCategoryId: string;
    onUnsavedChanges?: (hasChanges: boolean) => void;
}

type CategoryCode = "LBE" | "UBE" | "ECD" | "TERTIARY" | "GENERAL";

interface CategoryMeta {
    id: string;
    code: CategoryCode;
    displayName: string;
    source: "per-category" | "legacy";
    syncStatus?: string;
    eventId?: string;
    fromServer?: boolean;
}

const ALLOWED_CATEGORY_GROUP_IDS = new Set([
    "ib40OsG9QAI",
    "SPCm0Ts3SLR",
    "sSgWDKuCrmi",
    "UzSEGuwAfyX",
]);

const DEFAULT_FORM: InspectionFormData = {
    textbooks: 0,
    chairs: 0,
    testFieldNotes: "",
    totalStudents: "0",
    maleStudents: "0",
    femaleStudents: "0",
    staffCount: "0",
    classroomCount: "0",
};

type NormalizedForm = {
    textbooks: number;
    chairs: number;
    totalStudents: number;
    maleStudents: number;
    femaleStudents: number;
    staffCount: number;
    classroomCount: number;
};

const normalizeForm = (data?: InspectionFormData | null): NormalizedForm => ({
    textbooks: Number(data?.textbooks ?? 0),
    chairs: Number(data?.chairs ?? 0),
    totalStudents: Number((data as any)?.totalStudents ?? 0),
    maleStudents: Number((data as any)?.maleStudents ?? 0),
    femaleStudents: Number((data as any)?.femaleStudents ?? 0),
    staffCount: Number((data as any)?.staffCount ?? 0),
    classroomCount: Number((data as any)?.classroomCount ?? 0),
});

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

function buildCategoriesFromInspection(inspection: Inspection): CategoryMeta[] {
    const {
        formDataByCategory,
        categorySyncStatus,
        categoryEventIds,
        orgUnitCategories,
    } = inspection as any;

    const allowedCategories =
        orgUnitCategories?.filter((c: any) => ALLOWED_CATEGORY_GROUP_IDS.has(c.id)) || [];

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
            const upperKey = key.toUpperCase();
            const code: CategoryCode =
                upperKey === "LBE" ||
                upperKey === "UBE" ||
                upperKey === "ECD" ||
                upperKey === "TERTIARY"
                    ? (upperKey as CategoryCode)
                    : "GENERAL";

            const nameFromOrgUnit = allowedCategories.find(
                (cat: any) => cat.id === key
            )?.name;

            return {
                id: key,
                code,
                displayName:
                    nameFromOrgUnit ??
                    CATEGORY_DISPLAY_NAME[code] ??
                    CATEGORY_DISPLAY_NAME.GENERAL,
                source: "per-category",
                syncStatus: categorySyncStatus?.[key],
                eventId: categoryEventIds?.[key],
                fromServer: categorySyncStatus?.[key] === "SERVER",
            };
        }
    );

    cats.sort((a, b) => {
        const aIdx = CATEGORY_ORDER.indexOf(a.code);
        const bIdx = CATEGORY_ORDER.indexOf(b.code);
        return aIdx - bIdx;
    });

    return cats;
}

function getStatusFromPercentDiff(percentDiff: number): RowStatus {
    if (percentDiff > 0) return "up";
    if (percentDiff < 0) return "down";
    return "neutral";
}

const getStatusIcon = (status: RowStatus) => {
    switch (status) {
        case "up":
            return (
                <div className={`${styles.statusIcon} ${styles.statusUp}`}>
                    <TrendingUp size={16} />
                </div>
            );
        case "down":
            return (
                <div className={`${styles.statusIcon} ${styles.statusDown}`}>
                    <TrendingDown size={16} />
                </div>
            );
        case "neutral":
            return (
                <div className={`${styles.statusIcon} ${styles.statusNeutral}`}>
                    <Minus size={16} />
                </div>
            );
        default:
            return null;
    }
};

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
    if (categories.length <= 1) return null;

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

const ResourceRow: React.FC<ResourceRowProps> = ({
    item,
    previous,
    recount,
    inputValue,
    error,
    status,
    onRecountChange,
    onRecountBlur,
}) => {
    const rawDiff =
        previous > 0 ? ((recount - previous) / previous) * 100 : 0;
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
                    value={inputValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onRecountChange(e.target.value)}
                    onBlur={onRecountBlur}
                />
                {error ? <div className={styles.inputError}>{error}</div> : null}
            </td>

            <td className={`${styles.numberCell} ${diffClass}`}>
                {formattedDiff}
            </td>
            <td className={styles.statusCell}>{getStatusIcon(status)}</td>
        </tr>
    );
};

const ResourceRecountTable: React.FC<ResourceRecountTableProps> = ({
    data,
    schoolName,
    inspectionDate,
    activeCategoryId,
    onUnsavedChanges,
}) => {
    const [notes, setNotes] = useState("");
    const [rows, setRows] = useState<ResourceItem[]>(data);
    const [saved, setSaved] = useState(false);
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    useEffect(() => {
        setRows(data);
        setSaved(false);
        onUnsavedChanges?.(false);
    }, [data, onUnsavedChanges]);

    useEffect(() => {
        const hasChanges = !saved && (
            rows.some((row, index) => row.recount !== data[index]?.recount) ||
            notes !== ""
        );
        onUnsavedChanges?.(hasChanges);
    }, [rows, notes, saved, data, onUnsavedChanges]);

    const validateInput = (raw: string, row: ResourceItem) => {
        if (raw.trim() === "") {
            return { inputValue: "", recount: row.recount, error: "Enter a non-negative whole number" };
        }

        if (!/^-?\d+$/.test(raw.trim())) {
            return { inputValue: raw, recount: row.recount, error: "Enter a non-negative whole number" };
        }

        const parsed = parseInt(raw.trim(), 10);
        if (Number.isNaN(parsed)) {
            return { inputValue: raw, recount: row.recount, error: "Enter a non-negative whole number" };
        }

        if (parsed < 0) {
            return { inputValue: raw, recount: row.recount, error: "Enter a non-negative whole number" };
        }

        return { inputValue: raw, recount: parsed, error: undefined };
    };

    const handleRecountChange = (index: number, raw: string) => {
        setRows((prev) =>
            prev.map((row, i) => {
                if (i !== index) return row;

                const { inputValue, recount, error } = validateInput(raw, row);
                const percentDiff =
                    row.previous > 0 ? ((recount - row.previous) / row.previous) * 100 : 0;
                const status = getStatusFromPercentDiff(percentDiff);

                return { ...row, inputValue, recount, status, error };
            })
        );
        setSaved(false);
    };

    const handleRecountBlur = (index: number) => {
        setRows((prev) =>
            prev.map((row, i) => {
                if (i !== index) return row;

                if (row.error) {
                    const percentDiff =
                        row.previous > 0 ? ((0 - row.previous) / row.previous) * 100 : 0;
                    const status = getStatusFromPercentDiff(percentDiff);
                    return { ...row, inputValue: "0", recount: 0, error: undefined, status };
                }
                return row;
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

        const hasErrors = rows.some(
            (r) => r.error || r.inputValue.trim() === ""
        );
        if (hasErrors) {
            setSaved(false);
            return;
        }

        setSaved(true);
    };

    const hasInvalidRows = rows.some((r) => r.error || r.inputValue.trim() === "");

    return (
        <>
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
                                onRecountChange={(newVal) => handleRecountChange(index, newVal)}
                                onRecountBlur={() => handleRecountBlur(index)}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

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
                            disabled={hasInvalidRows}
                        >
                            Save recount
                        </Button>
                    )}
                </div>
            </div>
        </>
    );
};

const findPreviousInspection = async (
    current: Inspection
): Promise<Inspection | null> => {
    const all = await getAllInspections();
    const currentDate = new Date(current.eventDate).getTime();

    const candidates = all.filter(
        (ins) =>
            ins.id !== current.id &&
            ins.orgUnit === current.orgUnit &&
            ins.status === "completed"
    );

    if (candidates.length === 0) return null;

    const earlier = candidates.filter(
        (ins) => new Date(ins.eventDate).getTime() < currentDate
    );

    const sortByDate = (arr: Inspection[]) =>
        arr.sort(
            (a, b) =>
                new Date(b.eventDate).getTime() -
                new Date(a.eventDate).getTime()
        );

    const pool = earlier.length > 0 ? earlier : candidates;
    const sorted = sortByDate(pool);
    return sorted[0] ?? null;
};

const RecountDataScreen: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    const [inspection, setInspection] = useState<Inspection | null>(null);
    const [previousInspection, setPreviousInspection] = useState<Inspection | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [displaySchoolName, setDisplaySchoolName] = useState("");
    const [displayDate, setDisplayDate] = useState("");

    const [categories, setCategories] = useState<CategoryMeta[]>([]);
    const [activeCategoryId, setActiveCategoryId] = useState<string>("GENERAL");
    const [showExitModal, setShowExitModal] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const navigate = useNavigate();

    const handleHomeNavigation = () => {
        if (hasUnsavedChanges) {
            setShowExitModal(true);
        } else {
            navigate("/");
        }
    };

    const handleConfirmExit = () => {
        setShowExitModal(false);
        navigate("/");
    };

    const handleCancelExit = () => {
        setShowExitModal(false);
    };

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

                    findPreviousInspection(result)
                        .then(setPreviousInspection)
                        .catch((err) => {
                            console.warn("Unable to resolve previous inspection", err);
                            setPreviousInspection(null);
                        });
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

    const activeCategory =
        categories.find((c) => c.id === activeCategoryId) ?? categories[0];

    const formData = inspection?.formData;
    const formDataByCategory = (inspection as any)?.formDataByCategory;

    const currentForm: NormalizedForm = useMemo(() => {
        const categoryEntry = formDataByCategory?.[activeCategory?.id];
        const raw = categoryEntry?.formData ?? formData ?? DEFAULT_FORM;
        return normalizeForm(raw);
    }, [activeCategory?.id, formData, formDataByCategory]);

    const previousForm: NormalizedForm | null = useMemo(() => {
        if (!previousInspection) return null;
        const prevEntry = previousInspection.formDataByCategory?.[activeCategory?.id];
        const raw = prevEntry?.formData ?? previousInspection.formData ?? DEFAULT_FORM;
        return normalizeForm(raw);
    }, [activeCategory?.id, previousInspection]);

    const resourceData: ResourceItem[] = useMemo(() => {
        const prev = previousForm ?? normalizeForm(DEFAULT_FORM);
        const buildStatus = (prevVal: number, currVal: number) =>
            getStatusFromPercentDiff(prevVal > 0 ? ((currVal - prevVal) / prevVal) * 100 : 0);

        return [
            {
                item: "Textbooks",
                previous: prev.textbooks,
                recount: currentForm.textbooks,
                inputValue: String(currentForm.textbooks ?? 0),
                status: buildStatus(prev.textbooks, currentForm.textbooks),
            },
            {
                item: "Chairs",
                previous: prev.chairs,
                recount: currentForm.chairs,
                inputValue: String(currentForm.chairs ?? 0),
                status: buildStatus(prev.chairs, currentForm.chairs),
            },
            {
                item: "Total students",
                previous: prev.totalStudents,
                recount: currentForm.totalStudents,
                inputValue: String(currentForm.totalStudents ?? 0),
                status: buildStatus(prev.totalStudents, currentForm.totalStudents),
            },
            {
                item: "Male students",
                previous: prev.maleStudents,
                recount: currentForm.maleStudents,
                inputValue: String(currentForm.maleStudents ?? 0),
                status: buildStatus(prev.maleStudents, currentForm.maleStudents),
            },
            {
                item: "Female students",
                previous: prev.femaleStudents,
                recount: currentForm.femaleStudents,
                inputValue: String(currentForm.femaleStudents ?? 0),
                status: buildStatus(prev.femaleStudents, currentForm.femaleStudents),
            },
            {
                item: "Staff count",
                previous: prev.staffCount,
                recount: currentForm.staffCount,
                inputValue: String(currentForm.staffCount ?? 0),
                status: buildStatus(prev.staffCount, currentForm.staffCount),
            },
            {
                item: "Classrooms",
                previous: prev.classroomCount,
                recount: currentForm.classroomCount,
                inputValue: String(currentForm.classroomCount ?? 0),
                status: buildStatus(prev.classroomCount, currentForm.classroomCount),
            },
        ];
    }, [currentForm, previousForm]);

    const syncLabel =
        activeCategory?.fromServer || activeCategory?.syncStatus === "SERVER"
            ? "From server"
            : activeCategory?.syncStatus || "";

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
                onHomeClick={handleHomeNavigation}
            />

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
                        onUnsavedChanges={setHasUnsavedChanges}
                    />

                    {!previousInspection && (
                        <div className={styles.noPrevious}>
                            No previous inspection found for comparison.
                        </div>
                    )}
                </div>
            </div>

            {showExitModal && (
                <>
                    <div 
                        className={styles.bottomSheetOverlay}
                        onClick={handleCancelExit}
                    />
                    <div className={styles.bottomSheetShell}>
                        <div className={styles.bottomSheetContent}>
                            <h2 className={styles.bottomSheetTitle}>
                                {i18n.t('Are you sure you want to exit?')}
                            </h2>
                            <p className={styles.bottomSheetText}>
                                {i18n.t('Any unsaved data will be lost.')}
                            </p>
                            <div className={styles.bottomSheetButtons}>
                                <Button 
                                    onClick={handleConfirmExit}
                                    className={styles.summaryButton}
                                >
                                    {i18n.t('Yes')}
                                </Button>
                                <Button 
                                    onClick={handleCancelExit}
                                    className={styles.discardButton}
                                >
                                    {i18n.t('No')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default RecountDataScreen;
