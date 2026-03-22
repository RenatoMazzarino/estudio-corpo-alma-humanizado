import type { ReactNode } from "react";
import type { PaymentMethodIconKind } from "./payment-method-icon";
import { PaymentMethodIcon } from "./payment-method-icon";

type PaymentMethodSelectorOption<TValue extends string> = {
  value: TValue;
  label: string;
  icon: PaymentMethodIconKind;
  iconNode?: ReactNode;
  tone?: "default" | "waiver";
  disabled?: boolean;
};

type PaymentMethodSelectorProps<TValue extends string> = {
  options: readonly PaymentMethodSelectorOption<TValue>[];
  value: TValue | null;
  onChangeAction: (value: TValue) => void;
  columnsClassName?: string;
  buttonClassName?: string;
  variant?: "inline" | "modal-grid";
};

function getSelectedStyle(tone: "default" | "waiver") {
  if (tone === "waiver") {
    return "border-sky-500 bg-sky-50 text-sky-700";
  }
  return "border-studio-green bg-studio-light text-studio-green";
}

export function PaymentMethodSelector<TValue extends string>({
  options,
  value,
  onChangeAction,
  columnsClassName = "grid-cols-2",
  buttonClassName = "",
  variant = "inline",
}: PaymentMethodSelectorProps<TValue>) {
  return (
    <div className={`grid gap-2 ${columnsClassName}`}>
      {options.map((option) => {
        const isSelected = value === option.value;
        const selectedStyle =
          variant === "modal-grid" ? "border-studio-green bg-studio-light text-studio-green" : getSelectedStyle(option.tone ?? "default");
        const baseButtonStyle =
          variant === "modal-grid"
            ? "rounded-xl border border-line px-2 py-3 text-center transition"
            : "rounded-xl border px-3 py-2 text-[11px] font-extrabold uppercase tracking-wide flex items-center justify-center gap-2 transition";
        const unselectedStyle = variant === "modal-grid" ? "wl-surface-card-body text-studio-text" : "border-line text-muted hover:bg-paper";
        return (
          <button
            key={option.value}
            type="button"
            disabled={option.disabled}
            onClick={() => onChangeAction(option.value)}
            className={`${baseButtonStyle} ${
              isSelected ? selectedStyle : unselectedStyle
            } ${option.disabled ? "cursor-not-allowed opacity-50" : ""} ${buttonClassName}`}
            aria-pressed={isSelected}
          >
            {variant === "modal-grid" ? (
              <>
                {option.iconNode ?? <PaymentMethodIcon method={option.icon} className="mx-auto h-4 w-4" />}
                <span className="wl-typo-chip mt-2 block">{option.label}</span>
              </>
            ) : (
              <>
                {option.iconNode ?? <PaymentMethodIcon method={option.icon} className="h-4 w-4" />}
                {option.label}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
