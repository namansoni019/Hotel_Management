import { NextResponse } from 'next/server';
import { memoriesService } from '@/lib/services/memories-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('eventType') || undefined;
    const memories = await memoriesService.getMemories(eventType);
    return NextResponse.json({ success: true, memories });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event_name, event_type, host_name, celebration_date, story, photo_url } = body;

    if (!event_name || !host_name || !story) {
      return NextResponse.json(
        { success: false, error: 'event_name, host_name, and story are required' },
        { status: 400 }
      );
    }

    const memory = await memoriesService.createMemory({
      event_name,
      event_type: event_type || 'wedding',
      host_name,
      celebration_date: celebration_date || 'Recent Celebration',
      story,
      photo_url,
    });

    return NextResponse.json({ success: true, memory }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
