import { PAYMENT_METHODS } from "./payment-methods";

// Shared (client + server) description of all global settings.
// Every field here gets a real control in /admin/settings and is persisted in the Setting table.

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "color"
  | "image"
  | "secret"
  | "links"
  | "list";

export type SettingField = {
  key: string;
  label: string;
  type: FieldType;
  help?: string;
  options?: { value: string; label: string }[];
  default: unknown;
  min?: number;
  max?: number;
};

export type SettingGroup = {
  key: string;
  title: string;
  description?: string;
  fields: SettingField[];
};

const bool = (key: string, label: string, def: boolean, help?: string): SettingField => ({ key, label, type: "boolean", default: def, help });
const text = (key: string, label: string, def = "", help?: string): SettingField => ({ key, label, type: "text", default: def, help });
const area = (key: string, label: string, def = "", help?: string): SettingField => ({ key, label, type: "textarea", default: def, help });
const num = (key: string, label: string, def: number, min?: number, max?: number, help?: string): SettingField => ({ key, label, type: "number", default: def, min, max, help });
const select = (key: string, label: string, def: string, options: [string, string][], help?: string): SettingField => ({
  key, label, type: "select", default: def, options: options.map(([value, label]) => ({ value, label })), help,
});
const secret = (key: string, label: string, help?: string): SettingField => ({ key, label, type: "secret", default: "", help });
const image = (key: string, label: string, help?: string): SettingField => ({ key, label, type: "image", default: "", help });

export const SETTINGS_GROUPS: SettingGroup[] = [
  {
    key: "general",
    title: "Основные",
    description: "Название, описание, логотип и режим работы сайта",
    fields: [
      text("siteName", "Название сайта", "TECHMARKET"),
      text("tagline", "Слоган", "Маркетплейс электроники и техники"),
      area("description", "Описание сайта", "TECHMARKET — маркетплейс электроники: смартфоны, ноутбуки, комплектующие и бытовая техника от проверенных продавцов с быстрой доставкой."),
      image("logoUrl", "Логотип", "Если пусто — используется текстовый логотип"),
      image("faviconUrl", "Favicon"),
      text("currency", "Символ валюты", "₽"),
      bool("maintenanceMode", "Режим обслуживания", false, "Покупатели увидят страницу техработ, администраторы — сайт"),
      area("maintenanceMessage", "Текст режима обслуживания", "Мы обновляем магазин. Вернёмся совсем скоро!"),
    ],
  },
  {
    key: "design",
    title: "Цвета и шрифты",
    description: "Фирменная палитра и типографика (используйте только чёрный, белый и синий)",
    fields: [
      { key: "primaryColor", label: "Фирменный синий", type: "color", default: "#2563EB" },
      { key: "textColor", label: "Основной чёрный", type: "color", default: "#111111" },
      { key: "backgroundColor", label: "Фон (белый)", type: "color", default: "#FFFFFF" },
      select("font", "Шрифт", "Inter", [["Inter", "Inter"], ["Manrope", "Manrope"], ["Roboto", "Roboto"], ["Montserrat", "Montserrat"], ["system", "Системный"]]),
      select("radius", "Скругление углов", "lg", [["sm", "Малое"], ["md", "Среднее"], ["lg", "Большое"], ["xl", "Очень большое"]]),
      select("cardStyle", "Стиль карточек", "border", [["border", "С рамкой"], ["shadow", "С тенью"], ["flat", "Плоский"]]),
      select("headerStyle", "Стиль шапки", "light", [["light", "Белая"], ["dark", "Чёрная"]]),
      bool("animations", "Анимации интерфейса", true, "Учитывается также системная настройка «уменьшить движение»"),
    ],
  },
  {
    key: "catalog",
    title: "Каталог",
    fields: [
      num("perPage", "Товаров на странице", 24, 8, 96),
      select("defaultSort", "Сортировка по умолчанию", "popular", [["popular", "По популярности"], ["rating", "По рейтингу"], ["price_asc", "Дешевле"], ["price_desc", "Дороже"], ["new", "Новинки"]]),
      bool("showOutOfStock", "Показывать товары не в наличии", true),
      bool("showFilters", "Показывать фильтры", true),
      select("columns", "Колонок на десктопе", "4", [["3", "3"], ["4", "4"], ["5", "5"]]),
    ],
  },
  {
    key: "product",
    title: "Карточка товара",
    fields: [
      bool("showSeller", "Показывать продавца", true),
      bool("showDelivery", "Показывать блок доставки", true),
      text("deliveryText", "Текст о доставке", "Доставим завтра — бесплатно от 3 000 ₽"),
      bool("showSimilar", "Блок «Похожие товары»", true),
      bool("showBoughtTogether", "Блок «С этим товаром покупают»", true),
      bool("showRecent", "Блок «Вы недавно смотрели»", true),
      num("maxPhotos", "Максимум фото у товара", 15, 1, 40),
      bool("reviewPremoderation", "Премодерация отзывов", true),
      bool("reviewPhotos", "Фото в отзывах", true),
    ],
  },
  {
    key: "cart",
    title: "Корзина и оформление",
    fields: [
      num("minOrder", "Минимальная сумма заказа, ₽", 0, 0),
      num("maxQtyPerItem", "Максимум штук одного товара", 10, 1, 999),
      bool("allowGuestCheckout", "Оформление без регистрации", true),
      bool("promoEnabled", "Промокоды в корзине", true),
    ],
  },
  {
    key: "registration",
    title: "Регистрация",
    fields: [
      bool("enabled", "Регистрация открыта", true),
      bool("showModalOnFirstVisit", "Показывать окно регистрации при первом визите", true),
      num("modalDelaySec", "Задержка окна, сек", 3, 0, 60),
      bool("requireEmailVerification", "Требовать подтверждение email для покупок", false),
      bool("requirePhone", "Телефон обязателен", true),
      bool("phoneVerification", "Подтверждение телефона по SMS", false, "Работает при настроенном SMS-провайдере"),
    ],
  },
  {
    key: "auth",
    title: "Авторизация",
    fields: [
      num("sessionDays", "Срок сессии, дней", 30, 1, 365),
      num("passwordMinLength", "Минимальная длина пароля", 8, 6, 64),
      num("maxLoginAttempts", "Попыток входа до блокировки", 5, 3, 50),
      num("lockMinutes", "Блокировка входа, минут", 15, 1, 1440),
    ],
  },
  {
    key: "email",
    title: "Электронная почта",
    description: "Отправка писем подтверждения, восстановления пароля и уведомлений",
    fields: [
      select("provider", "Провайдер", "none", [["none", "Не настроен"], ["smtp", "SMTP"], ["resend", "Resend API"]]),
      text("fromName", "Имя отправителя", "TECHMARKET"),
      text("fromEmail", "Email отправителя", "no-reply@techmarket.ru"),
      text("smtpHost", "SMTP хост", ""),
      num("smtpPort", "SMTP порт", 587, 1, 65535),
      text("smtpUser", "SMTP логин", ""),
      bool("smtpSecure", "SMTP SSL (порт 465)", false),
      secret("smtpPassword", "SMTP пароль"),
      secret("resendApiKey", "Resend API Key"),
      bool("devShowLinks", "Показывать ссылки подтверждения на экране, если почта не настроена", true, "Удобно для демонстрации. Отключите в продакшене после настройки почты."),
    ],
  },
  {
    key: "sms",
    title: "SMS",
    fields: [
      select("provider", "SMS-провайдер", "none", [["none", "Не подключён"], ["smsru", "SMS.ru"]]),
      text("sender", "Имя отправителя", ""),
      secret("smsruApiId", "SMS.ru api_id"),
    ],
  },
  {
    key: "payments",
    title: "Платежи",
    description: "Способы оплаты и платёжный провайдер. Ключи провайдеров хранятся зашифрованными на сервере.",
    fields: [
      select("provider", "Провайдер онлайн-оплаты", "test", [
        ["test", "Тестовый режим (деньги не списываются)"],
        ["yookassa", "ЮKassa"],
        ["tbank", "Т-Банк (Т-Касса)"],
      ], "Для боевого режима укажите данные магазина ниже"),
      ...PAYMENT_METHODS.map((m) => bool(m.key, `${m.label} — ${m.description}`, m.defaultEnabled)),
      text("yookassaShopId", "ЮKassa: shopId", ""),
      secret("yookassaSecret", "ЮKassa: секретный ключ"),
      text("tbankTerminalKey", "Т-Банк: TerminalKey", ""),
      secret("tbankPassword", "Т-Банк: пароль терминала"),
      num("paymentTimeoutMinutes", "Неоплаченный онлайн-заказ отменяется через, минут", 60, 10, 10080),
      num("installmentParts", "Оплата частями: количество платежей", 4, 2, 12),
      num("creditMonths", "Кредит: срок по умолчанию, месяцев", 12, 3, 60),
      num("creditRate", "Кредит: ставка для расчёта, % годовых", 19, 0, 100),
      num("creditMinAmount", "Кредит/частями: минимальная сумма заказа, ₽", 3000, 0),
      num("cashMaxAmount", "Оплата при получении: максимальная сумма, ₽ (0 — без ограничений)", 300000, 0),
      text("companyName", "Реквизиты для счетов: получатель", "ООО «ТЕХМАРКЕТ»"),
      text("companyInn", "ИНН / КПП", "7700000000 / 770001001"),
      text("companyBank", "Банк", "ПАО Сбербанк"),
      text("companyBik", "БИК", "044525225"),
      text("companyAccount", "Расчётный счёт", "40702810000000000000"),
      text("companyCorrAccount", "Корр. счёт", "30101810400000000225"),
    ],
  },
  {
    key: "delivery",
    title: "Доставка",
    fields: [
      bool("courier", "Курьерская доставка", true),
      num("courierPrice", "Стоимость курьера, ₽", 299, 0),
      bool("pickup", "Самовывоз из ПВЗ", true),
      num("pickupPrice", "Стоимость самовывоза, ₽", 0, 0),
      bool("post", "Почта", true),
      num("postPrice", "Стоимость почты, ₽", 399, 0),
      num("freeFrom", "Бесплатная доставка от, ₽", 3000, 0),
      text("deliveryDays", "Срок доставки (текст)", "1–3 дня"),
    ],
  },
  {
    key: "commissions",
    title: "Комиссии",
    fields: [
      num("defaultRate", "Комиссия маркетплейса по умолчанию, %", 10, 0, 100),
      { key: "categoryRates", label: "Комиссия по категориям (slug=процент, по одному в строке)", type: "textarea", default: "smartphones=8\nlaptops=7\nvideo-cards=6" },
    ],
  },
  {
    key: "sellers",
    title: "Продавцы",
    fields: [
      bool("allowRegistration", "Приём заявок продавцов", true),
      bool("autoApprove", "Автоматически одобрять заявки", false),
      bool("productModeration", "Модерация товаров продавцов", true, "Новые товары продавцов будут черновиками до публикации администратором"),
      num("payoutDelayDays", "Выплата через, дней после доставки", 7, 0, 90),
    ],
  },
  {
    key: "users",
    title: "Покупатели",
    fields: [
      bool("allowReviews", "Разрешить отзывы", true),
      bool("allowFavorites", "Избранное", true),
      bool("allowSupport", "Обращения в поддержку", true),
    ],
  },
  {
    key: "notifications",
    title: "Уведомления",
    fields: [
      bool("emailOnOrder", "Письмо покупателю о новом заказе", true),
      bool("emailOnStatus", "Письмо при смене статуса заказа", true),
      text("adminEmail", "Email администратора для уведомлений", ""),
      num("lowStockThreshold", "Порог «мало товара», шт.", 3, 0, 1000),
    ],
  },
  {
    key: "seo",
    title: "SEO и метаданные",
    fields: [
      text("titleTemplate", "Шаблон заголовка (%s — название страницы)", "%s — TECHMARKET"),
      text("defaultTitle", "Заголовок главной", "TECHMARKET — маркетплейс электроники и техники"),
      area("defaultDescription", "Meta description", "Смартфоны, ноутбуки, комплектующие, ТВ и бытовая техника с доставкой. Тысячи товаров, честные отзывы, гарантия."),
      text("keywords", "Ключевые слова", "электроника, смартфоны, ноутбуки, маркетплейс"),
      image("ogImage", "Изображение для соцсетей (OG)"),
      bool("robotsIndex", "Разрешить индексацию", true),
    ],
  },
  {
    key: "analytics",
    title: "Аналитика",
    fields: [
      text("yandexMetrikaId", "Яндекс Метрика — номер счётчика", ""),
      text("googleAnalyticsId", "Google Analytics — ID (G-XXXX)", ""),
    ],
  },
  {
    key: "security",
    title: "Безопасность",
    fields: [
      num("apiRateLimit", "Лимит запросов к API в минуту с IP", 120, 10, 10000),
      num("authRateLimit", "Лимит попыток авторизации в 10 минут", 20, 3, 1000),
      num("maxUploadMb", "Максимальный размер фото, МБ", 10, 1, 50),
      num("imageMaxSide", "Максимальная сторона фото после оптимизации, px", 1600, 400, 4000),
      bool("logAdminActions", "Журналировать действия администраторов", true),
    ],
  },
  {
    key: "backup",
    title: "Резервное копирование",
    description: "Выгрузка полной резервной копии данных в JSON доступна кнопкой ниже",
    fields: [
      bool("includeUsers", "Включать пользователей в копию", true),
      bool("includeOrders", "Включать заказы в копию", true),
      area("note", "Заметка о политике бэкапов", "Резервная копия БД также создаётся провайдером PostgreSQL (point-in-time recovery)."),
    ],
  },
  {
    key: "integrations",
    title: "Интеграции",
    fields: [
      bool("webhookEnabled", "Webhook о новых заказах", false),
      text("webhookUrl", "URL webhook (POST JSON)", ""),
      secret("webhookSecret", "Секрет подписи webhook (заголовок X-Signature)"),
    ],
  },
  {
    key: "ads",
    title: "Реклама",
    fields: [
      bool("topBarEnabled", "Рекламная полоса над шапкой", true),
      text("topBarText", "Текст полосы", "Скидки до 30% на ноутбуки — только неделю"),
      text("topBarLink", "Ссылка полосы", "/catalog/laptops"),
      bool("promoBanners", "Промо-баннеры на главной", true),
    ],
  },
  {
    key: "contacts",
    title: "Контакты",
    fields: [
      text("phone", "Телефон", "8 800 555-35-35"),
      text("email", "Email", "support@techmarket.ru"),
      text("address", "Адрес", "Москва, Пресненская наб., 12"),
      text("workHours", "Часы работы", "Ежедневно 9:00–21:00"),
    ],
  },
  {
    key: "social",
    title: "Социальные сети",
    fields: [
      text("vk", "ВКонтакте", "https://vk.com"),
      text("telegram", "Telegram", "https://t.me"),
      text("youtube", "YouTube", ""),
      text("dzen", "Дзен", ""),
    ],
  },
  {
    key: "menu",
    title: "Меню",
    fields: [
      {
        key: "headerLinks",
        label: "Ссылки под поиском",
        type: "links",
        default: [
          { label: "Смартфоны", href: "/catalog/smartphones" },
          { label: "Ноутбуки", href: "/catalog/laptops" },
          { label: "Игровые приставки", href: "/catalog/consoles" },
          { label: "Наушники", href: "/catalog/headphones" },
          { label: "Телевизоры", href: "/catalog/tv" },
          { label: "Скидки", href: "/catalog?discount=1" },
          { label: "Продавать на TECHMARKET", href: "/seller/register" },
        ],
      },
    ],
  },
  {
    key: "footer",
    title: "Футер",
    fields: [
      area("aboutText", "Текст о компании", "TECHMARKET — маркетплейс электроники, где тысячи продавцов предлагают оригинальную технику с гарантией."),
      text("copyright", "Копирайт", "© TECHMARKET. Все права защищены."),
      {
        key: "links",
        label: "Ссылки футера",
        type: "links",
        default: [
          { label: "О компании", href: "/info/about" },
          { label: "Контакты", href: "/info/contacts" },
          { label: "Доставка", href: "/info/delivery" },
          { label: "Оплата", href: "/info/payment" },
          { label: "Возврат", href: "/info/returns" },
          { label: "Поддержка", href: "/support" },
          { label: "Политика конфиденциальности", href: "/info/privacy" },
        ],
      },
    ],
  },
  {
    key: "telegram",
    title: "Telegram",
    description: "Подробная настройка — в разделе «Telegram интеграция»",
    fields: [
      bool("enabled", "Уведомления включены", false),
      text("chatId", "Chat ID", ""),
      secret("botToken", "Bot Token"),
    ],
  },
  {
    key: "ai",
    title: "AI",
    description: "Провайдер нейросети для AI-генератора карточек",
    fields: [
      select("provider", "Провайдер", "gemini", [
        ["gemini", "Google Gemini (бесплатный тариф)"],
        ["groq", "Groq (бесплатный тариф)"],
        ["openrouter", "OpenRouter (бесплатные модели)"],
        ["openai", "OpenAI-совместимый API"],
      ]),
      text("model", "Модель", "gemini-2.0-flash", "Например: gemini-2.0-flash, llama-3.3-70b-versatile, meta-llama/llama-3.3-70b-instruct:free"),
      text("baseUrl", "Base URL (для OpenAI-совместимого)", ""),
      num("temperature", "Температура (×100)", 30, 0, 100),
      secret("apiKey", "API ключ"),
    ],
  },
];

export const TELEGRAM_EVENTS: { key: string; label: string }[] = [
  { key: "newOrder", label: "Новый заказ" },
  { key: "newUser", label: "Новый пользователь" },
  { key: "newSeller", label: "Новый продавец" },
  { key: "newProduct", label: "Новый товар" },
  { key: "orderStatus", label: "Изменение статуса заказа" },
  { key: "lowStock", label: "Мало товара на складе" },
  { key: "newReview", label: "Новый отзыв" },
  { key: "newTicket", label: "Новое обращение в поддержку" },
  { key: "systemError", label: "Ошибки системы" },
];

export type HomeBlock = {
  id: string;
  type: "hero" | "categories" | "products" | "brands" | "promo" | "advantages";
  title: string;
  subtitle?: string;
  enabled: boolean;
  source?: "hits" | "new" | "discount" | "featured" | "category" | "manual";
  category?: string;
  limit?: number;
  productIds?: string[];
};

export const DEFAULT_HOME_BLOCKS: HomeBlock[] = [
  { id: "hero", type: "hero", title: "Главный баннер", enabled: true },
  { id: "categories", type: "categories", title: "Популярные категории", enabled: true },
  { id: "hits", type: "products", title: "Хиты продаж", source: "hits", limit: 10, enabled: true },
  { id: "promo", type: "promo", title: "Специальные предложения", enabled: true },
  { id: "new", type: "products", title: "Новинки", source: "new", limit: 10, enabled: true },
  { id: "smartphones", type: "products", title: "Популярные смартфоны", source: "category", category: "smartphones", limit: 10, enabled: true },
  { id: "laptops", type: "products", title: "Популярные ноутбуки", source: "category", category: "laptops", limit: 10, enabled: true },
  { id: "gaming", type: "products", title: "Игровая техника", source: "category", category: "consoles", limit: 10, enabled: true },
  { id: "audio", type: "products", title: "Наушники и аксессуары", source: "category", category: "headphones", limit: 10, enabled: true },
  { id: "deals", type: "products", title: "Скидки дня", source: "discount", limit: 10, enabled: true },
  { id: "brands", type: "brands", title: "Популярные бренды", enabled: true },
  { id: "advantages", type: "advantages", title: "Почему TECHMARKET", enabled: true },
];

export type SettingsValues = Record<string, Record<string, unknown>>;

export function defaultsFor(groupKey: string): Record<string, unknown> {
  const g = SETTINGS_GROUPS.find((x) => x.key === groupKey);
  const out: Record<string, unknown> = {};
  g?.fields.forEach((f) => {
    if (f.type !== "secret") out[f.key] = f.default;
  });
  if (groupKey === "telegram") out.events = Object.fromEntries(TELEGRAM_EVENTS.map((e) => [e.key, true]));
  if (groupKey === "home") out.blocks = DEFAULT_HOME_BLOCKS;
  return out;
}

export const SECRET_FIELDS: Record<string, string[]> = Object.fromEntries(
  SETTINGS_GROUPS.map((g) => [g.key, g.fields.filter((f) => f.type === "secret").map((f) => f.key)]),
);
