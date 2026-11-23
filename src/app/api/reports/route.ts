import { NextResponse } from 'next/server';
import { ordersService } from '@/lib/services/orders-service';
import { reservationsService } from '@/lib/services/reservations-service';
import { dataRepository } from '@/lib/data/repository';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'month';

    const [allOrders, allReservations] = await Promise.all([
      ordersService.getOrders(),
      reservationsService.getReservations(),
    ]);

    // Outlets lookup
    const outletsList = dataRepository.getOutlets();
    const outletMap = new Map(outletsList.map((o) => [o.id, o]));

    // Total rooms count
    let totalRoomsCount = dataRepository.getRooms().length;
    try {
      const roomSnap = await getDocs(collection(db, 'rooms'));
      if (!roomSnap.empty) totalRoomsCount = roomSnap.size;
    } catch {
      // Fallback
    }
    if (totalRoomsCount === 0) totalRoomsCount = 6;

    // Filter by date range
    const now = new Date();
    let startDate: Date | null = null;

    if (range === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (range === '7days') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    } // 'all' leaves startDate as null

    const orders = startDate
      ? allOrders.filter((o) => new Date(o.created_at) >= startDate)
      : allOrders;

    const reservations = startDate
      ? allReservations.filter((r) => new Date(r.created_at) >= startDate)
      : allReservations;

    // Real Financial KPIs
    const totalFoodTurnover = orders.reduce((sum, o) => sum + (o.total_minor || 0), 0);
    const totalRoomTurnover = reservations.reduce((sum, r) => {
      const resAny = r as any;
      return sum + (resAny.total_amount_minor || r.rate_snapshot_minor || 0);
    }, 0);
    const totalGrossTurnover = totalFoodTurnover + totalRoomTurnover;

    // GST Tax Analysis
    const totalFoodTax = orders.reduce((sum, o) => sum + (o.tax_minor || 0), 0);
    const totalRoomTax = Math.round(totalRoomTurnover * 0.12); // Standard 12% GST bracket for luxury rooms
    const totalTaxMinor = totalFoodTax + totalRoomTax;
    const cgstMinor = Math.round(totalTaxMinor / 2);
    const sgstMinor = totalTaxMinor - cgstMinor;

    // Occupancy
    const occupiedRooms = reservations.filter((r) => r.status === 'confirmed' || r.status === 'checked_in').length;
    const occupancyPercent = totalRoomsCount > 0 ? Math.min(100, Math.round((occupiedRooms / totalRoomsCount) * 100)) : 0;
    const adrMinor = reservations.length > 0 ? Math.round(totalRoomTurnover / reservations.length) : 0;
    const revParMinor = totalRoomsCount > 0 ? Math.round(totalRoomTurnover / totalRoomsCount) : 0;

    // Real Outlets breakdown
    const outletsBreakdown: Array<{
      name: string;
      category: string;
      amountMinor: number;
      ordersCount: number;
      share: number;
    }> = [
      {
        name: 'Heritage Palace Suites & Chambers',
        category: 'Rooms',
        amountMinor: totalRoomTurnover,
        ordersCount: reservations.length,
        share: totalGrossTurnover > 0 ? Number(((totalRoomTurnover / totalGrossTurnover) * 100).toFixed(1)) : 0,
      },
    ];

    outletsList.forEach((out) => {
      const outOrders = orders.filter((o) => o.outlet_id === out.id);
      const outRevenue = outOrders.reduce((sum, o) => sum + (o.total_minor || 0), 0);
      outletsBreakdown.push({
        name: out.name,
        category: out.type === 'restaurant' ? 'Restaurant' : out.type === 'cafe' ? 'Café' : 'F&B',
        amountMinor: outRevenue,
        ordersCount: outOrders.length,
        share: totalGrossTurnover > 0 ? Number(((outRevenue / totalGrossTurnover) * 100).toFixed(1)) : 0,
      });
    });

    // Real Tenders (Payment settlement distribution)
    const qrOrders = orders.filter((o) => o.channel === 'qr' || o.fulfilment_mode === 'delivery');
    const posOrders = orders.filter((o) => o.channel === 'pos');
    const otherOrders = orders.filter((o) => o.channel !== 'qr' && o.channel !== 'pos' && o.fulfilment_mode !== 'delivery');

    const upiFoodMinor = qrOrders.reduce((sum, o) => sum + (o.total_minor || 0), 0);
    const cashFoodMinor = posOrders.reduce((sum, o) => sum + (o.total_minor || 0), 0);
    const cardFoodMinor = otherOrders.reduce((sum, o) => sum + (o.total_minor || 0), 0);

    // For room reservations, split advance as UPI/Bank and balance as Card
    const resAdvanceTotal = reservations.reduce((sum, r) => {
      const resAny = r as any;
      return sum + (resAny.deposit_amount_minor || 0);
    }, 0);
    const resCardTotal = Math.max(0, totalRoomTurnover - resAdvanceTotal);

    const totalUpi = upiFoodMinor + resAdvanceTotal;
    const totalCash = cashFoodMinor;
    const totalCard = Math.max(0, cardFoodMinor + resCardTotal);

    const upiCount = qrOrders.length + (resAdvanceTotal > 0 ? reservations.length : 0);
    const cashCount = posOrders.length;
    const cardCount = otherOrders.length + (resCardTotal > 0 ? reservations.length : 0);

    const tendersBreakdown = [
      {
        mode: 'UPI & Instant QR Payments',
        amountMinor: totalUpi,
        count: upiCount,
        percent: totalGrossTurnover > 0 ? Number(((totalUpi / totalGrossTurnover) * 100).toFixed(1)) : 0,
      },
      {
        mode: 'Credit & Debit Cards (RuPay/Visa)',
        amountMinor: totalCard,
        count: cardCount,
        percent: totalGrossTurnover > 0 ? Number(((totalCard / totalGrossTurnover) * 100).toFixed(1)) : 0,
      },
      {
        mode: 'Cash Counter Settlement',
        amountMinor: totalCash,
        count: cashCount,
        percent: totalGrossTurnover > 0 ? Number(((totalCash / totalGrossTurnover) * 100).toFixed(1)) : 0,
      },
    ];

    // Real Recent Transactions list
    const orderTx = orders.map((o) => {
      const outlet = outletMap.get(o.outlet_id);
      const outletName = outlet?.name || 'Palace Dining';
      const itemsDesc = o.order_lines && o.order_lines.length > 0
        ? o.order_lines.map((l: any) => `${l.quantity}x ${l.item_name_snapshot || 'Item'}`).join(', ')
        : 'Royal Dining Feast';
      const guestName = o.pickup_name || o.delivery_name || 'Walk-in Guest';

      return {
        id: o.id,
        date: new Date(o.created_at).toLocaleString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        timestamp: new Date(o.created_at).getTime(),
        ref: o.order_number,
        desc: `${outletName} • ${itemsDesc} (${guestName})`,
        tender: o.channel === 'pos' ? 'Cash Counter' : o.channel === 'qr' ? 'UPI QR' : 'Online / Card',
        amountMinor: o.total_minor,
        type: 'order' as const,
      };
    });

    const resTx = reservations.map((r) => {
      const resAny = r as any;
      const guestName = resAny.guests?.name || r.guest?.name || 'Royal Guest';
      const roomName = resAny.room_types?.name || r.room_type?.name || 'Heritage Suite';

      return {
        id: r.id,
        date: new Date(r.created_at).toLocaleString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        timestamp: new Date(r.created_at).getTime(),
        ref: r.reference_code,
        desc: `${roomName} • ${guestName} (${r.party_size} Guests)`,
        tender: resAny.deposit_amount_minor ? 'Bank Advance / UPI' : 'Direct Booking',
        amountMinor: resAny.total_amount_minor || r.rate_snapshot_minor || 0,
        type: 'reservation' as const,
      };
    });

    const recentTransactions = [...orderTx, ...resTx].sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({
      success: true,
      range,
      kpis: {
        totalRevenueMinor: totalGrossTurnover,
        roomsRevenueMinor: totalRoomTurnover,
        fbRevenueMinor: totalFoodTurnover,
        occupancyPercent,
        occupiedRooms,
        totalRooms: totalRoomsCount,
        adrMinor,
        revParMinor,
        totalOrdersCount: orders.length,
        totalReservationsCount: reservations.length,
      },
      taxKpis: {
        cgstMinor,
        sgstMinor,
        totalTaxMinor,
      },
      outlets: outletsBreakdown,
      tenders: tendersBreakdown,
      recentTransactions,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
