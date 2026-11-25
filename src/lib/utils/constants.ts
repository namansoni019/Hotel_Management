/* ───────────────────────────────────────────────
 * Status enums and constants for the platform
 * ─────────────────────────────────────────────── */

// ── Reservation Statuses ──
export const RESERVATION_STATUSES = {
  REQUESTED: 'requested',
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked_in',
  CHECKED_OUT: 'checked_out',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[keyof typeof RESERVATION_STATUSES];

// Valid transitions for reservation statuses
export const RESERVATION_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  requested: ['confirmed', 'cancelled'],
  pending: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['checked_out'],
  checked_out: [],
  cancelled: [],
  no_show: [],
};

// ── Housekeeping States ──
export const HOUSEKEEPING_STATES = {
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
  OCCUPIED: 'occupied',
  DIRTY: 'dirty',
  CLEANING: 'cleaning',
  MAINTENANCE: 'maintenance',
} as const;

export type HousekeepingState = (typeof HOUSEKEEPING_STATES)[keyof typeof HOUSEKEEPING_STATES];

// ── Hall Enquiry Statuses ──
export const HALL_ENQUIRY_STATUSES = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUOTED: 'quoted',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
} as const;

export type HallEnquiryStatus = (typeof HALL_ENQUIRY_STATUSES)[keyof typeof HALL_ENQUIRY_STATUSES];

// ── Hall Slot Statuses ──
export const HALL_SLOT_STATUSES = {
  AVAILABLE: 'available',
  BLOCKED: 'blocked',
  ENQUIRED: 'enquired',
  CONFIRMED: 'confirmed',
} as const;

export type HallSlotStatus = (typeof HALL_SLOT_STATUSES)[keyof typeof HALL_SLOT_STATUSES];

// ── Order Statuses ──
export const ORDER_STATUSES = {
  NEW: 'new',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  READY: 'ready',
  SERVED: 'served',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  COLLECTED: 'collected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];

// ── Fulfilment Modes ──
export const FULFILMENT_MODES = {
  DINE_IN: 'dine_in',
  PICKUP: 'pickup',
  DELIVERY: 'delivery',
} as const;

export type FulfilmentMode = (typeof FULFILMENT_MODES)[keyof typeof FULFILMENT_MODES];

// ── Order Channels ──
export const ORDER_CHANNELS = {
  QR: 'qr',
  POS: 'pos',
  WEB: 'web',
  QR_DINE_IN: 'qr_dine_in',
  ROOM_SERVICE: 'room_service',
} as const;

export type OrderChannel = (typeof ORDER_CHANNELS)[keyof typeof ORDER_CHANNELS];

// ── Outlet Types ──
export const OUTLET_TYPES = {
  RESTAURANT: 'restaurant',
  CAFE: 'cafe',
} as const;

export type OutletType = (typeof OUTLET_TYPES)[keyof typeof OUTLET_TYPES];

// ── Payment Tender Types ──
export const TENDER_TYPES = {
  CASH: 'cash',
  UPI: 'upi',
  CARD: 'card',
  GATEWAY: 'gateway',
} as const;

export type TenderType = (typeof TENDER_TYPES)[keyof typeof TENDER_TYPES];

// ── Payment Statuses ──
export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES];

// ── Adjustment Types ──
export const ADJUSTMENT_TYPES = {
  VOID: 'void',
  REFUND: 'refund',
  DISCOUNT: 'discount',
} as const;

export type AdjustmentType = (typeof ADJUSTMENT_TYPES)[keyof typeof ADJUSTMENT_TYPES];

// ── User Roles ──
export const USER_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  FRONT_DESK: 'front_desk',
  CASHIER: 'cashier',
  KITCHEN: 'kitchen',
  HOUSEKEEPING: 'housekeeping',
  DELIVERY: 'delivery',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// ── Role Display Names ──
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  owner: 'Palace Owner / Director',
  admin: 'Owner / Admin',
  manager: 'Manager / Front Desk',
  front_desk: 'Front Desk',
  cashier: 'Cashier / POS',
  kitchen: 'Kitchen / Service',
  housekeeping: 'Housekeeping',
  delivery: 'Delivery Staff',
};

// ── Status Badge Colors ──
export const STATUS_COLORS: Record<string, string> = {
  // Reservation
  requested: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  checked_in: 'bg-green-100 text-green-800',
  checked_out: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-orange-100 text-orange-800',
  // Order
  new: 'bg-purple-100 text-purple-800',
  accepted: 'bg-blue-100 text-blue-800',
  preparing: 'bg-amber-100 text-amber-800',
  ready: 'bg-emerald-100 text-emerald-800',
  served: 'bg-gray-100 text-gray-800',
  out_for_delivery: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  collected: 'bg-teal-100 text-teal-800',
  // Housekeeping
  available: 'bg-green-100 text-green-800',
  occupied: 'bg-blue-100 text-blue-800',
  dirty: 'bg-red-100 text-red-800',
  cleaning: 'bg-yellow-100 text-yellow-800',
  maintenance: 'bg-orange-100 text-orange-800',
  // Hall
  contacted: 'bg-cyan-100 text-cyan-800',
  quoted: 'bg-violet-100 text-violet-800',
  declined: 'bg-red-100 text-red-800',
  // Payment
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-orange-100 text-orange-800',
  // Generic
  blocked: 'bg-gray-100 text-gray-800',
  enquired: 'bg-purple-100 text-purple-800',
};

// ── Fulfilment Mode Display Names ──
export const FULFILMENT_MODE_NAMES: Record<FulfilmentMode, string> = {
  dine_in: 'Dine-in',
  pickup: 'Pickup',
  delivery: 'Delivery',
};
