import { NextResponse } from 'next/server';
import { ordersService } from '@/lib/services/orders-service';
import type { OrderStatus } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await ordersService.getOrderById(id);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, payment_status, payment_method, payment_id } = body;

    if (!status && !payment_status) {
      return NextResponse.json({ success: false, error: 'Status or payment_status is required' }, { status: 400 });
    }

    let updated = null;
    if (status) {
      updated = await ordersService.updateOrderStatus(id, status as OrderStatus);
    }
    if (payment_status) {
      updated = await ordersService.updateOrderPayment(id, payment_status, payment_method, payment_id);
    }

    if (!updated) {
      // Fallback: try finding order
      updated = await ordersService.getOrderById(id);
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
