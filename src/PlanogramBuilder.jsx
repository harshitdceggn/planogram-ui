import React, { useState } from "react";
import * as XLSX from "xlsx";

export default function PlanogramConverter() {
  const [kpiEnums, setKpiEnums] = useState([
    { KPIEnum: "", Weightage: "", Target: "" }
  ]);
  const [planogramData, setPlanogramData] = useState(null);
  const [error, setError] = useState(null);
  const [showGuide, setShowGuide] = useState(true);

  // ============ KPI MANAGEMENT ============
  const addKPIEnum = () => {
    setKpiEnums([...kpiEnums, { KPIEnum: "", Weightage: "", Target: "" }]);
  };

  const removeKPIEnum = (index) => {
    setKpiEnums(kpiEnums.filter((_, i) => i !== index));
  };

  const updateKPIEnum = (index, field, value) => {
    const updated = [...kpiEnums];
    updated[index][field] = value;
    setKpiEnums(updated);
  };

  // ============ EXCEL PROCESSING ============
  const parseProductString = (cellValue) => {
    if (!cellValue || cellValue === "") return [];

    const products = [];
    const str = String(cellValue).trim();

    // Match pattern: productId (count) or productId count or just productId
    // Examples: "10629468 (3)", "10629468(3)", "10629468 3", "10629468"
    const matches = str.matchAll(/(\d+)\s*(?:\((\d+)\)|(\d+))?/g);

    for (const match of matches) {
      const productId = parseInt(match[1]);
      const count = match[2] ? parseInt(match[2]) : match[3] ? parseInt(match[3]) : 1;

      for (let i = 0; i < count; i++) {
        products.push(productId);
      }
    }

    return products;
  };

  const processExcel = (file) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const planogramEntries = [];

        // Process each sheet (each sheet = one planogram entry/asset)
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

          if (jsonData.length === 0) return;

          // Row 1: [anything, ImageURL, AssetIDs, Compliance]
          const row1 = jsonData[0] || [];
          const imageUrl = row1[1] ? String(row1[1]).trim() : "";
          const assetIdStr = row1[2] ? String(row1[2]).trim() : "";
          const complianceStr = row1[3] ? String(row1[3]).trim() : "50";

          // Parse AssetDefinitionIds
          const assetIds = assetIdStr
            .split(",")
            .map((id) => id.trim())
            .filter((id) => id !== "" && !isNaN(id))
            .map((id) => parseInt(id));

          const compliance = parseInt(complianceStr) || 50;

          // Process racks starting from row 2
          const subracks = {};

          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            const rackIdentifier = row[0];
            if (!rackIdentifier) continue;

            const rackStr = String(rackIdentifier).trim().toLowerCase();

            // Check if it's a rack row (starts with "rack")
            if (rackStr.startsWith("rack")) {
              const rackNumMatch = rackStr.match(/rack\s*(\d+)/);
              if (!rackNumMatch) continue;

              const rackNum = rackNumMatch[1];
              const rackKey = `Rack ${rackNum}`;

              if (!subracks[rackKey]) {
                subracks[rackKey] = [];
              }

              // Process each column as a layer
              for (let col = 1; col < row.length; col++) {
                const cellValue = row[col];
                if (cellValue !== undefined && cellValue !== null && cellValue !== "") {
                  const products = parseProductString(cellValue);
                  subracks[rackKey].push(products);
                } else {
                  // Empty cell = empty layer
                  subracks[rackKey].push([]);
                }
              }
            }
          }

          // Only add if we have valid data
          if (Object.keys(subracks).length > 0 && assetIds.length > 0) {
            planogramEntries.push({
              IdealPlanogramImageUrl: imageUrl,
              AssetDefinitionIds: assetIds,
              Compliance: compliance,
              SubrackProducts: subracks
            });
          }
        });

        setPlanogramData(planogramEntries);
        setError(null);
      } catch (err) {
        setError(`Error processing Excel: ${err.message}`);
        setPlanogramData(null);
      }
    };

    reader.onerror = () => {
      setError("Error reading file");
      setPlanogramData(null);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      processExcel(file);
    }
  };

  // ============ GENERATE JSON ============
  const generateJSON = () => {
    return kpiEnums.map((kpi) => {
      const output = {
        KPIEnum: kpi.KPIEnum ? parseInt(kpi.KPIEnum) : "",
        Weightage: kpi.Weightage ? parseInt(kpi.Weightage) : "",
        Target: kpi.Target ? parseInt(kpi.Target) : ""
      };

      // Add Planogram only if KPIEnum is 11 and we have planogram data
      if (parseInt(kpi.KPIEnum) === 11 && planogramData && planogramData.length > 0) {
        output.Planogram = planogramData;
      }

      return output;
    });
  };

  const hasKPIEnum11 = kpiEnums.some((kpi) => parseInt(kpi.KPIEnum) === 11);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #2c3e50 0%, #34495e 50%, #2c3e50 100%)",
        padding: "30px 20px",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Animated Shine Effect */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "-100%",
          width: "100%",
          height: "100%",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
          animation: "shine 3s infinite",
          pointerEvents: "none"
        }}
      />
      <style>{`
        @keyframes shine {
          0% { left: -100%; }
          100% { left: 200%; }
        }
        
        .metallic-card {
          background: linear-gradient(135deg, #bdc3c7 0%, #ecf0f1 50%, #bdc3c7 100%);
          position: relative;
          overflow: hidden;
        }
        
        .metallic-card::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            45deg,
            transparent 30%,
            rgba(255, 255, 255, 0.3) 50%,
            transparent 70%
          );
          animation: cardShine 4s infinite;
        }
        
        @keyframes cardShine {
          0% { transform: rotate(0deg) translate(-50%, -50%); }
          100% { transform: rotate(360deg) translate(-50%, -50%); }
        }
        
        .metallic-button {
          background: linear-gradient(135deg, #95a5a6 0%, #bdc3c7 50%, #95a5a6 100%);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
          position: relative;
          overflow: hidden;
        }
        
        .metallic-button::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            to bottom right,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.3) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: rotate(45deg);
          animation: buttonShine 2s infinite;
        }
        
        @keyframes buttonShine {
          0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
          100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
        }
        
        .metallic-input {
          background: linear-gradient(135deg, #ecf0f1 0%, #bdc3c7 50%, #ecf0f1 100%);
          border: 2px solid #7f8c8d;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .metallic-input:focus {
          border-color: #95a5a6;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 8px rgba(149, 165, 166, 0.6);
        }
      `}</style>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "30px", color: "#ecf0f1", position: "relative", zIndex: 1 }}>
          <h1
            style={{
              fontSize: "42px",
              margin: "0 0 10px 0",
              textShadow: "2px 2px 4px rgba(0,0,0,0.5), 0 0 20px rgba(236, 240, 241, 0.3)",
              background: "linear-gradient(135deg, #ecf0f1 0%, #bdc3c7 50%, #ecf0f1 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}
          >
            🏗️ Planogram JSON Builder
          </h1>
          <p style={{ fontSize: "16px", opacity: 0.9, textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}>
            Configure KPIs and upload Excel for automatic JSON generation
          </p>
        </div>

        {/* KPI Configuration */}
        <div
          className="metallic-card"
          style={{
            borderRadius: "12px",
            padding: "25px",
            marginBottom: "25px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)"
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              position: "relative",
              zIndex: 1
            }}
          >
            <h2 style={{ margin: 0, color: "#2c3e50", fontSize: "24px", fontWeight: "700", textShadow: "1px 1px 0 rgba(255,255,255,0.5)" }}>
              📊 KPI Configuration
            </h2>
            <button
              onClick={addKPIEnum}
              className="metallic-button"
              style={{
                padding: "10px 18px",
                color: "#2c3e50",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "14px",
                textShadow: "1px 1px 0 rgba(255,255,255,0.5)"
              }}
            >
              ➕ Add KPI Enum
            </button>
          </div>

          {kpiEnums.map((kpi, index) => (
            <div
              key={index}
              style={{
                padding: "20px",
                background: "linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)",
                borderRadius: "8px",
                marginBottom: "15px",
                border: "2px solid #34495e",
                boxShadow: "0 4px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                position: "relative",
                zIndex: 1
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "15px"
                }}
              >
                <h3 style={{ margin: 0, color: "#ecf0f1", fontSize: "18px", fontWeight: "700", textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}>
                  KPI Enum #{index + 1}
                </h3>
                {kpiEnums.length > 1 && (
                  <button
                    onClick={() => removeKPIEnum(index)}
                    style={{
                      padding: "6px 12px",
                      background: "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "5px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "700",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                      textShadow: "1px 1px 2px rgba(0,0,0,0.3)"
                    }}
                  >
                    ❌ Remove
                  </button>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "15px"
                }}
              >
                <div>
                  <label
                    style={{
                      fontWeight: "700",
                      display: "block",
                      marginBottom: "6px",
                      color: "#ecf0f1",
                      fontSize: "13px",
                      textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                    }}
                  >
                    KPIEnum
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 11"
                    value={kpi.KPIEnum}
                    onChange={(e) => updateKPIEnum(index, "KPIEnum", e.target.value)}
                    className="metallic-input"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      fontSize: "14px",
                      borderRadius: "5px",
                      outline: "none",
                      boxSizing: "border-box",
                      color: "#2c3e50",
                      fontWeight: "600"
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontWeight: "700",
                      display: "block",
                      marginBottom: "6px",
                      color: "#ecf0f1",
                      fontSize: "13px",
                      textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                    }}
                  >
                    Weightage
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 50"
                    value={kpi.Weightage}
                    onChange={(e) => updateKPIEnum(index, "Weightage", e.target.value)}
                    className="metallic-input"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      fontSize: "14px",
                      borderRadius: "5px",
                      outline: "none",
                      boxSizing: "border-box",
                      color: "#2c3e50",
                      fontWeight: "600"
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontWeight: "700",
                      display: "block",
                      marginBottom: "6px",
                      color: "#ecf0f1",
                      fontSize: "13px",
                      textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                    }}
                  >
                    Target
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 60"
                    value={kpi.Target}
                    onChange={(e) => updateKPIEnum(index, "Target", e.target.value)}
                    className="metallic-input"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      fontSize: "14px",
                      borderRadius: "5px",
                      outline: "none",
                      boxSizing: "border-box",
                      color: "#2c3e50",
                      fontWeight: "600"
                    }}
                  />
                </div>
              </div>

              {parseInt(kpi.KPIEnum) === 11 && (
                <div
                  style={{
                    marginTop: "15px",
                    padding: "15px",
                    background: "linear-gradient(135deg, #f39c12 0%, #e67e22 100%)",
                    borderRadius: "6px",
                    border: "2px solid #d68910",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)"
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 10px 0",
                      color: "#ecf0f1",
                      fontWeight: "700",
                      fontSize: "14px",
                      textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                    }}
                  >
                    📋 This KPI requires Planogram data - upload Excel below
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Excel Upload (Only show if KPIEnum 11 exists) */}
        {hasKPIEnum11 && (
          <div
            className="metallic-card"
            style={{
              borderRadius: "12px",
              padding: "25px",
              marginBottom: "25px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)"
            }}
          >
            <h2 style={{ margin: "0 0 20px 0", color: "#2c3e50", fontSize: "24px", fontWeight: "700", textShadow: "1px 1px 0 rgba(255,255,255,0.5)", position: "relative", zIndex: 1 }}>
              📁 Upload Planogram Excel
            </h2>

            <div
              style={{
                border: "3px dashed #7f8c8d",
                borderRadius: "8px",
                padding: "30px",
                textAlign: "center",
                background: "linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)",
                boxShadow: "inset 0 2px 6px rgba(0,0,0,0.3)",
                position: "relative",
                zIndex: 1
              }}
            >
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                style={{
                  display: "block",
                  margin: "0 auto 15px",
                  padding: "10px",
                  fontSize: "14px"
                }}
              />
              <p style={{ color: "#ecf0f1", fontSize: "14px", margin: "0 0 10px 0", fontWeight: "600", textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}>
                Upload Excel file with planogram data
              </p>
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="metallic-button"
                style={{
                  padding: "8px 16px",
                  color: "#2c3e50",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "700",
                  textShadow: "1px 1px 0 rgba(255,255,255,0.5)"
                }}
              >
                {showGuide ? "Hide" : "Show"} Excel Format Guide
              </button>
            </div>

            {planogramData && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "15px",
                  background: "linear-gradient(135deg, #27ae60 0%, #229954 100%)",
                  border: "2px solid #1e8449",
                  borderRadius: "8px",
                  color: "#ecf0f1",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                  position: "relative",
                  zIndex: 1,
                  fontWeight: "700",
                  textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                }}
              >
                <strong>✅ Excel Processed Successfully!</strong>
                <br />
                Found {planogramData.length} planogram{planogramData.length !== 1 ? "s" : ""}{" "}
                (sheets)
              </div>
            )}
          </div>
        )}

        {/* Visual Excel Format Guide */}
        {showGuide && hasKPIEnum11 && (
          <div
            className="metallic-card"
            style={{
              borderRadius: "12px",
              padding: "25px",
              marginBottom: "25px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)"
            }}
          >
            <h2 style={{ margin: "0 0 20px 0", color: "#2c3e50", fontSize: "24px", fontWeight: "700", textShadow: "1px 1px 0 rgba(255,255,255,0.5)", position: "relative", zIndex: 1 }}>
              📖 Excel Format Guide (Visual)
            </h2>

            <div style={{ marginBottom: "25px", position: "relative", zIndex: 1 }}>
              <h3 style={{ color: "#2c3e50", fontSize: "18px", marginBottom: "15px", fontWeight: "700", textShadow: "1px 1px 0 rgba(255,255,255,0.5)" }}>
                🔹 Sheet Structure
              </h3>
              <p style={{ color: "#34495e", marginBottom: "15px", lineHeight: "1.6", fontWeight: "600" }}>
                <strong>Each sheet = One Planogram Entry (Asset)</strong>
                <br />
                Example: If you have 5 assets, create 5 sheets in your Excel file
              </p>

              {/* Visual Table */}
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                    background: "linear-gradient(135deg, #ecf0f1 0%, #bdc3c7 100%)",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
                  }}
                >
                  <thead>
                    <tr style={{ background: "linear-gradient(135deg, #7f8c8d 0%, #95a5a6 100%)" }}>
                      <th style={{ border: "2px solid #34495e", padding: "10px", fontWeight: "700", color: "#ecf0f1", textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}>
                        
                      </th>
                      <th
                        style={{
                          border: "2px solid #34495e",
                          padding: "10px",
                          background: "linear-gradient(135deg, #5dade2 0%, #3498db 100%)",
                          fontWeight: "700",
                          color: "#ecf0f1",
                          textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                        }}
                      >
                        A
                      </th>
                      <th
                        style={{
                          border: "2px solid #34495e",
                          padding: "10px",
                          background: "linear-gradient(135deg, #5dade2 0%, #3498db 100%)",
                          fontWeight: "700",
                          color: "#ecf0f1",
                          textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                        }}
                      >
                        B
                      </th>
                      <th
                        style={{
                          border: "2px solid #34495e",
                          padding: "10px",
                          background: "linear-gradient(135deg, #5dade2 0%, #3498db 100%)",
                          fontWeight: "700",
                          color: "#ecf0f1",
                          textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                        }}
                      >
                        C
                      </th>
                      <th
                        style={{
                          border: "2px solid #34495e",
                          padding: "10px",
                          background: "linear-gradient(135deg, #5dade2 0%, #3498db 100%)",
                          fontWeight: "700",
                          color: "#ecf0f1",
                          textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                        }}
                      >
                        D
                      </th>
                      <th
                        style={{
                          border: "2px solid #34495e",
                          padding: "10px",
                          background: "linear-gradient(135deg, #5dade2 0%, #3498db 100%)",
                          fontWeight: "700",
                          color: "#ecf0f1",
                          textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                        }}
                      >
                        E
                      </th>
                      <th
                        style={{
                          border: "2px solid #34495e",
                          padding: "10px",
                          background: "linear-gradient(135deg, #5dade2 0%, #3498db 100%)",
                          fontWeight: "700",
                          color: "#ecf0f1",
                          textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                        }}
                      >
                        F
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: "linear-gradient(135deg, #f39c12 0%, #e67e22 100%)" }}>
                      <td
                        style={{
                          border: "2px solid #34495e",
                          padding: "10px",
                          fontWeight: "700",
                          background: "linear-gradient(135deg, #7f8c8d 0%, #95a5a6 100%)",
                          color: "#ecf0f1",
                          textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                        }}
                      >
                        1
                      </td>
                      <td style={{ border: "2px solid #34495e", padding: "10px", color: "#ecf0f1", fontWeight: "600", textShadow: "1px 1px 2px rgba(0,0,0,0.3)" }}>
                        (any label)
                      </td>
                      <td style={{ border: "2px solid #34495e", padding: "10px", color: "#ecf0f1", fontWeight: "600", textShadow: "1px 1px 2px rgba(0,0,0,0.3)" }}>
                        <strong>Image URL</strong>
                        <br />
                        <small>
                          https://example.com/image.jpg
                        </small>
                      </td>
                      <td style={{ border: "2px solid #34495e", padding: "10px", color: "#ecf0f1", fontWeight: "600", textShadow: "1px 1px 2px rgba(0,0,0,0.3)" }}>
                        <strong>Asset IDs</strong>
                        <br />
                        <small>56006</small>
                      </td>
                      <td style={{ border: "2px solid #34495e", padding: "10px", color: "#ecf0f1", fontWeight: "600", textShadow: "1px 1px 2px rgba(0,0,0,0.3)" }}>
                        <strong>Compliance</strong>
                        <br />
                        <small>50</small>
                      </td>
                      <td style={{ border: "2px solid #34495e", padding: "10px", color: "#95a5a6", fontStyle: "italic" }}>
                        (empty)
                      </td>
                      <td style={{ border: "2px solid #34495e", padding: "10px", color: "#95a5a6", fontStyle: "italic" }}>
                        (empty)
                      </td>
                    </tr>
                    <tr style={{ background: "linear-gradient(135deg, #ecf0f1 0%, #d5dbdb 100%)" }}>
                      <td
                        style={{
                          border: "2px solid #34495e",
                          padding: "10px",
                          fontWeight: "700",
                          background: "linear-gradient(135deg, #7f8c8d 0%, #95a5a6 100%)",
                          color: "#ecf0f1",
                          textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                        }}
                      >
                        2
                      </td>
                      <td
                        style={{
                          border: "2px solid #34495e",
                          padding: "10px",
                          background: "linear-gradient(135deg, #85c1e9 0%, #5dade2 100%)",
                          color: "#ecf0f1",
                          fontWeight: "700",
                          textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                        }}
                      >
                        <strong>rack 1</strong>
                      </td>
                      <td style={{ border: "2px solid #34495e", padding: "10px", color: "#2c3e50", fontWeight: "600" }}>
                        10629468 (3)
                        <br />
                        <small style={{ color: "#27ae60", fontWeight: "700" }}>= Layer 1</small>
                      </td>
                      <td style={{ border: "2px solid #34495e", padding: "10px", color: "#2c3e50", fontWeight: "600" }}>
                        10629469 (3)
                        <br />
                        <small style={{ color: "#27ae60", fontWeight: "700" }}>= Layer 2</small>
                      </td>
                      <td style={{ border: "2px solid #34495e", padding: "10px", color: "#2c3e50", fontWeight: "600" }}>
                        10629439 (4)
                        <br />
                        <small style={{ color: "#27ae60", fontWeight: "700" }}>= Layer 3</small>
                      </td>
                      <td style={{ border: "2px solid #34495e", padding: "10px", color: "#95a5a6", fontStyle: "italic" }}>
                        (empty)
                      </td>
                      <td style={{ border: "2px solid #34495e", padding: "10px", color: "#95a5a6", fontStyle: "italic" }}>
                        (empty)
                      </td>
                    </tr>
                    <tr style={{ background: "linear-gradient(135deg, #ecf0f1 0%, #d5dbdb 100%)" }}>
                      <td
                        style={{
                          border: "2px solid #34495e",
                          padding: "10px",
                          fontWeight: "700",
                          background: "linear-gradient(135deg, #7f8c8d 0%, #95a5a6 100%)",
                          color: "#ecf0f1",
                          textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                        }}
                      >
                        3
                      </td>
                      <td
                        style={{
                          border: "2px solid #34495e",
                          padding: "10px",
                          background: "linear-gradient(135deg, #85c1e9 0%, #5dade2 100%)",
                          color: "#ecf0f1",
                          fontWeight: "700",
                          textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                        }}
                      >
                        <strong>rack 2</strong>
                      </td>
                      <td style={{ border: "2px solid #34495e", padding: "10px", color: "#2c3e50", fontWeight: "600" }}>
                        10629470 (2)
                        <br />
                        <small style={{ color: "#27ae60", fontWeight: "700" }}>= Layer 1</small>
                      </td>
                      <td style={{ border: "2px solid #34495e", padding: "10px", color: "#2c3e50", fontWeight: "600" }}>
                        10629471 (2)
                        <br />
                        <small style={{ color: "#27ae60", fontWeight: "700" }}>= Layer 2</small>
                      </td>
                      <td style={{ border: "2px solid #34495e", padding: "10px", color: "#2c3e50", fontWeight: "600" }}>
                        10629472
                        <br />
                        <small style={{ color: "#27ae60", fontWeight: "700" }}>= Layer 3</small>
                      </td>
                      <td style={{ border: "2px solid #34495e", padding: "10px", color: "#2c3e50", fontWeight: "600" }}>
                        10629473
                        <br />
                        <small style={{ color: "#27ae60", fontWeight: "700" }}>= Layer 4</small>
                      </td>
                      <td style={{ border: "2px solid #34495e", padding: "10px", color: "#2c3e50", fontWeight: "600" }}>
                        10734053
                        <br />
                        <small style={{ color: "#27ae60", fontWeight: "700" }}>= Layer 5</small>
                      </td>
                    </tr>
                    <tr style={{ background: "linear-gradient(135deg, #ecf0f1 0%, #d5dbdb 100%)" }}>
                      <td
                        style={{
                          border: "2px solid #34495e",
                          padding: "10px",
                          fontWeight: "700",
                          background: "linear-gradient(135deg, #7f8c8d 0%, #95a5a6 100%)",
                          color: "#ecf0f1",
                          textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                        }}
                      >
                        4
                      </td>
                      <td
                        style={{
                          border: "2px solid #34495e",
                          padding: "10px",
                          background: "linear-gradient(135deg, #85c1e9 0%, #5dade2 100%)",
                          color: "#ecf0f1",
                          fontWeight: "700",
                          textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
                        }}
                      >
                        <strong>rack 3</strong>
                      </td>
                      <td style={{ border: "2px solid #34495e", padding: "10px", color: "#2c3e50", fontWeight: "600" }}>...</td>
                      <td style={{ border: "2px solid #34495e", padding: "10px", color: "#2c3e50", fontWeight: "600" }}>...</td>
                      <td style={{ border: "2px solid #34495e", padding: "10px", color: "#2c3e50", fontWeight: "600" }}>...</td>
                      <td style={{ border: "2px solid #34495e", padding: "10px", color: "#2c3e50", fontWeight: "600" }}>...</td>
                      <td style={{ border: "2px solid #34495e", padding: "10px", color: "#2c3e50", fontWeight: "600" }}>...</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginBottom: "25px", position: "relative", zIndex: 1 }}>
              <h3 style={{ color: "#2c3e50", fontSize: "18px", marginBottom: "15px", fontWeight: "700", textShadow: "1px 1px 0 rgba(255,255,255,0.5)" }}>
                🔹 Product Format Examples
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "15px"
                }}
              >
                <div
                  style={{
                    padding: "15px",
                    background: "linear-gradient(135deg, #27ae60 0%, #229954 100%)",
                    border: "2px solid #1e8449",
                    borderRadius: "6px",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)"
                  }}
                >
                  <code style={{ fontSize: "14px", fontWeight: "700", color: "#ecf0f1", textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}>10629468 (3)</code>
                  <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: "#ecf0f1", fontWeight: "600" }}>
                    ✅ Means: [10629468, 10629468, 10629468]
                  </p>
                </div>

                <div
                  style={{
                    padding: "15px",
                    background: "linear-gradient(135deg, #27ae60 0%, #229954 100%)",
                    border: "2px solid #1e8449",
                    borderRadius: "6px",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)"
                  }}
                >
                  <code style={{ fontSize: "14px", fontWeight: "700", color: "#ecf0f1", textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}>10629468</code>
                  <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: "#ecf0f1", fontWeight: "600" }}>
                    ✅ Means: [10629468]
                  </p>
                </div>

                <div
                  style={{
                    padding: "15px",
                    background: "linear-gradient(135deg, #27ae60 0%, #229954 100%)",
                    border: "2px solid #1e8449",
                    borderRadius: "6px",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)"
                  }}
                >
                  <code style={{ fontSize: "14px", fontWeight: "700", color: "#ecf0f1", textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}>
                    10629468 (2) 10629469 (1)
                  </code>
                  <p style={{ margin: "8px 0 0 0", fontSize: "13px", color: "#ecf0f1", fontWeight: "600" }}>
                    ✅ Means: [10629468, 10629468, 10629469]
                  </p>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: "20px",
                background: "linear-gradient(135deg, #3498db 0%, #2980b9 100%)",
                border: "2px solid #21618c",
                borderRadius: "8px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                position: "relative",
                zIndex: 1
              }}
            >
              <h3 style={{ color: "#ecf0f1", fontSize: "16px", margin: "0 0 10px 0", fontWeight: "700", textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}>
                💡 Key Points
              </h3>
              <ul style={{ margin: 0, paddingLeft: "20px", color: "#ecf0f1", lineHeight: "1.8", fontWeight: "600" }}>
                <li>
                  <strong>Row 1:</strong> Header with Image URL (B), Asset IDs (C), Compliance (D)
                </li>
                <li>
                  <strong>Row 2+:</strong> Each row = One rack (Column A = "rack 1", "rack 2", etc.)
                </li>
                <li>
                  <strong>Columns B, C, D, E...:</strong> Each column = One layer in that rack
                </li>
                <li>
                  <strong>Product format:</strong> Use "ProductID (Count)" or just "ProductID"
                </li>
                <li>
                  <strong>Empty cells:</strong> Will create empty layers []
                </li>
                <li>
                  <strong>Multiple sheets:</strong> Each sheet becomes a separate planogram entry
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div
            style={{
              background: "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)",
              border: "2px solid #a93226",
              borderRadius: "8px",
              padding: "15px",
              marginBottom: "25px",
              color: "#ecf0f1",
              boxShadow: "0 4px 10px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
              fontWeight: "700",
              textShadow: "1px 1px 2px rgba(0,0,0,0.5)"
            }}
          >
            <strong>❌ Error:</strong> {error}
          </div>
        )}

        {/* JSON Output */}
        {kpiEnums.some((kpi) => kpi.KPIEnum) && (
          <div
            className="metallic-card"
            style={{
              borderRadius: "12px",
              padding: "25px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "15px",
                position: "relative",
                zIndex: 1
              }}
            >
              <h2 style={{ margin: 0, color: "#2c3e50", fontSize: "24px", fontWeight: "700", textShadow: "1px 1px 0 rgba(255,255,255,0.5)" }}>
                📄 Generated JSON
              </h2>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(generateJSON(), null, "\t"));
                  alert("JSON copied to clipboard!");
                }}
                className="metallic-button"
                style={{
                  padding: "10px 18px",
                  color: "#2c3e50",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "700",
                  fontSize: "14px",
                  textShadow: "1px 1px 0 rgba(255,255,255,0.5)"
                }}
              >
                📋 Copy JSON
              </button>
            </div>
            <pre
              style={{
                background: "linear-gradient(135deg, #1c2833 0%, #17202a 100%)",
                color: "#aed581",
                padding: "20px",
                borderRadius: "8px",
                overflow: "auto",
                fontSize: "13px",
                maxHeight: "600px",
                lineHeight: "1.6",
                margin: 0,
                fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
                border: "2px solid #34495e",
                boxShadow: "inset 0 2px 8px rgba(0,0,0,0.5), 0 4px 10px rgba(0,0,0,0.3)",
                position: "relative",
                zIndex: 1
              }}
            >
              {JSON.stringify(generateJSON(), null, "\t")}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}