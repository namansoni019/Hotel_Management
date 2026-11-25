import { NextResponse } from 'next/server';
import { dataRepository } from '@/lib/data/repository';
import { ordersService } from '@/lib/services/orders-service';
import { reservationsService } from '@/lib/services/reservations-service';

export const dynamic = 'force-dynamic';

function normalizePhone(phone?: string | null): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '').slice(-10); // Take last 10 digits
}

export async function GET() {
  try {
    const outlets = dataRepository.getOutlets();

    // 1. Fetch real orders from Firestore & repository
    let orders: any[] = [];
    try {
      orders = await ordersService.getOrders();
    } catch {
      orders = dataRepository.getOrders();
    }

    // 2. Fetch real hotel reservations exclusively from Firestore
    let reservations: Awaited<ReturnType<typeof reservationsService.getReservations>> = [];
    try {
      reservations = await reservationsService.getReservations();
    } catch (err) {
      console.warn('Firestore reservations read warning:', err);
      reservations = [];
    }

    // 3. Fetch real table reservations
    const tableReservations = dataRepository.getTableReservations();

    // 4. Fetch registered customers
    const manualCustomers = dataRepository.getCustomers();

    // ── Build Unified Customer Map ──
    const customerMap = new Map<string, any>();

    // Helper to get or create unified patron
    const getOrCreatePatron = (key: string, initialData: any) => {
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          id: initialData.id || `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: initialData.name || 'Valued Patron',
          phone: initialData.phone || '',
          email: initialData.email || '',
          city: initialData.city || 'Jaipur',
          guest_type: initialData.guest_type || 'Patron',
          venue_type: initialData.venue_type || 'hotel',
          total_spend_minor: 0,
          hotel_spend_minor: 0,
          dining_spend_minor: 0,
          stays_count: 0,
          orders_count: 0,
          table_reservations_count: 0,
          last_visit: initialData.last_visit || 'Recent',
          last_visit_timestamp: initialData.last_visit_timestamp || 0,
          created_at: initialData.created_at || new Date().toISOString(),
          dining_orders: [],
          hotel_stays: [],
          table_bookings: [],
          notes: initialData.notes || '',
        });
      }
      return customerMap.get(key)!;
    };

    // ── Process 1: Registered Customers ──
    for (const cust of manualCustomers) {
      const normPhone = normalizePhone(cust.phone);
      const key = normPhone || cust.email?.toLowerCase() || cust.id;
      const patron = getOrCreatePatron(key, {
        id: cust.id,
        name: cust.name,
        phone: cust.phone,
        email: cust.email,
        city: cust.city || 'Jaipur',
        guest_type: cust.guest_type || 'Royal VIP',
        venue_type: 'hotel',
        last_visit: cust.last_visit,
        created_at: cust.created_at,
      });

      patron.name = cust.name || patron.name;
      patron.phone = cust.phone || patron.phone;
      patron.email = cust.email || patron.email;
      patron.city = cust.city || patron.city;
      patron.guest_type = cust.guest_type || patron.guest_type;
      patron.stays_count = Math.max(patron.stays_count, cust.stays_count || cust.total_stays || 1);
      patron.hotel_spend_minor += cust.total_spend_minor || 0;
      patron.total_spend_minor += cust.total_spend_minor || 0;
    }

    // ── Process 2: Hotel Room Reservations ──
    for (const res of reservations) {
      const guestObj = res.guest;
      const guestName = guestObj?.name || 'Hotel Guest';
      const guestPhone = guestObj?.phone || '';
      const guestEmail = guestObj?.email || '';
      const normPhone = normalizePhone(guestPhone);
      const key = normPhone || guestEmail?.toLowerCase() || res.guest_id || `res-guest-${res.id}`;

      const patron = getOrCreatePatron(key, {
        id: guestObj?.id || `cust-res-${res.id.slice(0, 8)}`,
        name: guestName,
        phone: guestPhone,
        email: guestEmail,
        city: 'Jaipur',
        guest_type: 'Royal VIP',
        venue_type: 'hotel',
        created_at: res.created_at,
      });

      patron.name = guestName !== 'Hotel Guest' ? guestName : patron.name;
      if (guestPhone && !patron.phone) patron.phone = guestPhone;
      if (guestEmail && !patron.email) patron.email = guestEmail;

      const staySpend = Number(res.deposit_amount_minor || res.rate_snapshot_minor || 0);
      patron.hotel_spend_minor += staySpend;
      patron.total_spend_minor += staySpend;
      patron.stays_count += 1;

      const stayDate = res.check_in || res.created_at;
      const stayTs = new Date(stayDate).getTime();
      if (stayTs > patron.last_visit_timestamp) {
        patron.last_visit_timestamp = stayTs;
        patron.last_visit = new Date(stayDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }

      patron.hotel_stays.push({
        id: res.id,
        reference_code: res.reference_code || `RES-${res.id.slice(0, 6)}`,
        room_type_name: res.room_type_name || res.room_type?.name || 'Heritage Suite',
        check_in: res.check_in,
        check_out: res.check_out,
        party_size: res.party_size || 2,
        status: res.status,
        total_minor: staySpend,
      });
    }

    // ── Process 3: Restaurant & Café Dining Orders ──
    for (const order of orders) {
      const customerName = order.pickup_name || order.delivery_name || 'Restaurant Patron';
      const customerPhone = order.pickup_phone || order.delivery_phone || '';
      const normPhone = normalizePhone(customerPhone);
      const key = normPhone || `order-cust-${order.id}`;

      // Identify outlet type
      const outlet = outlets.find((o) => o.id === order.outlet_id);
      const isCafe =
        outlet?.type === 'cafe' ||
        order.outlet_id?.includes('2') ||
        order.outlet_id?.includes('cafe') ||
        outlet?.name?.toLowerCase().includes('café') ||
        outlet?.name?.toLowerCase().includes('cafe');

      const outletName = isCafe
        ? 'Jharokha Café & Lounge'
        : 'Royal Khansama Restaurant';

      const initialType = isCafe ? 'Café Patron' : 'Restaurant Diner';
      const initialVenue = isCafe ? 'cafe' : 'restaurant';

      const patron = getOrCreatePatron(key, {
        id: `cust-ord-${order.id.slice(0, 8)}`,
        name: customerName,
        phone: customerPhone,
        email: `${customerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@dining.rajmahal.com`,
        city: order.delivery_address ? 'Jaipur (Delivery)' : 'Palace Dine-in',
        guest_type: initialType,
        venue_type: initialVenue,
        created_at: order.created_at,
      });

      if (customerName !== 'Restaurant Patron' && (!patron.name || patron.name === 'Valued Patron')) {
        patron.name = customerName;
      }
      if (customerPhone && !patron.phone) patron.phone = customerPhone;

      const orderSpend = Number(order.total_minor || 0);
      patron.dining_spend_minor += orderSpend;
      patron.total_spend_minor += orderSpend;
      patron.orders_count += 1;

      const orderTs = new Date(order.created_at).getTime();
      if (orderTs > patron.last_visit_timestamp) {
        patron.last_visit_timestamp = orderTs;
        patron.last_visit = new Date(order.created_at).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }

      // Format items summary
      const itemsList = (order.order_lines || [])
        .map((l: any) => `${l.quantity || 1}x ${l.item_name_snapshot || 'Dish'}`)
        .join(', ');

      patron.dining_orders.push({
        id: order.id,
        order_number: order.order_number || `ORD-${order.id.slice(0, 6)}`,
        outlet_name: outletName,
        channel: order.channel || 'dine_in',
        fulfilment_mode: order.fulfilment_mode || 'dine_in',
        total_minor: orderSpend,
        status: order.status,
        created_at: order.created_at,
        items_summary: itemsList || 'Royal Delicacies',
      });
    }

    // ── Process 4: Table Reservations ──
    for (const tr of tableReservations) {
      const normPhone = normalizePhone(tr.phone);
      const key = normPhone || tr.email?.toLowerCase() || `tbl-cust-${tr.id}`;

      const outlet = outlets.find((o) => o.id === tr.outlet_id);
      const isCafe =
        outlet?.type === 'cafe' ||
        outlet?.name?.toLowerCase().includes('caf') ||
        tr.outlet_name?.toLowerCase().includes('caf');
      const outletName = tr.outlet_name || (isCafe ? 'Jharokha Café & Lounge' : 'Royal Khansama Restaurant');

      const patron = getOrCreatePatron(key, {
        id: `cust-tbl-${tr.id.slice(0, 8)}`,
        name: tr.guest_name,
        phone: tr.phone,
        email: tr.email || '',
        city: 'Jaipur',
        guest_type: isCafe ? 'Café Patron' : 'Restaurant Diner',
        venue_type: isCafe ? 'cafe' : 'restaurant',
        created_at: tr.created_at,
      });

      if (tr.guest_name && (!patron.name || patron.name === 'Valued Patron')) {
        patron.name = tr.guest_name;
      }
      if (tr.phone && !patron.phone) patron.phone = tr.phone;
      if (tr.email && !patron.email) patron.email = tr.email;

      patron.table_reservations_count += 1;

      patron.table_bookings.push({
        id: tr.id,
        outlet_name: outletName,
        table_number: tr.table_number || 'Reserved Table',
        date: tr.reservation_time ? tr.reservation_time.split('T')[0] : 'Upcoming',
        time: tr.reservation_time ? tr.reservation_time.split('T')[1]?.slice(0, 5) || tr.reservation_time : '',
        party_size: tr.party_size,
        status: tr.status,
      });
    }

    // ── Determine Final Classification (Multi-Venue / VIP / Diner / Café) ──
    const unifiedList = Array.from(customerMap.values()).map((patron) => {
      const hasHotel = patron.stays_count > 0;
      const hasDining = patron.orders_count > 0 || patron.table_reservations_count > 0;
      const hasCafe = patron.dining_orders.some((o: any) => o.outlet_name.includes('Café'));
      const hasRestaurant = patron.dining_orders.some((o: any) => o.outlet_name.includes('Restaurant'));

      if (hasHotel && hasDining) {
        patron.venue_type = 'all';
        patron.guest_type = 'Royal VIP Patron';
      } else if (hasHotel) {
        patron.venue_type = 'hotel';
        if (patron.guest_type === 'Patron') patron.guest_type = 'Hotel Guest';
      } else if (hasRestaurant && hasCafe) {
        patron.venue_type = 'all';
        patron.guest_type = 'Heritage Dining Patron';
      } else if (hasCafe) {
        patron.venue_type = 'cafe';
        patron.guest_type = 'Café Patron';
      } else if (hasDining) {
        patron.venue_type = 'restaurant';
        patron.guest_type = 'Restaurant Diner';
      }

      return patron;
    });

    // Sort by latest activity first
    unifiedList.sort((a, b) => b.last_visit_timestamp - a.last_visit_timestamp);

    return NextResponse.json({
      success: true,
      customers: unifiedList,
      totalCount: unifiedList.length,
      hotelCount: unifiedList.filter((c) => c.venue_type === 'hotel' || c.venue_type === 'all').length,
      restaurantCount: unifiedList.filter((c) => c.venue_type === 'restaurant' || c.venue_type === 'all').length,
      cafeCount: unifiedList.filter((c) => c.venue_type === 'cafe' || c.venue_type === 'all').length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, email, guest_type, city, notes } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: 'Name and phone are required' },
        { status: 400 }
      );
    }

    const newCust = dataRepository.addCustomer({
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim() || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@patron.rajmahal.com`,
      guest_type: guest_type || 'Royal VIP',
      city: city?.trim() || 'Jaipur',
      stays_count: 1,
      total_spend_minor: 0,
      last_visit: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    });

    return NextResponse.json({ success: true, customer: newCust });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
