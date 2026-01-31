import chipSvg from "../../../assets/CHIP.svg";

interface CardProps {
  cardNumber?: string;
  cardHolderName?: string;
  expiryDate?: string;
  cardType?: "visa" | "mastercard" | "discover" | "american_express";
  cardHolderLabel?: string;
  expiryLabel?: string;
  showChip?: boolean;
  className?: string;
  ideal?: boolean;
}

export function Card({
  cardNumber,
  cardHolderName,
  expiryDate,
  cardType,
  cardHolderLabel = "Card Holder Name",
  expiryLabel = "Expiry Date",
  showChip = true,
  className = "",
  ideal = false,
}: CardProps) {
  const lastFour = cardNumber ? cardNumber.slice(-4) : "1234";
  const maskedPart = "* * * *   * * * *   * * * *";
  const lastFourSpaced = lastFour.split("").join(" ");
  const displayNumber = `${maskedPart}   ${lastFourSpaced}`;

  const cardContent = (
    <div className={`w-full aspect-[1.7/1] bg-white rounded-2xl p-6 flex flex-col justify-between overflow-hidden ${className}`}>
      {/* Top row: Chip and Card Type */}
      <div className="flex justify-between items-start">
        {/* Chip */}
        {showChip && (
          <img src={chipSvg} alt="Chip" className="w-12 h-10 shrink-0" />
        )}

        {/* Card Type Logo - fixed width container */}
        <div className="w-[100px] h-8 flex items-center justify-end shrink-0">
          {cardType === "visa" && (
            <span className="text-2xl font-bold italic text-[#1a1f71]">VISA</span>
          )}
          {cardType === "mastercard" && (
            <div className="flex items-center">
              <div className="w-8 h-8 bg-[#eb001b] rounded-full" />
              <div className="w-8 h-8 bg-[#f79e1b] rounded-full -ml-3 opacity-90" />
            </div>
          )}
          {cardType === "discover" && (
            <span className="text-xl font-bold text-[#ff6000]">DISCOVER</span>
          )}
          {cardType === "american_express" && (
            <span className="text-xl font-bold text-[#006fcf]">AMEX</span>
          )}
        </div>
      </div>

      {/* Card Number */}
      <div className="text-base tracking-wider text-[#A09D9D] whitespace-nowrap">
        {displayNumber}
      </div>

      {/* Bottom row: Name and Expiry */}
      <div className="flex justify-between items-end">
        <div>
          {cardHolderLabel && (
            <div className="text-xs text-[#A09D9D] mb-1">{cardHolderLabel}</div>
          )}
          {cardHolderName && (
            <div className="text-xl text-[#A09D9D] font-medium">{cardHolderName}</div>
          )}
        </div>
        <div className="text-right">
          {expiryLabel && (
            <div className="text-xs text-[#A09D9D] mb-1">{expiryLabel}</div>
          )}
          {expiryDate && (
            <div className="text-xl text-[#A09D9D] font-medium">{expiryDate}</div>
          )}
        </div>
      </div>
    </div>
  );

  if (ideal) {
    return (
      <div className="relative w-full">
        {/* Ideal card pill */}
        <div className="absolute -top-4 right-1 z-10 bg-white border-2 border-[#BB86FC] rounded-full px-5 py-1 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#BB86FC">
            <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
            <path d="M19 2L19.94 4.06L22 5L19.94 5.94L19 8L18.06 5.94L16 5L18.06 4.06L19 2Z" />
            <path d="M5 16L5.63 17.37L7 18L5.63 18.63L5 20L4.37 18.63L3 18L4.37 17.37L5 16Z" />
          </svg>
          <span className="text-[#BB86FC] text-base font-medium">ideal card!</span>
        </div>
        {/* Backdrop glow */}
        <div className="absolute bg-[#BB86FC] opacity-40 blur-lg left-0 right-4 top-1/2 -bottom-3 rounded-2xl pointer-events-none" />
        {/* Card */}
        <div className="relative w-full">
          {cardContent}
        </div>
      </div>
    );
  }

  return cardContent;
}
