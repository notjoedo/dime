import { useState, useCallback } from "react";

interface Recommendation {
    card_id: string;
    card_number: string;
    cardholder: string;
    reason: string;
}

interface OptimalCardResponse {
    merchant: string;
    category: string;
    recommendation: Recommendation | null;
    error?: string;
}

export default function OptimalCard() {
    const [merchant, setMerchant] = useState("");
    const [category, setCategory] = useState("");
    const [result, setResult] = useState<OptimalCardResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const PYTHON_SERVER_URL = "http://localhost:5001";

    const findOptimalCard = useCallback(async () => {
        if (!merchant.trim()) {
            setError("Please enter a merchant name");
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setResult(null);

            const response = await fetch(`${PYTHON_SERVER_URL}/api/optimal-card`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ merchant, category })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch");
        } finally {
            setLoading(false);
        }
    }, [merchant, category]);

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
            <h2 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#333" }}>
                🎯 Optimal Card Finder
            </h2>

            <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#666", marginBottom: "4px" }}>
                    Merchant
                </label>
                <input
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="Amazon, Walmart, DoorDash..."
                    style={{
                        width: "100%",
                        padding: "10px",
                        fontSize: "14px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        boxSizing: "border-box"
                    }}
                />
            </div>

            <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#666", marginBottom: "4px" }}>
                    Category (optional)
                </label>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                        width: "100%",
                        padding: "10px",
                        fontSize: "14px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        boxSizing: "border-box",
                        backgroundColor: "#fff"
                    }}
                >
                    <option value="">Select category...</option>
                    <option value="groceries">Groceries</option>
                    <option value="dining">Dining</option>
                    <option value="travel">Travel</option>
                    <option value="gas">Gas</option>
                    <option value="streaming">Streaming</option>
                    <option value="shopping">Shopping</option>
                    <option value="other">Other</option>
                </select>
            </div>

            <button
                onClick={findOptimalCard}
                disabled={loading}
                style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "14px",
                    fontWeight: "600",
                    backgroundColor: loading ? "#ccc" : "#6f42c1",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: loading ? "not-allowed" : "pointer"
                }}
            >
                {loading ? "Finding..." : "Find Best Card"}
            </button>

            {error && (
                <div style={{
                    marginTop: "12px",
                    padding: "12px",
                    backgroundColor: "#fee",
                    borderRadius: "4px",
                    color: "#c00",
                    fontSize: "13px"
                }}>
                    {error}
                </div>
            )}

            {result?.recommendation && (
                <div style={{
                    marginTop: "16px",
                    padding: "16px",
                    backgroundColor: "#f0fdf4",
                    borderRadius: "6px",
                    border: "1px solid #86efac"
                }}>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>
                        Best card for <strong>{result.merchant}</strong>
                        {result.category && <span> ({result.category})</span>}
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: "600", color: "#333" }}>
                        {result.recommendation.card_number}
                    </div>
                    <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>
                        {result.recommendation.cardholder}
                    </div>
                    <div style={{
                        marginTop: "12px",
                        padding: "8px",
                        backgroundColor: "#fff",
                        borderRadius: "4px",
                        fontSize: "12px",
                        color: "#888"
                    }}>
                        💡 {result.recommendation.reason}
                    </div>
                </div>
            )}
        </div>
    );
}
