import { useState, useEffect, useCallback } from "react";

interface Alert {
    id?: string;
    type?: string;
    message?: string;
    timestamp?: string;
}

interface AlertsData {
    alerts?: Alert[];
}

export default function Alerts() {
    const [data, setData] = useState<AlertsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const PYTHON_SERVER_URL = "http://localhost:5001";

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${PYTHON_SERVER_URL}/api/alerts`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            maxWidth: "500px",
            margin: "20px auto",
            padding: "20px",
            backgroundColor: "#fff",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ margin: 0, fontSize: "18px", color: "#333" }}>
                    🔔 Alerts
                </h2>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    style={{
                        padding: "6px 12px",
                        fontSize: "12px",
                        backgroundColor: loading ? "#ccc" : "#ffc107",
                        color: "#333",
                        border: "none",
                        borderRadius: "4px",
                        cursor: loading ? "not-allowed" : "pointer"
                    }}
                >
                    {loading ? "..." : "Refresh"}
                </button>
            </div>

            {error && (
                <div style={{ padding: "12px", backgroundColor: "#fee", borderRadius: "4px", color: "#c00", fontSize: "13px", marginBottom: "12px" }}>
                    {error}
                </div>
            )}

            <div style={{ padding: "20px", backgroundColor: "#f5f5f5", borderRadius: "4px", textAlign: "center", color: "#888" }}>
                {data?.alerts && data.alerts.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {data.alerts.map((alert, index) => (
                            <div key={alert.id || index} style={{
                                padding: "10px",
                                backgroundColor: "#fff",
                                borderRadius: "4px",
                                borderLeft: "3px solid #ffc107",
                                textAlign: "left"
                            }}>
                                <div style={{ fontSize: "13px", color: "#333" }}>{alert.message}</div>
                                {alert.timestamp && (
                                    <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>{alert.timestamp}</div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <span>No alerts - endpoint not implemented</span>
                )}
            </div>
        </div>
    );
}
