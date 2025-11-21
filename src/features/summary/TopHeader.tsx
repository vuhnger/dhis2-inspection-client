import React from "react";
import { useNavigate } from "react-router-dom";
import { Edit3, FileText, RotateCcw } from "lucide-react";
import styles from "./TopHeader.module.css";

interface HeaderProps {
  schoolName: string;
  inspectionDate: string;
  pageTitle?: string;
  isSynced?: boolean;
  userInitials?: string;
  activeTab?: "current" | "recount";
  onTabChange?: (tab: "current" | "recount") => void;
}

const TopHeader: React.FC<HeaderProps> = ({
  schoolName,
  inspectionDate,
  pageTitle = "Summary",
  isSynced = true,
  userInitials = "LH",
  activeTab = "current",
  onTabChange,
}) => {
  const navigate = useNavigate();

  const handleTabClick = (tab: "current" | "recount") => {
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
            onClick={() => navigate("/inspection")}
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
            activeTab === "current" ? styles.tabActive : ""
          }`}
          onClick={() => handleTabClick("current")}
        >
          <span className={styles.tabInner}>
            <FileText size={16} className={styles.tabIcon} />
            <span>Current inspection</span>
          </span>
        </button>

        <button
          type="button"
          className={`${styles.tab} ${
            activeTab === "recount" ? styles.tabActive : ""
          }`}
          onClick={() => handleTabClick("recount")}
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
