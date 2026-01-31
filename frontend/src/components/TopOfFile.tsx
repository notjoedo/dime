import { useState, useEffect, useCallback } from "react";

interface TopOfFileData {
    // Placeholder structure - to be defined
}

export default function TopOfFile() {
    const [data, setData] = useState<TopOfFileData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const PYTHON_SERVER_URL = "http://localhost:5001";

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${PYTHON_SERVER_URL}/api/top-of-file`);
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
                    📄 Top of File
                </h2>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    style={{
                        padding: "6px 12px",
                        fontSize: "12px",
                        backgroundColor: loading ? "#ccc" : "#007bff",
                        color: "#fff",
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
                {data ? (
                    <pre style={{ margin: 0, textAlign: "left", fontSize: "12px", overflow: "auto" }}>
                        {JSON.stringify(data, null, 2)}
                    </pre>
                ) : (
                    <span>No data yet - endpoint not implemented</span>
                )}
            </div>
        </div>
    );
}
