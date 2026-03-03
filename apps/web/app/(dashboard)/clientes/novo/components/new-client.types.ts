
export interface PhoneEntry {
  id: string;
  label: string;
  number: string;
  isPrimary: boolean;
  isWhatsapp: boolean;
}

export interface EmailEntry {
  id: string;
  label: string;
  email: string;
  isPrimary: boolean;
}

export interface AddressEntry {
  label: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}
