/**
 * Application-level TypeScript types used across components.
 */

import type {
  ReservationStatus,
  HousekeepingState,
  HallEnquiryStatus,
  OrderStatus,
  FulfilmentMode,
  OrderChannel,
  OutletType,
  TenderType,
  PaymentStatus,
  UserRole,
} from '@/lib/utils/constants';

export type {
  ReservationStatus,
  HousekeepingState,
  HallEnquiryStatus,
  OrderStatus,
  FulfilmentMode,
  OrderChannel,
  OutletType,
  TenderType,
  PaymentStatus,
  UserRole,
};

// ── Property ──
export interface Property {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  currency_code: string;
  timezone: string;
  operating_hours: Record<string, { open: string; close: string }>;
  booking_policy: string;
  cancellation_terms: string;
  deposit_percent: number;
  is_active: boolean;
  created_at: string;
}

// ── Outlet ──
export interface Outlet {
  id: string;
  property_id: string;
  name: string;
  type: OutletType;
  operating_hours: Record<string, { open: string; close: string }>;
  dine_in_enabled: boolean;
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  room_service_enabled?: boolean;
  image_url?: string;
  operating_days?: Record<string, boolean>;
  pickup_lead_minutes: number;
  delivery_lead_minutes: number;
  delivery_fee_minor: number;
  min_delivery_order_minor: number;
  delivery_estimate: string;
  is_paused: boolean;
  is_active?: boolean;
  tax_rate_bps: number;
  service_charge_bps: number;
  packaging_fee_minor?: number;
  packaging_enabled?: boolean;
  created_at: string;
}

export interface BillingSettings {
  gstin: string;
  business_name: string;
  restaurant_gst_percent: number;
  rooms_gst_percent: number;
  service_charge_percent: number;
  service_charge_enabled: boolean;
  round_off_cash: boolean;
  delivery_charges: number;
  delivery_free_above: number;
  delivery_enabled: boolean;
  delivery_estimate_mins: number;
  packaging_charges_pickup: number;
  packaging_charges_delivery: number;
  packaging_charges_enabled: boolean;
  packaging_note: string;
  invoice_prefix: string;
  next_invoice_number: number;
  invoice_footer_note: string;
}

// ── Room Type ──
export interface RoomType {
  id: string;
  property_id: string;
  name: string;
  description: string;
  capacity: number;
  total_rooms: number;
  base_rate_minor: number;
  amenities: string[];
  photos: string[];
  is_active: boolean;
  created_at: string;
}

// ── Room ──
export interface Room {
  id: string;
  room_type_id: string;
  room_number: string;
  housekeeping_state: HousekeepingState;
  notes: string | null;
  room_type?: RoomType;
}

// ── Guest ──
export interface Guest {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  created_at: string;
}

export interface GuestAadhaarDetail {
  guest_index: number;
  full_name: string;
  aadhaar_number: string;
  aadhaar_image_url?: string;
  is_verified?: boolean;
}

// ── Reservation ──
export interface Reservation {
  id: string;
  property_id: string;
  guest_id: string;
  room_type_id: string;
  room_id: string | null;
  check_in: string;
  check_out: string;
  party_size: number;
  rate_snapshot_minor: number;
  terms_snapshot: string;
  status: ReservationStatus;
  reference_code: string;
  notes: string | null;
  created_at: string;
  guest?: Guest;
  room_type?: RoomType;
  room?: Room;
  aadhaar_details?: GuestAadhaarDetail[];
}

// ── Hall ──
export interface Hall {
  id: string;
  property_id: string;
  name: string;
  capacity: number;
  description: string;
  photos: string[];
  packages: HallPackage[];
}

export interface HallPackage {
  name: string;
  description: string;
  price_guidance_minor: number;
}

// ── Hall Slot ──
export interface HallSlot {
  id: string;
  hall_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

// ── Event Lead ──
export interface EventLead {
  id: string;
  hall_id: string;
  hall_slot_id: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  event_type: string;
  expected_guests: number;
  seating_layout?: string | null;
  setup_needs: string | null;
  notes: string | null;
  quote_amount_minor: number | null;
  quote_validity: string | null;
  deposit_amount_minor: number | null;
  status: HallEnquiryStatus;
  reference_code: string;
  created_at: string;
  hall?: Hall;
}

// ── Menu Category ──
export interface MenuCategory {
  id: string;
  outlet_id: string;
  name: string;
  sort_order: number;
  is_available: boolean;
  items?: MenuItem[];
}

// ── Menu Item ──
export interface MenuItem {
  id: string;
  category_id: string;
  outlet_id?: string;
  name: string;
  description: string | null;
  price_minor: number;
  image_url: string | null;
  is_available: boolean;
  dietary_labels: string[];
  sort_order: number;
  modifiers?: Modifier[];
  discount_percent?: number;
  discount_price_minor?: number;
  prep_time_minutes?: number;
  portions?: Array<{ name: string; price_minor: number }>;
  extras?: Array<{ name: string; price_minor: number }>;
  single_choice_extras?: boolean;
  portion_wise_extras?: boolean;
  track_quantity?: boolean;
  stock_quantity?: number;
}

// ── Modifier ──
export interface Modifier {
  id: string;
  menu_item_id: string;
  name: string;
  price_minor: number;
  is_available: boolean;
}

// ── Table ──
export interface Table {
  id: string;
  outlet_id: string;
  table_number: string;
  capacity: number;
  is_active: boolean;
  status?: 'available' | 'occupied' | 'reserved' | 'cleaning';
  location?: string;
  code?: string;
}

// ── QR Token ──
export interface QRToken {
  id: string;
  table_id: string;
  token: string;
  is_active: boolean;
  created_at: string;
  table?: Table;
}

// ── Order ──
export interface Order {
  id: string;
  outlet_id: string;
  table_id: string | null;
  order_number: string;
  channel: OrderChannel;
  fulfilment_mode: FulfilmentMode;
  order_type?: 'dine_in' | 'room_service' | 'delivery' | 'pickup';
  table_number?: string | null;
  room_number?: string | null;
  pickup_name: string | null;
  pickup_phone: string | null;
  delivery_name: string | null;
  delivery_phone: string | null;
  delivery_address: string | null;
  delivery_notes: string | null;
  delivery_fee_minor: number;
  packaging_fee_minor?: number;
  subtotal_minor: number;
  tax_minor: number;
  service_charge_minor: number;
  discount_minor: number;
  total_minor: number;
  total_amount_minor?: number;
  status: OrderStatus;
  payment_status?: string;
  payment_mode?: 'upi' | 'cash' | 'card' | string;
  payment_method?: string;
  cancel_reason: string | null;
  created_by: string | null;
  assigned_delivery_staff: string | null;
  created_at: string;
  items?: any[];
  order_lines?: OrderLine[];
  outlet?: Outlet;
  table?: Table;
  payments?: Payment[];
  bill?: Bill;
}

// ── Order Line ──
export interface OrderLine {
  id: string;
  order_id: string;
  menu_item_id: string;
  item_name_snapshot: string;
  unit_price_snapshot_minor: number;
  quantity: number;
  notes: string | null;
  modifiers_snapshot: ModifierSnapshot[] | null;
  line_total_minor: number;
}

export interface ModifierSnapshot {
  name: string;
  price_minor: number;
}

// ── Payment ──
export interface Payment {
  id: string;
  order_id: string;
  tender_type: TenderType;
  payment_status: PaymentStatus;
  amount_minor: number;
  gateway_reference: string | null;
  recorded_by: string;
  created_at: string;
}

// ── Bill ──
export interface Bill {
  id: string;
  order_id: string;
  bill_number: string;
  outlet_id: string;
  business_name: string;
  subtotal_minor: number;
  tax_minor: number;
  service_charge_minor: number;
  discount_minor: number;
  total_minor: number;
  payment_method: string;
  is_void: boolean;
  created_at: string;
  adjustments?: Adjustment[];
}

// ── Adjustment ──
export interface Adjustment {
  id: string;
  bill_id: string;
  type: 'void' | 'refund' | 'discount';
  amount_minor: number;
  reason: string;
  actor_id: string;
  created_at: string;
}

// ── User ──
export interface User {
  id: string;
  auth_id: string;
  name: string;
  email: string;
  phone: string | null;
  property_id: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

// ── Audit Event ──
export interface AuditEvent {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
  actor?: User;
}

// ── Delivery Area ──
export interface DeliveryArea {
  id: string;
  outlet_id: string;
  area_name: string;
  area_polygon: string;
  is_active: boolean;
}

// ── Cart (client-side) ──
export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
  selectedModifiers: Modifier[];
  lineTotal: number;
}

// ── Availability Result ──
export interface AvailabilityResult {
  roomType: RoomType;
  availableCount: number;
  totalPrice: number; // minor units for the full stay
  nightCount: number;
}

// ── Inventory Item ──
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  cost_per_unit_minor: number;
  supplier: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  last_updated: string;
}

// ── Stock Movement ──
export interface StockMovement {
  id: string;
  item_id: string;
  item_name: string;
  type: 'stock_in' | 'stock_out' | 'wastage' | 'adjustment';
  quantity: number;
  reason: string;
  actor_name?: string;
  recorded_by?: string;
  created_at: string;
}

// ── Customer Directory ──
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  guest_type: string;
  total_stays?: number;
  stays_count?: number;
  total_spend_minor: number;
  last_visit: string;
  city?: string;
  created_at: string;
}

// ── Staff Member ──
export interface StaffMember {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'chef' | 'waiter' | 'housekeeper' | 'accountant' | 'kitchen' | 'housekeeping' | 'receptionist' | string;
  email: string;
  phone: string;
  department?: string;
  outlet_id?: string;
  outlet_name?: string;
  shift?: string;
  status?: 'active' | 'on_leave';
  is_active?: boolean;
  created_at: string;
  password?: string;
}

// ── Housekeeping Task ──
export interface HousekeepingTask {
  id: string;
  room_id: string;
  room_number: string;
  task_type: 'checkout_cleaning' | 'stayover_cleaning' | 'inspection' | 'linen_replacement' | 'maintenance' | 'room_inspection';
  priority: 'urgent' | 'high' | 'normal' | 'low' | 'medium';
  assigned_to: string;
  scheduled_time: string;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string | null;
  completed_at?: string;
}

// ── Table Reservation ──
export interface TableReservation {
  id: string;
  guest_name: string;
  phone: string;
  email?: string;
  outlet_id: string;
  outlet_name: string;
  table_id?: string;
  table_number: string;
  reservation_time: string;
  party_size: number;
  status: 'confirmed' | 'seated' | 'completed' | 'cancelled';
  special_requests?: string;
  notes?: string;
  created_at: string;
}

