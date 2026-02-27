import Image from "next/image";

export type PaymentMethodIconKind = "pix" | "pix_key" | "card" | "cash" | "waiver";

const iconByMethod: Record<PaymentMethodIconKind, string> = {
  pix: "/icons/pix-brazil-symbol-official.svg",
  pix_key: "/icons/pix-brazil-symbol-official.svg",
  card: "/icons/card-material-official.svg",
  cash: "/icons/cash-material-official.svg",
  waiver: "/icons/courtesy-material-official.svg",
};

const labelByMethod: Record<PaymentMethodIconKind, string> = {
  pix: "Pix",
  pix_key: "Pix por chave",
  card: "Cartão",
  cash: "Dinheiro",
  waiver: "Cortesia",
};

type PaymentMethodIconProps = {
  method: PaymentMethodIconKind;
  size?: number;
  className?: string;
};

export function PaymentMethodIcon({ method, size = 16, className }: PaymentMethodIconProps) {
  const src = iconByMethod[method];
  return (
    <Image
      src={src}
      alt={labelByMethod[method]}
      width={size}
      height={size}
      className={className}
    />
  );
}

