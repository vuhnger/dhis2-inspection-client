import React from "react";
import { useNavigate } from "react-router-dom";
import { Layers } from "lucide-react";
// If you use @dhis2/ui you can swap the buttons/chip with those components later
// import { Button, Chip } from '@dhis2/ui';

import styles from "./TopHeader.module.css";

interface HeaderProps {
  schoolName: string;
  inspectionDate: string;
  logoSrc?: string;
  pageTitle?: string;
  isSynced?: boolean;
  userInitials?: string;
  activeTab?: "current" | "recount";
  onTabChange?: (tab: "current" | "recount") => void;
}

const TopHeader: React.FC<HeaderProps> = ({
  schoolName,
  inspectionDate,
  logoSrc,
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
      {/* Top row: icon + title + date + status */}
      <div className={styles.topRow}>
        <div className={styles.titleBlock}>
          <div className={styles.logoWrapper}>
            {logoSrc ? (
              <img src={logoSrc} alt="School logo" />
            ) : (
              <Layers size={24} color="#ffffff" />
            )}
          </div>

          <div className={styles.textBlock}>
            <h1 className={styles.headerTitle}>
              {pageTitle}: <span className={styles.schoolName}>{schoolName}</span>
            </h1>
            <p className={styles.dateRow}>
              <span className={styles.dateLabel}>Date:</span>{" "}
              <span className={styles.dateValue}>{inspectionDate}</span>
            </p>
          </div>
        </div>

        <div className={styles.rightBlock}>
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

      {/* Second row: pill tabs (Current inspection / Recount data) */}
      <div className={styles.tabRow}>
        <button
          type="button"
          className={`${styles.tab} ${
            activeTab === "current" ? styles.tabActive : ""
          }`}
          onClick={() => handleTabClick("current")}
        >
          Current inspection
        </button>

        <button
          type="button"
          className={`${styles.tab} ${
            activeTab === "recount" ? styles.tabActive : ""
          }`}
          onClick={() => handleTabClick("recount")}
        >
          Recount data
        </button>
      </div>
    </header>
  );
};

export default TopHeader;
