"use client";

import { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Info, X } from "lucide-react";
import type { PublicConfig } from "@/lib/public-config";
import { api } from "@/lib/client-api";
import dynamic from "next/dynamic";
// Loaded on demand: the auth modal is only needed after a click
const AuthModal = dynamic(() => import("./shop/auth-modal").then((m) => m.AuthModal), { ssr: false });

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "BUYER" | "SELLER" | "ADMIN";
  emailVerified: string | Date | null;
  phoneVerified: string | Date | null;
  seller: { id: string; status: string; shopName: string; slug: string } | null;
} | null;

export type CartItem = { id: string; slug: string; title: string; price: number; oldPrice?: number | null; image?: string | null; stock: number; qty: number };
type Toast = { id: number; text: string; kind: "success" | "info" | "error"; action?: { label: string; href: string } };
export type AuthMode = "register" | "login" | "forgot";

type Ctx = {
  config: PublicConfig;
  user: SessionUser;
  setUser: (u: SessionUser) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  openAuth: (mode?: AuthMode, next?: string) => void;
  closeAuth: () => void;
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  syncCart: (lines: { productId: string; price: number; oldPrice: number | null; stock: number }[]) => void;
  cartPulse: number;
  favorites: Set<string>;
  toggleFavorite: (id: string) => Promise<void>;
  toast: (text: string, kind?: Toast["kind"], action?: Toast["action"]) => void;
};

const AppContext = createContext<Ctx | null>(null);

/** true only after this component has mounted — use for values that differ between server and client (cart). */
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within Providers");
  return ctx;
}

function readLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

// Cart lives in localStorage and is exposed through useSyncExternalStore, so hydration always uses the
// server snapshot (empty cart) and then re-renders — no hydration mismatches, plus cross-tab sync.
const EMPTY_CART: CartItem[] = [];
let cartCache: CartItem[] | null = null;
const cartListeners = new Set<() => void>();
function getCartSnapshot() {
  if (cartCache === null) cartCache = readLS<CartItem[]>("tm_cart", EMPTY_CART);
  return cartCache;
}
let cartStorageWarned = false;
function setCart(update: CartItem[] | ((c: CartItem[]) => CartItem[])) {
  const next = typeof update === "function" ? update(getCartSnapshot()) : update;
  if (next === cartCache) return;
  cartCache = next;
  try {
    localStorage.setItem("tm_cart", JSON.stringify(next));
  } catch {
    if (!cartStorageWarned && typeof window !== "undefined") {
      cartStorageWarned = true;
      window.dispatchEvent(new CustomEvent("tm:toast", { detail: { text: "Корзина не сохраняется на этом устройстве (приватный режим или нет места)", kind: "error" } }));
    }
  }
  cartListeners.forEach((l) => l());
}
function subscribeCart(l: () => void) {
  cartListeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === "tm_cart") {
      cartCache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    cartListeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function Providers({ children, config, initialUser, initialFavorites }: { children: ReactNode; config: PublicConfig; initialUser: SessionUser; initialFavorites: string[] }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser>(initialUser);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [authNext, setAuthNext] = useState<string | undefined>();
  const cart = useSyncExternalStore(subscribeCart, getCartSnapshot, () => EMPTY_CART);
  const [cartPulse, setCartPulse] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(initialFavorites));
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => setFavorites(new Set(initialFavorites)), [initialFavorites]);
  useEffect(() => setUser(initialUser), [initialUser]);

  const toast = useCallback((text: string, kind: Toast["kind"] = "success", action?: Toast["action"]) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, text, kind, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ text: string; kind: Toast["kind"] }>).detail;
      toast(d.text, d.kind);
    };
    window.addEventListener("tm:toast", on);
    return () => window.removeEventListener("tm:toast", on);
  }, [toast]);

  // First-visit registration modal
  useEffect(() => {
    if (user || !config.registration.enabled || !config.registration.showModalOnFirstVisit) return;
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    if (path.startsWith("/admin") || path.startsWith("/auth")) return;
    let seen = false;
    try {
      seen = localStorage.getItem("tm_welcome_seen") === "1";
    } catch {}
    if (seen) return;
    const t = setTimeout(() => {
      setAuthMode((m) => m ?? "register");
      try {
        localStorage.setItem("tm_welcome_seen", "1");
      } catch {}
    }, Math.max(0, config.registration.modalDelaySec) * 1000);
    return () => clearTimeout(t);
  }, [user, config.registration]);

  const refreshUser = useCallback(async () => {
    const r = await api<{ user: SessionUser }>("/api/auth/me");
    setUser(r.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch (e) {
      toast(`Не удалось выйти: ${(e as Error).message}`, "error");
      return;
    }
    setUser(null);
    setFavorites(new Set());
    toast("Вы вышли из аккаунта", "info");
    router.push("/");
    router.refresh();
  }, [router, toast]);

  const maxQty = config.cart.maxQtyPerItem || 10;
  const addToCart = useCallback(
    (item: Omit<CartItem, "qty">, qty = 1) => {
      if (Math.min(maxQty, item.stock) < 1) {
        toast("Товара нет в наличии", "error");
        return;
      }
      setCart((c) => {
        const ex = c.find((x) => x.id === item.id);
        const limit = Math.min(maxQty, Math.max(item.stock, 0));
        if (ex) return c.map((x) => (x.id === item.id ? { ...x, ...item, qty: Math.min(limit, x.qty + qty) } : x));
        return [...c, { ...item, qty: Math.min(limit, qty) }];
      });
      setCartPulse((p) => p + 1);
      toast("Товар добавлен в корзину", "success", { label: "В корзину", href: "/cart" });
    },
    [maxQty, toast],
  );
  const setQty = useCallback((id: string, qty: number) => {
    setCart((c) => c.map((x) => (x.id === id ? { ...x, qty: Math.max(1, Math.min(qty, Math.min(maxQty, x.stock || maxQty))) } : x)));
  }, [maxQty]);
  const removeFromCart = useCallback((id: string) => setCart((c) => c.filter((x) => x.id !== id)), []);
  const clearCart = useCallback(() => setCart([]), []);
  const syncCart = useCallback((lines: { productId: string; price: number; oldPrice: number | null; stock: number }[]) => {
    setCart((c) => {
      let changed = false;
      const next = c.map((x) => {
        const l = lines.find((y) => y.productId === x.id);
        if (!l || (l.price === x.price && l.stock === x.stock && l.oldPrice === x.oldPrice)) return x;
        changed = true;
        return { ...x, price: l.price, oldPrice: l.oldPrice, stock: l.stock, qty: Math.max(1, Math.min(x.qty, l.stock || 1)) };
      });
      return changed ? next : c;
    });
  }, []);

  const toggleFavorite = useCallback(
    async (id: string) => {
      if (!user) {
        setAuthMode("login");
        toast("Войдите, чтобы добавлять товары в избранное", "info");
        return;
      }
      const has = favorites.has(id);
      setFavorites((f) => {
        const n = new Set(f);
        if (has) n.delete(id);
        else n.add(id);
        return n;
      });
      try {
        await api("/api/favorites", { method: has ? "DELETE" : "POST", body: { productId: id } });
        toast(has ? "Удалено из избранного" : "Добавлено в избранное", "info", has ? undefined : { label: "Открыть", href: "/favorites" });
      } catch (e) {
        setFavorites((f) => {
          const n = new Set(f);
          if (has) n.add(id);
          else n.delete(id);
          return n;
        });
        toast((e as Error).message, "error");
      }
    },
    [user, favorites, toast],
  );

  const value = useMemo<Ctx>(
    () => ({
      config,
      user,
      setUser,
      refreshUser,
      logout,
      openAuth: (mode = "login", next) => {
        setAuthMode(mode);
        setAuthNext(next);
      },
      closeAuth: () => setAuthMode(null),
      cart,
      cartCount: cart.reduce((s, i) => s + i.qty, 0),
      cartTotal: cart.reduce((s, i) => s + i.qty * i.price, 0),
      addToCart,
      setQty,
      removeFromCart,
      clearCart,
      syncCart,
      cartPulse,
      favorites,
      toggleFavorite,
      toast,
    }),
    [config, user, refreshUser, logout, cart, addToCart, setQty, removeFromCart, clearCart, syncCart, cartPulse, favorites, toggleFavorite, toast],
  );

  return (
    <AppContext.Provider value={value}>
      <MotionConfig reducedMotion={config.animations ? "user" : "always"}>
        {children}
        <Suspense fallback={null}><AuthDeepLink onOpen={(m, n) => { setAuthMode(m); setAuthNext(n); }} /></Suspense>
        <AnimatePresence>{authMode && <AuthModal mode={authMode} setMode={setAuthMode} next={authNext} onClose={() => setAuthMode(null)} />}</AnimatePresence>
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6">
          <AnimatePresence initial={false}>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.22 }}
                className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-lift"
                role="status"
              >
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${t.kind === "error" ? "bg-white text-ink" : "bg-brand text-white"}`}>
                  {t.kind === "success" ? <Check size={14} /> : t.kind === "error" ? <X size={14} /> : <Info size={14} />}
                </span>
                <span className="flex-1">{t.text}</span>
                {t.action && (
                  <button
                    className="font-semibold text-brand-300 hover:text-white"
                    onClick={() => {
                      router.push(t.action!.href);
                      setToasts((x) => x.filter((y) => y.id !== t.id));
                    }}
                  >
                    {t.action.label}
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </AppContext.Provider>
  );
}

/** Opens the login/registration modal for ?auth=login|register links (also after client-side redirects, e.g. from /admin). */
function AuthDeepLink({ onOpen }: { onOpen: (mode: AuthMode, next?: string) => void }) {
  const sp = useSearchParams();
  const auth = sp.get("auth");
  const next = sp.get("next") || undefined;
  useEffect(() => {
    if (auth === "login" || auth === "register") onOpen(auth, next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, next]);
  return null;
}
