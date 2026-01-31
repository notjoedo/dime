import { useState, useEffect } from "react";
import { CreditCard } from "./CreditCard";

interface Card {
    card_id: string;
    card_type: string;
    last_four: string;
    expiration: string;
    cardholder: string;
    benefits?: string;
}

const CARD_TYPES = [
    { value: "visa", label: "Visa" },
    { value: "mastercard", label: "Mastercard" },
    { value: "amex", label: "American Express" },
    { value: "discover", label: "Discover" },
    { value: "paypal", label: "PayPal" },
    { value: "other", label: "Other" }
];

export default function Cards() {
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [cardNumber, setCardNumber] = useState("");
    const [expiration, setExpiration] = useState("");
    const [cvv, setCvv] = useState("");
    const [cardholder, setCardholder] = useState("");
    const [benefits, setBenefits] = useState("");
    const [cardType, setCardType] = useState("visa");

    // Address Fields
    const [billingAddress, setBillingAddress] = useState("");
    const [billingCity, setBillingCity] = useState("");
    const [billingState, setBillingState] = useState("");
    const [billingZip, setBillingZip] = useState("");

    const API_URL = "http://localhost:5001/api";

    useEffect(() => {
        fetchCards();
    }, []);

    const fetchCards = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/cards?user_id=aman`);
            const data = await res.json();
            setCards(data.cards || []);
            setLoading(false);
        } catch (err) {
            console.error("Failed to fetch cards:", err);
            setLoading(false);
        }
    };

    const handleAddCard = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (cardNumber.length < 13) {
            setError("Please enter a valid card number");
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/cards`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: "aman",
                    card_number: cardNumber,
                    expiration,
                    cvv,
                    cardholder_name: cardholder,
                    billing_address: billingAddress,
                    billing_city: billingCity,
                    billing_state: billingState,
                    billing_zip: billingZip,
                    card_type: cardType,
                    benefits: benefits
                })
            });

            if (!res.ok) throw new Error("Failed to add card");

            // Reset form
            setCardNumber("");
            setExpiration("");
            setCvv("");
            setCardholder("");
            setBillingAddress("");
            setBillingCity("");
            setBillingState("");
            setBillingZip("");
            setBenefits("");

            await fetchCards();
        } catch (err) {
            setError("Failed to save card. Please try again.");
            setLoading(false);
        }
    };

    const handleDeleteCard = async (card_id: string) => {
        if (!confirm("Are you sure you want to delete this card?")) return;

        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/cards/${card_id}?user_id=aman`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to delete");
            await fetchCards();
        } catch (err) {
            setError("Failed to delete card");
            setLoading(false);
        }
    };

    return (
        <div style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            maxWidth: "900px",
            margin: "0 auto",
            padding: "20px"
        }}>
            <h2 style={{ fontSize: "24px", color: "#333", marginBottom: "24px" }}>💳 Wallet Management</h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", alignItems: "start" }}>

                {/* Left: Add Card Form */}
                <div style={{
                    backgroundColor: "#fff",
                    padding: "24px",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
                }}>
                    <h3 style={{ fontSize: "18px", marginBottom: "16px", color: "#444" }}>Add New Card</h3>
                    <form onSubmit={handleAddCard} autoComplete="off" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

                        <div style={{ display: "flex", gap: "12px" }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Card Type</label>
                                <select
                                    value={cardType}
                                    onChange={(e) => setCardType(e.target.value)}
                                    style={inputStyle}
                                    autoComplete="off"
                                >
                                    {CARD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 2 }}>
                                <label style={labelStyle}>Cardholder Name</label>
                                <input
                                    type="text"
                                    value={cardholder}
                                    onChange={(e) => setCardholder(e.target.value)}
                                    placeholder="John Doe"
                                    style={inputStyle}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Card Number</label>
                            <input
                                type="text"
                                value={cardNumber}
                                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                                placeholder="4242 4242 4242 4242"
                                style={inputStyle}
                                maxLength={16}
                                required
                                autoComplete="cc-number"
                            />
                        </div>

                        <div style={{ display: "flex", gap: "12px" }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Expiration (MM/YY)</label>
                                <input
                                    type="text"
                                    value={expiration}
                                    onChange={(e) => setExpiration(e.target.value)}
                                    placeholder="MM/YY"
                                    style={inputStyle}
                                    maxLength={5}
                                    required
                                    autoComplete="cc-exp"
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>CVV</label>
                                <input
                                    type="password"
                                    value={cvv}
                                    onChange={(e) => setCvv(e.target.value)}
                                    placeholder="123"
                                    style={inputStyle}
                                    maxLength={4}
                                    required
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>

                        <div style={{ borderTop: "1px solid #eee", marginTop: "8px", paddingTop: "12px" }}>
                            <label style={labelStyle}>Billing Street Address</label>
                            <input
                                type="text"
                                value={billingAddress}
                                onChange={(e) => setBillingAddress(e.target.value)}
                                placeholder="123 Main St"
                                style={inputStyle}
                                required
                            />
                        </div>

                        <div style={{ display: "flex", gap: "12px" }}>
                            <div style={{ flex: 2 }}>
                                <label style={labelStyle}>City</label>
                                <input
                                    type="text"
                                    value={billingCity}
                                    onChange={(e) => setBillingCity(e.target.value)}
                                    placeholder="New York"
                                    style={inputStyle}
                                    required
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>State</label>
                                <input
                                    type="text"
                                    value={billingState}
                                    onChange={(e) => setBillingState(e.target.value)}
                                    placeholder="NY"
                                    style={inputStyle}
                                    maxLength={2}
                                    required
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Zip</label>
                                <input
                                    type="text"
                                    value={billingZip}
                                    onChange={(e) => setBillingZip(e.target.value)}
                                    placeholder="10001"
                                    style={inputStyle}
                                    maxLength={5}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label style={labelStyle}>Card Benefits</label>
                            <textarea
                                value={benefits}
                                onChange={(e) => setBenefits(e.target.value)}
                                placeholder="e.g. 3% cashback on dining..."
                                style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
                            />
                        </div>

                        {error && <div style={{ color: "red", fontSize: "12px" }}>{error}</div>}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                marginTop: "8px",
                                padding: "12px",
                                backgroundColor: loading ? "#666" : "#000",
                                color: "#fff",
                                border: "none",
                                borderRadius: "8px",
                                fontWeight: "600",
                                cursor: loading ? "not-allowed" : "pointer"
                            }}
                        >
                            {loading ? "Processing..." : "Securely Save Card"}
                        </button>
                    </form>
                </div>

                {/* Right: Card List */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <h3 style={{ fontSize: "18px", color: "#444", marginBottom: "16px" }}>Stored Cards</h3>
                    {cards.length === 0 && !loading && (
                        <div style={{ color: "#888", fontStyle: "italic" }}>No cards in wallet.</div>
                    )}

                    {cards.map(card => (
                        <CreditCard key={card.card_id} card={card} onDelete={handleDeleteCard} />
                    ))}
                </div>

            </div>
        </div>
    );
}

const labelStyle = {
    display: "block",
    fontSize: "12px",
    fontWeight: "600",
    color: "#666",
    marginBottom: "4px"
} as const;

const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    boxSizing: "border-box", // Fixes padding issues
    fontFamily: "inherit"
} as const;

