// Subset of settings that is safe to ship to the browser.
export type PublicConfig = {
  siteName: string;
  logoUrl: string;
  currency: string;
  registration: { enabled: boolean; showModalOnFirstVisit: boolean; modalDelaySec: number; requirePhone: boolean };
  cart: { minOrder: number; maxQtyPerItem: number; allowGuestCheckout: boolean; promoEnabled: boolean };
  delivery: { courier: boolean; courierPrice: number; pickup: boolean; pickupPrice: number; post: boolean; postPrice: number; freeFrom: number; deliveryDays: string };
  payments: { card: boolean; sbp: boolean; cash: boolean };
  passwordMinLength: number;
  animations: boolean;
  headerStyle: string;
  maxUploadMb: number;
};
