// Idempotent seed: creates the admin account every time it is missing,
// and fills the demo catalogue only when the database has no products yet.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({ datasourceUrl: process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL });

const T = (key, label, filter) => ({ key, label, ...(filter ? { filter } : {}) });

const CATEGORIES = [
  { slug: "smartphones", name: "Смартфоны", icon: "Smartphone", kind: "phone", spec: [T("processor", "Процессор", "processor"), T("ram", "Оперативная память"), T("storage", "Встроенная память", "memory"), T("diagonal", "Диагональ", "diagonal"), T("resolution", "Разрешение экрана"), T("cameras", "Камеры"), T("battery", "Аккумулятор"), T("os", "Операционная система"), T("color", "Цвет", "color")] },
  { slug: "laptops", name: "Ноутбуки", icon: "Laptop", kind: "laptop", spec: [T("processor", "Процессор", "processor"), T("gpu", "Видеокарта"), T("ram", "Оперативная память"), T("ssd", "SSD", "memory"), T("diagonal", "Диагональ", "diagonal"), T("resolution", "Разрешение"), T("refresh", "Частота обновления"), T("os", "Операционная система"), T("color", "Цвет", "color")] },
  { slug: "computers", name: "Компьютеры", icon: "PcCase", kind: "desktop", spec: [T("processor", "Процессор", "processor"), T("gpu", "Видеокарта"), T("ram", "Оперативная память"), T("ssd", "Накопитель", "memory"), T("psu", "Блок питания"), T("os", "Операционная система"), T("color", "Цвет", "color")] },
  { slug: "tablets", name: "Планшеты", icon: "Tablet", kind: "tablet", spec: [T("processor", "Процессор", "processor"), T("ram", "Оперативная память"), T("storage", "Встроенная память", "memory"), T("diagonal", "Диагональ", "diagonal"), T("resolution", "Разрешение экрана"), T("battery", "Аккумулятор"), T("os", "Операционная система"), T("color", "Цвет", "color")] },
  { slug: "tv", name: "Телевизоры", icon: "Tv", kind: "tv", spec: [T("diagonal", "Диагональ", "diagonal"), T("resolution", "Разрешение"), T("matrix", "Тип матрицы"), T("refresh", "Частота обновления"), T("hdr", "HDR"), T("smart", "Smart TV"), T("sound", "Звук"), T("color", "Цвет", "color")] },
  { slug: "headphones", name: "Наушники", icon: "Headphones", kind: "headphones", spec: [T("type", "Тип"), T("connection", "Подключение"), T("anc", "Шумоподавление"), T("battery", "Время работы"), T("codecs", "Кодеки"), T("weight", "Вес"), T("color", "Цвет", "color")] },
  { slug: "smartwatch", name: "Умные часы", icon: "Watch", kind: "watch", spec: [T("diagonal", "Диагональ", "diagonal"), T("display", "Экран"), T("battery", "Автономность"), T("protection", "Защита"), T("sensors", "Датчики"), T("compatibility", "Совместимость"), T("color", "Цвет", "color")] },
  { slug: "consoles", name: "Игровые приставки", icon: "Gamepad2", kind: "console", spec: [T("processor", "Процессор", "processor"), T("gpu", "Графика"), T("storage", "Накопитель", "memory"), T("resolution", "Максимальное разрешение"), T("fps", "Частота кадров"), T("media", "Привод"), T("color", "Цвет", "color")] },
  { slug: "video-cards", name: "Видеокарты", icon: "CircuitBoard", kind: "gpu", spec: [T("chip", "Графический процессор", "processor"), T("vram", "Объём видеопамяти", "memory"), T("memoryType", "Тип памяти"), T("bus", "Шина памяти"), T("boost", "Частота Boost"), T("tdp", "Энергопотребление"), T("connectors", "Разъёмы")] },
  { slug: "processors", name: "Процессоры", icon: "Cpu", kind: "cpu", spec: [T("socket", "Сокет"), T("cores", "Ядер / потоков"), T("baseClock", "Базовая частота"), T("boostClock", "Турбо частота"), T("cache", "Кэш L3"), T("tdp", "TDP"), T("graphics", "Встроенная графика")] },
  { slug: "components", name: "Комплектующие", icon: "MemoryStick", kind: "ram", spec: [T("type", "Тип"), T("capacity", "Объём", "memory"), T("interface", "Интерфейс"), T("speed", "Скорость"), T("warranty", "Гарантия")] },
  { slug: "cameras", name: "Фотоаппараты", icon: "Camera", kind: "camera", spec: [T("sensor", "Матрица"), T("megapixels", "Разрешение"), T("mount", "Байонет"), T("video", "Видео"), T("stabilization", "Стабилизация"), T("weight", "Вес"), T("color", "Цвет", "color")] },
  { slug: "monitors", name: "Мониторы", icon: "Monitor", kind: "monitor", spec: [T("diagonal", "Диагональ", "diagonal"), T("resolution", "Разрешение"), T("matrix", "Матрица"), T("refresh", "Частота обновления"), T("response", "Время отклика"), T("ports", "Разъёмы"), T("color", "Цвет", "color")] },
  { slug: "accessories", name: "Аксессуары", icon: "Cable", kind: "charger", spec: [T("type", "Тип"), T("compatibility", "Совместимость"), T("connection", "Подключение"), T("power", "Мощность"), T("color", "Цвет", "color")] },
  { slug: "appliances", name: "Бытовая техника", icon: "WashingMachine", kind: "vacuum", spec: [T("type", "Тип"), T("power", "Мощность"), T("capacity", "Объём"), T("features", "Особенности"), T("color", "Цвет", "color")] },
];

const BRANDS = ["Apple", "Samsung", "Xiaomi", "Huawei", "HONOR", "Google", "ASUS", "Lenovo", "HP", "Acer", "MSI", "Sony", "LG", "JBL", "Sennheiser", "Palit", "Gigabyte", "AMD", "Intel", "Kingston", "Canon", "Nikon", "Fujifilm", "Microsoft", "Nintendo", "Anker", "Logitech", "Dyson", "Philips", "Garmin", "POCO", "Redmi"];
const POPULAR = ["Apple", "Samsung", "Xiaomi", "Huawei", "ASUS", "Lenovo", "Sony", "LG", "JBL", "MSI", "AMD", "Canon"];

const TR = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };
const slug = (s) => s.toLowerCase().split("").map((c) => (TR[c] !== undefined ? TR[c] : c)).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const colorKey = { Чёрный: "black", Белый: "white", Синий: "blue", Серый: "black", Серебристый: "white", Графитовый: "black", Голубой: "blue", "Тёмно-синий": "blue" };

// [title, brand, category, price, oldPrice, stock, color, memory, diagonal, processor, kind, specs, flags]
const P = [
  // smartphones
  ["Apple iPhone 16 Pro 256 ГБ", "Apple", "smartphones", 129990, 139990, 25, "Чёрный", "256 ГБ", "6.3\"", "Apple A18 Pro", "phone", { ram: "8 ГБ", resolution: "2622×1206", cameras: "48 + 48 + 12 Мп, фронтальная 12 Мп", battery: "3582 мА·ч", os: "iOS 18" }, "hit"],
  ["Apple iPhone 16 128 ГБ", "Apple", "smartphones", 89990, 94990, 40, "Синий", "128 ГБ", "6.1\"", "Apple A18", "phone", { ram: "8 ГБ", resolution: "2556×1179", cameras: "48 + 12 Мп, фронтальная 12 Мп", battery: "3561 мА·ч", os: "iOS 18" }, "new"],
  ["Apple iPhone 15 128 ГБ", "Apple", "smartphones", 69990, 79990, 18, "Белый", "128 ГБ", "6.1\"", "Apple A16 Bionic", "phone", { ram: "6 ГБ", resolution: "2556×1179", cameras: "48 + 12 Мп", battery: "3349 мА·ч", os: "iOS 17" }, "hit"],
  ["Samsung Galaxy S25 Ultra 512 ГБ", "Samsung", "smartphones", 139990, 154990, 12, "Чёрный", "512 ГБ", "6.9\"", "Snapdragon 8 Elite", "phone", { ram: "12 ГБ", resolution: "3120×1440", cameras: "200 + 50 + 50 + 10 Мп", battery: "5000 мА·ч", os: "Android 15, One UI 7" }, "new"],
  ["Samsung Galaxy S24 FE 256 ГБ", "Samsung", "smartphones", 54990, 64990, 30, "Синий", "256 ГБ", "6.7\"", "Exynos 2400e", "phone", { ram: "8 ГБ", resolution: "2340×1080", cameras: "50 + 12 + 8 Мп", battery: "4700 мА·ч", os: "Android 14" }, ""],
  ["Samsung Galaxy A55 256 ГБ", "Samsung", "smartphones", 36990, 41990, 55, "Белый", "256 ГБ", "6.6\"", "Exynos 1480", "phone", { ram: "8 ГБ", resolution: "2340×1080", cameras: "50 + 12 + 5 Мп", battery: "5000 мА·ч", os: "Android 14" }, "hit"],
  ["Xiaomi 15 Ultra 512 ГБ", "Xiaomi", "smartphones", 119990, null, 9, "Чёрный", "512 ГБ", "6.73\"", "Snapdragon 8 Elite", "phone", { ram: "16 ГБ", resolution: "3200×1440", cameras: "50 + 50 + 200 + 50 Мп, Leica", battery: "5410 мА·ч", os: "Android 15, HyperOS 2" }, "new"],
  ["Redmi Note 14 Pro 256 ГБ", "Redmi", "smartphones", 27990, 32990, 80, "Синий", "256 ГБ", "6.67\"", "MediaTek Dimensity 7300 Ultra", "phone", { ram: "8 ГБ", resolution: "2712×1220", cameras: "200 + 8 + 2 Мп", battery: "5110 мА·ч", os: "Android 14, HyperOS" }, "hit"],
  ["POCO X7 Pro 256 ГБ", "POCO", "smartphones", 29990, 34990, 45, "Чёрный", "256 ГБ", "6.67\"", "MediaTek Dimensity 8400 Ultra", "phone", { ram: "12 ГБ", resolution: "2712×1220", cameras: "50 + 8 Мп", battery: "6000 мА·ч", os: "Android 15, HyperOS 2" }, ""],
  ["HUAWEI Pura 70 Pro 512 ГБ", "Huawei", "smartphones", 89990, 99990, 7, "Белый", "512 ГБ", "6.8\"", "Kirin 9010", "phone", { ram: "12 ГБ", resolution: "2844×1260", cameras: "50 + 48 + 12,5 Мп", battery: "5050 мА·ч", os: "HarmonyOS 4.2" }, ""],
  ["HONOR 200 Pro 512 ГБ", "HONOR", "smartphones", 49990, 59990, 22, "Синий", "512 ГБ", "6.78\"", "Snapdragon 8s Gen 3", "phone", { ram: "12 ГБ", resolution: "2700×1224", cameras: "50 + 50 + 12 Мп", battery: "5200 мА·ч", os: "Android 14, MagicOS 8" }, ""],
  ["Google Pixel 9 128 ГБ", "Google", "smartphones", 74990, null, 0, "Чёрный", "128 ГБ", "6.3\"", "Google Tensor G4", "phone", { ram: "12 ГБ", resolution: "2424×1080", cameras: "50 + 48 Мп", battery: "4700 мА·ч", os: "Android 14" }, ""],
  // laptops
  ["Apple MacBook Air 13 M3 16/512 ГБ", "Apple", "laptops", 139990, 149990, 14, "Серебристый", "512 ГБ", "13.6\"", "Apple M3", "laptop", { gpu: "Apple M3 10-core GPU", ram: "16 ГБ", resolution: "2560×1664", refresh: "60 Гц", os: "macOS" }, "hit"],
  ["Apple MacBook Pro 14 M4 Pro 24/1 ТБ", "Apple", "laptops", 249990, null, 6, "Чёрный", "1 ТБ", "14.2\"", "Apple M4 Pro", "laptop", { gpu: "Apple M4 Pro 16-core GPU", ram: "24 ГБ", resolution: "3024×1964", refresh: "120 Гц ProMotion", os: "macOS" }, "new"],
  ["ASUS ROG Strix G16 i7/RTX 4060", "ASUS", "laptops", 159990, 179990, 10, "Серый", "1 ТБ", "16\"", "Intel Core i7-13650HX", "laptop", { gpu: "NVIDIA GeForce RTX 4060 8 ГБ", ram: "16 ГБ DDR5", resolution: "1920×1200", refresh: "165 Гц", os: "Windows 11 Home" }, "hit"],
  ["Lenovo Legion 5 Pro Ryzen 7/RTX 4070", "Lenovo", "laptops", 189990, 209990, 8, "Серый", "1 ТБ", "16\"", "AMD Ryzen 7 7745HX", "laptop", { gpu: "NVIDIA GeForce RTX 4070 8 ГБ", ram: "32 ГБ DDR5", resolution: "2560×1600", refresh: "240 Гц", os: "Windows 11 Home" }, ""],
  ["Lenovo IdeaPad Slim 5 Ryzen 5", "Lenovo", "laptops", 64990, 72990, 26, "Синий", "512 ГБ", "14\"", "AMD Ryzen 5 7530U", "laptop", { gpu: "AMD Radeon Graphics", ram: "16 ГБ", resolution: "1920×1200", refresh: "60 Гц", os: "Windows 11 Home" }, ""],
  ["HP Pavilion 15 Core i5", "HP", "laptops", 59990, 66990, 19, "Серебристый", "512 ГБ", "15.6\"", "Intel Core i5-1335U", "laptop", { gpu: "Intel Iris Xe", ram: "16 ГБ", resolution: "1920×1080", refresh: "60 Гц", os: "Windows 11 Home" }, ""],
  ["Acer Nitro V 15 i5/RTX 4050", "Acer", "laptops", 89990, 99990, 15, "Чёрный", "512 ГБ", "15.6\"", "Intel Core i5-13420H", "laptop", { gpu: "NVIDIA GeForce RTX 4050 6 ГБ", ram: "16 ГБ", resolution: "1920×1080", refresh: "144 Гц", os: "Без ОС" }, ""],
  ["MSI Katana 15 i7/RTX 4070", "MSI", "laptops", 149990, 164990, 0, "Чёрный", "1 ТБ", "15.6\"", "Intel Core i7-13620H", "laptop", { gpu: "NVIDIA GeForce RTX 4070 8 ГБ", ram: "16 ГБ", resolution: "1920×1080", refresh: "144 Гц", os: "Windows 11 Home" }, ""],
  ["HUAWEI MateBook D 16 i5", "Huawei", "laptops", 69990, 79990, 21, "Серый", "512 ГБ", "16\"", "Intel Core i5-12450H", "laptop", { gpu: "Intel UHD Graphics", ram: "16 ГБ", resolution: "1920×1200", refresh: "60 Гц", os: "Windows 11 Home" }, ""],
  // computers
  ["Apple iMac 24 M4 16/256 ГБ", "Apple", "computers", 159990, null, 5, "Синий", "256 ГБ", "24\"", "Apple M4", "monitor", { gpu: "Apple M4 8-core GPU", ram: "16 ГБ", psu: "Встроенный", os: "macOS" }, "new"],
  ["MSI MAG Infinite S3 i7/RTX 4060 Ti", "MSI", "computers", 139990, 154990, 7, "Чёрный", "1 ТБ", null, "Intel Core i7-14700F", "desktop", { gpu: "NVIDIA GeForce RTX 4060 Ti 8 ГБ", ram: "32 ГБ DDR5", psu: "650 Вт", os: "Windows 11 Home" }, ""],
  ["ASUS ROG Strix G13CH i5/RTX 4060", "ASUS", "computers", 109990, 119990, 9, "Чёрный", "1 ТБ", null, "Intel Core i5-14400F", "desktop", { gpu: "NVIDIA GeForce RTX 4060 8 ГБ", ram: "16 ГБ DDR5", psu: "500 Вт", os: "Windows 11 Home" }, ""],
  ["Lenovo IdeaCentre 3 Ryzen 5", "Lenovo", "computers", 49990, 54990, 14, "Чёрный", "512 ГБ", null, "AMD Ryzen 5 5600G", "desktop", { gpu: "AMD Radeon Graphics", ram: "16 ГБ", psu: "260 Вт", os: "Windows 11 Home" }, ""],
  // tablets
  ["Apple iPad Air 11 M2 128 ГБ", "Apple", "tablets", 69990, 76990, 20, "Синий", "128 ГБ", "11\"", "Apple M2", "tablet", { ram: "8 ГБ", resolution: "2360×1640", battery: "До 10 ч", os: "iPadOS 17" }, "hit"],
  ["Apple iPad 10.9 64 ГБ", "Apple", "tablets", 39990, 44990, 33, "Серебристый", "64 ГБ", "10.9\"", "Apple A14 Bionic", "tablet", { ram: "4 ГБ", resolution: "2360×1640", battery: "До 10 ч", os: "iPadOS 17" }, ""],
  ["Samsung Galaxy Tab S9 FE 128 ГБ", "Samsung", "tablets", 39990, 47990, 17, "Серый", "128 ГБ", "10.9\"", "Exynos 1380", "tablet", { ram: "6 ГБ", resolution: "2304×1440", battery: "8000 мА·ч", os: "Android 14" }, ""],
  ["Xiaomi Pad 6 256 ГБ", "Xiaomi", "tablets", 32990, 37990, 24, "Синий", "256 ГБ", "11\"", "Snapdragon 870", "tablet", { ram: "8 ГБ", resolution: "2880×1800", battery: "8840 мА·ч", os: "Android 13, MIUI Pad" }, ""],
  // tv
  ["Samsung QE55Q80C QLED 55\"", "Samsung", "tv", 89990, 109990, 11, "Чёрный", null, "55\"", null, "tv", { resolution: "3840×2160 (4K UHD)", matrix: "QLED, VA", refresh: "120 Гц", hdr: "HDR10+, HLG", smart: "Tizen", sound: "40 Вт, OTS Lite" }, "hit"],
  ["LG OLED65C4 OLED 65\"", "LG", "tv", 199990, 229990, 4, "Чёрный", null, "65\"", null, "tv", { resolution: "3840×2160 (4K UHD)", matrix: "OLED evo", refresh: "144 Гц", hdr: "Dolby Vision, HDR10, HLG", smart: "webOS 24", sound: "40 Вт, Dolby Atmos" }, "new"],
  ["Xiaomi TV A Pro 43\"", "Xiaomi", "tv", 27990, 32990, 38, "Чёрный", null, "43\"", null, "tv", { resolution: "3840×2160 (4K UHD)", matrix: "QLED", refresh: "60 Гц", hdr: "Dolby Vision, HDR10", smart: "Google TV", sound: "2×10 Вт" }, ""],
  ["Sony Bravia 7 XR 65\"", "Sony", "tv", 159990, null, 3, "Чёрный", null, "65\"", null, "tv", { resolution: "3840×2160 (4K UHD)", matrix: "Mini LED, VA", refresh: "120 Гц", hdr: "Dolby Vision, HDR10", smart: "Google TV", sound: "50 Вт, Dolby Atmos" }, ""],
  // headphones
  ["Apple AirPods Pro 2 USB-C", "Apple", "headphones", 24990, 27990, 60, "Белый", null, null, null, "earbuds", { type: "TWS, внутриканальные", connection: "Bluetooth 5.3", anc: "Активное", battery: "До 6 ч (30 ч с кейсом)", codecs: "AAC", weight: "5,3 г" }, "hit"],
  ["Sony WH-1000XM5", "Sony", "headphones", 32990, 39990, 25, "Чёрный", null, null, null, "headphones", { type: "Полноразмерные", connection: "Bluetooth 5.2, 3,5 мм", anc: "Активное", battery: "До 30 ч", codecs: "SBC, AAC, LDAC", weight: "250 г" }, "hit"],
  ["Samsung Galaxy Buds3 Pro", "Samsung", "headphones", 19990, 22990, 34, "Белый", null, null, null, "earbuds", { type: "TWS, внутриканальные", connection: "Bluetooth 5.4", anc: "Активное", battery: "До 6 ч (26 ч с кейсом)", codecs: "SBC, AAC, SSC", weight: "5,4 г" }, "new"],
  ["JBL Tune 770NC", "JBL", "headphones", 8990, 11990, 70, "Синий", null, null, null, "headphones", { type: "Полноразмерные", connection: "Bluetooth 5.3", anc: "Адаптивное", battery: "До 70 ч", codecs: "SBC, AAC", weight: "232 г" }, ""],
  ["Sennheiser Momentum 4 Wireless", "Sennheiser", "headphones", 29990, 34990, 12, "Чёрный", null, null, null, "headphones", { type: "Полноразмерные", connection: "Bluetooth 5.2", anc: "Адаптивное", battery: "До 60 ч", codecs: "SBC, AAC, aptX Adaptive", weight: "293 г" }, ""],
  ["Xiaomi Redmi Buds 6 Pro", "Xiaomi", "headphones", 5990, 7490, 120, "Чёрный", null, null, null, "earbuds", { type: "TWS, внутриканальные", connection: "Bluetooth 5.3", anc: "Активное, до 55 дБ", battery: "До 9,5 ч (36 ч с кейсом)", codecs: "SBC, AAC, LDAC", weight: "5,2 г" }, ""],
  ["JBL Flip 6 портативная колонка", "JBL", "headphones", 10990, 12990, 44, "Синий", null, null, null, "speaker", { type: "Портативная колонка", connection: "Bluetooth 5.1", anc: "—", battery: "До 12 ч", codecs: "SBC", weight: "550 г" }, ""],
  // smartwatch
  ["Apple Watch Series 10 46 мм", "Apple", "smartwatch", 44990, 49990, 22, "Чёрный", null, "46 мм", null, "watch", { display: "LTPO3 OLED Always-On", battery: "До 18 ч", protection: "WR50, IP6X", sensors: "ЭКГ, SpO2, температура, пульс", compatibility: "iOS" }, "new"],
  ["Samsung Galaxy Watch7 44 мм", "Samsung", "smartwatch", 27990, 32990, 28, "Серебристый", null, "44 мм", null, "watch", { display: "Super AMOLED 1,5\"", battery: "До 40 ч", protection: "5ATM, IP68", sensors: "BioActive, пульс, SpO2, ЭКГ", compatibility: "Android" }, ""],
  ["HUAWEI Watch GT 5 46 мм", "Huawei", "smartwatch", 19990, 23990, 31, "Чёрный", null, "46 мм", null, "watch", { display: "AMOLED 1,43\"", battery: "До 14 дней", protection: "5ATM", sensors: "Пульс, SpO2, GPS", compatibility: "Android, iOS" }, "hit"],
  ["Garmin Forerunner 265", "Garmin", "smartwatch", 44990, null, 6, "Синий", null, "46 мм", null, "watch", { display: "AMOLED 1,3\"", battery: "До 13 дней", protection: "5ATM", sensors: "Пульс, SpO2, GPS многодиапазонный", compatibility: "Android, iOS" }, ""],
  // consoles
  ["Sony PlayStation 5 Slim с дисководом", "Sony", "consoles", 64990, 69990, 16, "Белый", "1 ТБ", null, "AMD Zen 2, 8 ядер", "console", { gpu: "AMD RDNA 2, 10,3 TFLOPS", resolution: "4K (до 8K)", fps: "До 120 к/с", media: "Ultra HD Blu-ray" }, "hit"],
  ["Microsoft Xbox Series X 1 ТБ", "Microsoft", "consoles", 59990, 64990, 9, "Чёрный", "1 ТБ", null, "AMD Zen 2, 8 ядер", "console", { gpu: "AMD RDNA 2, 12 TFLOPS", resolution: "4K (до 8K)", fps: "До 120 к/с", media: "Ultra HD Blu-ray" }, ""],
  ["Nintendo Switch OLED", "Nintendo", "consoles", 32990, 36990, 27, "Белый", "64 ГБ", "7\"", "NVIDIA Tegra X1", "console", { gpu: "NVIDIA Maxwell", resolution: "1080p (в доке)", fps: "До 60 к/с", media: "Картриджи" }, "hit"],
  ["Sony DualSense беспроводной геймпад", "Sony", "consoles", 6990, 7990, 90, "Белый", null, null, null, "console", { gpu: "—", resolution: "—", fps: "—", media: "—" }, ""],
  // video cards
  ["Palit GeForce RTX 4070 SUPER Dual 12 ГБ", "Palit", "video-cards", 64990, 72990, 13, null, "12 ГБ", null, "NVIDIA GeForce RTX 4070 SUPER", "gpu", { memoryType: "GDDR6X", bus: "192 бит", boost: "2475 МГц", tdp: "220 Вт", connectors: "3× DisplayPort, HDMI" }, "hit"],
  ["Gigabyte GeForce RTX 4060 Ti Eagle 8 ГБ", "Gigabyte", "video-cards", 44990, 49990, 18, null, "8 ГБ", null, "NVIDIA GeForce RTX 4060 Ti", "gpu", { memoryType: "GDDR6", bus: "128 бит", boost: "2535 МГц", tdp: "160 Вт", connectors: "2× DisplayPort, 2× HDMI" }, ""],
  ["ASUS TUF Gaming Radeon RX 7800 XT 16 ГБ", "ASUS", "video-cards", 62990, 69990, 7, null, "16 ГБ", null, "AMD Radeon RX 7800 XT", "gpu", { memoryType: "GDDR6", bus: "256 бит", boost: "2565 МГц", tdp: "263 Вт", connectors: "3× DisplayPort, HDMI" }, ""],
  ["MSI GeForce RTX 4090 Gaming X Trio 24 ГБ", "MSI", "video-cards", 249990, 279990, 2, null, "24 ГБ", null, "NVIDIA GeForce RTX 4090", "gpu", { memoryType: "GDDR6X", bus: "384 бит", boost: "2595 МГц", tdp: "450 Вт", connectors: "3× DisplayPort, HDMI" }, "new"],
  // processors
  ["AMD Ryzen 7 7800X3D BOX", "AMD", "processors", 44990, 49990, 15, null, null, null, "AMD Ryzen 7 7800X3D", "cpu", { socket: "AM5", cores: "8 / 16", baseClock: "4,2 ГГц", boostClock: "5,0 ГГц", cache: "96 МБ", tdp: "120 Вт", graphics: "AMD Radeon" }, "hit"],
  ["AMD Ryzen 5 7600 OEM", "AMD", "processors", 17990, 19990, 40, null, null, null, "AMD Ryzen 5 7600", "cpu", { socket: "AM5", cores: "6 / 12", baseClock: "3,8 ГГц", boostClock: "5,1 ГГц", cache: "32 МБ", tdp: "65 Вт", graphics: "AMD Radeon" }, ""],
  ["Intel Core i7-14700K BOX", "Intel", "processors", 42990, 46990, 11, null, null, null, "Intel Core i7-14700K", "cpu", { socket: "LGA1700", cores: "20 / 28", baseClock: "3,4 ГГц", boostClock: "5,6 ГГц", cache: "33 МБ", tdp: "125 Вт", graphics: "Intel UHD 770" }, ""],
  ["Intel Core i5-14400F OEM", "Intel", "processors", 16990, 18990, 35, null, null, null, "Intel Core i5-14400F", "cpu", { socket: "LGA1700", cores: "10 / 16", baseClock: "2,5 ГГц", boostClock: "4,7 ГГц", cache: "20 МБ", tdp: "65 Вт", graphics: "Нет" }, ""],
  // components
  ["Kingston FURY Beast DDR5 32 ГБ (2×16) 6000 МГц", "Kingston", "components", 10990, 12990, 50, "Чёрный", "32 ГБ", null, null, "ram", { type: "Оперативная память DDR5", interface: "DIMM", speed: "6000 МГц, CL36", warranty: "Пожизненная" }, "hit"],
  ["Samsung 990 PRO 2 ТБ NVMe M.2", "Samsung", "components", 17990, 21990, 32, null, "2 ТБ", null, null, "ssd", { type: "SSD-накопитель", interface: "PCIe 4.0 x4, NVMe", speed: "До 7450 / 6900 МБ/с", warranty: "5 лет" }, ""],
  ["Kingston NV3 1 ТБ NVMe M.2", "Kingston", "components", 6490, 7490, 75, null, "1 ТБ", null, null, "ssd", { type: "SSD-накопитель", interface: "PCIe 4.0 x4, NVMe", speed: "До 6000 / 4000 МБ/с", warranty: "3 года" }, ""],
  // cameras
  ["Sony Alpha 7 IV Body", "Sony", "cameras", 219990, 239990, 4, "Чёрный", null, null, null, "camera", { sensor: "Полнокадровая Exmor R", megapixels: "33 Мп", mount: "Sony E", video: "4K 60p, 10 бит", stabilization: "5-осевая, 5,5 ступени", weight: "658 г" }, ""],
  ["Canon EOS R50 Kit 18-45mm", "Canon", "cameras", 79990, 89990, 9, "Чёрный", null, null, null, "camera", { sensor: "APS-C CMOS", megapixels: "24,2 Мп", mount: "Canon RF", video: "4K 30p", stabilization: "Цифровая", weight: "375 г" }, "hit"],
  ["Fujifilm X-T50 Body", "Fujifilm", "cameras", 159990, null, 3, "Серебристый", null, null, null, "camera", { sensor: "APS-C X-Trans CMOS 5 HR", megapixels: "40,2 Мп", mount: "Fujifilm X", video: "6,2K 30p", stabilization: "5-осевая, 7 ступеней", weight: "438 г" }, "new"],
  ["Nikon Z6 III Body", "Nikon", "cameras", 239990, null, 2, "Чёрный", null, null, null, "camera", { sensor: "Полнокадровая частично многослойная", megapixels: "24,5 Мп", mount: "Nikon Z", video: "6K 60p RAW", stabilization: "5-осевая, 8 ступеней", weight: "760 г" }, ""],
  // monitors
  ["Samsung Odyssey G5 27\" QHD 165 Гц", "Samsung", "monitors", 26990, 31990, 20, "Чёрный", null, "27\"", null, "monitor", { resolution: "2560×1440", matrix: "VA, изогнутый 1000R", refresh: "165 Гц", response: "1 мс", ports: "HDMI, DisplayPort" }, "hit"],
  ["LG UltraGear 27GR95QE OLED 240 Гц", "LG", "monitors", 79990, 89990, 6, "Чёрный", null, "27\"", null, "monitor", { resolution: "2560×1440", matrix: "OLED", refresh: "240 Гц", response: "0,03 мс", ports: "2× HDMI 2.1, DisplayPort 1.4, USB" }, "new"],
  ["ASUS ProArt PA279CRV 27\" 4K", "ASUS", "monitors", 49990, 54990, 8, "Чёрный", null, "27\"", null, "monitor", { resolution: "3840×2160", matrix: "IPS", refresh: "60 Гц", response: "5 мс", ports: "HDMI, 2× DisplayPort, USB-C 96 Вт" }, ""],
  ["Xiaomi Mi Monitor 23.8\" 1C", "Xiaomi", "monitors", 9990, 11990, 46, "Чёрный", null, "23.8\"", null, "monitor", { resolution: "1920×1080", matrix: "IPS", refresh: "60 Гц", response: "6 мс", ports: "HDMI, VGA" }, ""],
  // accessories
  ["Anker 735 GaN зарядное устройство 65 Вт", "Anker", "accessories", 4990, 5990, 85, "Белый", null, null, null, "charger", { type: "Сетевое зарядное устройство", compatibility: "Смартфоны, планшеты, ноутбуки", connection: "2× USB-C, USB-A", power: "65 Вт" }, "hit"],
  ["Logitech MX Master 3S", "Logitech", "accessories", 10990, 12490, 37, "Чёрный", null, null, null, "mouse", { type: "Беспроводная мышь", compatibility: "Windows, macOS, Linux", connection: "Bluetooth, Logi Bolt", power: "Аккумулятор, до 70 дней" }, ""],
  ["Logitech MX Keys S", "Logitech", "accessories", 12990, 14490, 21, "Чёрный", null, null, null, "keyboard", { type: "Беспроводная клавиатура", compatibility: "Windows, macOS, Linux", connection: "Bluetooth, Logi Bolt", power: "Аккумулятор, до 10 дней с подсветкой" }, ""],
  ["Apple Magic Keyboard с Touch ID", "Apple", "accessories", 16990, null, 14, "Белый", null, null, null, "keyboard", { type: "Беспроводная клавиатура", compatibility: "Mac с Apple silicon", connection: "Bluetooth, USB-C", power: "Аккумулятор" }, ""],
  // appliances
  ["Dyson V15 Detect Absolute", "Dyson", "appliances", 69990, 79990, 8, "Синий", null, null, null, "vacuum", { type: "Беспроводной вертикальный пылесос", power: "660 Вт", capacity: "0,76 л", features: "Лазерная подсветка пыли, датчик частиц" }, "hit"],
  ["Xiaomi Robot Vacuum X20+", "Xiaomi", "appliances", 44990, 54990, 15, "Белый", null, null, null, "vacuum", { type: "Робот-пылесос", power: "6000 Па", capacity: "0,4 л", features: "Самоочистка, влажная уборка, LDS-навигация" }, "new"],
  ["Philips LatteGo 3200 EP3246", "Philips", "appliances", 49990, 57990, 10, "Чёрный", null, null, null, "coffee", { type: "Автоматическая кофемашина", power: "1500 Вт", capacity: "1,8 л", features: "Капучинатор LatteGo, 5 напитков" }, ""],
];

const ADV = {
  smartphones: ["Флагманская производительность для игр и многозадачности", "Яркий экран с высокой частотой обновления", "Камеры, которые снимают отлично даже ночью", "Аккумулятор на целый день активного использования"],
  laptops: ["Мощная конфигурация для работы и учёбы", "Качественный экран с точной цветопередачей", "Тихая система охлаждения", "Лёгкий корпус и долгая автономность"],
  default: ["Оригинальная продукция с официальной гарантией", "Быстрая доставка по всей России", "Возврат в течение 14 дней", "Проверенный продавец с высоким рейтингом"],
};
const EQUIP = {
  smartphones: ["Смартфон", "Кабель USB-C", "Скрепка для лотка SIM", "Документация"],
  laptops: ["Ноутбук", "Блок питания", "Документация"],
  tv: ["Телевизор", "Пульт ДУ", "Подставка", "Кабель питания", "Документация"],
  headphones: ["Наушники", "Кабель для зарядки", "Документация"],
  default: ["Устройство", "Документация", "Гарантийный талон"],
};

const PAGES = [
  ["about", "О компании", "TECHMARKET — маркетплейс электроники и бытовой техники.\n\n## Наша миссия\nМы объединяем проверенных продавцов и покупателей, чтобы покупка техники была быстрой, честной и выгодной.\n\n## Почему нам доверяют\n- Только оригинальная техника с гарантией производителя\n- Тысячи товаров и честные отзывы покупателей\n- Доставка по всей России от 1 дня\n- Поддержка 7 дней в неделю"],
  ["contacts", "Контакты", "## Служба поддержки\nТелефон: 8 800 555-35-35 (бесплатно по России)\nEmail: support@techmarket.ru\n\n## Офис\nМосква, Пресненская наб., 12\nЕжедневно 9:00–21:00\n\n## Для продавцов\nsellers@techmarket.ru"],
  ["delivery", "Доставка", "## Способы доставки\n- **Курьером** — 1–3 дня, 299 ₽, бесплатно от 3 000 ₽\n- **Пункт выдачи** — бесплатно, срок хранения 7 дней\n- **Почта России** — от 3 до 10 дней, 399 ₽\n\nПосле оформления заказа вы получите уведомление о каждом изменении статуса."],
  ["payment", "Оплата", "## Способы оплаты\n- Банковской картой онлайн (Visa, Mastercard, МИР)\n- Через Систему быстрых платежей (СБП)\n- Наличными или картой при получении\n\nВсе платежи защищены по стандарту PCI DSS."],
  ["returns", "Возврат", "## Возврат товара\nВы можете вернуть товар надлежащего качества в течение 14 дней с момента получения, если сохранены товарный вид и упаковка.\n\n## Как оформить возврат\n1. Откройте заказ в личном кабинете\n2. Нажмите «Оформить возврат» и укажите причину\n3. Передайте товар в пункт выдачи\n\nДеньги вернутся тем же способом, которым был оплачен заказ, в течение 10 дней."],
  ["privacy", "Политика конфиденциальности", "## Какие данные мы собираем\nИмя, адрес электронной почты, номер телефона и адрес доставки — только для оформления и доставки заказов.\n\n## Как мы защищаем данные\nПароли хранятся в виде криптографических хешей, соединение защищено HTTPS, доступ к данным имеют только уполномоченные сотрудники.\n\n## Ваши права\nВы можете запросить изменение или удаление своих данных, написав на support@techmarket.ru."],
];

async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || "admin@techmarket.ru").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "ADMIN") await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
    return existing;
  }
  if (!password) {
    console.warn("ADMIN_PASSWORD not set — admin user not created");
    return null;
  }
  return prisma.user.create({
    data: { email, name: "Администратор", passwordHash: await bcrypt.hash(password, 12), role: "ADMIN", emailVerified: new Date(), phone: "+70000000000" },
  });
}

function rand(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

async function seedCatalog() {
  console.log("Seeding demo catalogue…");
  const cats = {};
  for (const [i, c] of CATEGORIES.entries()) {
    cats[c.slug] = await prisma.category.create({
      data: { name: c.name, slug: c.slug, icon: c.icon, sortOrder: i, specTemplate: c.spec, image: `/products/${c.kind}-black-front.svg`, description: `${c.name} с доставкой и гарантией` },
    });
  }
  // subcategories
  const sub = [["gaming-laptops", "Игровые ноутбуки", "laptops"], ["ultrabooks", "Ультрабуки", "laptops"], ["tws", "Беспроводные наушники", "headphones"]];
  for (const [s, n, parent] of sub) {
    await prisma.category.create({ data: { name: n, slug: s, parentId: cats[parent].id, icon: cats[parent].icon, showOnHome: false, specTemplate: CATEGORIES.find((c) => c.slug === parent).spec, sortOrder: 100 } });
  }
  const brands = {};
  for (const [i, b] of BRANDS.entries()) {
    brands[b] = await prisma.brand.create({ data: { name: b, slug: slug(b), popular: POPULAR.includes(b), sortOrder: i } });
  }

  const pass = await bcrypt.hash("seller12345", 12);
  const sellersData = [
    ["TechStore Official", "techstore", "seller@techmarket.ru", "Официальный магазин электроники", 8],
    ["GadgetPro", "gadgetpro", "gadgetpro@techmarket.ru", "Гаджеты и аксессуары с гарантией", null],
    ["DigitalHub", "digitalhub", "digitalhub@techmarket.ru", "Компьютерные комплектующие и периферия", 12],
  ];
  const sellers = [];
  for (const [shopName, s, email, description, rate] of sellersData) {
    const u = await prisma.user.create({ data: { name: shopName + " (менеджер)", email, passwordHash: pass, role: "SELLER", emailVerified: new Date(), phone: "+79990000000" } });
    sellers.push(await prisma.seller.create({ data: { userId: u.id, shopName, slug: s, description, status: "APPROVED", commissionRate: rate, email, rating: 4.8 } }));
  }
  const pu = await prisma.user.create({ data: { name: "Новый Продавец", email: "newseller@techmarket.ru", passwordHash: pass, role: "BUYER", phone: "+79990000001" } });
  await prisma.seller.create({ data: { userId: pu.id, shopName: "ElectroWorld", slug: "electroworld", description: "Заявка на подключение", status: "PENDING", inn: "7701234567" } });

  const r = rand(42);
  const products = [];
  for (const [idx, row] of P.entries()) {
    const [title, brand, cat, price, oldPrice, stock, color, memory, diagonal, processor, kind, specs, flag] = row;
    const ck = colorKey[color] || "black";
    const allSpecs = { ...specs };
    const tpl = CATEGORIES.find((c) => c.slug === cat).spec;
    if (processor && tpl.some((t) => t.key === "processor")) allSpecs.processor = processor;
    if (processor && tpl.some((t) => t.key === "chip")) allSpecs.chip = processor;
    if (diagonal && tpl.some((t) => t.key === "diagonal")) allSpecs.diagonal = diagonal;
    if (memory) for (const k of ["storage", "ssd", "vram", "capacity"]) if (tpl.some((t) => t.key === k)) allSpecs[k] = memory;
    if (color) allSpecs.color = color;
    const sales = Math.floor(r() * 900) + (flag === "hit" ? 600 : 20);
    const p = await prisma.product.create({
      data: {
        title,
        slug: slug(title.replace(/"/g, "")) + "-" + (idx + 1),
        sku: "TM-" + String(100000 + idx * 137).slice(0, 6),
        model: title.replace(brand, "").trim().split(" ").slice(0, 3).join(" "),
        brandId: brands[brand].id,
        categoryId: cats[cat].id,
        sellerId: sellers[idx % sellers.length].id,
        price,
        oldPrice,
        stock,
        status: "PUBLISHED",
        color,
        memory,
        diagonal,
        processor,
        shortDescription: `${title} — ${Object.values(specs).slice(0, 2).join(", ")}.`,
        description: `${title} от ${brand} — отличный выбор в категории «${cats[cat].name.toLowerCase()}». Модель сочетает продуманный дизайн, надёжность и современные технологии.\n\nКлючевые характеристики: ${Object.entries(allSpecs).slice(0, 4).map(([, v]) => v).join(", ")}.\n\nТовар поставляется официально, на него распространяется гарантия производителя. Перед отправкой каждый заказ проверяется продавцом.`,
        advantages: ADV[cat] || ADV.default,
        features: Object.entries(allSpecs).slice(0, 3).map(([k, v]) => `${tpl.find((t) => t.key === k)?.label ?? k}: ${v}`),
        equipment: EQUIP[cat] || EQUIP.default,
        manufacturerInfo: `${brand} — международный производитель электроники. Гарантия производителя: 12 месяцев. Страна производства указана на упаковке.`,
        specs: allSpecs,
        rating: 0,
        reviewsCount: 0,
        salesCount: sales,
        viewsCount: sales * 7,
        isNew: flag === "new",
        isHit: flag === "hit",
        featured: idx % 7 === 0,
        seoTitle: `${title} — купить по выгодной цене`,
        seoDescription: `Купить ${title} с доставкой. Гарантия, официальная поставка, отзывы покупателей.`,
        keywords: [brand, cats[cat].name, title].join(", ").toLowerCase(),
        createdAt: new Date(Date.now() - Math.floor(r() * 120) * 86400000),
        images: {
          create: ["front", "back", "side"].map((a, i) => ({ url: `/products/${kind}-${ck}-${a}.svg`, alt: `${title} — ${i === 0 ? "вид спереди" : i === 1 ? "вид сзади" : "вид сбоку"}`, sortOrder: i, isMain: i === 0 })),
        },
      },
    });
    products.push(p);
  }

  // demo buyers, orders, reviews
  const buyerPass = await bcrypt.hash("buyer12345", 12);
  const names = ["Анна Смирнова", "Игорь Петров", "Мария Кузнецова", "Дмитрий Волков", "Елена Соколова", "Алексей Морозов"];
  const buyers = [];
  buyers.push(await prisma.user.create({ data: { name: "Демо Покупатель", email: "buyer@techmarket.ru", passwordHash: buyerPass, phone: "+79161234567", emailVerified: new Date() } }));
  for (const [i, n] of names.entries()) {
    buyers.push(await prisma.user.create({ data: { name: n, email: `user${i + 1}@example.com`, passwordHash: buyerPass, phone: `+7916000000${i}`, emailVerified: new Date(), createdAt: new Date(Date.now() - (i + 2) * 9 * 86400000) } }));
  }
  const reviewTexts = [
    [5, "Отличный товар! Пользуюсь уже месяц — никаких нареканий, всё работает быстро и стабильно.", "Качество сборки, скорость", "Нет"],
    [5, "Доставили на следующий день, упаковка целая. Полностью соответствует описанию, рекомендую.", "Быстрая доставка, оригинал", "Не обнаружил"],
    [4, "Хорошая модель за свои деньги. Есть мелкие недочёты, но в целом доволен покупкой.", "Цена, функциональность", "Немного тяжеловат"],
    [5, "Брал в подарок — очень понравилось. Продавец отвечал быстро, всё чётко.", "Дизайн, комплектация", "—"],
    [3, "Нормально, но ожидал большего. Автономность ниже заявленной.", "Экран", "Автономность"],
    [4, "Работает отлично, настройка заняла пару минут. Снимаю звезду за отсутствие зарядки в комплекте.", "Производительность", "Комплектация"],
  ];
  let orderCount = 0;
  const statuses = ["DELIVERED", "DELIVERED", "DELIVERED", "DELIVERED", "SHIPPED", "PAID", "CONFIRMED", "NEW", "CANCELLED"];
  for (let i = 0; i < 70; i++) {
    const buyer = buyers[i % buyers.length];
    const daysAgo = Math.floor(r() * 120);
    const created = new Date(Date.now() - daysAgo * 86400000 - Math.floor(r() * 86400000));
    const nItems = 1 + Math.floor(r() * 2);
    const chosen = [];
    for (let k = 0; k < nItems; k++) chosen.push(products[Math.floor(r() * products.length)]);
    const uniq = [...new Map(chosen.map((c) => [c.id, c])).values()];
    const status = daysAgo > 10 ? (r() > 0.92 ? "CANCELLED" : "DELIVERED") : statuses[Math.floor(r() * statuses.length)];
    let subtotal = 0, commission = 0;
    const items = uniq.map((p) => {
      const qty = 1;
      const s = sellers.find((x) => x.id === p.sellerId);
      const rate = s?.commissionRate ?? 10;
      subtotal += p.price * qty;
      const c = Math.round((p.price * qty * rate) / 100);
      commission += c;
      return { productId: p.id, sellerId: p.sellerId, title: p.title, sku: p.sku, price: p.price, qty, commissionRate: rate, commission: c, image: null };
    });
    const delivery = subtotal >= 3000 ? 0 : 299;
    const order = await prisma.order.create({
      data: {
        userId: buyer.id, status, subtotal, deliveryPrice: delivery, total: subtotal + delivery, commissionTotal: status === "CANCELLED" ? 0 : commission,
        paymentMethod: ["card", "sbp", "cash"][i % 3], paymentStatus: ["DELIVERED", "SHIPPED", "PAID"].includes(status) ? "paid" : "pending",
        deliveryMethod: ["courier", "pickup", "post"][i % 3], recipientName: buyer.name, phone: buyer.phone || "+79160000000", email: buyer.email,
        city: "Москва", address: "ул. Тверская, д. " + (i + 1), createdAt: created, items: { create: items },
        events: { create: [{ status: "NEW", note: "Заказ создан", createdAt: created }, ...(status !== "NEW" ? [{ status, note: "Статус обновлён", createdAt: new Date(created.getTime() + 86400000) }] : [])] },
      },
    });
    orderCount++;
    if (status === "DELIVERED" && buyer.email !== "buyer@techmarket.ru") {
      for (const it of uniq) {
        const rv = reviewTexts[Math.floor(r() * reviewTexts.length)];
        await prisma.review.upsert({
          where: { productId_userId: { productId: it.id, userId: buyer.id } },
          create: { productId: it.id, userId: buyer.id, orderId: order.id, rating: rv[0], text: rv[1], pros: rv[2], cons: rv[3], status: "APPROVED", createdAt: new Date(created.getTime() + 5 * 86400000) },
          update: {},
        });
      }
    }
  }
  // pending review for moderation demo
  // recompute ratings
  for (const p of products) {
    const agg = await prisma.review.aggregate({ where: { productId: p.id, status: "APPROVED" }, _avg: { rating: true }, _count: true });
    await prisma.product.update({ where: { id: p.id }, data: { rating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0, reviewsCount: agg._count } });
  }

  await prisma.banner.createMany({
    data: [
      { title: "Новые iPhone 16 уже в продаже", subtitle: "Выгода до 10 000 ₽ при покупке с trade-in и доставка завтра", link: "/catalog/smartphones?brand=apple", buttonText: "Перейти к покупкам", image: "/products/phone-black-front.svg", position: "HERO", sortOrder: 0 },
      { title: "Игровые ноутбуки со скидкой до 15%", subtitle: "RTX 40-й серии, экраны до 240 Гц и бесплатная доставка", link: "/catalog/laptops", buttonText: "Выбрать ноутбук", image: "/products/laptop-black-front.svg", position: "HERO", sortOrder: 1 },
      { title: "PlayStation 5 Slim", subtitle: "Новая компактная консоль — в наличии с доставкой от 1 дня", link: "/catalog/consoles", buttonText: "Купить", image: "/products/console-white-front.svg", position: "HERO", sortOrder: 2 },
      { title: "Наушники −25%", subtitle: "Шумоподавление и Hi-Res звук", link: "/catalog/headphones", buttonText: "Смотреть", image: "/products/headphones-black-front.svg", position: "PROMO", sortOrder: 0 },
      { title: "Комплектующие для апгрейда", subtitle: "Видеокарты и процессоры по лучшим ценам", link: "/catalog/video-cards", buttonText: "Собрать ПК", image: "/products/gpu-black-front.svg", position: "PROMO", sortOrder: 1 },
    ],
  });
  for (const [i, [s, title, content]] of PAGES.entries()) {
    await prisma.page.create({ data: { slug: s, title, content, sortOrder: i, seoTitle: title, seoDescription: content.slice(0, 150).replace(/[#*\n]/g, " ") } });
  }
  await prisma.promoCode.createMany({
    data: [
      { code: "WELCOME10", type: "PERCENT", value: 10, minOrder: 1000, maxUses: 1000 },
      { code: "TECH500", type: "FIXED", value: 500, minOrder: 5000, maxUses: 500 },
    ],
  });
  await prisma.supportTicket.create({ data: { userId: buyers[1].id, name: buyers[1].name, email: buyers[1].email, subject: "Где мой заказ?", message: "Здравствуйте! Подскажите, когда будет доставлен мой заказ?" } });
  console.log(`Seeded ${products.length} products, ${orderCount} orders`);
}

// Demo accounts ship with well-known passwords. Unless DEMO_ACCOUNTS=1, any demo account that still has
// its default password gets a random one (the admin can set a new password in «Покупатели»).
async function lockDemoAccounts() {
  if (process.env.DEMO_ACCOUNTS === "1") return;
  const { randomBytes } = await import("crypto");
  const defaults = { "buyer12345": null, "seller12345": null };
  const users = await prisma.user.findMany({ where: { OR: [{ email: { endsWith: "@techmarket.ru" } }, { email: { endsWith: "@example.com" } }] }, select: { id: true, email: true, passwordHash: true, role: true } });
  let n = 0;
  for (const u of users) {
    if (u.role === "ADMIN") continue;
    for (const pw of Object.keys(defaults)) {
      if (await bcrypt.compare(pw, u.passwordHash)) {
        await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(randomBytes(24).toString("base64url"), 10), tokenVersion: { increment: 1 } } });
        n++;
        break;
      }
    }
  }
  if (n) console.log(`Locked ${n} demo accounts with default passwords`);
}

async function main() {
  await ensureAdmin();
  const count = await prisma.product.count();
  if (count === 0 && (await prisma.category.count()) === 0) await seedCatalog();
  else console.log("Catalogue already present — skipping demo seed");
  await lockDemoAccounts();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
