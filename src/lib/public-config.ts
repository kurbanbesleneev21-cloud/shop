// Subset of settings that is safe to ship to the browser.
export type PublicConfig = {
  siteName: string;
  logoUrl: string;
  currency: string;
  registration: { enabled: boolean; showModalOnFirstVisit: boolean; modalDelaySec: number; requirePhone: boolean; phoneVerification: boolean };
  cart: { minOrder: number; maxQtyPerItem: number; allowGuestCheckout: boolean; promoEnabled: boolean };
  delivery: { ozon: boolean; ozonPrice: number; ozonDays: string; post: boolean; postPrice: number; postDays: string; freeFrom: number };
  payments: { enabled: string[]; testMode: boolean; kaspiRate: number };
  passwordMinLength: number;
  animations: boolean;
  headerStyle: string;
  maxUploadMb: number;
};
