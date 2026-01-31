import { useState, useCallback, useEffect } from "react";


export default function Merchants() {
    const [clientId, setClientId] = useState("");
    const [merchantId, setMerchantId] = useState("");
    const [userId, setUserId] = useState("test_user");
    const [product] = useState("transaction_link");
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>("Ready");

    const PYTHON_SERVER_URL = "http://localhost:5001";

    useEffect(() => {
        const fetchClientId = async () => {
            try {
                const response = await fetch(`${PYTHON_SERVER_URL}/api/knot/config`);
                const data = await response.json();
                if (data.client_id) {
                    setClientId(data.client_id);
                }
            } catch (err) {
                console.error("Failed to fetch client ID:", err);
                setError("Failed to fetch Knot client ID from backend");
            }
        };
        fetchClientId();
    }, []);

    const launchKnotSDK = useCallback(async () => {
        if (!clientId.trim()) {
            setError("Client ID not loaded from backend");
            return;
        }
        if (!merchantId.trim()) {
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
                merchantIds: [parseInt(merchantId)],
                entryPoint: "test",
                onEvent: (eventData: any) => {
                    console.log("🔹 SDK Event:", eventData);
                    setStatus(`Event: ${JSON.stringify(eventData)}`);
                },
                onSuccess: (successData: any) => {
                    console.log("Success:", successData);
                    setStatus("Success!");
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
            maxWidth: "500px",
            margin: "40px auto",
            padding: "24px",
            backgroundColor: "#f9f9f9",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
            <h1 style={{ fontSize: "24px", marginBottom: "24px", color: "#333" }}>
                🔗 Knot Merchant Launcher
            </h1>

            <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#666", marginBottom: "4px" }}>
                    Client ID (from backend)
                </label>
                <input
                    type="text"
                    value={clientId}
                    disabled
                    placeholder="Loading from backend..."
                    style={{
                        width: "100%",
                        padding: "10px 12px",
                        fontSize: "14px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        boxSizing: "border-box",
                        backgroundColor: "#eee",
                        color: "#666"
                    }}
                />
            </div>

            <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#666", marginBottom: "4px" }}>
                    Merchant ID
                </label>
                <input
                    type="text"
                    value={merchantId}
                    onChange={(e) => setMerchantId(e.target.value)}
                    placeholder="19 (DoorDash), 44 (Amazon), 16 (Netflix)..."
                    style={{
                        width: "100%",
                        padding: "10px 12px",
                        fontSize: "14px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        boxSizing: "border-box"
                    }}
                />
            </div>

            <div style={{ marginBottom: "16px" }}>
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
                        padding: "10px 12px",
                        fontSize: "14px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        boxSizing: "border-box"
                    }}
                />
            </div>

            <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#666", marginBottom: "4px" }}>
                    Product
                </label>
                <input
                    type="text"
                    value={product}
                    disabled
                    style={{
                        width: "100%",
                        padding: "10px 12px",
                        fontSize: "14px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        boxSizing: "border-box",
                        backgroundColor: "#eee",
                        color: "#666"
                    }}
                />
            </div>

            <button
                onClick={launchKnotSDK}
                disabled={loading || !clientId}
                style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#fff",
                    backgroundColor: loading || !clientId ? "#999" : "#007bff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: loading || !clientId ? "not-allowed" : "pointer"
                }}
            >
                {loading ? "Loading..." : "Launch Knot SDK"}
            </button>

            {error && (
                <div style={{
                    marginTop: "16px",
                    padding: "12px",
                    backgroundColor: "#fee",
                    border: "1px solid #fcc",
                    borderRadius: "4px",
                    color: "#c00",
                    fontSize: "13px"
                }}>
                    {error}
                </div>
            )}

            <div style={{
                marginTop: "16px",
                padding: "12px",
                backgroundColor: "#f0f0f0",
                borderRadius: "4px",
                fontSize: "12px",
                fontFamily: "monospace"
            }}>
                <strong>Status:</strong> {status}
                {sessionId && (
                    <div style={{ marginTop: "8px", wordBreak: "break-all" }}>
                        <strong>Session:</strong> {sessionId}
                    </div>
                )}
            </div>
        </div>
    );
}
