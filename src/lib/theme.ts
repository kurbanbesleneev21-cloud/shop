export function hexToRgbTriplet(hex: string, fallback: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}
export const RADIUS: Record<string, string> = { sm: "8px", md: "12px", lg: "16px", xl: "22px" };
export const FONT_URL: Record<string, string> = {
  Inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
  Manrope: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap",
  Roboto: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap",
  Montserrat: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap",
};
