import { NextResponse } from 'next/server';
import { dataRepository } from '@/lib/data/repository';
import { billingService } from '@/lib/services/billing-service';
import type { BillingSettings } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await billingService.getBillingSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const current = await billingService.getBillingSettings();
    const updatedSettings: BillingSettings = {
      ...current,
      ...body,
    };

    try {
      await billingService.updateBillingSettings(updatedSettings);
    } catch (err) {
      console.warn('Firestore billing settings save failed:', err);
    }

    // Synchronize outlet settings in local repository
    try {
      const outlets = dataRepository.getOutlets();
      for (const outlet of outlets) {
        dataRepository.updateOutlet(outlet.id, {
          delivery_fee_minor: Math.round((updatedSettings.delivery_charges || 0) * 100),
          packaging_fee_minor: Math.round((updatedSettings.packaging_charges_delivery || 0) * 100),
          delivery_enabled: updatedSettings.delivery_enabled,
          packaging_enabled: updatedSettings.packaging_charges_enabled,
          tax_rate_bps: Math.round((updatedSettings.restaurant_gst_percent || 5) * 100),
          service_charge_bps: updatedSettings.service_charge_enabled
            ? Math.round((updatedSettings.service_charge_percent || 0) * 100)
            : 0,
        });
      }
    } catch (err) {
      console.warn('Repository sync failed:', err);
    }

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: 'Taxes & Billing configuration updated successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  return POST(request);
}
