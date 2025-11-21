import React from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Edit3, FileText, RotateCcw } from "lucide-react";
import styles from "./TopHeader.module.css";

interface HeaderProps {
  schoolName: string;
  inspectionDate: string;
  pageTitle?: string;
  isSynced?: boolean;
  userInitials?: string;

  /**
   * Optional override for which tab is active.
   * If not provided, TopHeader will infer it from the URL.
   */
  activeTab?: "current" | "recount";

  /**
   * Optional callback when a tab is clicked.
   * Navigation is handled inside TopHeader, this is just for side-effects.
   */
  onTabChange?: (tab: "current" | "recount") => void;
}

const TopHeader: React.FC<HeaderProps> = ({
  schoolName,
  inspectionDate,
  pageTitle = "Summary",
  isSynced = true,
  userInitials = "LH",
  activeTab,
  onTabChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  // Infer which tab is active from the current URL if not explicitly provided
  const inferredActiveTab: "current" | "recount" =
    location.pathname.includes("/RecountData") ? "recount" : "current";

  const currentActiveTab = activeTab ?? inferredActiveTab;

  const goToTab = (tab: "current" | "recount") => {
    if (!id) {
      // No id – nothing to navigate to
      return;
    }

    if (tab === "current") {
      navigate(`/summary/${id}`);
    } else {
      navigate(`/summary/${id}/RecountData`);
    }

    onTabChange?.(tab);
  };

  return (
    <header className={styles.header}>
      <div className={styles.topRow}>
        {/* LEFT SIDE — ONLY TITLE + DATE */}
        <div className={styles.textBlock}>
          <h1 className={styles.headerTitle}>
            {pageTitle}: <span className={styles.schoolName}>{schoolName}</span>
          </h1>
          <p className={styles.dateRow}>Date: {inspectionDate}</p>
        </div>

        {/* RIGHT SIDE — EDIT + SYNC + AVATAR */}
        <div className={styles.rightBlock}>
          <button
            type="button"
            className={styles.editButton}
            onClick={() => id && navigate(`/inspection/${id}`)}
            aria-label="Edit"
          >
            <Edit3 size={18} />
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
