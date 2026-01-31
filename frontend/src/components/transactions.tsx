import { useState, useEffect, useCallback } from "react";

interface TransactionProduct {
    external_id?: string;
    name?: string;
    description?: string;
    url?: string;
    image?: string;
    quantity?: number;
    unit_price?: string;
}

interface Transaction {
    id?: string;
    external_id?: string;
    datetime?: string;
    url?: string;
    order_status?: string;
    price?: {
        sub_total?: string;
        total?: string;
        currency?: string;
        adjustments?: Array<{
            type?: string;
            label?: string;
            amount?: string;
        }>;
    };
    products?: TransactionProduct[];
    payment_methods?: Array<{
        type?: string;
        brand?: string;
        last_four?: string;
        name?: string;
        transaction_amount?: string;
    }>;
}

interface SyncResponse {
    merchant?: {
        id?: number;
        name?: string;
    };
    transactions?: Transaction[];
    cursor?: string;
    has_more?: boolean;
}


export default function Transactions() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [merchantInfo, setMerchantInfo] = useState<{ id?: number; name?: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);


    const [userId, setUserId] = useState("aman");
    const [merchantId, setMerchantId] = useState("19"); // Default to DoorDash as requested
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);

    const PYTHON_SERVER_URL = "http://localhost:5001";

    const fetchTransactions = useCallback(async (useCursor: boolean = false) => {
        if (!userId.trim() || !merchantId.trim()) {
            setError("Please enter User ID and Merchant ID");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${PYTHON_SERVER_URL}/api/knot/transactions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: userId,
                    merchant_id: parseInt(merchantId),
                    cursor: useCursor ? cursor : undefined,
                    limit: 20
                }),
            });

            const data: SyncResponse = await response.json();

            if (!response.ok) {
                throw new Error((data as any).error || (data as any).error_message || `HTTP ${response.status}`);
            }

            if (data.merchant) {
                setMerchantInfo(data.merchant);
            }

            if (useCursor && cursor) {
                // Append to existing transactions
                setTransactions(prev => [...prev, ...(data.transactions || [])]);
            } else {
                // Replace transactions
                setTransactions(data.transactions || []);
            }

            setCursor(data.cursor || null);
            setHasMore(data.has_more || false);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Fetch error:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch transactions");
        } finally {
            setLoading(false);
        }
    }, [userId, merchantId, cursor]);

    // Initial fetch and auto-refresh setup
    useEffect(() => {
        // Initial fetch
        fetchTransactions(false);

        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            console.log("Auto-syncing transactions...");
            fetchTransactions(false);
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchTransactions]);

    const formatCurrency = (price?: { total?: string; currency?: string }) => {
        if (!price?.total) return "$0.00";
        const amount = parseFloat(price.total);
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: price.currency || "USD"
        }).format(amount);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return "Unknown date";
        try {
            return new Date(dateStr).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        } catch {
            return dateStr;
        }
    };

    const getStatusColor = (status?: string) => {
        switch (status?.toUpperCase()) {
            case "COMPLETED":
                return { bg: "#d4edda", color: "#155724" };
            case "PENDING":
                return { bg: "#fff3cd", color: "#856404" };
            case "CANCELLED":
            case "FAILED":
                return { bg: "#f8d7da", color: "#721c24" };
            default:
                return { bg: "#e2e3e5", color: "#383d41" };
        }
    };

    return (
        <div style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            maxWidth: "700px",
            margin: "40px auto",
            padding: "24px",
            backgroundColor: "#fff",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h1 style={{ fontSize: "24px", margin: 0, color: "#333" }}>
                    📦 Transaction History
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: loading ? "#ffc107" : "#28a745",
                        boxShadow: loading ? "0 0 8px #ffc107" : "none"
                    }}></div>
                    <span style={{ fontSize: "12px", color: "#666", fontWeight: "500" }}>
                        {loading ? "Syncing..." : "Live"}
                    </span>
                </div>
            </div>

            {/* Sync Controls */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginBottom: "20px"
            }}>
                <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#666", marginBottom: "4px" }}>
                        User ID
                    </label>
                    <input
                        type="text"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="test_user"
                        style={{
                            width: "100%",
                            padding: "8px 12px",
                            fontSize: "14px",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            boxSizing: "border-box"
                        }}
                    />
                </div>
                <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#666", marginBottom: "4px" }}>
                        Merchant ID
                    </label>
                    <input
                        type="text"
                        value={merchantId}
                        onChange={(e) => setMerchantId(e.target.value)}
                        placeholder="19 (DoorDash)"
                        style={{
                            width: "100%",
                            padding: "8px 12px",
                            fontSize: "14px",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                            boxSizing: "border-box"
                        }}
                    />
                </div>
            </div>

            {merchantInfo && (
                <div style={{ fontSize: "13px", color: "#666", marginBottom: "16px" }}>
                    <strong>Merchant:</strong> {merchantInfo.name} (ID: {merchantInfo.id})
                </div>
            )}

            {lastUpdated && (
                <div style={{ fontSize: "11px", color: "#999", marginBottom: "16px" }}>
                    Last synced: {lastUpdated.toLocaleTimeString()}
                </div>
            )}

            {error && (
                <div style={{
                    marginBottom: "16px",
                    padding: "12px",
                    backgroundColor: "#fee",
                    border: "1px solid #fcc",
                    borderRadius: "4px",
                    color: "#c00",
                    fontSize: "13px"
                }}>
                    ⚠️ {error}
                </div>
            )}

            {transactions.length === 0 ? (
                <div style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "#999",
                    backgroundColor: "#f9f9f9",
                    borderRadius: "4px"
                }}>
                    <div style={{ fontSize: "48px", marginBottom: "16px" }}>📭</div>
                    <div style={{ fontSize: "16px", fontWeight: "500" }}>No transactions yet</div>
                    <div style={{ fontSize: "13px", marginTop: "8px" }}>
                        Enter User ID and Merchant ID, then click "Sync Transactions"
                    </div>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {transactions.map((tx, index) => (
                        <div
                            key={tx.id || index}
                            style={{
                                padding: "16px",
                                backgroundColor: "#f9f9f9",
                                borderRadius: "6px",
                                border: "1px solid #eee"
                            }}
                        >
                            {/* Header row */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                                <div>
                                    <div style={{ fontWeight: "600", fontSize: "15px", color: "#333" }}>
                                        Order #{tx.external_id?.slice(0, 8) || tx.id?.slice(0, 8) || "N/A"}
                                    </div>
                                    <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
                                        {formatDate(tx.datetime)}
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <div style={{ fontSize: "18px", fontWeight: "600", color: "#333" }}>
                                        {formatCurrency(tx.price)}
                                    </div>
                                    {tx.order_status && (
                                        <div style={{
                                            padding: "4px 8px",
                                            fontSize: "10px",
                                            fontWeight: "600",
                                            textTransform: "uppercase",
                                            borderRadius: "4px",
                                            backgroundColor: getStatusColor(tx.order_status).bg,
                                            color: getStatusColor(tx.order_status).color
                                        }}>
                                            {tx.order_status}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Products */}
                            {tx.products && tx.products.length > 0 && (
                                <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #eee" }}>
                                    <div style={{ fontSize: "11px", fontWeight: "600", color: "#888", marginBottom: "8px" }}>
                                        ITEMS ({tx.products.length})
                                    </div>
                                    {tx.products.slice(0, 3).map((product, pIndex) => (
                                        <div key={pIndex} style={{ display: "flex", alignItems: "center", marginBottom: "6px" }}>
                                            {product.image && (
                                                <img
                                                    src={product.image}
                                                    alt={product.name}
                                                    style={{
                                                        width: "32px",
                                                        height: "32px",
                                                        borderRadius: "4px",
                                                        objectFit: "cover",
                                                        marginRight: "8px"
                                                    }}
                                                />
                                            )}
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: "13px", color: "#333" }}>
                                                    {product.name || "Unknown item"}
                                                </div>
                                                {product.quantity && (
                                                    <div style={{ fontSize: "11px", color: "#888" }}>
                                                        Qty: {product.quantity}
                                                    </div>
                                                )}
                                            </div>
                                            {product.unit_price && (
                                                <div style={{ fontSize: "12px", color: "#666" }}>
                                                    ${product.unit_price}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {tx.products.length > 3 && (
                                        <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>
                                            +{tx.products.length - 3} more items
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Payment methods */}
                            {tx.payment_methods && tx.payment_methods.length > 0 && (
                                <div style={{ marginTop: "8px", fontSize: "11px", color: "#888" }}>
                                    💳 {tx.payment_methods.map(pm => `${pm.brand || pm.type} •••• ${pm.last_four}`).join(", ")}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Load more button */}
            {hasMore && cursor && (
                <button
                    onClick={() => fetchTransactions(true)}
                    disabled={loading}
                    style={{
                        width: "100%",
                        marginTop: "16px",
                        padding: "10px",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#007bff",
                        backgroundColor: "#fff",
                        border: "1px solid #007bff",
                        borderRadius: "4px",
                        cursor: loading ? "not-allowed" : "pointer"
                    }}
                >
                    Load More
                </button>
            )}

            <div style={{
                marginTop: "24px",
                padding: "12px",
                backgroundColor: "#f0f0f0",
                borderRadius: "4px",
                fontSize: "12px",
                color: "#666"
            }}>
                <strong>Total:</strong> {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
            </div>
        </div>
    );
}
