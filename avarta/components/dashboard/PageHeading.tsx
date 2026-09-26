import { Database, Download } from "lucide-react";
import styles from "./replay.module.css";
import sihStyles from "./sih.module.css";

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
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <details className={sihStyles.provenance}>
          <summary className={styles.export}><Database size={15}/> Official provenance</summary>
          <div className={sihStyles.provenanceDrawer}>
            <div className={sihStyles.eyebrow}>OFFICIAL INDIAN MoES / NCMRWF DATASETS</div>
            <div className={sihStyles.source}><b>NEPS-G 12km Ensemble</b><span>ACTIVE FEED</span></div>
            <div className={sihStyles.source}><b>IMDAA 1990–2020</b><span>EFI BASELINE</span></div>
            <div className={sihStyles.source}><b>NCUM Global</b><span>BOUNDARY</span></div>
            <div className={sihStyles.source}><b>IMD Gridded 4km</b><span>GROUND TRUTH</span></div>
            <div className={sihStyles.source}><b>Copernicus DEM / ESA WorldCover</b><span>CONDITIONING</span></div>
          </div>
        </details>
        {exportHref && <a className={styles.export} href={exportHref} target="_blank" rel="noreferrer"><Download size={15} /> Export case JSON</a>}
      </div>
    </div>
  );
}
