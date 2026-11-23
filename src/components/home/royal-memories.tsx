'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Calendar,
  Sparkles,
  Heart,
  Upload,
  Camera,
  MapPin,
  X,
  Maximize2,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';

interface RoyalMemory {
  id: string;
  eventName: string;
  eventType: 'wedding' | 'sufi' | 'banquet' | 'festival' | 'anniversary';
  hostName: string;
  date: string;
  story: string;
  photoUrl: string;
  likes: number;
  userLiked?: boolean;
}

const INITIAL_MEMORIES: RoyalMemory[] = [
  {
    id: 'mem-1',
    eventName: 'The Royal Rajputana Wedding',
    eventType: 'wedding',
    hostName: 'Devendra & Radhika Rathore',
    date: 'February 2025',
    story:
      'From the royal Shehnai welcome at the Pol gate to the candle-lit pheras by the courtyard fountain, Rajmahal gave us memories that our families will cherish for generations.',
    photoUrl: '/images/hall/crystal-ballroom.jpg',
    likes: 342,
  },
  {
    id: 'mem-2',
    eventName: 'Sufi & Folk Night Under The Stars',
    eventType: 'sufi',
    hostName: 'Guest: Vikram & Friends',
    date: 'January 2025',
    story:
      'Mesmerizing Manganiyar musicians, fragrant burning loban, and authentic Ker Sangri served under the star-lit Udaipur sky. Pure heaven on earth.',
    photoUrl: '/images/rooms/royal-courtyard.jpg',
    likes: 219,
  },
  {
    id: 'mem-3',
    eventName: 'Golden 50th Wedding Anniversary',
    eventType: 'anniversary',
    hostName: 'Col. Jaswant & Savitri Singh',
    date: 'December 2024',
    story:
      'We celebrated our 50th anniversary in the Sheesh Mahal Suite. The personalized silver thali dinner and warm hospitality made us feel like true maharaja and maharani.',
    photoUrl: '/images/rooms/sheesh-mahal.jpg',
    likes: 512,
  },
  {
    id: 'mem-4',
    eventName: 'Courtyard Khansama Banquet',
    eventType: 'banquet',
    hostName: 'Singhania Family Reunion',
    date: 'November 2024',
    story:
      '40 of our relatives gathered from across the world. The slow-cooked Laal Maas and melt-in-mouth churma prepared by master khansamas was the highlight of our entire trip.',
    photoUrl: '/images/food/dal-baati.jpg',
    likes: 188,
  },
  {
    id: 'mem-5',
    eventName: 'Royal Heritage Diwali Gala',
    eventType: 'festival',
    hostName: 'Rajmahal Annual Celebration',
    date: 'November 2024',
    story:
      'Over 2,000 earthen diyas lighting up every arch and carved jharokha of the palace. An unforgettable celebration of light, classical sitar, and royal sweets.',
    photoUrl: '/images/hero_haveli.jpg',
    likes: 420,
  },
  {
    id: 'mem-6',
    eventName: 'Lakeview Jharokha Sunrise Breakfast',
    eventType: 'anniversary',
    hostName: 'Aarav & Meera',
    date: 'October 2024',
    story:
      'Steaming kulhad chai and piping hot pyaaz kachoris while watching the morning mist rise over Lake Pichola from our private jharokha.',
    photoUrl: '/images/rooms/jharokha-room.jpg',
    likes: 295,
  },
];

const EVENT_FILTERS = [
  { id: 'all', label: 'All Celebrations' },
  { id: 'wedding', label: 'Royal Weddings' },
  { id: 'sufi', label: 'Sufi & Folk Nights' },
  { id: 'banquet', label: 'Courtyard Banquets' },
  { id: 'festival', label: 'Heritage Festivals' },
  { id: 'anniversary', label: 'Anniversaries' },
];

export function RoyalMemories() {
  const [memories, setMemories] = useState<RoyalMemory[]>(INITIAL_MEMORIES);
  const [activeFilter, setActiveFilter] = useState('all');
  const [zoomMemory, setZoomMemory] = useState<RoyalMemory | null>(null);
  const [isSubmittingMemory, setIsSubmittingMemory] = useState(false);

  // Fetch live memories from Firestore API
  React.useEffect(() => {
    async function loadLiveMemories() {
      try {
        const res = await fetch('/api/memories');
        if (res.ok) {
          const data = await res.json();
          if (data.memories && data.memories.length > 0) {
            const mapped = data.memories.map((m: any) => ({
              id: m.id,
              eventName: m.event_name,
              eventType: (m.event_type || 'wedding') as RoyalMemory['eventType'],
              hostName: m.host_name,
              date: m.celebration_date,
              story: m.story,
              photoUrl: m.photo_url || '/images/hall/crystal-ballroom.jpg',
              likes: m.likes_count ?? 300,
              userLiked: false,
            }));
            setMemories(mapped);
          }
        }
      } catch (err) {
        console.error('Failed to load live memories, using fallback:', err);
      }
    }
    loadLiveMemories();
  }, []);

  // Add memory modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventType, setEventType] = useState<RoyalMemory['eventType']>('wedding');
  const [eventDate, setEventDate] = useState('');
  const [story, setStory] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState('/images/hall/crystal-ballroom.jpg');

  const filteredMemories = memories.filter((m) => {
    if (activeFilter === 'all') return true;
    return m.eventType === activeFilter;
  });

  const handleLike = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Optimistic UI update
    setMemories((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const wasLiked = m.userLiked;
          return {
            ...m,
            userLiked: !wasLiked,
            likes: wasLiked ? m.likes - 1 : m.likes + 1,
          };
        }
        return m;
      })
    );

    // Sync live with Firestore
    try {
      await fetch(`/api/memories/${id}/like`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to sync memory like to database:', err);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !eventName || !story) return;

    setIsSubmittingMemory(true);
    const celebrationDate = eventDate || 'Recent Celebration';

    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name: eventName,
          event_type: eventType,
          host_name: guestName,
          celebration_date: celebrationDate,
          story,
          photo_url: selectedPhoto,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const created = data.memory;
        const newMemory: RoyalMemory = {
          id: created.id,
          eventName: created.event_name,
          eventType: created.event_type as RoyalMemory['eventType'],
          hostName: created.host_name,
          date: created.celebration_date,
          story: created.story,
          photoUrl: created.photo_url || selectedPhoto,
          likes: created.likes_count || 1,
          userLiked: true,
        };
        setMemories([newMemory, ...memories]);
      } else {
        const newMemory: RoyalMemory = {
          id: `mem-${Date.now()}`,
          eventName,
          eventType,
          hostName: guestName,
          date: celebrationDate,
          story,
          photoUrl: selectedPhoto,
          likes: 1,
          userLiked: true,
        };
        setMemories([newMemory, ...memories]);
      }

      setIsAddModalOpen(false);
      setGuestName('');
      setEventName('');
      setStory('');
      setEventDate('');
    } catch (err) {
      console.error('Failed to submit memory:', err);
    } finally {
      setIsSubmittingMemory(false);
    }
  };

  return (
    <section className="py-20 bg-[#F5F1E8] relative overflow-hidden border-t border-[#D4CBBB]/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="text-left max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#670E10]/10 border border-[#B08D57]/40 mb-3">
              <Camera className="w-3.5 h-3.5 text-[#670E10]" />
              <span className="text-xs font-bold text-[#670E10] tracking-wider uppercase">
                #RajmahalMemories
              </span>
            </div>
            <h2 className="font-heritage text-3xl sm:text-4xl lg:text-5xl font-bold text-[#670E10] leading-tight">
              Royal Memories &amp; Events
            </h2>
            <p className="text-sm sm:text-base text-[#6E6356] font-light mt-2">
              A celebration chronicle curated by our guests — real weddings, milestone birthdays, and unforgettable courtyard evenings.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#C59B63] hover:bg-[#B88E55] text-[#4A0A0C] px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 shadow-md hover:shadow-lg transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Share Your Memory</span>
            </Button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {EVENT_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === f.id
                  ? 'bg-[#670E10] text-[#FAF8F3] shadow-md border border-[#B08D57]'
                  : 'bg-white text-[#6E6356] border border-[#D4CBBB] hover:border-[#B08D57]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Memories Photo Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredMemories.map((mem) => (
            <div
              key={mem.id}
              onClick={() => setZoomMemory(mem)}
              className="relative h-80 sm:h-96 rounded-2xl overflow-hidden border border-[#D4CBBB]/70 shadow-sm hover:shadow-xl hover:border-[#B08D57] transition-all duration-300 group cursor-pointer"
              aria-label={mem.eventName}
            >
              {/* Photo View with Hover Zoom */}
              <Image
                src={mem.photoUrl}
                alt={mem.eventName}
                fill
                className="object-cover group-hover:scale-106 transition-transform duration-700 ease-out"
              />

              {/* Top-Right Expand Button */}
              <div
                className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/55 backdrop-blur-md border border-[#B08D57]/60 flex items-center justify-center text-white/90 shadow-md group-hover:scale-110 group-hover:bg-black/75 group-hover:border-[#B08D57] transition-all duration-300 pointer-events-none"
                aria-hidden="true"
              >
                <Maximize2 className="w-4 h-4 text-[#FAF8F3]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MODAL: IMAGE-ONLY LIGHTBOX GALLERY ── */}
      {zoomMemory && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={() => setZoomMemory(null)}
        >
          {/* Close Button */}
          <button
            onClick={() => setZoomMemory(null)}
            className="absolute top-4 sm:top-6 right-4 sm:right-6 z-30 p-2.5 sm:p-3 rounded-full bg-black/60 text-white/90 hover:text-white hover:bg-black/90 border border-white/20 hover:border-[#B08D57] transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95"
            aria-label="Close image preview"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Main Pure Image Frame */}
          <div
            className="relative w-full max-w-5xl h-[70vh] sm:h-[80vh] md:h-[85vh] rounded-2xl sm:rounded-3xl overflow-hidden border border-[#B08D57]/40 shadow-2xl bg-black/50 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={zoomMemory.photoUrl}
              alt={zoomMemory.eventName}
              fill
              className="object-contain"
              sizes="(max-width: 1280px) 95vw, 1200px"
              priority
            />
          </div>
        </div>
      )}

      {/* ── MODAL: ADD YOUR MEMORY ── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Share Your Royal Memory & Event"
      >
        <form onSubmit={handleAddMemory} className="space-y-4 text-left">
          <p className="text-xs text-[#9A8E7F]">
            Submit a photograph and brief story from your wedding, anniversary, or stay at Rajmahal.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#D4CBBB]">Your / Host Name *</label>
              <Input
                required
                placeholder="e.g. Vikram & Radhika Rathore"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="bg-[#1C1814] border-[#3D352C] text-[#FAF8F3]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#D4CBBB]">Event Name *</label>
              <Input
                required
                placeholder="e.g. Royal Wedding Sangeet Night"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="bg-[#1C1814] border-[#3D352C] text-[#FAF8F3]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#D4CBBB]">Event Category *</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as RoyalMemory['eventType'])}
                className="w-full px-3 py-2 text-xs bg-[#1C1814] text-[#FAF8F3] rounded-lg border border-[#3D352C] focus:outline-none focus:border-[#B08D57]"
              >
                <option value="wedding">Royal Wedding</option>
                <option value="sufi">Sufi &amp; Folk Night</option>
                <option value="banquet">Courtyard Banquet</option>
                <option value="festival">Heritage Festival</option>
                <option value="anniversary">Anniversary Celebration</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#D4CBBB]">Date / Year of Celebration</label>
              <Input
                placeholder="e.g. February 2025"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="bg-[#1C1814] border-[#3D352C] text-[#FAF8F3]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#D4CBBB]">Select Memory Photo Scene</label>
            <select
              value={selectedPhoto}
              onChange={(e) => setSelectedPhoto(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#1C1814] text-[#FAF8F3] rounded-lg border border-[#3D352C] focus:outline-none focus:border-[#B08D57]"
            >
              <option value="/images/hall/crystal-ballroom.jpg">Crystal Ballroom Gala</option>
              <option value="/images/rooms/royal-courtyard.jpg">Royal Courtyard by Evening</option>
              <option value="/images/rooms/sheesh-mahal.jpg">Sheesh Mahal Chamber</option>
              <option value="/images/hero_haveli.jpg">Grand Haveli Pol Entrance</option>
              <option value="/images/food/dal-baati.jpg">Traditional Royal Feast</option>
              <option value="/images/rooms/jharokha-room.jpg">Jharokha Balcony View</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#D4CBBB]">Your Royal Story &amp; Experience *</label>
            <textarea
              required
              rows={3}
              placeholder="Tell us what made this event so unforgettable at Rajmahal..."
              value={story}
              onChange={(e) => setStory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#1C1814] text-[#FAF8F3] rounded-lg border border-[#3D352C] focus:outline-none focus:border-[#B08D57]"
            />
          </div>

          <div className="pt-4 border-t border-[#3D352C] flex items-center justify-end space-x-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAddModalOpen(false)}
              className="text-xs text-[#9A8E7F]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#670E10] hover:bg-[#821215] text-white text-xs font-bold px-4 py-2"
            >
              Add to Royal Memories
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
