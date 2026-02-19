const CURRENCY_BRL = "986";
const COUNTRY_BR = "BR";
const GUI = "BR.GOV.BCB.PIX";

type PixBrCodeInput = {
  pixKey: string;
  amount: number;
  merchantName: string;
  merchantCity: string;
  txid?: string;
  description?: string;
};

const tlv = (id: string, value: string) => `${id}${value.length.toString().padStart(2, "0")}${value}`;

const normalizeText = (value: string, maxLength: number) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 .,:;!?()/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const normalizeTxid = (value?: string) => {
  const txid = (value ?? "***").trim();
  if (!txid) return "***";
  if (txid === "***") return "***";
  const sanitized = txid
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 25);
  return sanitized || "***";
};

const crc16CcittFalse = (payload: string) => {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
};

const formatAmount = (amount: number) => amount.toFixed(2);

export function buildPixBrCode({
  pixKey,
  amount,
  merchantName,
  merchantCity,
  txid,
  description,
}: PixBrCodeInput) {
  const normalizedKey = pixKey.trim();
  if (!normalizedKey) {
    throw new Error("PIX key is required");
  }

  const safeAmount = Number.isFinite(amount) ? Math.max(amount, 0) : 0;
  if (safeAmount <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  const merchant = normalizeText(merchantName || "ESTUDIO CORPO ALMA", 25) || "ESTUDIO CORPO ALMA";
  const city = normalizeText(merchantCity || "SAO PAULO", 15) || "SAO PAULO";
  const pixDescription = description ? normalizeText(description, 72) : "";
  const txidValue = normalizeTxid(txid);

  const merchantAccountInfo = [
    tlv("00", GUI),
    tlv("01", normalizedKey),
    pixDescription ? tlv("02", pixDescription) : "",
  ].join("");

  const additionalDataField = tlv("05", txidValue);

  const payloadWithoutCrc = [
    tlv("00", "01"),
    tlv("26", merchantAccountInfo),
    tlv("52", "0000"),
    tlv("53", CURRENCY_BRL),
    tlv("54", formatAmount(safeAmount)),
    tlv("58", COUNTRY_BR),
    tlv("59", merchant),
    tlv("60", city),
    tlv("62", additionalDataField),
    "6304",
  ].join("");

  const crc = crc16CcittFalse(payloadWithoutCrc);
  return `${payloadWithoutCrc}${crc}`;
}
