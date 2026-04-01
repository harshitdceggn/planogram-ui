import React, { useState } from "react";
import * as XLSX from "xlsx";

// ─── Facing labels ───────────────────────────────────────────────────────────
const FACING_LABELS = { 0: "Left", 1: "Front", 2: "Right", 3: "Back" };

// ─── Helpers ─────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);

const parseProductString = (cellValue) => {
  if (!cellValue && cellValue !== 0) return [];
  const str = String(cellValue).trim();
  const products = [];
  const matches = [...str.matchAll(/(\d+)\s*(?:\((\d+)\))?/g)];
  for (const m of matches) {
    const id = parseInt(m[1]);
    const cnt = m[2] ? parseInt(m[2]) : 1;
    for (let i = 0; i < cnt; i++) products.push(id);
  }
  return products;
};

// ─── Excel processor ─────────────────────────────────────────────────────────
const processExcel = (file, assetIdsFromKPI) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
        const entries = [];

        wb.SheetNames.forEach((sheetName) => {
          const sheet = wb.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          if (!rows.length) return;

          // Row 0 → sheet-level meta
          const meta = rows[0] || [];
          const assetIdStr = meta[2] ? String(meta[2]).trim() : "";
          const compliance = parseInt(meta[3]) || 50;
          const caseNum = parseInt(meta[4]) || 0;

          const assetIds = assetIdStr
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s && !isNaN(s))
            .map(Number);

          // Parse facings
          const configurations = [];
          let currentFacing = null;

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row.length) continue;

            const col0 = row[0] ? String(row[0]).trim().toLowerCase() : "";

            // Detect "facing X" header
            const facingMatch = col0.match(/^facing\s+(\d+)$/);
            if (facingMatch) {
              if (currentFacing) configurations.push(currentFacing);
              currentFacing = {
                Facing: parseInt(facingMatch[1]),
                IdealPlanogramImageUrl: row[1] ? String(row[1]).trim() : "",
                RackInformation: [],
              };
              continue;
            }

            // Detect "rack N" row
            const rackMatch = col0.match(/^rack\s*(\d+)$/);
            if (rackMatch && currentFacing) {
              const products = [];
              for (let c = 1; c < row.length; c++) {
                const cell = row[c];
                products.push(
                  cell !== undefined && cell !== null && cell !== ""
                    ? parseProductString(cell)
                    : []
                );
              }
              currentFacing.RackInformation.push({
                Name: `Rack ${rackMatch[1]}`,
                Products: products,
              });
            }
          }
          if (currentFacing) configurations.push(currentFacing);

          if (configurations.length > 0) {
            entries.push({
              _sheetName: sheetName,
              AssetDefinitionIds: assetIds.length ? assetIds : assetIdsFromKPI,
              Case: caseNum,
              Compliance: compliance,
              Configuration: configurations,
            });
          }
        });

        resolve(entries);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsArrayBuffer(file);
  });

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function PlanogramConverter() {
  // KPI list
  const [kpiEnums, setKpiEnums] = useState([
    { KPIEnum: "", Weightage: "", Target: "", CreatedAt: today(), LastUpdatedAt: today(), UpdatedBy: "" },
  ]);
  // planogram data keyed by KPI index
  const [planogramData, setPlanogramData] = useState({});
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState({});
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── KPI helpers ──
  const addKPI = () =>
    setKpiEnums([...kpiEnums, { KPIEnum: "", Weightage: "", Target: "", CreatedAt: today(), LastUpdatedAt: today(), UpdatedBy: "" }]);

  const removeKPI = (i) => {
    setKpiEnums(kpiEnums.filter((_, idx) => idx !== i));
    const pd = { ...planogramData };
    delete pd[i];
    setPlanogramData(pd);
  };

  const updateKPI = (i, field, value) => {
    const updated = [...kpiEnums];
    updated[i] = { ...updated[i], [field]: value };
    setKpiEnums(updated);
  };

  // ── File upload ──
  const handleFile = async (e, kpiIndex) => {
    const file = e.target.files[0];
    if (!file) return;

    setProcessing((p) => ({ ...p, [kpiIndex]: true }));
    setErrors((err) => ({ ...err, [kpiIndex]: null }));

    try {
      const kpiAssetIds = kpiEnums[kpiIndex].AssetDefinitionIds || [];
      const data = await processExcel(file, kpiAssetIds);
      setPlanogramData((pd) => ({ ...pd, [kpiIndex]: data }));
    } catch (err) {
      setErrors((e) => ({ ...e, [kpiIndex]: err.message }));
    } finally {
      setProcessing((p) => ({ ...p, [kpiIndex]: false }));
    }
  };

  // ── JSON generation ──
  const generateJSON = () =>
    kpiEnums.map((kpi) => {
      const obj = {
        KPIEnum: kpi.KPIEnum !== "" ? parseInt(kpi.KPIEnum) : "",
        Weightage: kpi.Weightage !== "" ? parseInt(kpi.Weightage) : "",
        Target: kpi.Target !== "" ? parseInt(kpi.Target) : "",
        CreatedAt: kpi.CreatedAt || "",
        LastUpdatedAt: kpi.LastUpdatedAt || "",
        UpdatedBy: kpi.UpdatedBy !== "" ? parseInt(kpi.UpdatedBy) : "",
      };
      return obj;
    });

  const generateFullJSON = () =>
    kpiEnums.map((kpi, idx) => {
      const base = {
        KPIEnum: kpi.KPIEnum !== "" ? parseInt(kpi.KPIEnum) : "",
        Weightage: kpi.Weightage !== "" ? parseInt(kpi.Weightage) : "",
        Target: kpi.Target !== "" ? parseInt(kpi.Target) : "",
        CreatedAt: kpi.CreatedAt || "",
        LastUpdatedAt: kpi.LastUpdatedAt || "",
        UpdatedBy: kpi.UpdatedBy !== "" ? parseInt(kpi.UpdatedBy) : "",
      };

      if (parseInt(kpi.KPIEnum) === 11 && planogramData[idx]?.length) {
        base.AssetDefinitionIds = planogramData[idx]
          .flatMap((p) => p.AssetDefinitionIds)
          .filter((v, i, a) => a.indexOf(v) === i);

        base.Planogram = planogramData[idx].map((entry) => ({
          AssetDefinitionIds: entry.AssetDefinitionIds,
          Case: entry.Case,
          Compliance: entry.Compliance,
          Configuration: entry.Configuration,
        }));
      }

      return base;
    });

  const copyJSON = () => {
    const text = JSON.stringify(generateFullJSON(), null, "\t");
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }).catch(() => fallbackCopy(text));
      } else {
        fallbackCopy(text);
      }
    } catch {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Copy failed — please select the JSON manually and copy.");
    }
    document.body.removeChild(ta);
  };

  const hasAny11 = kpiEnums.some((k) => parseInt(k.KPIEnum) === 11);
  const hasOutput = kpiEnums.some((k) => k.KPIEnum !== "");

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", fontFamily: "'IBM Plex Mono', 'Courier New', monospace", color: "#e2e8f0", padding: "32px 32px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { min-height: 100%; width: 100%; background: #0f1117; }

        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #1a1d27; }
        ::-webkit-scrollbar-thumb { background: #3a3f55; border-radius: 3px; }

        .panel {
          background: #161922;
          border: 1px solid #252836;
          border-radius: 4px;
          position: relative;
        }
        .panel::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, #4f6ef7, #8b5cf6, #4f6ef7);
          background-size: 200% 100%;
          animation: shimmer 3s linear infinite;
          border-radius: 4px 4px 0 0;
        }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        .kpi-block {
          background: #1c2030;
          border: 1px solid #2a2f45;
          border-radius: 3px;
        }
        .kpi-block.is-11 {
          border-color: #4f6ef7;
          box-shadow: 0 0 0 1px #4f6ef720;
        }

        .inp {
          background: #0f1117;
          border: 1px solid #2a2f45;
          border-radius: 3px;
          color: #e2e8f0;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 13px;
          padding: 8px 10px;
          width: 100%;
          outline: none;
          transition: border-color 0.15s;
        }
        .inp:focus { border-color: #4f6ef7; }
        .inp::placeholder { color: #3a4060; }

        .btn {
          background: #1c2030;
          border: 1px solid #3a3f55;
          border-radius: 3px;
          color: #a0aec0;
          cursor: pointer;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          padding: 8px 14px;
          transition: all 0.15s;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .btn:hover { background: #252836; border-color: #4f6ef7; color: #e2e8f0; }

        .btn-primary {
          background: #4f6ef7;
          border-color: #4f6ef7;
          color: #fff;
        }
        .btn-primary:hover { background: #6b85ff; border-color: #6b85ff; color: #fff; }

        .btn-danger { border-color: #c53030; color: #fc8181; }
        .btn-danger:hover { background: #c5303020; border-color: #fc8181; color: #fc8181; }

        .btn-success { border-color: #276749; color: #68d391; }
        .btn-success:hover { background: #27674920; border-color: #68d391; }

        .tag {
          display: inline-block;
          background: #1c2030;
          border: 1px solid #2a2f45;
          border-radius: 2px;
          font-size: 11px;
          padding: 2px 7px;
          color: #718096;
          letter-spacing: 0.04em;
        }
        .tag.blue { border-color: #4f6ef740; color: #7f9cf5; background: #4f6ef710; }
        .tag.green { border-color: #27674940; color: #68d391; background: #27674910; }
        .tag.amber { border-color: #b7791f40; color: #f6ad55; background: #b7791f10; }

        .label {
          display: block;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #4a5568;
          margin-bottom: 6px;
          font-weight: 600;
        }

        .upload-zone {
          border: 1px dashed #2a2f45;
          border-radius: 3px;
          padding: 20px;
          text-align: center;
          transition: border-color 0.15s;
          cursor: pointer;
          position: relative;
        }
        .upload-zone:hover { border-color: #4f6ef7; }
        .upload-zone input[type=file] {
          position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
        }

        .json-out {
          background: #0a0c12;
          border: 1px solid #1e2235;
          border-radius: 3px;
          color: #7fdbca;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          line-height: 1.7;
          max-height: 500px;
          overflow: auto;
          padding: 20px;
          white-space: pre;
        }

        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        @media (max-width: 640px) { .grid-3, .grid-2 { grid-template-columns: 1fr; } }

        .section-title {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #4a5568;
          font-weight: 700;
          margin: 0 0 16px 0;
          padding-bottom: 10px;
          border-bottom: 1px solid #1e2235;
        }

        .facing-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #1a1d2e;
          border: 1px solid #2a2f45;
          border-radius: 2px;
          font-size: 11px;
          padding: 3px 8px;
          color: #7f9cf5;
          margin: 2px;
        }

        .planogram-preview {
          background: #0f1117;
          border: 1px solid #1e2235;
          border-radius: 3px;
          padding: 16px;
          margin-top: 12px;
        }

        .rack-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
          font-size: 11px;
        }
        .rack-name {
          color: #4a5568;
          width: 52px;
          flex-shrink: 0;
          font-size: 10px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .layer-pill {
          background: #1c2030;
          border: 1px solid #252836;
          border-radius: 2px;
          color: #718096;
          font-size: 10px;
          padding: 2px 6px;
          white-space: nowrap;
        }
        .layer-pill.has-products { border-color: #4f6ef740; color: #7f9cf5; }

        .guide-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .guide-table th, .guide-table td { border: 1px solid #1e2235; padding: 8px 10px; text-align: left; }
        .guide-table th { background: #1c2030; color: #718096; font-weight: 600; letter-spacing: 0.06em; font-size: 11px; }
        .guide-table tr:nth-child(even) td { background: #0f1117; }
        .guide-table .hl-facing { color: #f6ad55; }
        .guide-table .hl-rack { color: #7f9cf5; }
        .guide-table .hl-meta { color: #68d391; }

        .dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
      `}</style>

      <div style={{ width: "100%" }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 36, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4f6ef7", fontWeight: 700 }}>KPI CONFIG TOOL</span>
              <span className="tag blue">v2.0</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#e2e8f0", letterSpacing: "-0.02em" }}>
              Planogram JSON Builder
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#4a5568" }}>
              Configure KPIs · Upload Excel · Export structured JSON
            </p>
          </div>
          <button className="btn btn-primary" onClick={addKPI}>
            + Add KPI
          </button>
        </div>

        {/* ── KPI Cards ──────────────────────────────────────────────────── */}
        {kpiEnums.map((kpi, idx) => {
          const is11 = parseInt(kpi.KPIEnum) === 11;
          const pd = planogramData[idx];
          const err = errors[idx];
          const busy = processing[idx];

          return (
            <div key={idx} className={`panel kpi-block${is11 ? " is-11" : ""}`} style={{ padding: 20, marginBottom: 16 }}>

              {/* Card header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: "#4a5568", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>
                    KPI #{idx + 1}
                  </span>
                  {is11 && <span className="tag blue">Planogram</span>}
                  {kpi.KPIEnum && !is11 && <span className="tag">Enum {kpi.KPIEnum}</span>}
                </div>
                {kpiEnums.length > 1 && (
                  <button className="btn btn-danger" style={{ padding: "5px 10px" }} onClick={() => removeKPI(idx)}>
                    Remove
                  </button>
                )}
              </div>

              {/* ── Core fields ── */}
              <p className="section-title">Core Fields</p>
              <div className="grid-3" style={{ marginBottom: 16 }}>
                <div>
                  <label className="label">KPIEnum</label>
                  <input className="inp" type="number" placeholder="e.g. 11" value={kpi.KPIEnum} onChange={(e) => updateKPI(idx, "KPIEnum", e.target.value)} />
                </div>
                <div>
                  <label className="label">Weightage</label>
                  <input className="inp" type="number" placeholder="e.g. 20" value={kpi.Weightage} onChange={(e) => updateKPI(idx, "Weightage", e.target.value)} />
                </div>
                <div>
                  <label className="label">Target</label>
                  <input className="inp" type="number" placeholder="e.g. 40" value={kpi.Target} onChange={(e) => updateKPI(idx, "Target", e.target.value)} />
                </div>
              </div>

              {/* ── Audit fields ── */}
              <p className="section-title">Audit Fields</p>
              <div className="grid-3" style={{ marginBottom: is11 ? 16 : 0 }}>
                <div>
                  <label className="label">CreatedAt</label>
                  <input className="inp" type="date" value={kpi.CreatedAt} onChange={(e) => updateKPI(idx, "CreatedAt", e.target.value)} />
                </div>
                <div>
                  <label className="label">LastUpdatedAt</label>
                  <input className="inp" type="date" value={kpi.LastUpdatedAt} onChange={(e) => updateKPI(idx, "LastUpdatedAt", e.target.value)} />
                </div>
                <div>
                  <label className="label">UpdatedBy (User ID)</label>
                  <input className="inp" type="number" placeholder="e.g. 202567" value={kpi.UpdatedBy} onChange={(e) => updateKPI(idx, "UpdatedBy", e.target.value)} />
                </div>
              </div>

              {/* ── Planogram section (KPIEnum 11 only) ── */}
              {is11 && (
                <>
                  <p className="section-title">Planogram Data</p>

                  {/* Upload */}
                  <div className="upload-zone" style={{ marginBottom: 12 }}>
                    <input type="file" accept=".xlsx,.xls" onChange={(e) => handleFile(e, idx)} />
                    <div style={{ pointerEvents: "none" }}>
                      <div style={{ fontSize: 22, marginBottom: 6 }}>📂</div>
                      <div style={{ fontSize: 13, color: "#4a5568" }}>
                        {busy ? "Processing…" : pd ? `✓ ${pd.length} sheet${pd.length !== 1 ? "s" : ""} loaded — drop to replace` : "Drop Excel file or click to upload"}
                      </div>
                      {pd && (
                        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                          {pd.map((entry, ei) => (
                            <span key={ei} className="tag green">{entry._sheetName}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {err && (
                    <div style={{ background: "#c5303015", border: "1px solid #c5303050", borderRadius: 3, padding: "10px 14px", fontSize: 12, color: "#fc8181", marginBottom: 12 }}>
                      ⚠ {err}
                    </div>
                  )}

                  {/* Preview */}
                  {pd && pd.length > 0 && (
                    <div className="planogram-preview">
                      <div style={{ fontSize: 11, color: "#4a5568", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>
                        Preview
                      </div>
                      {pd.map((entry, ei) => (
                        <div key={ei} style={{ marginBottom: ei < pd.length - 1 ? 16 : 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, color: "#a0aec0", fontWeight: 600 }}>{entry._sheetName}</span>
                            <span className="tag">Case {entry.Case}</span>
                            <span className="tag">Compliance {entry.Compliance}%</span>
                            <span className="tag">{entry.AssetDefinitionIds.length} asset{entry.AssetDefinitionIds.length !== 1 ? "s" : ""}</span>
                          </div>
                          {entry.Configuration.map((cfg, ci) => (
                            <div key={ci} style={{ marginBottom: 8, paddingLeft: 12, borderLeft: "2px solid #2a2f45" }}>
                              <div style={{ marginBottom: 6 }}>
                                <span className="facing-badge">
                                  <span className="dot" style={{ background: ["#4f6ef7","#68d391","#f6ad55","#fc8181"][cfg.Facing] || "#718096" }} />
                                  Facing {cfg.Facing} — {FACING_LABELS[cfg.Facing] || "Unknown"}
                                </span>
                              </div>
                              {cfg.RackInformation.map((rack, ri) => (
                                <div key={ri} className="rack-row">
                                  <span className="rack-name">{rack.Name}</span>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                                    {rack.Products.map((layer, li) => (
                                      <span key={li} className={`layer-pill${layer.length ? " has-products" : ""}`}>
                                        {layer.length ? `[${layer.length}]` : "[ ]"}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* ── Excel Format Guide ──────────────────────────────────────────── */}
        {hasAny11 && (
          <div style={{ marginBottom: 16 }}>
            <button className="btn" style={{ width: "100%", textAlign: "left", justifyContent: "flex-start" }} onClick={() => setShowGuide(!showGuide)}>
              {showGuide ? "▾" : "▸"} Excel Format Guide
            </button>

            {showGuide && (
              <div className="panel" style={{ padding: 20, marginTop: 1, borderTop: "none", borderRadius: "0 0 4px 4px" }}>
                <p className="section-title">Sheet Layout</p>
                <p style={{ fontSize: 12, color: "#718096", marginBottom: 16 }}>
                  One sheet per asset · Each sheet can have multiple facings · Each facing has its own racks
                </p>

                <div style={{ overflowX: "auto", marginBottom: 20 }}>
                  <table className="guide-table">
                    <thead>
                      <tr>
                        <th>Row</th><th>Col A</th><th>Col B</th><th>Col C</th><th>Col D</th><th>Col E</th><th>Col F+</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>1</td>
                        <td style={{ color: "#4a5568" }}>(any label)</td>
                        <td className="hl-meta">Image URL*</td>
                        <td className="hl-meta">Asset IDs (comma-sep)</td>
                        <td className="hl-meta">Compliance (50)</td>
                        <td className="hl-meta">Case (0)</td>
                        <td style={{ color: "#4a5568" }}>—</td>
                      </tr>
                      <tr>
                        <td>2</td>
                        <td className="hl-facing">facing 0</td>
                        <td className="hl-facing">Image URL for this facing</td>
                        <td colSpan={4} style={{ color: "#4a5568" }}>—</td>
                      </tr>
                      <tr>
                        <td>3</td>
                        <td className="hl-rack">rack 1</td>
                        <td>Layer 1 products</td>
                        <td>Layer 2 products</td>
                        <td>Layer 3 products</td>
                        <td>Layer 4…</td>
                        <td>…</td>
                      </tr>
                      <tr>
                        <td>4</td>
                        <td className="hl-rack">rack 2</td>
                        <td>Layer 1 products</td>
                        <td>Layer 2 products</td>
                        <td colSpan={3} style={{ color: "#4a5568" }}>…</td>
                      </tr>
                      <tr>
                        <td>…</td>
                        <td className="hl-rack">rack N</td>
                        <td colSpan={5} style={{ color: "#4a5568" }}>…</td>
                      </tr>
                      <tr>
                        <td>30</td>
                        <td className="hl-facing">facing 1</td>
                        <td className="hl-facing">Image URL for this facing</td>
                        <td colSpan={4} style={{ color: "#4a5568" }}>— (new facing section starts)</td>
                      </tr>
                      <tr>
                        <td>31</td>
                        <td className="hl-rack">rack 1</td>
                        <td>Layer 1 products</td>
                        <td colSpan={4} style={{ color: "#4a5568" }}>…</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="section-title">Facing Values</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                  {Object.entries(FACING_LABELS).map(([k, v]) => (
                    <span key={k} className="facing-badge">
                      <span className="dot" style={{ background: ["#4f6ef7","#68d391","#f6ad55","#fc8181"][k] }} />
                      facing {k} — {v}
                    </span>
                  ))}
                </div>

                <p className="section-title">Product Cell Formats</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                  {[
                    ["10629468 (3)", "[10629468, 10629468, 10629468]"],
                    ["10629468", "[10629468]"],
                    ["10629468 (2) 10629469 (1)", "[10629468, 10629468, 10629469]"],
                    ["(empty cell)", "[ ]  — empty layer"],
                  ].map(([fmt, result]) => (
                    <div key={fmt} style={{ background: "#0f1117", border: "1px solid #1e2235", borderRadius: 3, padding: 12 }}>
                      <code style={{ fontSize: 12, color: "#7fdbca", display: "block", marginBottom: 6 }}>{fmt}</code>
                      <span style={{ fontSize: 11, color: "#4a5568" }}>{result}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── JSON Output ─────────────────────────────────────────────────── */}
        {hasOutput && (
          <div className="panel" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <p className="section-title" style={{ margin: 0, border: 0, padding: 0 }}>Generated JSON</p>
              <button className={`btn ${copied ? "btn-success" : "btn-primary"}`} onClick={copyJSON}>
                {copied ? "✓ Copied!" : "Copy JSON"}
              </button>
            </div>
            <div className="json-out">
              {JSON.stringify(generateFullJSON(), null, "\t")}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}