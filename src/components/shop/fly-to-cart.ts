"use client";

/** Lightweight "fly to cart" effect using the Web Animations API (skipped for reduced motion). */
export function flyToCart(fromEl: HTMLElement | null, imageUrl?: string | null) {
  if (!fromEl || typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (document.documentElement.dataset.anim === "off") return;
  const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-cart-target]")).filter((el) => el.offsetParent !== null);
  const target = targets[0];
  if (!target) return;
  const a = fromEl.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const size = Math.min(a.width, a.height, 120);
  const ghost = document.createElement("div");
  ghost.style.cssText = `position:fixed;z-index:200;left:${a.left + a.width / 2 - size / 2}px;top:${a.top + a.height / 2 - size / 2}px;width:${size}px;height:${size}px;border-radius:16px;background:#fff center/contain no-repeat;box-shadow:0 10px 30px rgba(17,17,17,.18);pointer-events:none;will-change:transform,opacity`;
  if (imageUrl) ghost.style.backgroundImage = `url("${imageUrl}")`;
  document.body.appendChild(ghost);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = ghost.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.6}px, ${dy * 0.3 - 60}px) scale(.6)`, opacity: 0.9, offset: 0.6 },
      { transform: `translate(${dx}px, ${dy}px) scale(.12)`, opacity: 0.2 },
    ],
    { duration: 650, easing: "cubic-bezier(.5,0,.3,1)" },
  );
  anim.onfinish = () => ghost.remove();
}
