import React from "react";

import styles from "./LevelSelector.module.css";

export type LevelType = "LBE" | "SSE" | "UBE";

interface LevelSelectorProps {
  initialLevel?: LevelType;
}

const LevelSelector: React.FC<LevelSelectorProps> = ({
  initialLevel = "LBE",
}) => {
  const [selected, setSelected] = React.useState<LevelType>(initialLevel);

  const levels: LevelType[] = ["LBE", "SSE", "UBE"];

  return (
    <section className={styles.levelSection}>
      <span className={styles.levelLabel}>Level</span>

      <div className={styles.levelPills}>
        {levels.map((level) => (
          <button
            key={level}
            type="button"
            className={`${styles.pill} ${
              selected === level ? styles.pillActive : ""
            }`}
            onClick={() => setSelected(level)}
          >
            {level}
          </button>
        ))}
      </div>
    </section>
  );
};

export default LevelSelector;
