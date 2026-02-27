export interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  accepts_home_visit: boolean;
  custom_buffer_minutes: number;
  description: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export interface BookingFlowProps {
  tenant: Tenant;
  services: Service[];
  signalPercentage?: number | null;
  publicBookingCutoffBeforeCloseMinutes?: number | null;
  publicBookingLastSlotBeforeCloseMinutes?: number | null;
  whatsappNumber?: string | null;
  mercadoPagoPublicKey?: string | null;
}

export type Step =
  | "WELCOME"
  | "IDENT"
  | "SERVICE"
  | "DATETIME"
  | "LOCATION"
  | "CONFIRM"
  | "PAYMENT"
  | "SUCCESS";

export type PaymentMethod = "pix" | "card" | null;

export type DisplacementEstimate = {
  distanceKm: number;
  fee: number;
  rule: "urban" | "road";
};

export type CardFormData = {
  token: string;
  paymentMethodId: string;
  issuerId?: string;
  installments: string | number;
  identificationType?: string;
  identificationNumber?: string;
  cardholderEmail?: string;
};

export type CardFormInstance = {
  getCardFormData: () => CardFormData;
  unmount?: () => void;
};

export type AddressSearchResult = {
  id: string;
  placeId: string;
  label: string;
};

export type LocationAddressMode = "cep" | "text" | null;

export interface SuggestedClientLookup {
  id: string;
  name: string | null;
  email: string | null;
  cpf: string | null;
  public_first_name?: string | null;
  public_last_name?: string | null;
  internal_reference?: string | null;
  address_cep: string | null;
  address_logradouro: string | null;
  address_numero: string | null;
  address_complemento: string | null;
  address_bairro: string | null;
  address_cidade: string | null;
  address_estado: string | null;
}

export type CardFormOptions = {
  amount: string;
  iframe?: boolean;
  form: {
    id: string;
    cardNumber: { id: string; placeholder?: string };
    expirationDate: { id: string; placeholder?: string };
    securityCode: { id: string; placeholder?: string };
    cardholderName: { id: string; placeholder?: string };
    issuer: { id: string; placeholder?: string };
    installments: { id: string; placeholder?: string };
    identificationType: { id: string; placeholder?: string };
    identificationNumber: { id: string; placeholder?: string };
    cardholderEmail: { id: string; placeholder?: string };
  };
  callbacks?: {
    onFormMounted?: (error: unknown) => void;
    onSubmit?: (event: Event) => void;
    onFetching?: (resource: string) => void | (() => void);
  };
};

export type MercadoPagoConstructor = new (
  publicKey: string,
  options?: { locale?: string }
) => {
  cardForm: (options: CardFormOptions) => CardFormInstance;
};
