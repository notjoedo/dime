import logoSvg from "../../../assets/LOGO-02.svg";

interface HeaderProps {
  cashbackRate?: string;
  cardLastFour?: string;
}

export function Header({
  cashbackRate = "1.25%",
  cardLastFour = "1234"
}: HeaderProps) {
  return (
    <header className="bg-[#121212] px-10 pt-6 pb-4 fixed top-0 left-0 right-0 z-50">
      <div className="flex justify-between items-center mb-4">
        {/* Logo */}
        <img
          src={logoSvg}
          alt="Dime"
          className="h-14 invert"
        />

        {/* Cashback Info */}
        <div className="text-right">
          <div className="text-white text-2xl font-coolvetica">
            {cashbackRate} cashback
          </div>
          <div className="text-gray-400 text-base font-coolvetica">
            card ending in {cardLastFour}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#454545]" />
    </header>
  );
}
