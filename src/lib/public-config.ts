// Subset of settings that is safe to ship to the browser.
export type PublicConfig = {
  siteName: string;
  logoUrl: string;
  currency: string;
  registration: { enabled: boolean; showModalOnFirstVisit: boolean; modalDelaySec: number; requirePhone: boolean; phoneVerification: boolean };
  cart: { minOrder: number; maxQtyPerItem: number; allowGuestCheckout: boolean; promoEnabled: boolean };
  delivery: { courier: boolean; courierPrice: number; pickup: boolean; pickupPrice: number; post: boolean; postPrice: number; freeFrom: number; deliveryDays: string };
  payments: { enabled: string[]; testMode: boolean; installmentParts: number; creditMonths: number; creditRate: number; creditMinAmount: number; cashMaxAmount: number };
  passwordMinLength: number;
  animations: boolean;
  headerStyle: string;
  maxUploadMb: number;
};
