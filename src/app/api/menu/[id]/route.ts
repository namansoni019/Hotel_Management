import { NextResponse } from 'next/server';
import path from 'path';
import sharp from 'sharp';
import { menuService } from '@/lib/services/menu-service';

async function sanitizeImageUrl(url?: string): Promise<string | undefined> {
  if (!url) return undefined;
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.toggleAvailability) {
      const newState = await menuService.toggleItemAvailability(id);
      return NextResponse.json({ success: true, is_available: newState });
    }

    if (body.image_url) {
      body.image_url = await sanitizeImageUrl(body.image_url);
    }

    const updated = await menuService.updateMenuItem(id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Menu item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await menuService.deleteMenuItem(id);
    return NextResponse.json({ success: deleted });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
