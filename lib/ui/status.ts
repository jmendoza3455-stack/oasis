import type { BookingStatus } from "@/lib/domain";

// Colores por estado (calendario y leyenda). Contraste AA con texto blanco u oscuro.
export const STATUS_COLOR: Record<BookingStatus | "blocked", { bg: string; fg: string }> = {
  prebooked: { bg: "#E0B354", fg: "#2A2418" },
  reserved: { bg: "#5B8DB8", fg: "#FFFFFF" },
  confirmed: { bg: "#374031", fg: "#F7F5F0" },
  done: { bg: "#716D48", fg: "#FFFFFF" },
  settled: { bg: "#768689", fg: "#1F2A2E" },
  cancelled: { bg: "#C2683F", fg: "#FFFFFF" },
  expired: { bg: "#B9B2A5", fg: "#2A2418" },
  blocked: { bg: "#444646", fg: "#F7F5F0" },
};

export const CHANNEL_LABEL = {
  planner: "Planner",
  direct: "Directo",
  referral: "Referido",
  organic: "Orgánico",
} as const;

export const EVENT_TYPE_LABEL = {
  wedding: "Boda",
  social: "Social",
  corporate: "Corporativo",
  family_day: "Full day familiar",
} as const;
