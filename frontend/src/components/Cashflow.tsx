import { useState, useEffect, useCallback } from "react";

interface CategoryData {
    category: string;
    transaction_count: number;
    total_spent: number;
    avg_transaction: number;
}

interface CashflowData {
    user_id: string;
    period_days: number;
    total_spent: number;
    by_category: CategoryData[];
    error?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
    groceries: "#22c55e",
    dining: "#f97316",
    travel: "#3b82f6",
    gas: "#eab308",
    streaming: "#a855f7",
    shopping: "#ec4899",
    utilities: "#6b7280",
    healthcare: "#ef4444",
    entertainment: "#06b6d4",
    other: "#94a3b8",
    uncategorized: "#d1d5db"
};

export default function Cashflow() {
    const [data, setData] = useState<CashflowData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState("test_user");
    const [days, setDays] = useState(30);

    const PYTHON_SERVER_URL = "http://localhost:5001";

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${PYTHON_SERVER_URL}/api/cashflow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId, days })
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch");
        } finally {
            setLoading(false);
        }
    }, [userId, days]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

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
                    💰 Cashflow
                </h2>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    style={{
                        padding: "6px 12px",
                        fontSize: "12px",
                        backgroundColor: loading ? "#ccc" : "#28a745",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: loading ? "not-allowed" : "pointer"
                    }}
                >
                    {loading ? "..." : "Refresh"}
                </button>
            </div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="User ID"
                    style={{
                        flex: 1,
                        padding: "8px",
                        fontSize: "13px",
                        border: "1px solid #ddd",
                        borderRadius: "4px"
                    }}
                />
                <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    style={{
                        padding: "8px",
                        fontSize: "13px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        backgroundColor: "#fff"
                    }}
                >
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                </select>
            </div>

            {error && (
                <div style={{ padding: "12px", backgroundColor: "#fee", borderRadius: "4px", color: "#c00", fontSize: "13px", marginBottom: "12px" }}>
                    {error}
                </div>
            )}

            {data?.error && !data.by_category?.length && (
                <div style={{ padding: "20px", backgroundColor: "#f5f5f5", borderRadius: "4px", textAlign: "center", color: "#888" }}>
                    Snowflake not configured - connect to see analytics
                </div>
            )}

            {data?.by_category && data.by_category.length > 0 && (
                <>
                    <div style={{
                        padding: "16px",
                        backgroundColor: "#f0fdf4",
                        borderRadius: "6px",
                        marginBottom: "12px",
                        textAlign: "center"
                    }}>
                        <div style={{ fontSize: "12px", color: "#666" }}>Total Spent ({days} days)</div>
                        <div style={{ fontSize: "24px", fontWeight: "700", color: "#16a34a" }}>
                            {formatCurrency(data.total_spent)}
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {data.by_category.map((cat) => {
                            const percentage = data.total_spent > 0 ? (cat.total_spent / data.total_spent) * 100 : 0;
                            return (
                                <div key={cat.category} style={{
                                    padding: "12px",
                                    backgroundColor: "#f9f9f9",
                                    borderRadius: "6px",
                                    borderLeft: `4px solid ${CATEGORY_COLORS[cat.category] || "#888"}`
                                }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div>
                                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#333", textTransform: "capitalize" }}>
                                                {cat.category}
                                            </div>
                                            <div style={{ fontSize: "11px", color: "#888" }}>
                                                {cat.transaction_count} transactions
                                            </div>
                                        </div>
                                        <div style={{ textAlign: "right" }}>
                                            <div style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>
                                                {formatCurrency(cat.total_spent)}
                                            </div>
                                            <div style={{ fontSize: "11px", color: "#888" }}>
                                                {percentage.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{
                                        marginTop: "8px",
                                        height: "4px",
                                        backgroundColor: "#e5e7eb",
                                        borderRadius: "2px",
                                        overflow: "hidden"
                                    }}>
                                        <div style={{
                                            width: `${percentage}%`,
                                            height: "100%",
                                            backgroundColor: CATEGORY_COLORS[cat.category] || "#888",
                                            transition: "width 0.3s ease"
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {data && !data.error && (!data.by_category || data.by_category.length === 0) && (
                <div style={{ padding: "20px", backgroundColor: "#f5f5f5", borderRadius: "4px", textAlign: "center", color: "#888" }}>
                    No transaction data yet
                </div>
            )}
        </div>
    );
}
