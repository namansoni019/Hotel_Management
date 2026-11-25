import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BillingSettings, DEFAULT_BILLING_SETTINGS } from '@/lib/types';

export interface BillCalculation {
  subtotalMinor: number;
  gstPercent: number;
  taxMinor: number;
  cgstMinor: number;
  sgstMinor: number;
  serviceChargeMinor: number;
  serviceChargePercent: number;
  deliveryFeeMinor: number;
  isFreeDelivery: boolean;
  packagingFeeMinor: number;
  roundOffMinor: number;
  totalMinor: number;
}

export const billingService = {
  /**
   * Fetch current billing settings from Firestore 'settings/billing' with fallback to DEFAULT_BILLING_SETTINGS.
   */
  async getBillingSettings(): Promise<BillingSettings> {
    try {
      const snap = await getDoc(doc(db, 'settings', 'billing'));
      if (snap.exists()) {
        return {
          ...DEFAULT_BILLING_SETTINGS,
          ...(snap.data() as Partial<BillingSettings>),
        };
      }
    } catch (err) {
      console.warn('Failed to fetch settings/billing, using defaults:', err);
    }
    return DEFAULT_BILLING_SETTINGS;
  },

  /**
   * Listen to real-time changes on Firestore 'settings/billing'.
   */
  subscribeBillingSettings(callback: (settings: BillingSettings) => void): () => void {
    try {
      return onSnapshot(
        doc(db, 'settings', 'billing'),
        (snap) => {
          if (snap.exists()) {
            callback({
              ...DEFAULT_BILLING_SETTINGS,
              ...(snap.data() as Partial<BillingSettings>),
            });
          } else {
            callback(DEFAULT_BILLING_SETTINGS);
          }
        },
        (err) => {
          console.warn('Billing settings snapshot error:', err);
          callback(DEFAULT_BILLING_SETTINGS);
        }
      );
    } catch {
      callback(DEFAULT_BILLING_SETTINGS);
      return () => {};
    }
  },

  /**
   * Update Firestore 'settings/billing' doc.
   */
  async updateBillingSettings(settings: Partial<BillingSettings>): Promise<void> {
    const docRef = doc(db, 'settings', 'billing');
    await setDoc(
      docRef,
      {
        ...settings,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
  },

  /**
   * Calculate statutory GST and billing taxes for respective order types:
   * - dine_in: 5% GST (2.5% CGST + 2.5% SGST), 2.5% Service Charge (if enabled), ₹0 Delivery, ₹0 Packaging.
   * - delivery: 5% GST, ₹0 Service Charge, ₹50 Delivery (FREE if subtotal >= ₹500), ₹25 Packaging (if enabled).
   * - pickup: 5% GST, ₹0 Service Charge, ₹0 Delivery, ₹25 Packaging (if enabled).
   * - room: 12% Rooms GST (or 5% for food), 2.5% Service Charge (if enabled), ₹0 Delivery.
   * - round_off_cash: rounds total to nearest rupee if enabled.
   */
  calculateOrderBill(
    subtotalMinor: number,
    orderType: 'dine_in' | 'delivery' | 'pickup' | 'room',
    settings: BillingSettings = DEFAULT_BILLING_SETTINGS
  ): BillCalculation {
    const subtotalRupees = subtotalMinor / 100;

    // GST percentage
    const gstPercent =
      orderType === 'room'
        ? Number(settings.rooms_gst_percent) || 12
        : Number(settings.restaurant_gst_percent) || 5;

    const taxMinor = Math.round((subtotalMinor * gstPercent) / 100);
    const cgstMinor = Math.round(taxMinor / 2);
    const sgstMinor = taxMinor - cgstMinor;

    // Service Charge (applicable to Dine-in hospitality when enabled)
    let serviceChargeMinor = 0;
    const serviceChargePercent = Number(settings.service_charge_percent) || 2.5;
    if (orderType === 'dine_in' && settings.service_charge_enabled) {
      serviceChargeMinor = Math.round((subtotalMinor * serviceChargePercent) / 100);
    }

    // Delivery Fee: ₹50 or FREE if subtotal >= ₹500
    let deliveryFeeMinor = 0;
    let isFreeDelivery = false;
    if (orderType === 'delivery') {
      const freeAbove = Number(settings.delivery_free_above) || 500;
      if (subtotalRupees >= freeAbove) {
        deliveryFeeMinor = 0;
        isFreeDelivery = true;
      } else {
        deliveryFeeMinor = (Number(settings.delivery_charges) || 50) * 100;
      }
    }

    // Packaging Charges: ₹25 for Delivery or Pickup when packaging_charges_enabled
    let packagingFeeMinor = 0;
    if (settings.packaging_charges_enabled) {
      if (orderType === 'delivery') {
        packagingFeeMinor = (Number(settings.packaging_charges_delivery) || 25) * 100;
      } else if (orderType === 'pickup') {
        packagingFeeMinor = (Number(settings.packaging_charges_pickup) || 25) * 100;
      }
    }

    const unroundedTotalMinor =
      subtotalMinor + taxMinor + serviceChargeMinor + deliveryFeeMinor + packagingFeeMinor;

    // Round off to nearest rupee if round_off_cash is true
    let roundOffMinor = 0;
    let totalMinor = unroundedTotalMinor;
    if (settings.round_off_cash) {
      const rounded = Math.round(unroundedTotalMinor / 100) * 100;
      roundOffMinor = rounded - unroundedTotalMinor;
      totalMinor = rounded;
    }

    return {
      subtotalMinor,
      gstPercent,
      taxMinor,
      cgstMinor,
      sgstMinor,
      serviceChargeMinor,
      serviceChargePercent,
      deliveryFeeMinor,
      isFreeDelivery,
      packagingFeeMinor,
      roundOffMinor,
      totalMinor: Math.max(0, totalMinor),
    };
  },
};
