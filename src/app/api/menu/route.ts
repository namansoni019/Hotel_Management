import { NextResponse } from 'next/server';
import path from 'path';
import sharp from 'sharp';
import { menuService } from '@/lib/services/menu-service';

export const dynamic = 'force-dynamic';

async function sanitizeImageUrl(url?: string): Promise<string> {
  if (!url) return '/images/dining_ambiance.jpg';
  if (url.startsWith('data:')) return url;
  if (url.startsWith('/uploads/')) {
    try {
      const filePath = path.join(process.cwd(), 'public', url.replace(/^\//, ''));
      const buf = await sharp(filePath)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      return `data:image/webp;base64,${buf.toString('base64')}`;
    } catch {
      return url;
    }
  }
  return url;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const outletId = searchParams.get('outletId') || undefined;
    const categories = await menuService.getMenuCategories(outletId);
    return NextResponse.json({ success: true, categories });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      category_id,
      name,
      description,
      price_minor,
      dietary_labels,
      image_url,
      discount_percent,
      discount_price_minor,
      prep_time_minutes,
      portions,
      extras,
      single_choice_extras,
      portion_wise_extras,
      track_quantity,
      stock_quantity,
      is_available,
    } = body;

    if (!category_id || !name || price_minor === undefined) {
      return NextResponse.json(
        { success: false, error: 'category_id, name, and price_minor are required' },
        { status: 400 }
      );
    }

    const finalImageUrl = await sanitizeImageUrl(image_url);

    const item = await menuService.addMenuItem({
      category_id,
      name,
      description: description || '',
      price_minor: Number(price_minor),
      dietary_labels: dietary_labels || ['Vegetarian'],
      image_url: finalImageUrl,
      discount_percent: discount_percent !== undefined ? Number(discount_percent) : 0,
      discount_price_minor: discount_price_minor !== undefined ? Number(discount_price_minor) : Number(price_minor),
      prep_time_minutes: prep_time_minutes !== undefined ? Number(prep_time_minutes) : 15,
      portions: Array.isArray(portions) ? portions : [],
      extras: Array.isArray(extras) ? extras : [],
      single_choice_extras: Boolean(single_choice_extras),
      portion_wise_extras: Boolean(portion_wise_extras),
      track_quantity: Boolean(track_quantity),
      stock_quantity: stock_quantity !== undefined ? Number(stock_quantity) : 0,
      is_available: is_available !== undefined ? Boolean(is_available) : true,
    });

    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
