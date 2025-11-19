import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FileText, Edit3 } from "lucide-react";
import styles from "./BottomNavBar.module.css";

const BottomNavBar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <nav className={styles.bottomNav}>
        <button 
        className={`${styles.navItem} ${isActive("/summary") ? styles.active : ""}`} 
        onClick={() => navigate("/summary")}
        >
        <div className={styles.iconWrapper}>
            <FileText
            size={20}
            className={isActive("/summary") ? styles.activeIcon : ""}
            />
        </div>
            <span className={styles.label}>Current Inspection</span>
        </button>
        
        <button 
        className={`${styles.navItem} ${isActive("/summary/RecountData") ? styles.active : ""}`}
        onClick={() => navigate("/summary/RecountData")}
        >

        <div className={styles.iconWrapper}>
            <Edit3
            size={20}
            className={isActive("/summary/RecountData") ? styles.activeIcon : ""}
            />
        </div>
        <span className={styles.label}>Recount data</span>
        </button>
        </nav>
  );
};

export default BottomNavBar;
