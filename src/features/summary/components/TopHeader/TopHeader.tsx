import { Edit3, Check, FileText, RotateCcw, Home, Info} from "lucide-react";
import React from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Layer } from "@dhis2/ui";

import styles from "./TopHeader.module.css";

interface HeaderProps {
  schoolName: string;
  inspectionDate: string;
  pageTitle?: string;
  isSynced?: boolean;
  userInitials?: string;

  activeTab?: "current" | "recount";

  onTabChange?: (tab: "current" | "recount") => void;

  onHeaderChange?: (schoolName: string, inspectionDate: string) => void;

  onHomeClick?: () => void;
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
  onHomeClick,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  const inferredActiveTab: "current" | "recount" = location.pathname.includes("/RecountData") ? "recount" : "current";

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

  const [isEditing, setIsEditing] = React.useState(false);
  const [draftSchoolName, setDraftSchoolName] = React.useState(schoolName);
  const [draftDate, setDraftDate] = React.useState(inspectionDate);

  const [showHeaderInfo, setShowHeaderInfo] = React.useState(false);

  React.useEffect(() => {
    if (!isEditing) {
      setDraftSchoolName(schoolName);
      setDraftDate(inspectionDate);
    }
  }, [schoolName, inspectionDate, isEditing]);

  const handleEditClick = () => {
    if (isEditing) {
      onHeaderChange?.(draftSchoolName, draftDate);
    }
    setIsEditing((prev) => !prev);
  };

  return (
    <header className={styles.header}>
      <div className={styles.topRow}>
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
              <span className={styles.schoolName}>
                {schoolName}

                {currentActiveTab === "recount" && (
                  <Info
                      size={18}
                      className={styles.inlineInfoIcon}
                      onClick={() => setShowHeaderInfo(true)}
                      role="button"
                      aria-label="Recount information"
                  />
              )}
              </span>
            </h1>
              <p className={styles.dateRow}>Date: {inspectionDate}</p>
            </>
          )}
        </div>

        <div className={styles.rightBlock}>
          {currentActiveTab !== "recount" && (
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
          )}

          {isSynced && (
            <div className={styles.syncedChip}>
              <span className={styles.syncedDot} />
              Synced
            </div>
          )}

          <button
            type="button"
            className={styles.userAvatar}
          >
            {userInitials}
          </button>
        </div>
      </div>

      <div className={styles.tabRow}>
        <button
          type="button"
          className={styles.homeButton}
          onClick={onHomeClick || (() => navigate("/"))}
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
        

      {showHeaderInfo && (
      <Layer translucent onClick={() => setShowHeaderInfo(false)}>
          <div
              className={styles.headerInfoOverlay}
              onClick={(e) => e.stopPropagation()}
          >
              <p className={styles.headerInfoText}>
                  For the recount, please contact the teacher or principal
                  for the official numbers.
              </p>
          </div>
      </Layer>
  )}

    </header>
  );
};

export default TopHeader;
