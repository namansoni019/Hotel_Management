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
    const { category_id, name, description, price_minor, dietary_labels, image_url } = body;

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
    });

    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
