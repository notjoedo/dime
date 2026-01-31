import React from 'react';

interface CreditCardProps {
    card: {
        card_id: string;
        card_type: string;
        last_four: string;
        expiration: string;
        cardholder: string;
        benefits?: string;
    };
    onDelete: (id: string) => void;
}

const CARD_TYPES = {
    visa: { label: "Visa", color: "linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)" },
    mastercard: { label: "Mastercard", color: "linear-gradient(135deg, #ff6f00 0%, #ffca28 100%)" },
    amex: { label: "American Express", color: "linear-gradient(135deg, #00acc1 0%, #006064 100%)" },
    discover: { label: "Discover", color: "linear-gradient(135deg, #f57c00 0%, #e65100 100%)" },
    other: { label: "Other", color: "linear-gradient(135deg, #424242 0%, #212121 100%)" }
};

export const CreditCard: React.FC<CreditCardProps> = ({ card, onDelete }) => {
    const type = (card.card_type?.toLowerCase() || 'other') as keyof typeof CARD_TYPES;
    const config = CARD_TYPES[type] || CARD_TYPES.other;

    return (
        <div style={{
            background: config.color,
            borderRadius: "16px",
            padding: "24px",
            color: "#fff",
            boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
            position: "relative",
            overflow: "hidden",
            marginBottom: "16px",
            transition: "transform 0.2s ease"
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
                <span style={{ fontWeight: "600", textTransform: "capitalize", fontSize: "18px" }}>
                    {card.card_type}
                </span>
                <button
                    onClick={() => onDelete(card.card_id)}
                    style={{
                        background: "rgba(255,255,255,0.2)",
                        border: "none",
                        color: "#fff",
                        borderRadius: "50%",
                        width: "24px",
                        height: "24px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px"
                    }}
                    title="Delete Card"
                >
                    ×
                </button>
            </div>

            <div style={{ fontSize: "22px", letterSpacing: "2px", marginBottom: "22px", fontFamily: "monospace" }}>
                •••• •••• •••• {card.last_four}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end" }}>
                <div>
                    <div style={{ fontSize: "10px", opacity: 0.8, textTransform: "uppercase" }}>Cardholder</div>
                    <div style={{ fontSize: "14px", fontWeight: "500" }}>{card.cardholder || "Valued User"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "10px", opacity: 0.8, textTransform: "uppercase" }}>Expires</div>
                    <div style={{ fontSize: "14px", fontWeight: "500" }}>{card.expiration}</div>
                </div>
            </div>

            {card.benefits && (
                <div style={{
                    marginTop: "16px",
                    paddingTop: "12px",
                    borderTop: "1px solid rgba(255,255,255,0.2)",
                    fontSize: "12px",
                    fontStyle: "italic",
                    opacity: 0.9
                }}>
                    ✨ {card.benefits.length > 80 ? card.benefits.substring(0, 80) + "..." : card.benefits}
                </div>
            )}
        </div>
    );
};
