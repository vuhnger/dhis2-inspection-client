import React from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Edit3 } from "lucide-react";
import styles from "./BottomNavBar.module.css";

const BottomNavBar: React.FC = () => {
    const navigate = useNavigate();

    return (
        <nav className={styles.bottomNav}>
        <button className={styles.navItem} onClick={() => navigate("/summary")}>
            <FileText size={20} />
            <span>Current Inspection</span>
        </button>
        <button className={styles.navItem} onClick={() => navigate("/summary/RecountData")} >
            <Edit3 size={20} />
            <span>Recount Data</span>
        </button>
        </nav>
  );
};

export default BottomNavBar;
