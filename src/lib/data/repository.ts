import {
  INITIAL_PROPERTY,
  INITIAL_OUTLETS,
  INITIAL_ROOM_TYPES,
  INITIAL_ROOMS,
  INITIAL_HALL,
  INITIAL_TABLES,
  INITIAL_QR_TOKENS,
  INITIAL_ORDERS,
  INITIAL_RESERVATIONS,
  INITIAL_TABLE_RESERVATIONS,
  INITIAL_INVENTORY,
  INITIAL_CUSTOMERS,
  INITIAL_STAFF,
  INITIAL_HOUSEKEEPING_TASKS,
  INITIAL_USERS,
} from './initial-data';
import type {
  Property,
  Outlet,
  RoomType,
  Room,
  Hall,
  MenuCategory,
  MenuItem,
  Table,
  QRToken,
  Order,
  Reservation,
  EventLead,
  User,
  InventoryItem,
  StockMovement,
  Customer,
  StaffMember,
  HousekeepingTask,
  TableReservation,
  AvailabilityResult,
  GuestAadhaarDetail,
} from '@/lib/types';

// In-memory state for development & centralized single source of truth
let propertyState = { ...INITIAL_PROPERTY };
let outletsState = [...INITIAL_OUTLETS];
let roomTypesState = [...INITIAL_ROOM_TYPES];
let roomsState = [...INITIAL_ROOMS];
let hallState = { ...INITIAL_HALL };
let eventLeadsState: EventLead[] = [];
let menuCategoriesState: MenuCategory[] = [];
let tablesState = [...INITIAL_TABLES];
let qrTokensState = [...INITIAL_QR_TOKENS];
let ordersState = [...INITIAL_ORDERS];
let reservationsState = [...INITIAL_RESERVATIONS];
let tableReservationsState = [...INITIAL_TABLE_RESERVATIONS];
let inventoryState = [...INITIAL_INVENTORY];
let stockMovementsState: StockMovement[] = [];
let customersState = [...INITIAL_CUSTOMERS];
let staffState = [...INITIAL_STAFF];
let housekeepingTasksState = [...INITIAL_HOUSEKEEPING_TASKS];
let usersState = [...INITIAL_USERS];

export const dataRepository = {
  // ── Property ──
  getProperty(): Property {
    return propertyState;
  },
  updateProperty(patch: Partial<Property>): Property {
    propertyState = { ...propertyState, ...patch };
    return propertyState;
  },

  // ── Outlets ──
  getOutlets(): Outlet[] {
    return outletsState;
  },
  getOutletById(id: string): Outlet | undefined {
    return outletsState.find((o) => o.id === id);
  },
  getOutletByType(type: 'restaurant' | 'cafe'): Outlet | undefined {
    return outletsState.find((o) => o.type === type);
  },
  updateOutlet(id: string, patch: Partial<Outlet>): Outlet | undefined {
    let idx = outletsState.findIndex((o) => o.id === id);
    if (idx === -1) {
      if (id.includes('1')) idx = outletsState.findIndex((o) => o.type === 'restaurant');
      else if (id.includes('2')) idx = outletsState.findIndex((o) => o.type === 'cafe');
    }
    if (idx !== -1) {
      outletsState[idx] = { ...outletsState[idx], ...patch };
      return outletsState[idx];
    }
    return undefined;
  },
  addOutlet(outletData: Omit<Outlet, 'id' | 'created_at'> & { id?: string }): Outlet {
    const newOutlet: Outlet = {
      id: outletData.id || `outlet-${Date.now()}`,
      property_id: outletData.property_id || propertyState.id,
      name: outletData.name,
      type: outletData.type || 'restaurant',
      operating_hours: outletData.operating_hours || { all: { open: '08:00', close: '22:00' } },
      dine_in_enabled: outletData.dine_in_enabled ?? true,
      pickup_enabled: outletData.pickup_enabled ?? true,
      delivery_enabled: outletData.delivery_enabled ?? true,
      room_service_enabled: outletData.room_service_enabled ?? false,
      pickup_lead_minutes: outletData.pickup_lead_minutes ?? 20,
      delivery_lead_minutes: outletData.delivery_lead_minutes ?? 40,
      delivery_fee_minor: outletData.delivery_fee_minor ?? 4000,
      min_delivery_order_minor: outletData.min_delivery_order_minor ?? 20000,
      delivery_estimate: outletData.delivery_estimate ?? '30-45 mins',
      is_paused: outletData.is_paused ?? false,
      is_active: outletData.is_active ?? true,
      tax_rate_bps: outletData.tax_rate_bps ?? 500,
      service_charge_bps: outletData.service_charge_bps ?? 250,
      packaging_fee_minor: outletData.packaging_fee_minor ?? 2500,
      packaging_enabled: outletData.packaging_enabled ?? true,
      created_at: new Date().toISOString(),
      image_url: outletData.image_url || '/images/dining/rajasthani-restaurant.png',
    };
    outletsState.push(newOutlet);
    return newOutlet;
  },
  deleteOutlet(id: string): boolean {
    const prev = outletsState.length;
    outletsState = outletsState.filter((o) => o.id !== id);
    return outletsState.length < prev;
  },

  // ── Room Types & Rooms ──
  getRoomTypes(): RoomType[] {
    return roomTypesState.filter((rt) => rt.is_active);
  },
  getRoomTypeById(id: string): RoomType | undefined {
    return roomTypesState.find((rt) => rt.id === id);
  },
  getRooms(): Room[] {
    return roomsState.map((r) => ({
      ...r,
      room_type: roomTypesState.find((rt) => rt.id === r.room_type_id),
    }));
  },
  updateRoomHousekeeping(roomId: string, state: Room['housekeeping_state']): Room | null {
    const idx = roomsState.findIndex((r) => r.id === roomId);
    if (idx === -1) return null;
    roomsState[idx] = { ...roomsState[idx], housekeeping_state: state };
    return roomsState[idx];
  },
  addRoom(room: { room_number: string; room_type_id: string; housekeeping_state: Room['housekeeping_state']; notes?: string | null }): Room {
    const newRoom: Room = {
      id: `room-${Date.now()}`,
      room_number: room.room_number,
      room_type_id: room.room_type_id,
      housekeeping_state: room.housekeeping_state,
      notes: room.notes || null,
    };
    roomsState.push(newRoom);
    return newRoom;
  },
  deleteRoom(roomId: string): boolean {
    const prevLen = roomsState.length;
    roomsState = roomsState.filter((r) => r.id !== roomId);
    return roomsState.length < prevLen;
  },

  // ── Reservations (Room Bookings) ──
  getReservations(): Reservation[] {
    return reservationsState.map((res) => ({
      ...res,
      room_type: roomTypesState.find((rt) => rt.id === res.room_type_id),
      room: roomsState.find((r) => r.id === res.room_id),
    }));
  },
  getReservationById(id: string): Reservation | undefined {
    return this.getReservations().find((r) => r.id === id);
  },
  getReservationByReference(reference: string): Reservation | undefined {
    return this.getReservations().find(
      (r) => r.id === reference || r.reference_code.toUpperCase() === reference.toUpperCase()
    );
  },
  searchAvailability(checkIn: string, checkOut: string, guests: number): AvailabilityResult[] {
    const roomTypes = this.getRoomTypes();
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const nights = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    return roomTypes.map((rt) => {
      const matchingRooms = roomsState.filter(
        (r) => r.room_type_id === rt.id && r.housekeeping_state === 'available'
      );
      return {
        roomType: rt,
        availableCount: matchingRooms.length || 3,
        totalPrice: rt.base_rate_minor * nights,
        nightCount: nights,
      };
    });
  },
  createReservation(data: {
    guestName?: string;
    name?: string;
    phone?: string;
    guestPhone?: string;
    email?: string;
    guestEmail?: string;
    roomTypeId: string;
    roomId?: string;
    checkIn: string;
    checkOut: string;
    partySize: number;
    notes?: string;
    aadhaarDetails?: GuestAadhaarDetail[];
  }): Reservation {
    const refCode = `BK-${Math.floor(8800 + Math.random() * 1000)}`;
    const rt = roomTypesState.find((t) => t.id === data.roomTypeId);
    const assignedRoom = data.roomId
      ? roomsState.find((r) => r.id === data.roomId)
      : roomsState.find((r) => r.room_type_id === data.roomTypeId && r.housekeeping_state === 'available');

    const gName = data.guestName || data.name || 'Palace Guest';
    const gPhone = data.guestPhone || data.phone || '+91 98000 00000';
    const gEmail = data.guestEmail || data.email || `${gName.toLowerCase().replace(/\s+/g, '')}@example.com`;

    const newRes: Reservation = {
      id: `res-${Date.now()}`,
      property_id: propertyState.id,
      guest_id: `guest-${Date.now()}`,
      room_type_id: data.roomTypeId,
      room_id: assignedRoom?.id || (roomsState.length > 0 ? roomsState[0].id : null),
      check_in: data.checkIn,
      check_out: data.checkOut,
      party_size: data.partySize,
      rate_snapshot_minor: rt ? rt.base_rate_minor : 520000,
      terms_snapshot: 'Standard royal booking guarantee',
      status: 'confirmed',
      reference_code: refCode,
      notes: data.notes || null,
      created_at: new Date().toISOString(),
      guest: {
        id: `guest-${Date.now()}`,
        name: gName,
        phone: gPhone,
        email: gEmail,
        created_at: new Date().toISOString(),
      },
      aadhaar_details: data.aadhaarDetails || [],
    };

    if (assignedRoom) {
      this.updateRoomHousekeeping(assignedRoom.id, 'occupied');
    }

    reservationsState.unshift(newRes);
    return newRes;
  },
  updateReservationStatus(id: string, status: Reservation['status'], roomId?: string): Reservation | null {
    const idx = reservationsState.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const rId = roomId || reservationsState[idx].room_id;
    reservationsState[idx] = { ...reservationsState[idx], status, room_id: rId };
    if (status === 'checked_out' && reservationsState[idx].room_id) {
      this.updateRoomHousekeeping(reservationsState[idx].room_id!, 'dirty');
    }
    return reservationsState[idx];
  },

  // ── Table Reservations ──
  getTableReservations(): TableReservation[] {
    return tableReservationsState;
  },
  createTableReservation(data: Omit<TableReservation, 'id' | 'created_at'>): TableReservation {
    const newRes: TableReservation = {
      ...data,
      id: `res-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    tableReservationsState.unshift(newRes);

    // Sync table status to reserved
    const tbl = tablesState.find((t) => t.table_number === data.table_number && (!data.outlet_id || t.outlet_id === data.outlet_id));
    if (tbl) {
      tbl.status = 'reserved';
    }

    return newRes;
  },
  updateTableReservationStatus(id: string, status: TableReservation['status']): TableReservation | null {
    const idx = tableReservationsState.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    tableReservationsState[idx] = { ...tableReservationsState[idx], status };

    // Sync table status accordingly
    const res = tableReservationsState[idx];
    const tbl = tablesState.find((t) => t.table_number === res.table_number && (!res.outlet_id || t.outlet_id === res.outlet_id));
    if (tbl) {
      if (status === 'seated') {
        tbl.status = 'occupied';
      } else if (status === 'completed') {
        tbl.status = 'cleaning';
      } else if (status === 'cancelled') {
        tbl.status = 'available';
      }
    }

    return tableReservationsState[idx];
  },
  deleteTableReservation(id: string): boolean {
    const idx = tableReservationsState.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    const res = tableReservationsState[idx];
    const tbl = tablesState.find((t) => t.table_number === res.table_number && (!res.outlet_id || t.outlet_id === res.outlet_id));
    if (tbl && tbl.status === 'reserved') {
      tbl.status = 'available';
    }
    tableReservationsState.splice(idx, 1);
    return true;
  },

  // ── Hall & Events ──
  getHall(): Hall {
    return hallState;
  },
  getEventLeads(): EventLead[] {
    return eventLeadsState;
  },
  createEventLead(data: {
    contactName: string;
    contactPhone: string;
    contactEmail?: string;
    eventType: string;
    expectedGuests: number;
    seatingLayout?: string;
    setupNeeds?: string;
    notes?: string;
  }): EventLead {
    const reference = `EVT-AUR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newLead: EventLead = {
      id: `evt-${Date.now()}`,
      hall_id: hallState.id,
      hall_slot_id: 'slot-1',
      contact_name: data.contactName,
      contact_phone: data.contactPhone,
      contact_email: data.contactEmail || null,
      event_type: data.eventType,
      expected_guests: data.expectedGuests,
      seating_layout: data.seatingLayout || null,
      setup_needs: data.setupNeeds || null,
      notes: data.notes || null,
      quote_amount_minor: null,
      quote_validity: null,
      deposit_amount_minor: null,
      status: 'new',
      reference_code: reference,
      created_at: new Date().toISOString(),
      hall: hallState,
    };
    eventLeadsState.unshift(newLead);
    return newLead;
  },

  // ── Menus ──
  getMenuCategories(outletId?: string): MenuCategory[] {
    if (!outletId) return menuCategoriesState;
    return menuCategoriesState.filter((c) => c.outlet_id === outletId);
  },
  getMenuItemById(itemId: string) {
    for (const cat of menuCategoriesState) {
      const found = cat.items?.find((i) => i.id === itemId);
      if (found) return found;
    }
    return null;
  },
  toggleItemAvailability(itemId: string): boolean {
    for (const cat of menuCategoriesState) {
      const item = cat.items?.find((i) => i.id === itemId);
      if (item) {
        item.is_available = !item.is_available;
        return item.is_available;
      }
    }
    return false;
  },
  addMenuItem(itemData: Partial<MenuItem> & {
    category_id: string;
    name: string;
    price_minor: number;
  }): MenuItem {
    const newItem: MenuItem = {
      id: `item-${Date.now()}`,
      category_id: itemData.category_id,
      name: itemData.name,
      description: itemData.description || '',
      price_minor: itemData.price_minor,
      dietary_labels: itemData.dietary_labels || ['Vegetarian'],
      image_url: itemData.image_url || '/images/dining_ambiance.jpg',
      is_available: itemData.is_available ?? true,
      sort_order: itemData.sort_order ?? 99,
      discount_percent: itemData.discount_percent ?? 0,
      discount_price_minor: itemData.discount_price_minor ?? itemData.price_minor,
      prep_time_minutes: itemData.prep_time_minutes ?? 15,
      portions: itemData.portions || [],
      extras: itemData.extras || [],
      single_choice_extras: itemData.single_choice_extras ?? false,
      portion_wise_extras: itemData.portion_wise_extras ?? false,
      track_quantity: itemData.track_quantity ?? false,
      stock_quantity: itemData.stock_quantity ?? 0,
    };
    const cat = menuCategoriesState.find((c) => c.id === itemData.category_id);
    if (cat) {
      if (!cat.items) cat.items = [];
      cat.items.push(newItem);
    }
    return newItem;
  },
  updateMenuItem(
    itemId: string,
    updates: Partial<MenuItem>
  ): MenuItem | null {
    for (const cat of menuCategoriesState) {
      const item = cat.items?.find((i) => i.id === itemId);
      if (item) {
        Object.assign(item, updates);
        return item;
      }
    }
    return null;
  },
  deleteMenuItem(itemId: string): boolean {
    for (const cat of menuCategoriesState) {
      if (cat.items) {
        const idx = cat.items.findIndex((i) => i.id === itemId);
        if (idx !== -1) {
          cat.items.splice(idx, 1);
          return true;
        }
      }
    }
    return false;
  },
  addCategory(data: { name: string; outlet_id?: string; image_url?: string }): MenuCategory {
    const newCat: MenuCategory = {
      id: `cat-${Date.now()}`,
      outlet_id: data.outlet_id || INITIAL_OUTLETS[0].id,
      name: data.name,
      sort_order: menuCategoriesState.length + 1,
      is_available: true,
      items: [],
    };
    menuCategoriesState.push(newCat);
    return newCat;
  },
  updateCategory(catId: string, updates: Partial<MenuCategory>): MenuCategory | null {
    const cat = menuCategoriesState.find((c) => c.id === catId);
    if (cat) {
      Object.assign(cat, updates);
      return cat;
    }
    return null;
  },
  deleteCategory(catId: string): boolean {
    const idx = menuCategoriesState.findIndex((c) => c.id === catId);
    if (idx !== -1) {
      menuCategoriesState.splice(idx, 1);
      return true;
    }
    return false;
  },

  // ── QR & Tables ──
  getTables(outletId?: string): Table[] {
    if (!outletId) return tablesState;
    return tablesState.filter((t) => t.outlet_id === outletId);
  },
  addTable(data: Omit<Table, 'id'>): Table {
    const newTable: Table = {
      ...data,
      id: `tab-${Date.now()}`,
      status: data.status || 'available',
      is_active: data.is_active ?? true,
    };
    tablesState.push(newTable);

    // Auto-create a QR token for the new table
    const cleanNum = newTable.table_number.toLowerCase().replace(/[^a-z0-9]/g, '');
    const tokenStr = `table-${cleanNum}`;
    qrTokensState.push({
      id: `qr-${Date.now()}`,
      table_id: newTable.id,
      token: tokenStr,
      is_active: true,
      created_at: new Date().toISOString(),
      table: newTable,
    });
    newTable.code = tokenStr;

    return newTable;
  },
  updateTable(id: string, patch: Partial<Table>): Table | null {
    const idx = tablesState.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    tablesState[idx] = { ...tablesState[idx], ...patch };
    return tablesState[idx];
  },
  updateTableStatus(id: string, status: Table['status']): Table | null {
    const idx = tablesState.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    tablesState[idx].status = status;
    return tablesState[idx];
  },
  deleteTable(id: string): boolean {
    const idx = tablesState.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    tablesState.splice(idx, 1);
    // Also remove associated QR token
    const qrIdx = qrTokensState.findIndex((q) => q.table_id === id);
    if (qrIdx !== -1) {
      qrTokensState.splice(qrIdx, 1);
    }
    return true;
  },
  clearAllTables(): void {
    tablesState = [];
    qrTokensState = [];
  },
  deleteQRToken(id: string): boolean {
    const idx = qrTokensState.findIndex((q) => q.id === id || q.table_id === id);
    if (idx !== -1) {
      const tableId = qrTokensState[idx].table_id;
      qrTokensState.splice(idx, 1);
      if (tableId) {
        this.deleteTable(tableId);
      }
      return true;
    }
    // Also check if id is a table ID
    return this.deleteTable(id);
  },
  getQRTokens(): QRToken[] {
    // Ensure every dining table has a corresponding QR token in state
    tablesState.forEach((t) => {
      const cleanNum = t.table_number.toLowerCase().replace(/[^a-z0-9]/g, '');
      const defaultToken = `table-${cleanNum}`;
      let qr = qrTokensState.find((q) => q.table_id === t.id);
      if (!qr) {
        qr = {
          id: `qr-${t.id}`,
          table_id: t.id,
          token: defaultToken,
          is_active: true,
          created_at: new Date().toISOString(),
          table: t,
        };
        qrTokensState.push(qr);
      } else {
        qr.table = t;
      }
      t.code = qr.token;
    });
    return qrTokensState;
  },
  toggleQRTokenActive(id: string): QRToken | null {
    const qr = qrTokensState.find((q) => q.id === id || q.table_id === id);
    if (!qr) return null;
    qr.is_active = !qr.is_active;
    return qr;
  },
  resolveQRToken(token: string): { table: Table; outlet: Outlet } | null {
    const norm = token.toLowerCase().replace(/[^a-z0-9]/g, '');
    this.getQRTokens();

    // 1. Direct match on token
    let qr = qrTokensState.find(
      (q) => q.token.toLowerCase().replace(/[^a-z0-9]/g, '') === norm && q.is_active
    );
    let table = qr ? tablesState.find((t) => t.id === qr.table_id) : undefined;

    // 2. Flexible fallback: match by table number (e.g. "T-01" -> "table-t01", "t01", "table-t-01")
    if (!table) {
      table = tablesState.find((t) => {
        const tNorm = t.table_number.toLowerCase().replace(/[^a-z0-9]/g, '');
        return norm === tNorm || norm === `table${tNorm}` || norm === `cafe${tNorm}`;
      });
    }

    if (!table) return null;
    const outlet = outletsState.find((o) => o.id === table.outlet_id) || outletsState[0];
    if (!outlet) return null;
    return { table, outlet };
  },

  // ── Orders ──
  getOrders(outletId?: string): Order[] {
    if (!outletId) return ordersState;
    return ordersState.filter((o) => o.outlet_id === outletId);
  },
  getOrderById(id: string): Order | undefined {
    return ordersState.find((o) => o.id === id);
  },
  getOrderByNumber(orderNumber: string): Order | undefined {
    return ordersState.find((o) => o.order_number.toUpperCase() === orderNumber.toUpperCase());
  },
  createOrder(order: Omit<Order, 'id' | 'order_number' | 'created_at'>): Order {
    const orderNumber = `ORD${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: Order = {
      ...order,
      id: `ord-${Date.now()}`,
      order_number: orderNumber,
      created_at: new Date().toISOString(),
    };
    ordersState.unshift(newOrder);
    return newOrder;
  },
  updateOrderStatus(orderId: string, status: Order['status'], reason?: string): Order | null {
    const idx = ordersState.findIndex((o) => o.id === orderId);
    if (idx === -1) return null;
    ordersState[idx] = {
      ...ordersState[idx],
      status,
      cancel_reason: reason || ordersState[idx].cancel_reason,
    };
    return ordersState[idx];
  },

  // ── Inventory & Stock ──
  getInventory(): InventoryItem[] {
    return inventoryState;
  },
  updateInventoryItem(id: string, patch: Partial<InventoryItem>): InventoryItem | null {
    const idx = inventoryState.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    inventoryState[idx] = { ...inventoryState[idx], ...patch, last_updated: new Date().toLocaleString() };
    if (inventoryState[idx].current_stock <= 0) {
      inventoryState[idx].status = 'out_of_stock';
    } else if (inventoryState[idx].current_stock <= inventoryState[idx].min_stock) {
      inventoryState[idx].status = 'low_stock';
    } else {
      inventoryState[idx].status = 'in_stock';
    }
    return inventoryState[idx];
  },
  recordStockMovement(data: Omit<StockMovement, 'id' | 'created_at'>): StockMovement {
    const movement: StockMovement = {
      ...data,
      id: `mov-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    stockMovementsState.unshift(movement);

    // Apply movement quantity
    const item = inventoryState.find((i) => i.id === data.item_id);
    if (item) {
      if (data.type === 'stock_in') {
        item.current_stock += data.quantity;
      } else {
        item.current_stock = Math.max(0, item.current_stock - data.quantity);
      }
      this.updateInventoryItem(item.id, { current_stock: item.current_stock });
    }

    return movement;
  },
  getStockMovements(): StockMovement[] {
    return stockMovementsState;
  },

  // ── Customers ──
  getCustomers(): Customer[] {
    return customersState;
  },
  addCustomer(customer: Omit<Customer, 'id' | 'created_at'>): Customer {
    const newCust: Customer = {
      ...customer,
      id: `cust-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    customersState.unshift(newCust);
    return newCust;
  },

  // ── Staff ──
  getStaff(): StaffMember[] {
    return staffState;
  },
  updateStaff(id: string, patch: Partial<StaffMember>): StaffMember | null {
    const idx = staffState.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    staffState[idx] = { ...staffState[idx], ...patch };
    return staffState[idx];
  },
  addStaff(member: Omit<StaffMember, 'id' | 'created_at'>): StaffMember {
    const newMember: StaffMember = {
      ...member,
      id: `stf-${Date.now().toString().slice(-6)}`,
      created_at: new Date().toISOString(),
    };
    staffState.push(newMember);
    return newMember;
  },
  deleteStaff(id: string): boolean {
    const prev = staffState.length;
    staffState = staffState.filter((s) => s.id !== id);
    return staffState.length < prev;
  },
  clearAllStaff(): void {
    staffState = [];
  },

  // ── Housekeeping ──
  getHousekeepingTasks(): HousekeepingTask[] {
    return housekeepingTasksState;
  },
  createHousekeepingTask(task: Omit<HousekeepingTask, 'id'>): HousekeepingTask {
    const newTask: HousekeepingTask = {
      ...task,
      id: `hk-${Date.now()}`,
    };
    housekeepingTasksState.unshift(newTask);
    return newTask;
  },
  updateHousekeepingTask(id: string, status: HousekeepingTask['status']): HousekeepingTask | null {
    const idx = housekeepingTasksState.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    housekeepingTasksState[idx] = {
      ...housekeepingTasksState[idx],
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : undefined,
    };
    // If checkout cleaning completed, set room state to available
    if (status === 'completed' && housekeepingTasksState[idx].task_type === 'checkout_cleaning') {
      this.updateRoomHousekeeping(housekeepingTasksState[idx].room_id, 'available');
    }
    return housekeepingTasksState[idx];
  },

  // ── Reset to Seed Demo Data ──
  resetDemoData(): void {
    propertyState = { ...INITIAL_PROPERTY };
    outletsState = [...INITIAL_OUTLETS];
    roomTypesState = [...INITIAL_ROOM_TYPES];
    roomsState = [...INITIAL_ROOMS];
    hallState = { ...INITIAL_HALL };
    ordersState = [...INITIAL_ORDERS];
    reservationsState = [...INITIAL_RESERVATIONS];
    tableReservationsState = [...INITIAL_TABLE_RESERVATIONS];
    inventoryState = [...INITIAL_INVENTORY];
    stockMovementsState = [];
    customersState = [...INITIAL_CUSTOMERS];
    staffState = [...INITIAL_STAFF];
    housekeepingTasksState = [...INITIAL_HOUSEKEEPING_TASKS];
    usersState = [...INITIAL_USERS];
  },
};
