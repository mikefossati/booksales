import type { ExpenseCategory, ExpenseLevel, ChannelType } from "@/generated/prisma/client";

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  PRINT:                  "Impresión",
  DESIGN_ART:             "Diseño y arte",
  EDITING:                "Edición",
  MERCHANDISE_PRODUCTION: "Prod. merch",
  SOCIAL_ADS:             "Publicidad",
  EVENTS:                 "Ferias y eventos",
  MARKETING_OTHER:        "Marketing",
  SHIPPING:               "Envíos",
  PLATFORMS_SOFTWARE:     "Plataformas",
  OTHER:                  "Otros",
};

export const LEVEL_LABELS: Record<ExpenseLevel, string> = {
  GENERAL:   "General",
  BOOK:      "Libro",
  PRINT_RUN: "Tirada",
};

export const CHANNEL_TYPE_LABEL: Record<ChannelType, string> = {
  DIGITAL:   "Digital",
  BOOKSTORE: "Librería",
  DIRECT:    "Directo",
  PRESALE:   "Preventa",
};
