import { useState, useEffect, useCallback } from "react";

interface CardData {
    card_id: string;
    card_type: string;
    last_four: string;
    card_number: string;
    expiration: string;
    cardholder: string;
    location?: string;
    created_at?: string;
}

const CARD_TYPES = [
    { value: "visa", label: "Visa", icon: "💳" },
    { value: "mastercard", label: "Mastercard", icon: "💳" },
    { value: "amex", label: "American Express", icon: "💳" },
    { value: "discover", label: "Discover", icon: "💳" },
    { value: "other", label: "Other", icon: "💳" },
];

const CARD_TYPE_COLORS: Record<string, string> = {
    visa: "#1a1f71",
    mastercard: "#eb001b",
    amex: "#006fcf",
    discover: "#ff6000",
    other: "#666",
};

export default function Cards() {
    const [cards, setCards] = useState<CardData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    // Form state - simplified
    const [cardType, setCardType] = useState("visa");
    const [lastFour, setLastFour] = useState("");
    const [expiration, setExpiration] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    const PYTHON_SERVER_URL = "http://localhost:5001";

    const fetchCards = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${PYTHON_SERVER_URL}/api/cards`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            setCards(result.cards || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCards();
    }, [fetchCards]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (lastFour.length !== 4 || !/^\d{4}$/.test(lastFour)) {
            setError("Last 4 digits must be exactly 4 numbers");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${PYTHON_SERVER_URL}/api/cards`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user: {
                        name: { first_name: firstName, last_name: lastName },
                        address: {},
                        phone_number: ""
                    },
                    card: {
                        card_type: cardType,
                        last_four: lastFour,
                        number: "",  // Not required anymore
                        expiration,
                        cvv: ""
                    }
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            // Reset form and refresh
            setCardType("visa");
            setLastFour("");
            setExpiration("");
            setFirstName("");
            setLastName("");
            setShowForm(false);
            fetchCards();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to add card");
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: "100%",
        padding: "10px",
        fontSize: "14px",
        border: "1px solid #ddd",
        borderRadius: "6px",
        boxSizing: "border-box" as const
    };

    const labelStyle = {
        display: "block",
        fontSize: "12px",
        fontWeight: "600" as const,
        color: "#666",
        marginBottom: "6px"
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
                    💳 Cards
                </h2>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        padding: "8px 16px",
                        fontSize: "13px",
                        backgroundColor: showForm ? "#6c757d" : "#007bff",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer"
                    }}
                >
                    {showForm ? "Cancel" : "+ Add Card"}
                </button>
            </div>

            {error && (
                <div style={{ padding: "12px", backgroundColor: "#fee", borderRadius: "6px", color: "#c00", fontSize: "13px", marginBottom: "12px" }}>
                    {error}
                </div>
            )}

            {showForm && (
                <form onSubmit={handleSubmit} style={{ marginBottom: "16px", padding: "16px", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
                    <div style={{ marginBottom: "16px" }}>
                        <label style={labelStyle}>Card Type</label>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
                            {CARD_TYPES.map((type) => (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => setCardType(type.value)}
                                    style={{
                                        padding: "10px 4px",
                                        fontSize: "11px",
                                        fontWeight: cardType === type.value ? "600" : "400",
                                        backgroundColor: cardType === type.value ? CARD_TYPE_COLORS[type.value] : "#fff",
                                        color: cardType === type.value ? "#fff" : "#333",
                                        border: `2px solid ${cardType === type.value ? CARD_TYPE_COLORS[type.value] : "#ddd"}`,
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        transition: "all 0.2s"
                                    }}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                        <div>
                            <label style={labelStyle}>Last 4 Digits</label>
                            <input
                                style={inputStyle}
                                value={lastFour}
                                onChange={(e) => setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                placeholder="1234"
                                maxLength={4}
                                required
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Expiration</label>
                            <input
                                style={inputStyle}
                                value={expiration}
                                onChange={(e) => setExpiration(e.target.value)}
                                placeholder="MM/YY"
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                        <div>
                            <label style={labelStyle}>First Name</label>
                            <input
                                style={inputStyle}
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="John"
                                required
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Last Name</label>
                            <input
                                style={inputStyle}
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Doe"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "12px",
                            fontSize: "14px",
                            fontWeight: "600",
                            backgroundColor: loading ? "#ccc" : "#28a745",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            cursor: loading ? "not-allowed" : "pointer"
                        }}
                    >
                        {loading ? "Adding..." : "Add Card"}
                    </button>
                </form>
            )}

            {cards.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {cards.map((card, index) => (
                        <div key={card.card_id || index} style={{
                            padding: "14px",
                            backgroundColor: "#f8f9fa",
                            borderRadius: "8px",
                            borderLeft: `4px solid ${CARD_TYPE_COLORS[card.card_type?.toLowerCase()] || "#666"}`,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}>
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                    <span style={{
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        color: "#fff",
                                        backgroundColor: CARD_TYPE_COLORS[card.card_type?.toLowerCase()] || "#666",
                                        padding: "2px 8px",
                                        borderRadius: "4px",
                                        textTransform: "uppercase"
                                    }}>
                                        {card.card_type || "Card"}
                                    </span>
                                    <span style={{ fontSize: "16px", fontWeight: "600", color: "#333", fontFamily: "monospace" }}>
                                        •••• {card.last_four}
                                    </span>
                                </div>
                                <div style={{ fontSize: "12px", color: "#666" }}>
                                    {card.cardholder} • Exp: {card.expiration}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ padding: "24px", backgroundColor: "#f5f5f5", borderRadius: "8px", textAlign: "center", color: "#888" }}>
                    No cards saved yet
                </div>
            )}
        </div>
    );
}
