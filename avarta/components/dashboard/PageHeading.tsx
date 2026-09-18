import { Download } from "lucide-react";
import styles from "./replay.module.css";

export default function PageHeading({
  eyebrow,
  title,
  blurb,
  exportHref,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
  exportHref?: string;
}) {
  return (
    <div className={styles.heading}>
      <div>
        <div className={styles.eyebrow}>{eyebrow}</div>
        <h1>{title}</h1>
        <p>{blurb}</p>
      </div>
      {exportHref && (
        <a className={styles.export} href={exportHref} target="_blank" rel="noreferrer">
          <Download size={15} /> Export case JSON
        </a>
      )}
    </div>
  );
}
