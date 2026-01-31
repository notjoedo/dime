import { useState, useEffect, useCallback } from "react";

interface CardData {
    card_id: string;
    user: {
        name: {
            first_name: string;
            last_name: string;
        };
        address: {
            street: string;
            street2: string;
            city: string;
            region: string;
            postal_code: string;
            country: string;
        };
        phone_number: string;
    };
    card: {
        number: string;
        expiration: string;
    };
}

export default function Cards() {
    const [cards, setCards] = useState<CardData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    // Form state
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [street, setStreet] = useState("");
    const [street2, setStreet2] = useState("");
    const [city, setCity] = useState("");
    const [region, setRegion] = useState("");
    const [postalCode, setPostalCode] = useState("");
    const [country, setCountry] = useState("US");
    const [phone, setPhone] = useState("");
    const [cardNumber, setCardNumber] = useState("");
    const [expiration, setExpiration] = useState("");
    const [cvv, setCvv] = useState("");

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
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${PYTHON_SERVER_URL}/api/cards`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user: {
                        name: { first_name: firstName, last_name: lastName },
                        address: {
                            street, street2, city, region,
                            postal_code: postalCode, country
                        },
                        phone_number: phone
                    },
                    card: {
                        number: cardNumber,
                        expiration,
                        cvv
                    }
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            // Reset form and refresh
            setFirstName(""); setLastName("");
            setStreet(""); setStreet2(""); setCity(""); setRegion("");
            setPostalCode(""); setCountry("US"); setPhone("");
            setCardNumber(""); setExpiration(""); setCvv("");
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
        padding: "8px",
        fontSize: "13px",
        border: "1px solid #ddd",
        borderRadius: "4px",
        boxSizing: "border-box" as const
    };

    const labelStyle = {
        display: "block",
        fontSize: "11px",
        fontWeight: "600" as const,
        color: "#666",
        marginBottom: "4px"
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
                        padding: "6px 12px",
                        fontSize: "12px",
                        backgroundColor: showForm ? "#6c757d" : "#007bff",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer"
                    }}
                >
                    {showForm ? "Cancel" : "+ Add Card"}
                </button>
            </div>

            {error && (
                <div style={{ padding: "12px", backgroundColor: "#fee", borderRadius: "4px", color: "#c00", fontSize: "13px", marginBottom: "12px" }}>
                    {error}
                </div>
            )}

            {showForm && (
                <form onSubmit={handleSubmit} style={{ marginBottom: "16px", padding: "16px", backgroundColor: "#f9f9f9", borderRadius: "6px" }}>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "12px" }}>Cardholder Info</div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                        <div>
                            <label style={labelStyle}>First Name</label>
                            <input style={inputStyle} value={firstName} onChange={e => setFirstName(e.target.value)} required />
                        </div>
                        <div>
                            <label style={labelStyle}>Last Name</label>
                            <input style={inputStyle} value={lastName} onChange={e => setLastName(e.target.value)} required />
                        </div>
                    </div>

                    <div style={{ marginBottom: "8px" }}>
                        <label style={labelStyle}>Street Address</label>
                        <input style={inputStyle} value={street} onChange={e => setStreet(e.target.value)} placeholder="100 Main Street" />
                    </div>
                    <div style={{ marginBottom: "8px" }}>
                        <label style={labelStyle}>Street 2</label>
                        <input style={inputStyle} value={street2} onChange={e => setStreet2(e.target.value)} placeholder="Apt #100" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                        <div>
                            <label style={labelStyle}>City</label>
                            <input style={inputStyle} value={city} onChange={e => setCity(e.target.value)} />
                        </div>
                        <div>
                            <label style={labelStyle}>State</label>
                            <input style={inputStyle} value={region} onChange={e => setRegion(e.target.value)} placeholder="NY" />
                        </div>
                        <div>
                            <label style={labelStyle}>ZIP</label>
                            <input style={inputStyle} value={postalCode} onChange={e => setPostalCode(e.target.value)} />
                        </div>
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                        <label style={labelStyle}>Phone</label>
                        <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+11234567890" />
                    </div>

                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#333", marginBottom: "12px", marginTop: "16px" }}>Card Details</div>

                    <div style={{ marginBottom: "8px" }}>
                        <label style={labelStyle}>Card Number</label>
                        <input style={inputStyle} value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="4242424242424242" required />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                        <div>
                            <label style={labelStyle}>Expiration</label>
                            <input style={inputStyle} value={expiration} onChange={e => setExpiration(e.target.value)} placeholder="08/2030" required />
                        </div>
                        <div>
                            <label style={labelStyle}>CVV</label>
                            <input style={inputStyle} value={cvv} onChange={e => setCvv(e.target.value)} placeholder="123" type="password" />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "10px",
                            fontSize: "14px",
                            fontWeight: "600",
                            backgroundColor: loading ? "#ccc" : "#28a745",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: loading ? "not-allowed" : "pointer"
                        }}
                    >
                        {loading ? "Adding..." : "Add Card"}
                    </button>
                </form>
            )}

            {cards.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {cards.map((card, index) => (
                        <div key={card.card_id || index} style={{
                            padding: "12px",
                            backgroundColor: "#f5f5f5",
                            borderRadius: "6px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}>
                            <div>
                                <div style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>
                                    {card.card.number}
                                </div>
                                <div style={{ fontSize: "12px", color: "#888" }}>
                                    {card.user.name.first_name} {card.user.name.last_name} • Exp: {card.card.expiration}
                                </div>
                            </div>
                            <div style={{ fontSize: "11px", color: "#aaa", fontFamily: "monospace" }}>
                                {card.card_id.slice(0, 8)}...
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ padding: "20px", backgroundColor: "#f5f5f5", borderRadius: "4px", textAlign: "center", color: "#888" }}>
                    No cards saved yet
                </div>
            )}
        </div>
    );
}
