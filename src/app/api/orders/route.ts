import { NextResponse } from 'next/server';
import { ordersService } from '@/lib/services/orders-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const outletId = searchParams.get('outletId') || undefined;
    const orders = await ordersService.getOrders(outletId);
    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      outlet_id,
      table_id,
      table_number,
      room_number,
      channel,
      fulfilment_mode,
      pickup_name,
      pickup_phone,
      delivery_name,
      delivery_phone,
      delivery_address,
      delivery_notes,
      delivery_fee_minor,
      packaging_fee_minor,
      subtotal_minor,
      tax_minor,
      service_charge_minor,
      discount_minor,
      total_minor,
      payment_mode,
      payment_method,
      order_lines,
    } = body;

    const effectiveLines = (order_lines || body.lines || []).map((l: any) => ({
      menu_item_id: l.menu_item_id || l.id,
      item_name_snapshot: l.item_name_snapshot || l.name || 'Menu Item',
      unit_price_snapshot_minor: Number(l.unit_price_snapshot_minor || l.price_minor || 0),
      quantity: Number(l.quantity || 1),
      notes: l.notes || null,
      modifiers_snapshot: l.modifiers_snapshot || null,
      line_total_minor: Number(l.line_total_minor || (l.unit_price_snapshot_minor || l.price_minor || 0) * (l.quantity || 1)),
    }));

    const effectiveDeliveryName = delivery_name || pickup_name || body.customer_name || null;
    const effectiveDeliveryPhone = delivery_phone || pickup_phone || body.customer_phone || null;
    const effectiveNotes = delivery_notes || body.kitchen_notes || null;

    // Detect table vs room from table_id or input
    let effectiveTable = table_number || null;
    let effectiveRoom = room_number || null;
    if (table_id) {
      const lower = String(table_id).toLowerCase().trim();
      if (lower.includes('room') || lower.includes('suite')) {
        effectiveRoom = effectiveRoom || table_id.replace(/^(room|suite)\s*/i, '').trim();
      } else {
        effectiveTable = effectiveTable || (lower.startsWith('table') ? table_id : `Table ${table_id}`);
      }
    }

    const effectivePaymentMode = payment_mode || 'upi';
    const effectivePaymentMethod = payment_method || (
      effectivePaymentMode === 'cash' ? 'Cash Counter' : effectivePaymentMode === 'card' ? 'Card' : 'UPI'
    );

    if (!outlet_id || !channel || !fulfilment_mode || effectiveLines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required order fields or order lines' },
        { status: 400 }
      );
    }

    const order = await ordersService.createOrder({
      outlet_id,
      table_id: table_id || null,
      table_number: effectiveTable,
      room_number: effectiveRoom,
      channel,
      fulfilment_mode,
      pickup_name: pickup_name || effectiveDeliveryName,
      pickup_phone: pickup_phone || effectiveDeliveryPhone,
      delivery_name: effectiveDeliveryName,
      delivery_phone: effectiveDeliveryPhone,
      delivery_address: delivery_address || null,
      delivery_notes: effectiveNotes,
      delivery_fee_minor: delivery_fee_minor || 0,
      packaging_fee_minor: packaging_fee_minor || 0,
      subtotal_minor: subtotal_minor || 0,
      tax_minor: tax_minor || 0,
      service_charge_minor: service_charge_minor || 0,
      discount_minor: discount_minor || 0,
      total_minor: total_minor || 0,
      payment_mode: effectivePaymentMode,
      payment_method: effectivePaymentMethod,
      order_lines: effectiveLines,
    });

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { orderId, status, cancel_reason, payment_mode, payment_method, table_number, room_number } = body;
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Missing orderId' }, { status: 400 });
    }

    if (payment_mode) {
      await ordersService.updateOrderPaymentMode(orderId, payment_mode);
    }
    if (status) {
      await ordersService.updateOrderStatus(orderId, status, cancel_reason);
    }

    return NextResponse.json({ success: true, message: 'Order updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
