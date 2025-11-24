import React from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Edit3, Check, FileText, RotateCcw, Home } from "lucide-react";
import styles from "./TopHeader.module.css";

interface HeaderProps {
  schoolName: string;
  inspectionDate: string;
  pageTitle?: string;
  isSynced?: boolean;
  userInitials?: string;

  /** Optional override for active tab; otherwise inferred from URL */
  activeTab?: "current" | "recount";

  /** Optional side-effect callback when tab changes (navigation is internal) */
  onTabChange?: (tab: "current" | "recount") => void;

  /**
   * Optional callback when the user finishes editing the header.
   * You can use this later to persist changes to DB.
   */
  onHeaderChange?: (schoolName: string, inspectionDate: string) => void;
}

const TopHeader: React.FC<HeaderProps> = ({
  schoolName,
  inspectionDate,
  pageTitle = "Summary",
  isSynced = true,
  userInitials = "LH",
  activeTab,
  onTabChange,
  onHeaderChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  // ----- Tab handling -----
  const inferredActiveTab: "current" | "recount" =
    location.pathname.includes("/RecountData") ? "recount" : "current";

  const currentActiveTab = activeTab ?? inferredActiveTab;

  const goToTab = (tab: "current" | "recount") => {
    if (!id) return;

    if (tab === "current") {
      navigate(`/summary/${id}`);
    } else {
      navigate(`/summary/${id}/RecountData`);
    }

    onTabChange?.(tab);
  };

  // ----- Inline editing state -----
  const [isEditing, setIsEditing] = React.useState(false);
  const [draftSchoolName, setDraftSchoolName] = React.useState(schoolName);
  const [draftDate, setDraftDate] = React.useState(inspectionDate);

  // If props change from outside while not editing, sync the drafts
  React.useEffect(() => {
    if (!isEditing) {
      setDraftSchoolName(schoolName);
      setDraftDate(inspectionDate);
    }
  }, [schoolName, inspectionDate, isEditing]);

  const handleEditClick = () => {
    if (isEditing) {
      // Save edits
      onHeaderChange?.(draftSchoolName, draftDate);
    }
    setIsEditing((prev) => !prev);
  };

  return (
    <header className={styles.header}>
      <div className={styles.topRow}>
        {/* LEFT SIDE — title + date (editable) */}
        <div className={styles.textBlock}>
          {isEditing ? (
            <>
              <div className={styles.editTitleRow}>
                <input
                  className={styles.titleInput}
                  value={draftSchoolName}
                  onChange={(e) => setDraftSchoolName(e.target.value)}
                />
              </div>
              <input
                className={styles.dateInput}
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
              />
            </>
          ) : (
            <>
              <h1 className={styles.headerTitle}>
                {pageTitle}:{" "}
                <span className={styles.schoolName}>{schoolName}</span>
              </h1>
              <p className={styles.dateRow}>Date: {inspectionDate}</p>
            </>
          )}
        </div>

        {/* RIGHT SIDE — EDIT + SYNC + AVATAR */}
        <div className={styles.rightBlock}>
          <button
            type="button"
            className={`${styles.editButton} ${
              isEditing ? styles.editButtonActive : ""
            }`}
            onClick={handleEditClick}
            aria-label={isEditing ? "Save header" : "Edit header"}
          >
            {isEditing ? <Check size={18} /> : <Edit3 size={18} />}
          </button>

          {isSynced && (
            <div className={styles.syncedChip}>
              <span className={styles.syncedDot} />
              Synced
            </div>
          )}

          <button
            type="button"
            className={styles.userAvatar}
            onClick={() => navigate("/profile")}
          >
            {userInitials}
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className={styles.tabRow}>
        <button
          type="button"
          className={styles.homeButton}
          onClick={() => navigate("/")}
          aria-label="Go to home page"
        >
          <Home size={16} className={styles.tabIcon} />
          <span>Home</span>
        </button>

        <button
          type="button"
          className={`${styles.tab} ${
            currentActiveTab === "current" ? styles.tabActive : ""
          }`}
          onClick={() => goToTab("current")}
        >
          <span className={styles.tabInner}>
            <FileText size={16} className={styles.tabIcon} />
            <span>Current inspection</span>
          </span>
        </button>

        <button
          type="button"
          className={`${styles.tab} ${
            currentActiveTab === "recount" ? styles.tabActive : ""
          }`}
          onClick={() => goToTab("recount")}
        >
          <span className={styles.tabInner}>
            <RotateCcw size={16} className={styles.tabIcon} />
            <span>Recount data</span>
          </span>
        </button>
      </div>
    </header>
  );
};

export default TopHeader;
