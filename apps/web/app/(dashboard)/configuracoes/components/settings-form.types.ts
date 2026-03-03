
export interface BusinessHourItem {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean | null;
}

export type PixKeyType = "cnpj" | "cpf" | "email" | "phone" | "evp";

export type PixKeyItem = {
  id: string;
  keyType: PixKeyType;
  keyValue: string;
  label: string;
  isActive: boolean;
};

export type PointDeviceItem = {
  id: string;
  name: string;
  model: string | null;
  external_id: string | null;
  status: string | null;
};
