import { z } from "zod";
import { PAYMENT_KEYS } from "./payment-methods";

export const emailSchema = z.string().trim().toLowerCase().email("Введите корректный email").max(160);
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[^\d+]/g, ""))
  .refine((v) => /^\+?\d{10,15}$/.test(v), "Введите корректный номер телефона");
export const nameSchema = z.string().trim().min(2, "Имя слишком короткое").max(80, "Имя слишком длинное");
export const passwordSchema = z
  .string()
  .min(8, "Пароль должен быть не короче 8 символов")
  .max(128)
  .refine((v) => /[A-Za-zА-Яа-я]/.test(v) && /\d/.test(v), "Пароль должен содержать буквы и цифры");

export const registerSchema = z
  .object({
    name: nameSchema.refine((v) => /^[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё\s'.-]{1,79}$/.test(v), "Имя может содержать только буквы, пробел и дефис"),
    email: emailSchema,
    phone: z.string().optional().default(""),
    password: passwordSchema,
    passwordConfirm: z.string().max(128),
    agree: z.literal(true, "Необходимо согласие на обработку персональных данных"),
    marketing: z.boolean().optional().default(false),
    accountType: z.enum(["buyer", "seller"]).optional().default("buyer"),
    website: z.string().max(200).optional().default(""), // honeypot: humans never fill it
    smsCode: z.string().trim().max(6).optional().default(""),
  })
  .refine((d) => d.password === d.passwordConfirm, { message: "Пароли не совпадают", path: ["passwordConfirm"] });

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Введите пароль").max(128) });

const strList = z.array(z.string().trim().max(500)).max(50).default([]);

export const productSchema = z.object({
  title: z.string().trim().min(3, "Название слишком короткое").max(200),
  slug: z.string().trim().max(120).optional().default(""),
  sku: z.string().trim().max(60).optional().default(""),
  model: z.string().trim().max(120).optional().nullable(),
  brandId: z.string().optional().nullable(),
  categoryId: z.string().min(1, "Выберите категорию"),
  sellerId: z.string().optional().nullable(),
  price: z.coerce.number().int("Цена — целое число").min(1, "Укажите цену").max(100_000_000),
  oldPrice: z.coerce.number().int().min(0).max(100_000_000).optional().nullable(),
  stock: z.coerce.number().int().min(0).max(1_000_000).default(0),
  status: z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]).default("DRAFT"),
  shortDescription: z.string().trim().max(600).optional().nullable(),
  description: z.string().trim().max(20000).optional().nullable(),
  advantages: strList,
  features: strList,
  equipment: strList,
  manufacturerInfo: z.string().trim().max(3000).optional().nullable(),
  specs: z.record(z.string().max(100), z.string().max(300)).default({}),
  color: z.string().trim().max(60).optional().nullable(),
  memory: z.string().trim().max(60).optional().nullable(),
  diagonal: z.string().trim().max(60).optional().nullable(),
  processor: z.string().trim().max(120).optional().nullable(),
  isNew: z.boolean().default(false),
  isHit: z.boolean().default(false),
  featured: z.boolean().default(false),
  seoTitle: z.string().trim().max(200).optional().nullable(),
  seoDescription: z.string().trim().max(400).optional().nullable(),
  keywords: z.string().trim().max(500).optional().nullable(),
  aiGenerated: z.boolean().optional(),
  images: z
    .array(z.object({ url: z.string().min(1).max(1000), alt: z.string().max(200).optional().nullable() }))
    .max(40)
    .default([]),
});

export type ProductInput = z.infer<typeof productSchema>;

export const checkoutSchema = z.object({
  items: z.array(z.object({ productId: z.string(), qty: z.coerce.number().int().min(1).max(999) })).min(1, "Корзина пуста").max(100),
  recipientName: nameSchema,
  phone: phoneSchema,
  email: emailSchema,
  deliveryMethod: z.enum(["courier", "pickup", "post"]),
  city: z.string().trim().max(120).optional().default(""),
  address: z.string().trim().max(400).optional().default(""),
  paymentMethod: z.enum(PAYMENT_KEYS as [string, ...string[]], "Выберите способ оплаты"),
  companyName: z.string().trim().max(200).optional().default(""),
  companyInn: z.string().trim().regex(/^(\d{10}|\d{12})?$/, "ИНН — 10 или 12 цифр").optional().default(""),
  comment: z.string().trim().max(1000).optional().default(""),
  promoCode: z.string().trim().max(40).optional().default(""),
});

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Поставьте оценку").max(5),
  text: z.string().trim().min(10, "Отзыв должен содержать минимум 10 символов").max(5000),
  pros: z.string().trim().max(1000).optional().default(""),
  cons: z.string().trim().max(1000).optional().default(""),
  photos: z.array(z.string().max(1000)).max(8).default([]),
});
