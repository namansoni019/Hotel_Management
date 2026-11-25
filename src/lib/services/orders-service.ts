import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { dataRepository } from '@/lib/data/repository';
import type { Order, OrderStatus, OrderLine } from '@/lib/types';

export const ordersService = {
  async getOrders(outletId?: string, uid?: string): Promise<Order[]> {
    try {
      const ordersRef = collection(db, 'orders');
      let q;
      if (uid && outletId) {
        q = query(ordersRef, where('outlet_id', '==', outletId), where('uid', '==', uid), orderBy('created_at', 'desc'));
      } else if (uid) {
        q = query(ordersRef, where('uid', '==', uid), orderBy('created_at', 'desc'));
      } else if (outletId) {
        q = query(ordersRef, where('outlet_id', '==', outletId), orderBy('created_at', 'desc'));
      } else {
        q = query(ordersRef, orderBy('created_at', 'desc'));
      }

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Order[];
      }
    } catch (err) {
      console.warn('Firestore getOrders fallback to local repository / client filtering:', err);
      // Fallback: fetch without complex index and filter in memory
      try {
        const ordersRef = collection(db, 'orders');
        const snap = await getDocs(query(ordersRef, orderBy('created_at', 'desc')));
        if (!snap.empty) {
          let list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[];
          if (outletId) list = list.filter((o) => o.outlet_id === outletId);
          if (uid) list = list.filter((o) => (o as any).uid === uid || (o as any).user_id === uid);
          return list;
        }
      } catch {}
    }
    const all = dataRepository.getOrders(outletId);
    if (uid) {
      return all.filter((o) => (o as any).uid === uid || (o as any).user_id === uid);
    }
    return all;
  },

  async getOrderById(orderId: string): Promise<Order | undefined> {
    try {
      const docRef = doc(db, 'orders', orderId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Order;
      }

      // Check by order_number
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, where('order_number', '==', orderId));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const d = qSnap.docs[0];
        return { id: d.id, ...d.data() } as Order;
      }
    } catch (err) {
      console.warn('Firestore getOrderById fallback:', err);
    }
    return (
      dataRepository.getOrderByNumber(orderId) ||
      dataRepository.getOrders().find((o) => o.id === orderId || o.order_number === orderId)
    );
  },

  async createOrder(data: {
    outlet_id: string;
    table_id: string | null;
    table_number?: string | null;
    room_number?: string | null;
    channel: Order['channel'];
    fulfilment_mode: Order['fulfilment_mode'];
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
    round_off_minor?: number;
    total_minor: number;
    invoice_number?: string;
    payment_mode?: 'upi' | 'cash' | 'card' | string;
    payment_method?: string;
    payment_status?: string;
    payment_id?: string | null;
    uid?: string | null;
    user_id?: string | null;
    order_lines: Array<{
      menu_item_id: string;
      item_name_snapshot: string;
      unit_price_snapshot_minor: number;
      quantity: number;
      notes: string | null;
      modifiers_snapshot: any[] | null;
      line_total_minor: number;
    }>;
  }): Promise<Order> {
    const orderNumber = `ORD-AUR-${Date.now().toString().slice(-6)}`;
    const localOrderLines: OrderLine[] = data.order_lines.map((l, i) => ({
      id: `line-${Date.now()}-${i}`,
      order_id: '',
      menu_item_id: l.menu_item_id,
      item_name_snapshot: l.item_name_snapshot,
      unit_price_snapshot_minor: l.unit_price_snapshot_minor,
      quantity: l.quantity,
      notes: l.notes,
      modifiers_snapshot: l.modifiers_snapshot,
      line_total_minor: l.line_total_minor,
    }));

    const createdLocalOrder = dataRepository.createOrder({
      ...data,
      order_lines: localOrderLines,
      status: 'new',
      cancel_reason: null,
      created_by: data.user_id || null,
      assigned_delivery_staff: null,
    });

    try {
      const orderRef = doc(db, 'orders', createdLocalOrder.id);
      await setDoc(orderRef, {
        ...data,
        id: createdLocalOrder.id,
        order_number: orderNumber,
        status: 'new',
        payment_status: data.payment_status || (data.payment_method === 'pay_on_delivery' ? 'pending' : 'pending'),
        payment_method: data.payment_method || 'pay_on_delivery',
        payment_id: data.payment_id || null,
        uid: data.uid || data.user_id || null,
        user_id: data.uid || data.user_id || null,
        order_lines: localOrderLines,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore createOrder error (saved to local repository):', err);
    }

    return createdLocalOrder;
  },

  async updateOrderPayment(
    orderId: string,
    paymentStatus: string,
    paymentMethod?: string,
    paymentId?: string
  ): Promise<Order | null> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const updateData: Record<string, any> = {
        payment_status: paymentStatus,
        updated_at: serverTimestamp(),
      };
      if (paymentMethod) updateData.payment_method = paymentMethod;
      if (paymentId) updateData.payment_id = paymentId;
      await updateDoc(orderRef, updateData);
    } catch (err) {
      console.warn('Firestore updateOrderPayment fallback:', err);
    }

    const localOrder = dataRepository.getOrderById(orderId) || dataRepository.getOrderByNumber(orderId);
    if (localOrder) {
      localOrder.payment_status = paymentStatus;
      if (paymentMethod) localOrder.payment_method = paymentMethod;
      if (paymentId) localOrder.payment_id = paymentId;
      return localOrder;
    }
    return null;
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, reason?: string): Promise<Order | null> {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const updateData: Record<string, any> = {
        status,
        updated_at: serverTimestamp(),
      };
      if (reason) updateData.cancel_reason = reason;
      await updateDoc(orderRef, updateData);
    } catch (err) {
      console.warn('Firestore updateOrderStatus fallback:', err);
    }
    return dataRepository.updateOrderStatus(orderId, status, reason);
  },

  async updateOrderPaymentMode(orderId: string, payment_mode: 'upi' | 'cash' | 'card' | string): Promise<void> {
    const payment_method = payment_mode === 'cash' ? 'Cash Counter' : payment_mode === 'card' ? 'Card' : 'UPI';
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        payment_mode,
        payment_method,
        updated_at: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore updateOrderPaymentMode fallback:', err);
    }
    const local = dataRepository.getOrders().find((o) => o.id === orderId);
    if (local) {
      local.payment_mode = payment_mode;
      local.payment_method = payment_method;
    }
  },

  async settleOrderAndFreeTable(params: {
    orderId: string;
    payment_mode: 'cash' | 'upi' | 'card' | string;
    payment_method: string;
    tendered_amount_minor?: number | null;
    change_amount_minor?: number | null;
    table_id?: string | null;
    table_number?: string | null;
  }): Promise<void> {
    const { orderId, payment_mode, payment_method, tendered_amount_minor, change_amount_minor, table_id, table_number } = params;

    // 1. Update order in Firestore
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: 'completed',
        payment_status: 'paid',
        payment_mode,
        payment_method,
        tendered_amount_minor: tendered_amount_minor || null,
        change_amount_minor: change_amount_minor || null,
        settled_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore settleOrder updateDoc error:', err);
    }

    // 2. Update local repository order
    dataRepository.updateOrderStatus(orderId, 'completed');
    dataRepository.updateOrderPaymentMode(orderId, payment_mode);
    const localOrder = dataRepository.getOrders().find((o) => o.id === orderId);
    if (localOrder) {
      localOrder.status = 'completed';
      localOrder.payment_status = 'paid';
      localOrder.payment_mode = payment_mode;
      localOrder.payment_method = payment_method;
    }

    // 3. Free and unreserve the table
    try {
      const allTables = dataRepository.getTables();
      let targetTable = allTables.find((t) => t.id === table_id);
      if (!targetTable && table_number) {
        const cleanTarget = table_number.replace(/^(table|room)\s*/i, '').trim().toUpperCase();
        targetTable = allTables.find(
          (t) =>
            t.table_number.toUpperCase() === cleanTarget ||
            t.table_number.toUpperCase() === `T-${cleanTarget}` ||
            `Table ${t.table_number}`.toUpperCase() === table_number.toUpperCase()
        );
      }
      if (!targetTable && table_id) {
        const cleanId = String(table_id).toLowerCase();
        targetTable = allTables.find(
          (t) =>
            t.id.toLowerCase() === cleanId ||
            t.code?.toLowerCase() === cleanId ||
            cleanId.includes(t.table_number.toLowerCase())
        );
      }

      if (targetTable) {
        dataRepository.updateTableStatus(targetTable.id, 'available');
        try {
          await updateDoc(doc(db, 'tables', targetTable.id), {
            status: 'available',
            updated_at: serverTimestamp(),
          });
        } catch {}
      }

      // Query Firestore tables collection to make sure any table matching table_number is available
      if (table_number) {
        const cleanNum = table_number.replace(/^(table|room)\s*/i, '').trim().toUpperCase();
        try {
          const q = query(collection(db, 'tables'), where('table_number', '==', cleanNum));
          const snap = await getDocs(q);
          for (const d of snap.docs) {
            await updateDoc(d.ref, { status: 'available', updated_at: serverTimestamp() });
          }
        } catch {}
      }

      // 4. Mark any active table reservation as completed
      const allRes = dataRepository.getTableReservations();
      const activeRes = allRes.find(
        (r) =>
          targetTable &&
          (r.table_number === targetTable.table_number || r.table_number === targetTable.id) &&
          (r.status === 'confirmed' || r.status === 'seated')
      );
      if (activeRes) {
        dataRepository.updateTableReservationStatus(activeRes.id, 'completed');
        try {
          await updateDoc(doc(db, 'table_reservations', activeRes.id), {
            status: 'completed',
            updated_at: serverTimestamp(),
          });
        } catch {}
      }
    } catch (e) {
      console.warn('Error freeing table upon settlement:', e);
    }
  },
};
