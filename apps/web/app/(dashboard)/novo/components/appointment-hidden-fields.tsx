"use client";

import type { CollectionTimingDraft } from "../appointment-form.types";

type AppointmentHiddenFieldsProps = {
  isEditing: boolean;
  appointmentId?: string;
  returnTo?: string;
  resolvedClientId: string | null;
  clientSelectionMode: "idle" | "existing" | "new";
  clientFirstName: string;
  clientLastName: string;
  clientReference: string;
  clientEmail: string;
  createPriceOverrideValue: string;
  createCheckoutServiceAmountValue: string;
  effectiveScheduleDiscount: number;
  scheduleDiscountType: "value" | "pct";
  createCheckoutExtraItemsJson: string;
  collectionTimingDraft: CollectionTimingDraft | null;
  isCourtesyDraft: boolean;
  isHomeVisit: boolean;
  selectedAddressId: string | null;
  addressLabel: string;
  addressMode: "none" | "existing" | "new";
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  effectiveDisplacementFee: number;
  displacementDistanceKm: number | null;
};

export function AppointmentHiddenFields({
  isEditing,
  appointmentId,
  returnTo,
  resolvedClientId,
  clientSelectionMode,
  clientFirstName,
  clientLastName,
  clientReference,
  clientEmail,
  createPriceOverrideValue,
  createCheckoutServiceAmountValue,
  effectiveScheduleDiscount,
  scheduleDiscountType,
  createCheckoutExtraItemsJson,
  collectionTimingDraft,
  isCourtesyDraft,
  isHomeVisit,
  selectedAddressId,
  addressLabel,
  addressMode,
  cep,
  logradouro,
  numero,
  complemento,
  bairro,
  cidade,
  estado,
  effectiveDisplacementFee,
  displacementDistanceKm,
}: AppointmentHiddenFieldsProps) {
  return (
    <>
      {isEditing && <input type="hidden" name="appointmentId" value={appointmentId ?? ""} />}
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}
      <input type="hidden" name="clientId" value={resolvedClientId ?? ""} />
      <input type="hidden" name="client_first_name" value={clientSelectionMode === "new" ? clientFirstName : ""} />
      <input type="hidden" name="client_last_name" value={clientSelectionMode === "new" ? clientLastName : ""} />
      <input type="hidden" name="client_reference" value={clientSelectionMode === "new" ? clientReference : ""} />
      <input type="hidden" name="client_email" value={clientSelectionMode === "new" ? clientEmail : ""} />
      {!isEditing && <input type="hidden" name="price_override" value={createPriceOverrideValue} />}
      {!isEditing && <input type="hidden" name="checkout_service_amount" value={createCheckoutServiceAmountValue} />}
      {!isEditing && (
        <input
          type="hidden"
          name="initial_checkout_discount_type"
          value={effectiveScheduleDiscount > 0 ? scheduleDiscountType : ""}
        />
      )}
      {!isEditing && (
        <input
          type="hidden"
          name="initial_checkout_discount_value"
          value={effectiveScheduleDiscount > 0 ? effectiveScheduleDiscount.toFixed(2) : ""}
        />
      )}
      {!isEditing && <input type="hidden" name="finance_extra_items_json" value={createCheckoutExtraItemsJson} />}
      {!isEditing && <input type="hidden" name="payment_collection_timing" value={collectionTimingDraft ?? ""} />}
      {!isEditing && isCourtesyDraft && <input type="hidden" name="is_courtesy" value="on" />}
      <input type="hidden" name="client_address_id" value={isHomeVisit ? (selectedAddressId ?? "") : ""} />
      <input type="hidden" name="address_label" value={isHomeVisit ? addressLabel : ""} />
      <input type="hidden" name="address_cep" value={isHomeVisit && addressMode === "new" ? cep : ""} />
      <input
        type="hidden"
        name="address_logradouro"
        value={isHomeVisit && addressMode === "new" ? logradouro : ""}
      />
      <input type="hidden" name="address_numero" value={isHomeVisit && addressMode === "new" ? numero : ""} />
      <input
        type="hidden"
        name="address_complemento"
        value={isHomeVisit && addressMode === "new" ? complemento : ""}
      />
      <input type="hidden" name="address_bairro" value={isHomeVisit && addressMode === "new" ? bairro : ""} />
      <input type="hidden" name="address_cidade" value={isHomeVisit && addressMode === "new" ? cidade : ""} />
      <input type="hidden" name="address_estado" value={isHomeVisit && addressMode === "new" ? estado : ""} />
      <input type="hidden" name="displacement_fee" value={isHomeVisit ? String(effectiveDisplacementFee) : ""} />
      <input
        type="hidden"
        name="displacement_distance_km"
        value={isHomeVisit ? String(displacementDistanceKm ?? "") : ""}
      />
    </>
  );
}
