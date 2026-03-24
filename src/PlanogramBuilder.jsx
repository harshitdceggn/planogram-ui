import React, { useState } from "react";

export default function PlanogramBuilder() {
  const [kpiEnums, setKpiEnums] = useState([
    {
      KPIEnum: "",
      Weightage: "",
      Target: "",
      Planogram: []
    }
  ]);

  // ============ KPI ENUM LEVEL ============
  const addKPIEnum = () => {
    setKpiEnums([
      ...kpiEnums,
      {
        KPIEnum: "",
        Weightage: "",
        Target: "",
        Planogram: []
      }
    ]);
  };

  const removeKPIEnum = (index) => {
    setKpiEnums(kpiEnums.filter((_, i) => i !== index));
  };

  const updateKPIEnum = (index, field, value) => {
    const updated = [...kpiEnums];
    updated[index][field] = value;
    setKpiEnums(updated);
  };

  // ============ PLANOGRAM ENTRY LEVEL ============
  const addPlanogramEntry = (kpiIndex) => {
    const updated = [...kpiEnums];
    updated[kpiIndex].Planogram.push({
      IdealPlanogramImageUrl: "",
      AssetDefinitionIds: [],
      Compliance: "",
      SubrackProducts: {
        "Rack 1": [[""]]
      }
    });
    setKpiEnums(updated);
  };

  const removePlanogramEntry = (kpiIndex, planoIndex) => {
    const updated = [...kpiEnums];
    updated[kpiIndex].Planogram = updated[kpiIndex].Planogram.filter(
      (_, i) => i !== planoIndex
    );
    setKpiEnums(updated);
  };

  const updatePlanogramField = (kpiIndex, planoIndex, field, value) => {
    const updated = [...kpiEnums];
    updated[kpiIndex].Planogram[planoIndex][field] = value;
    setKpiEnums(updated);
  };

  const updateAssetDefinitionIds = (kpiIndex, planoIndex, value) => {
    const updated = [...kpiEnums];
    // Convert comma-separated string to array of numbers, filter out NaN
    const ids = value
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id !== "" && !isNaN(id))
      .map((id) => parseInt(id));
    updated[kpiIndex].Planogram[planoIndex].AssetDefinitionIds = ids;
    setKpiEnums(updated);
  };

  // ============ SUBRACK LEVEL ============
  const addRack = (kpiIndex, planoIndex) => {
    const updated = [...kpiEnums];
    const subracks = updated[kpiIndex].Planogram[planoIndex].SubrackProducts;
    const rackCount = Object.keys(subracks).length;
    const newRackName = `Rack ${rackCount + 1}`;

    // Get max layers from existing racks
    const maxLayers = Math.max(
      ...Object.values(subracks).map((layers) => layers.length),
      1
    );

    subracks[newRackName] = Array.from({ length: maxLayers }, () => [""]);
    setKpiEnums(updated);
  };

  const removeRack = (kpiIndex, planoIndex, rackName) => {
    const updated = [...kpiEnums];
    const subracks = updated[kpiIndex].Planogram[planoIndex].SubrackProducts;
    delete subracks[rackName];

    // Rename remaining racks
    const rackEntries = Object.entries(subracks);
    const renamedSubracks = {};
    rackEntries.forEach(([_, layers], idx) => {
      renamedSubracks[`Rack ${idx + 1}`] = layers;
    });

    updated[kpiIndex].Planogram[planoIndex].SubrackProducts = renamedSubracks;
    setKpiEnums(updated);
  };

  const addLayer = (kpiIndex, planoIndex) => {
    const updated = [...kpiEnums];
    const subracks = updated[kpiIndex].Planogram[planoIndex].SubrackProducts;

    // Add layer to ALL racks
    Object.keys(subracks).forEach((rackName) => {
      subracks[rackName].push([""]);
    });

    setKpiEnums(updated);
  };

  const addProduct = (kpiIndex, planoIndex, rackName, layerIndex) => {
    const updated = [...kpiEnums];
    const layers =
      updated[kpiIndex].Planogram[planoIndex].SubrackProducts[rackName];
    layers[layerIndex].push("");
    setKpiEnums(updated);
  };

  const updateProduct = (
    kpiIndex,
    planoIndex,
    rackName,
    layerIndex,
    productIndex,
    value
  ) => {
    const updated = [...kpiEnums];
    const layers =
      updated[kpiIndex].Planogram[planoIndex].SubrackProducts[rackName];
    
    // Only allow numbers, empty string, or valid integers
    if (value === "" || !isNaN(value)) {
      layers[layerIndex][productIndex] = value ? parseInt(value) : "";
    }
    
    setKpiEnums(updated);
  };

  const removeProduct = (kpiIndex, planoIndex, rackName, layerIndex, productIndex) => {
    const updated = [...kpiEnums];
    const layers =
      updated[kpiIndex].Planogram[planoIndex].SubrackProducts[rackName];
    layers[layerIndex] = layers[layerIndex].filter((_, i) => i !== productIndex);
    setKpiEnums(updated);
  };

  // ============ GENERATE FINAL JSON ============
  const generateJSON = () => {
    return kpiEnums.map((kpi) => {
      const output = {
        KPIEnum: kpi.KPIEnum ? parseInt(kpi.KPIEnum) : "",
        Weightage: kpi.Weightage ? parseInt(kpi.Weightage) : "",
        Target: kpi.Target ? parseInt(kpi.Target) : ""
      };

      // Add Planogram only if KPIEnum is 11 and Planogram array exists
      if (parseInt(kpi.KPIEnum) === 11 && kpi.Planogram.length > 0) {
        output.Planogram = kpi.Planogram.map((plano) => {
          // Clean SubrackProducts - remove empty strings from layers
          const cleanedSubracks = {};
          Object.entries(plano.SubrackProducts).forEach(([rackName, layers]) => {
            cleanedSubracks[rackName] = layers.map(layer => 
              layer.filter(productId => productId !== "")
            );
          });

          return {
            IdealPlanogramImageUrl: plano.IdealPlanogramImageUrl,
            AssetDefinitionIds: plano.AssetDefinitionIds,
            Compliance: plano.Compliance ? parseInt(plano.Compliance) : "",
            SubrackProducts: cleanedSubracks
          };
        });
      }

      return output;
    });
  };

  return (
    <div style={{ 
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "30px 20px",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        <div style={{ 
          textAlign: "center", 
          marginBottom: "30px",
          color: "white"
        }}>
          <h1 style={{ 
            fontSize: "42px", 
            margin: "0 0 10px 0",
            textShadow: "2px 2px 4px rgba(0,0,0,0.3)"
          }}>
            Planogram Builder
          </h1>
          <p style={{ fontSize: "16px", opacity: 0.9 }}>
            Build your planogram configuration with ease
          </p>
        </div>

        <button
          onClick={addKPIEnum}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            marginBottom: "25px",
            backgroundColor: "#10b981",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
            boxShadow: "0 4px 6px rgba(0,0,0,0.2)",
            transition: "all 0.3s ease",
            display: "block"
          }}
          onMouseOver={(e) => e.target.style.transform = "translateY(-2px)"}
          onMouseOut={(e) => e.target.style.transform = "translateY(0)"}
        >
          ➕ Add KPI Enum
        </button>

        {/* ============ KPI ENUMS ============ */}
        {kpiEnums.map((kpi, kpiIndex) => (
          <div
            key={kpiIndex}
            style={{
              border: "none",
              padding: "25px",
              marginBottom: "25px",
              borderRadius: "12px",
              backgroundColor: "white",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)"
            }}
          >
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              marginBottom: "20px",
              paddingBottom: "15px",
              borderBottom: "2px solid #e5e7eb"
            }}>
              <h2 style={{ margin: 0, color: "#1f2937", fontSize: "24px" }}>
                📊 KPI Enum #{kpiIndex + 1}
              </h2>
              <button
                onClick={() => removeKPIEnum(kpiIndex)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}
              >
                ❌ Remove
              </button>
            </div>

            {/* KPI Fields */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
              gap: "20px", 
              marginBottom: "25px" 
            }}>
              <div>
                <label style={{ 
                  fontWeight: "600", 
                  display: "block", 
                  marginBottom: "8px",
                  color: "#374151",
                  fontSize: "14px"
                }}>
                  KPIEnum
                </label>
                <input
                  type="number"
                  placeholder="e.g., 11"
                  value={kpi.KPIEnum}
                  onChange={(e) => updateKPIEnum(kpiIndex, "KPIEnum", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: "15px",
                    borderRadius: "6px",
                    border: "2px solid #e5e7eb",
                    outline: "none",
                    transition: "border 0.2s",
                    boxSizing: "border-box"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#667eea"}
                  onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                />
              </div>
              <div>
                <label style={{ 
                  fontWeight: "600", 
                  display: "block", 
                  marginBottom: "8px",
                  color: "#374151",
                  fontSize: "14px"
                }}>
                  Weightage
                </label>
                <input
                  type="number"
                  placeholder="e.g., 50"
                  value={kpi.Weightage}
                  onChange={(e) => updateKPIEnum(kpiIndex, "Weightage", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: "15px",
                    borderRadius: "6px",
                    border: "2px solid #e5e7eb",
                    outline: "none",
                    transition: "border 0.2s",
                    boxSizing: "border-box"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#667eea"}
                  onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                />
              </div>
              <div>
                <label style={{ 
                  fontWeight: "600", 
                  display: "block", 
                  marginBottom: "8px",
                  color: "#374151",
                  fontSize: "14px"
                }}>
                  Target
                </label>
                <input
                  type="number"
                  placeholder="e.g., 60"
                  value={kpi.Target}
                  onChange={(e) => updateKPIEnum(kpiIndex, "Target", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: "15px",
                    borderRadius: "6px",
                    border: "2px solid #e5e7eb",
                    outline: "none",
                    transition: "border 0.2s",
                    boxSizing: "border-box"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#667eea"}
                  onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                />
              </div>
            </div>

            {/* Show Planogram section ONLY if KPIEnum is 11 */}
            {parseInt(kpi.KPIEnum) === 11 && (
              <div style={{ 
                marginTop: "25px",
                padding: "20px",
                backgroundColor: "#fef3c7",
                borderRadius: "8px",
                border: "2px solid #fbbf24"
              }}>
                <h3 style={{ margin: "0 0 15px 0", color: "#92400e", fontSize: "20px" }}>
                  📋 Asset Entries
                </h3>
                <button
                  onClick={() => addPlanogramEntry(kpiIndex)}
                  style={{
                    padding: "10px 18px",
                    backgroundColor: "#f59e0b",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "600",
                    marginBottom: "20px",
                    fontSize: "14px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                  }}
                >
                  ➕ Add Asset Entry
                </button>

                {/* ============ PLANOGRAM ENTRIES ============ */}
                {kpi.Planogram.map((plano, planoIndex) => (
                  <div
                    key={planoIndex}
                    style={{
                      border: "none",
                      padding: "20px",
                      marginBottom: "20px",
                      borderRadius: "8px",
                      backgroundColor: "white",
                      boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
                    }}
                  >
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center",
                      marginBottom: "15px",
                      paddingBottom: "12px",
                      borderBottom: "1px solid #e5e7eb"
                    }}>
                      <h4 style={{ margin: 0, color: "#1f2937", fontSize: "18px" }}>
                        🗂️ Asset Entry #{planoIndex + 1}
                      </h4>
                      <button
                        onClick={() => removePlanogramEntry(kpiIndex, planoIndex)}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "5px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "600"
                        }}
                      >
                        ❌ Remove
                      </button>
                    </div>

                    {/* Planogram Fields */}
                    <div style={{ marginTop: "15px" }}>
                      <label style={{ 
                        fontWeight: "600", 
                        display: "block", 
                        marginBottom: "8px",
                        color: "#374151",
                        fontSize: "14px"
                      }}>
                        IdealPlanogramImageUrl
                      </label>
                      <input
                        type="text"
                        placeholder="https://example.com/image.jpg"
                        value={plano.IdealPlanogramImageUrl}
                        onChange={(e) =>
                          updatePlanogramField(kpiIndex, planoIndex, "IdealPlanogramImageUrl", e.target.value)
                        }
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          fontSize: "14px",
                          borderRadius: "6px",
                          border: "2px solid #e5e7eb",
                          marginBottom: "15px",
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                        onFocus={(e) => e.target.style.borderColor = "#f59e0b"}
                        onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                      />

                      <label style={{ 
                        fontWeight: "600", 
                        display: "block", 
                        marginBottom: "8px",
                        color: "#374151",
                        fontSize: "14px"
                      }}>
                        AssetDefinitionIds <span style={{ fontSize: "12px", color: "#6b7280" }}>(comma-separated integers only)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., 56006, 56005"
                        value={plano.AssetDefinitionIds.join(", ")}
                        onChange={(e) => updateAssetDefinitionIds(kpiIndex, planoIndex, e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          fontSize: "14px",
                          borderRadius: "6px",
                          border: "2px solid #e5e7eb",
                          marginBottom: "15px",
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                        onFocus={(e) => e.target.style.borderColor = "#f59e0b"}
                        onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                      />

                      <label style={{ 
                        fontWeight: "600", 
                        display: "block", 
                        marginBottom: "8px",
                        color: "#374151",
                        fontSize: "14px"
                      }}>
                        Compliance <span style={{ fontSize: "12px", color: "#6b7280" }}>(integer only)</span>
                      </label>
                      <input
                        type="number"
                        placeholder="e.g., 50"
                        value={plano.Compliance}
                        onChange={(e) =>
                          updatePlanogramField(kpiIndex, planoIndex, "Compliance", e.target.value)
                        }
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          fontSize: "14px",
                          borderRadius: "6px",
                          border: "2px solid #e5e7eb",
                          marginBottom: "20px",
                          outline: "none",
                          boxSizing: "border-box"
                        }}
                        onFocus={(e) => e.target.style.borderColor = "#f59e0b"}
                        onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                      />
                    </div>

                    {/* ============ SUBRACK PRODUCTS ============ */}
                    <div style={{
                      padding: "15px",
                      backgroundColor: "#f3f4f6",
                      borderRadius: "6px",
                      marginTop: "15px"
                    }}>
                      <h4 style={{ margin: "0 0 15px 0", color: "#1f2937", fontSize: "16px" }}>
                        🏪 SubrackProducts
                      </h4>
                      <div style={{ marginBottom: "15px" }}>
                        <button
                          onClick={() => addRack(kpiIndex, planoIndex)}
                          style={{
                            padding: "8px 14px",
                            backgroundColor: "#8b5cf6",
                            color: "white",
                            border: "none",
                            borderRadius: "5px",
                            cursor: "pointer",
                            marginRight: "10px",
                            fontSize: "13px",
                            fontWeight: "600",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                          }}
                        >
                          ➕ Add Rack
                        </button>
                        <button
                          onClick={() => addLayer(kpiIndex, planoIndex)}
                          style={{
                            padding: "8px 14px",
                            backgroundColor: "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: "5px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "600",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                          }}
                        >
                          ➕ Add Layer (All Racks)
                        </button>
                      </div>

                      {/* Racks */}
                      {Object.entries(plano.SubrackProducts).map(([rackName, layers]) => (
                        <div
                          key={rackName}
                          style={{
                            border: "2px solid #d1d5db",
                            padding: "12px",
                            marginBottom: "12px",
                            borderRadius: "6px",
                            backgroundColor: "white"
                          }}
                        >
                          <div style={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "center",
                            marginBottom: "10px"
                          }}>
                            <strong style={{ color: "#1f2937", fontSize: "15px" }}>
                              🗄️ {rackName}
                            </strong>
                            <button
                              onClick={() => removeRack(kpiIndex, planoIndex, rackName)}
                              style={{
                                padding: "4px 10px",
                                backgroundColor: "#ef4444",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "600"
                              }}
                            >
                              ❌
                            </button>
                          </div>

                          {/* Layers */}
                          {layers.map((layer, layerIndex) => (
                            <div key={layerIndex} style={{ marginTop: "12px" }}>
                              <div style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                marginBottom: "8px",
                                gap: "10px"
                              }}>
                                <strong style={{ fontSize: "13px", color: "#6b7280", minWidth: "60px" }}>
                                  Layer {layerIndex + 1}:
                                </strong>
                                <button
                                  onClick={() => addProduct(kpiIndex, planoIndex, rackName, layerIndex)}
                                  style={{
                                    padding: "4px 10px",
                                    backgroundColor: "#10b981",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    fontWeight: "600"
                                  }}
                                >
                                  ➕ Product
                                </button>
                              </div>

                              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {layer.map((productId, productIndex) => (
                                  <div key={productIndex} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <input
                                      type="number"
                                      placeholder="Product ID"
                                      value={productId}
                                      onChange={(e) =>
                                        updateProduct(
                                          kpiIndex,
                                          planoIndex,
                                          rackName,
                                          layerIndex,
                                          productIndex,
                                          e.target.value
                                        )
                                      }
                                      style={{
                                        width: "110px",
                                        padding: "6px 8px",
                                        fontSize: "13px",
                                        borderRadius: "4px",
                                        border: "1px solid #d1d5db",
                                        outline: "none"
                                      }}
                                      onFocus={(e) => e.target.style.borderColor = "#10b981"}
                                      onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                                    />
                                    <button
                                      onClick={() =>
                                        removeProduct(kpiIndex, planoIndex, rackName, layerIndex, productIndex)
                                      }
                                      style={{
                                        padding: "4px 8px",
                                        backgroundColor: "#ef4444",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "3px",
                                        cursor: "pointer",
                                        fontSize: "11px",
                                        fontWeight: "600",
                                        lineHeight: "1"
                                      }}
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* ============ JSON OUTPUT ============ */}
        <div style={{ 
          marginTop: "30px",
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "25px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.15)"
        }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: "15px"
          }}>
            <h2 style={{ margin: 0, color: "#1f2937", fontSize: "24px" }}>
              📄 Generated JSON
            </h2>
            <button
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(generateJSON(), null, "\t"));
                alert("JSON copied to clipboard!");
              }}
              style={{
                padding: "10px 18px",
                backgroundColor: "#667eea",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "14px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
              }}
            >
              📋 Copy JSON
            </button>
          </div>
          <pre
            style={{
              background: "#1e293b",
              color: "#e2e8f0",
              padding: "20px",
              borderRadius: "8px",
              overflow: "auto",
              fontSize: "13px",
              maxHeight: "600px",
              lineHeight: "1.6",
              margin: 0,
              fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace"
            }}
          >
            {JSON.stringify(generateJSON(), null, "\t")}
          </pre>
        </div>
      </div>
    </div>
  );
}