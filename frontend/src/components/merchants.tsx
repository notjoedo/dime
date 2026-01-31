import { useState, useCallback, useEffect } from "react";

interface ConnectedMerchant {
    merchant_id: number;
    name: string;
    logo_url?: string;
    top_of_file_payment: string;
    connected_at?: string;
    last_transaction_at?: string;
}

const PAYMENT_METHODS = [
    { value: "paypal", label: "PayPal", icon: "💳" },
    { value: "visa", label: "Visa", icon: "💳" },
    { value: "mastercard", label: "Mastercard", icon: "💳" },
    { value: "amex", label: "Amex", icon: "💳" },
    { value: "discover", label: "Discover", icon: "💳" },
    { value: "apple_pay", label: "Apple Pay", icon: "🍎" },
    { value: "google_pay", label: "Google Pay", icon: "🔵" },
];

const POPULAR_MERCHANTS = [
    { id: 44, name: "Amazon" },
    { id: 16, name: "Netflix" },
    { id: 19, name: "DoorDash" },
    { id: 40, name: "Uber" },
    { id: 45, name: "Spotify" },
    { id: 28, name: "Walmart" },
    { id: 55, name: "Target" },
];

export default function Merchants() {
    const [clientId, setClientId] = useState("");
    const [merchantId, setMerchantId] = useState("");
    const [userId, setUserId] = useState("test_user");
    const [product] = useState("transaction_link");
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>("Ready");
    const [connectedMerchants, setConnectedMerchants] = useState<ConnectedMerchant[]>([]);

    const PYTHON_SERVER_URL = "http://localhost:5001";

    // Fetch client ID and connected merchants
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [configRes, merchantsRes] = await Promise.all([
                    fetch(`${PYTHON_SERVER_URL}/api/knot/config`),
                    fetch(`${PYTHON_SERVER_URL}/api/merchants?user_id=${userId}`)
                ]);

                const configData = await configRes.json();
                if (configData.client_id) {
                    setClientId(configData.client_id);
                }

                const merchantsData = await merchantsRes.json();
                setConnectedMerchants(merchantsData.merchants || []);
            } catch (err) {
                console.error("Failed to fetch initial data:", err);
            }
        };
        fetchInitialData();
    }, [userId]);

    const refreshMerchants = async () => {
        try {
            const res = await fetch(`${PYTHON_SERVER_URL}/api/merchants?user_id=${userId}`);
            const data = await res.json();
            setConnectedMerchants(data.merchants || []);
        } catch (err) {
            console.error("Failed to refresh merchants:", err);
        }
    };

    const saveMerchantToBackend = async (merchantIdNum: number, merchantName: string) => {
        try {
            await fetch(`${PYTHON_SERVER_URL}/api/merchants`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: userId,
                    merchant_id: merchantIdNum,
                    name: merchantName
                })
            });
            await refreshMerchants();
        } catch (err) {
            console.error("Failed to save merchant:", err);
        }
    };

    const updatePaymentMethod = async (merchantIdNum: number, paymentMethod: string) => {
        try {
            await fetch(`${PYTHON_SERVER_URL}/api/merchants/${merchantIdNum}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: userId,
                    payment_method: paymentMethod
                })
            });
            await refreshMerchants();
        } catch (err) {
            console.error("Failed to update payment:", err);
        }
    };

    const launchKnotSDK = useCallback(async (merchantIdOverride?: number, merchantName?: string) => {
        const targetMerchantId = merchantIdOverride?.toString() || merchantId;

        if (!clientId.trim()) {
            setError("Client ID not loaded from backend");
            return;
        }
        if (!targetMerchantId.trim()) {
            setError("Please enter a Merchant ID");
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setStatus("Creating session...");

            const response = await fetch(`${PYTHON_SERVER_URL}/api/knot/create-session`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: userId,
                    product: product
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || data.error_message || "Failed to create session");
            }

            const sid = data.session_id || data.session;
            setSessionId(sid);
            setStatus("Session created, launching SDK...");

            const KnotapiJS = (await import("knotapi-js")).default;
            const knotapi = new KnotapiJS();

            knotapi.open({
                sessionId: sid,
                clientId: clientId,
                environment: "production",
                product: product as any,
                merchantIds: [parseInt(targetMerchantId)],
                entryPoint: "test",
                onEvent: (eventData: any) => {
                    console.log("🔹 SDK Event:", eventData);
                    setStatus(`Event: ${JSON.stringify(eventData)}`);
                },
                onSuccess: async (successData: any) => {
                    console.log("Success:", successData);
                    setStatus("Success! Merchant connected.");
                    // Save to Snowflake
                    await saveMerchantToBackend(
                        parseInt(targetMerchantId),
                        merchantName || `Merchant ${targetMerchantId}`
                    );
                    setLoading(false);
                },
                onError: (err: any) => {
                    console.error("Error:", err);
                    setError(`SDK Error: ${JSON.stringify(err)}`);
                    setLoading(false);
                },
                onExit: () => {
                    setStatus("SDK closed");
                    setLoading(false);
                },
            });
        } catch (err) {
            console.error("Launch error:", err);
            setError(err instanceof Error ? err.message : "Failed to launch SDK");
            setLoading(false);
        }
    }, [clientId, merchantId, userId, product]);

    return (
        <div style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            maxWidth: "600px",
            margin: "20px auto",
            padding: "24px",
            backgroundColor: "#fff",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
            <h2 style={{ fontSize: "20px", marginBottom: "20px", color: "#333" }}>
                🔗 Merchants
            </h2>

            {/* Connected Merchants */}
            {connectedMerchants.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                    <h3 style={{ fontSize: "14px", color: "#666", marginBottom: "12px" }}>Connected Merchants</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {connectedMerchants.map((merchant) => (
                            <div key={merchant.merchant_id} style={{
                                padding: "14px",
                                backgroundColor: "#f8f9fa",
                                borderRadius: "8px",
                                borderLeft: "4px solid #28a745"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div>
                                        <div style={{ fontWeight: "600", color: "#333" }}>{merchant.name}</div>
                                        <div style={{ fontSize: "12px", color: "#888" }}>ID: {merchant.merchant_id}</div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                        <select
                                            value={merchant.top_of_file_payment}
                                            onChange={(e) => updatePaymentMethod(merchant.merchant_id, e.target.value)}
                                            style={{
                                                padding: "6px 10px",
                                                fontSize: "12px",
                                                border: "1px solid #ddd",
                                                borderRadius: "4px",
                                                backgroundColor: "#fff"
                                            }}
                                        >
                                            {PAYMENT_METHODS.map((pm) => (
                                                <option key={pm.value} value={pm.value}>{pm.label}</option>
                                            ))}
                                        </select>
                                        <div style={{ fontSize: "10px", color: "#aaa", marginTop: "4px" }}>
                                            Top of File
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Connect Popular Merchants */}
            <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "14px", color: "#666", marginBottom: "12px" }}>Quick Connect</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {POPULAR_MERCHANTS.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => launchKnotSDK(m.id, m.name)}
                            disabled={loading || connectedMerchants.some(cm => cm.merchant_id === m.id)}
                            style={{
                                padding: "8px 14px",
                                fontSize: "13px",
                                backgroundColor: connectedMerchants.some(cm => cm.merchant_id === m.id) ? "#e9ecef" : "#007bff",
                                color: connectedMerchants.some(cm => cm.merchant_id === m.id) ? "#666" : "#fff",
                                border: "none",
                                borderRadius: "20px",
                                cursor: loading || connectedMerchants.some(cm => cm.merchant_id === m.id) ? "not-allowed" : "pointer",
                                opacity: loading ? 0.6 : 1
                            }}
                        >
                            {connectedMerchants.some(cm => cm.merchant_id === m.id) ? "✓ " : ""}{m.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Merchant ID */}
            <div style={{ marginBottom: "16px" }}>
                <h3 style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>Or Enter Merchant ID</h3>
                <div style={{ display: "flex", gap: "8px" }}>
                    <input
                        type="text"
                        value={merchantId}
                        onChange={(e) => setMerchantId(e.target.value)}
                        placeholder="Merchant ID (e.g., 44)"
                        style={{
                            flex: 1,
                            padding: "10px 12px",
                            fontSize: "14px",
                            border: "1px solid #ddd",
                            borderRadius: "6px"
                        }}
                    />
                    <button
                        onClick={() => launchKnotSDK()}
                        disabled={loading || !clientId || !merchantId}
                        style={{
                            padding: "10px 20px",
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#fff",
                            backgroundColor: loading || !clientId || !merchantId ? "#999" : "#007bff",
                            border: "none",
                            borderRadius: "6px",
                            cursor: loading || !clientId || !merchantId ? "not-allowed" : "pointer"
                        }}
                    >
                        {loading ? "..." : "Connect"}
                    </button>
                </div>
            </div>

            {error && (
                <div style={{
                    marginTop: "16px",
                    padding: "12px",
                    backgroundColor: "#fee",
                    border: "1px solid #fcc",
                    borderRadius: "6px",
                    color: "#c00",
                    fontSize: "13px"
                }}>
                    {error}
                </div>
            )}

            <div style={{
                marginTop: "16px",
                padding: "12px",
                backgroundColor: "#f8f9fa",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#666"
            }}>
                <strong>Status:</strong> {status}
                {sessionId && (
                    <div style={{ marginTop: "4px", wordBreak: "break-all", fontFamily: "monospace", fontSize: "10px" }}>
                        Session: {sessionId.slice(0, 20)}...
                    </div>
                )}
            </div>
        </div>
    );
}
