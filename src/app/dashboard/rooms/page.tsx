'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BedDouble,
  Sparkles,
  AlertCircle,
  Wrench,
  CheckCircle2,
  RotateCw,
  Plus,
  Building,
  ClipboardList,
  Search,
  Filter,
  Trash2,
  Upload,
  Image as ImageIcon,
  Camera,
  X,
  Pencil,
  Users,
  Check,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { roomsService } from '@/lib/services/rooms-service';
import { dataRepository } from '@/lib/data/repository';
import type { Room, HousekeepingState, RoomType } from '@/lib/types';

const CHAMBER_CATEGORIES = [
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    name: 'Deluxe Room',
    badge: 'ROYAL LUXURY',
    rate: '₹6,500 / night',
    defaultPrice: 6500,
    defaultBed: 'Plush King Bed',
    defaultAmenities: [
      'Complimentary Wi-Fi',
      'Air Conditioning (AC)',
      '24x7 Room Service',
      'In-room Dining',
      'Valet Parking',
      'Plush King Bed',
      'Luxury Toiletries',
      '4K Smart TV',
    ],
    defaultDesc: 'Spacious royal deluxe chamber with handcrafted furnishings, plush king bed, deep marble bath, and palace vistas.',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    name: 'Non-Deluxe Room',
    badge: 'HERITAGE STANDARD',
    rate: '₹4,500 / night',
    defaultPrice: 4500,
    defaultBed: 'Classic Double Bed',
    defaultAmenities: [
      'Complimentary Wi-Fi',
      'Air Conditioning (AC)',
      '24x7 Room Service',
      'In-room Dining',
      'Valet Parking',
      'En-suite Bathroom',
      'Smart TV',
    ],
    defaultDesc: 'Comfortable heritage non-deluxe chamber featuring classic Rajputana architecture, cozy double bed, and essential palace comforts.',
  },
] as const;

const PRESET_AMENITIES = [
  'Complimentary Wi-Fi',
  'Air Conditioning (AC)',
  '24x7 Room Service',
  'In-room Dining',
  'Valet Parking',
  'Plush King Bed',
  'Classic Double Bed',
  'Luxury Toiletries',
  '4K Smart TV',
  'Smart TV',
  'En-suite Bathroom',
  'Private Balcony',
  'Mini Bar',
  'Deep Marble Bath',
  'Tea & Coffee Maker',
];

const ROOM_PHOTO_SLOTS = [
  { id: 1, label: 'Cover Photo', desc: 'Main Chamber', badge: '👑 Cover' },
  { id: 2, label: 'Bedroom', desc: 'Plush Bedding', badge: '🛏️ Bed' },
  { id: 3, label: 'Royal Bath', desc: 'Marble Vanity', badge: '🛁 Bath' },
  { id: 4, label: 'Balcony / View', desc: 'Palace Vista', badge: '🌅 View' },
  { id: 5, label: 'Living Lounge', desc: 'Seating Area', badge: '🛋️ Living' },
  { id: 6, label: 'Amenities', desc: 'Heritage Decor', badge: '✨ Details' },
] as const;

export default function RoomsHousekeepingPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [filterState, setFilterState] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Add / Edit room modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomTypeId, setNewRoomTypeId] = useState('d0000000-0000-0000-0000-000000000001');
  const [newRoomPrice, setNewRoomPrice] = useState('6500');
  const [newRoomCapacity, setNewRoomCapacity] = useState('2');
  const [newRoomBedType, setNewRoomBedType] = useState('Plush King Bed');
  const [newRoomState, setNewRoomState] = useState<HousekeepingState>('available');
  const [newRoomAmenities, setNewRoomAmenities] = useState<string[]>([...CHAMBER_CATEGORIES[0].defaultAmenities]);
  const [customAmenity, setCustomAmenity] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState<string>(CHAMBER_CATEGORIES[0].defaultDesc);
  const [newRoomNotes, setNewRoomNotes] = useState('');
  const [newRoomImages, setNewRoomImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleBatchUpload = (files: FileList | File[]) => {
    const valid = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (valid.length === 0) return;

    const remainingSlots = 6 - newRoomImages.length;
    const toProcess = valid.slice(0, remainingSlots > 0 ? remainingSlots : 6);

    const readers = toProcess.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((results) => {
      setNewRoomImages((prev) => {
        const next = [...prev, ...results.filter(Boolean)];
        return next.slice(0, 6);
      });
    });
  };

  const handleSlotFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (result) {
        setNewRoomImages((prev) => {
          const next = [...prev];
          next[index] = result;
          return next.slice(0, 6);
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveSlotImage = (index: number) => {
    setNewRoomImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleBatchUpload(e.dataTransfer.files);
    }
  };

  const fetchRoomsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        if (data.rooms && Array.isArray(data.rooms)) {
          setRooms(data.rooms);
          if (typeof window !== 'undefined') {
            localStorage.setItem('rajmahal_rooms', JSON.stringify(data.rooms));
          }
        }
        if (data.roomTypes && Array.isArray(data.roomTypes)) {
          setRoomTypes(data.roomTypes);
        }
      }
    } catch (err) {
      console.warn('Error fetching /api/rooms:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Initial hydration from cache and repository
    const initialTypes = dataRepository.getRoomTypes();
    setRoomTypes(initialTypes);

    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const searchVal = params.get('search');
        if (searchVal) setSearchQuery(searchVal);

        const cached = localStorage.getItem('rajmahal_rooms');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRooms(parsed);
          } else {
            setRooms(dataRepository.getRooms());
          }
        } else {
          setRooms(dataRepository.getRooms());
        }
      } catch {
        setRooms(dataRepository.getRooms());
      }
    } else {
      setRooms(dataRepository.getRooms());
    }

    // 2. Fetch live data from /api/rooms
    fetchRoomsData();

    // 3. Subscribe to Firestore updates
    const unsubRooms = onSnapshot(
      collection(db, 'rooms'),
      (snap) => {
        if (!snap.empty) {
          const rts = dataRepository.getRoomTypes();
          const liveRooms = snap.docs.map((d) => {
            const data = d.data();
            const typeId = data.room_type_id || rts[0]?.id;
            const matchedType = rts.find((rt) => rt.id === typeId) || rts[0];
            const isNonDeluxe =
              typeId === 'd0000000-0000-0000-0000-000000000002' ||
              (data.room_type_name && data.room_type_name.toLowerCase().includes('non')) ||
              (data.room_category && data.room_category.toLowerCase().includes('non'));
            const categoryName = data.room_category || data.room_type_name || matchedType.name;
            const photos = data.images || data.photos || matchedType.photos || [];

            return {
              id: d.id,
              room_number: data.room_number,
              room_type_id: typeId,
              housekeeping_state: data.housekeeping_state || 'available',
              notes: data.notes || null,
              images: photos,
              photos: photos,
              room_category: categoryName,
              room_type_name: categoryName,
              category_badge: data.category_badge || (isNonDeluxe ? 'HERITAGE STANDARD' : 'ROYAL LUXURY'),
              base_rate_minor: data.base_rate_minor ?? matchedType.base_rate_minor,
              price_per_night: data.price_per_night ?? Math.round((data.base_rate_minor ?? matchedType.base_rate_minor) / 100),
              capacity: data.capacity ?? matchedType.capacity,
              bed_type: data.bed_type || (isNonDeluxe ? 'Classic Double Bed' : 'Plush King Bed'),
              amenities: data.amenities || matchedType.amenities,
              description: data.description || matchedType.description,
              room_type: data.room_type || {
                ...matchedType,
                name: categoryName,
                base_rate_minor: data.base_rate_minor ?? matchedType.base_rate_minor,
                amenities: data.amenities || matchedType.amenities,
                photos: photos,
              },
            } as Room;
          });
          setRooms(liveRooms);
          if (typeof window !== 'undefined') {
            localStorage.setItem('rajmahal_rooms', JSON.stringify(liveRooms));
          }
        }
      },
      () => {}
    );

    return () => {
      unsubRooms();
    };
  }, [fetchRoomsData]);

  const handleStateChange = async (roomId: string, newState: HousekeepingState) => {
    setRooms((prev) => {
      const updated = prev.map((r) => (r.id === roomId ? { ...r, housekeeping_state: newState } : r));
      if (typeof window !== 'undefined') {
        localStorage.setItem('rajmahal_rooms', JSON.stringify(updated));
      }
      return updated;
    });

    try {
      await roomsService.updateRoomHousekeeping(roomId, newState);
    } catch {
      dataRepository.updateRoomHousekeeping(roomId, newState);
    }
  };

  const handleDeleteRoom = async (roomId: string, roomNumber: string) => {
    if (window.confirm(`Are you sure you want to delete Room ${roomNumber}?`)) {
      setRooms((prev) => {
        const updated = prev.filter((r) => r.id !== roomId);
        if (typeof window !== 'undefined') {
          localStorage.setItem('rajmahal_rooms', JSON.stringify(updated));
        }
        return updated;
      });

      try {
        await fetch(`/api/rooms?id=${roomId}`, { method: 'DELETE' });
      } catch {
        dataRepository.deleteRoom(roomId);
      }
    }
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const openAddModal = () => {
    const defCat = CHAMBER_CATEGORIES[0];
    setEditingRoom(null);
    setNewRoomNumber('');
    setNewRoomTypeId(defCat.id);
    setNewRoomPrice(String(defCat.defaultPrice));
    setNewRoomCapacity('2');
    setNewRoomBedType(defCat.defaultBed);
    setNewRoomState('available');
    setNewRoomAmenities([...defCat.defaultAmenities]);
    setCustomAmenity('');
    setNewRoomDescription(defCat.defaultDesc);
    setNewRoomNotes('');
    setNewRoomImages([]);
    setActionError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (room: Room) => {
    const isNonDeluxe =
      room.room_type_id === 'd0000000-0000-0000-0000-000000000002' ||
      (room.room_category || room.room_type?.name || '').toLowerCase().includes('non');
    const cat = isNonDeluxe ? CHAMBER_CATEGORIES[1] : CHAMBER_CATEGORIES[0];

    const resolvedPrice =
      room.price_per_night ||
      (room.base_rate_minor ? Math.round(room.base_rate_minor / 100) : cat.defaultPrice);
    const resolvedAmenities =
      room.amenities && room.amenities.length > 0
        ? [...room.amenities]
        : room.room_type?.amenities
        ? [...room.room_type.amenities]
        : [...cat.defaultAmenities];
    const resolvedImages =
      room.images && room.images.length > 0
        ? [...room.images]
        : room.photos && room.photos.length > 0
        ? [...room.photos]
        : [];

    setEditingRoom(room);
    setNewRoomNumber(room.room_number || '');
    setNewRoomTypeId(cat.id);
    setNewRoomPrice(String(resolvedPrice));
    setNewRoomCapacity(String(room.capacity || room.room_type?.capacity || 2));
    setNewRoomBedType(room.bed_type || cat.defaultBed);
    setNewRoomState(room.housekeeping_state || 'available');
    setNewRoomAmenities(resolvedAmenities);
    setCustomAmenity('');
    setNewRoomDescription(room.description || room.room_type?.description || cat.defaultDesc);
    setNewRoomNotes(room.notes || '');
    setNewRoomImages(resolvedImages.slice(0, 6));
    setActionError(null);
    setIsAddModalOpen(true);
  };

  const handleCategoryChange = (catId: string) => {
    const cat = CHAMBER_CATEGORIES.find((c) => c.id === catId) || CHAMBER_CATEGORIES[0];
    setNewRoomTypeId(cat.id);
    if (!editingRoom || newRoomPrice === '6500' || newRoomPrice === '4500') {
      setNewRoomPrice(String(cat.defaultPrice));
    }
    if (!editingRoom || newRoomBedType === 'Plush King Bed' || newRoomBedType === 'Classic Double Bed') {
      setNewRoomBedType(cat.defaultBed);
    }
    if (!editingRoom) {
      setNewRoomAmenities([...cat.defaultAmenities]);
      setNewRoomDescription(cat.defaultDesc);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setNewRoomAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const handleAddCustomAmenity = () => {
    const trimmed = customAmenity.trim();
    if (!trimmed) return;
    if (!newRoomAmenities.includes(trimmed)) {
      setNewRoomAmenities((prev) => [...prev, trimmed]);
    }
    setCustomAmenity('');
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber.trim()) return;

    setIsSubmitting(true);
    setActionError(null);

    const cleanNum = newRoomNumber.trim().replace(/^(room|chamber)\s*/i, '');
    const cat = CHAMBER_CATEGORIES.find((c) => c.id === newRoomTypeId) || CHAMBER_CATEGORIES[0];
    const parsedPrice = Math.max(100, Number(newRoomPrice) || cat.defaultPrice);
    const parsedCap = Math.max(1, Number(newRoomCapacity) || 2);

    const payload = {
      ...(editingRoom ? { id: editingRoom.id } : {}),
      room_number: cleanNum,
      room_type_id: cat.id,
      room_category: cat.name,
      price_per_night: parsedPrice,
      base_rate_minor: parsedPrice * 100,
      capacity: parsedCap,
      bed_type: newRoomBedType.trim() || cat.defaultBed,
      housekeeping_state: newRoomState,
      amenities: newRoomAmenities,
      description: newRoomDescription.trim() || cat.defaultDesc,
      notes: newRoomNotes.trim() || null,
      images: newRoomImages,
      photos: newRoomImages,
    };

    try {
      const res = await fetch('/api/rooms', {
        method: editingRoom ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let savedRoom: Room;
      if (res.ok) {
        const data = await res.json();
        savedRoom = data.room;
      } else {
        if (editingRoom) {
          savedRoom = {
            ...editingRoom,
            ...payload,
          } as Room;
          dataRepository.updateRoom(editingRoom.id, savedRoom);
        } else {
          savedRoom = dataRepository.addRoom(payload);
        }
      }

      setRooms((prev) => {
        const updated = editingRoom
          ? prev.map((r) => (r.id === editingRoom.id ? savedRoom : r))
          : [savedRoom, ...prev.filter((r) => r.id !== savedRoom.id && r.room_number !== cleanNum)];
        if (typeof window !== 'undefined') {
          localStorage.setItem('rajmahal_rooms', JSON.stringify(updated));
        }
        return updated;
      });

      setIsAddModalOpen(false);
      setEditingRoom(null);
      setNewRoomNumber('');
      setNewRoomNotes('');
      setNewRoomImages([]);
      showToast(
        editingRoom
          ? `Room ${cleanNum} updated & saved in Firestore!`
          : `Room ${cleanNum} added to palace inventory!`
      );
      fetchRoomsData();
    } catch (err: any) {
      console.error('Error saving room:', err);
      setActionError(err.message || 'Failed to save chamber');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        r.room_number.toLowerCase().includes(q) ||
        (r.room_type?.name && r.room_type.name.toLowerCase().includes(q)) ||
        (r.room_category && r.room_category.toLowerCase().includes(q)) ||
        (r.bed_type && r.bed_type.toLowerCase().includes(q));
      const matchesFilter = filterState === 'all' || r.housekeeping_state === filterState;
      return matchesSearch && matchesFilter;
    });
  }, [rooms, searchQuery, filterState]);

  // Metric counts
  const totalCount = rooms.length;
  const availableCount = rooms.filter((r) => r.housekeeping_state === 'available').length;
  const occupiedCount = rooms.filter((r) => r.housekeeping_state === 'occupied').length;
  const dirtyCount = rooms.filter((r) => r.housekeeping_state === 'dirty').length;
  const cleaningCount = rooms.filter((r) => r.housekeeping_state === 'cleaning').length;

  return (
    <div className="space-y-4">
      {/* ── Success Toast ── */}
      {successToast && (
        <div className="p-3 rounded-xl bg-[#2E7D32]/10 border border-[#2E7D32]/30 text-[#2E7D32] text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-[#2E7D32] hover:opacity-75 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8DCD2]">
        <div>
          <h1
            className="text-2xl font-bold text-[#4F0809]"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Chambers &amp; Room Availability
          </h1>
          <p className="text-xs text-[#81736D] mt-0.5">
            Real-time palace chamber status, pricing, amenities, photos, and housekeeping state management
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRoomsData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8DCD2] bg-white text-[#4F0809] hover:bg-[#F6EAE0] text-xs font-medium shadow-xs transition cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#D8AA67]" />
            Add Chamber
          </button>
        </div>
      </div>

      {/* ── Metric Summary ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-[#81736D] uppercase font-bold tracking-wider block">
            Total Chambers
          </span>
          <span className="text-xl font-bold text-[#302421] mt-0.5 block">{totalCount}</span>
          <span className="text-[10px] text-[#81736D]">Across all palace wings</span>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-[#2E7D32] uppercase font-bold tracking-wider block">
            Available Ready
          </span>
          <span className="text-xl font-bold text-[#2E7D32] mt-0.5 block">{availableCount}</span>
          <span className="text-[10px] text-[#2E7D32]">Clean &amp; inspected</span>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-[#4F0809] uppercase font-bold tracking-wider block">
            Occupied Suites
          </span>
          <span className="text-xl font-bold text-[#4F0809] mt-0.5 block">{occupiedCount}</span>
          <span className="text-[10px] text-[#81736D]">
            {Math.round((occupiedCount / (totalCount || 1)) * 100)}% Occupancy
          </span>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-[#D97706] uppercase font-bold tracking-wider block">
            In Cleaning
          </span>
          <span className="text-xl font-bold text-[#D97706] mt-0.5 block">{cleaningCount}</span>
          <span className="text-[10px] text-[#81736D]">Attendant turnaround</span>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-red-600 uppercase font-bold tracking-wider block">
            Dirty / Turnover
          </span>
          <span className="text-xl font-bold text-red-600 mt-0.5 block">{dirtyCount}</span>
          <span className="text-[10px] text-[#81736D]">Needs housekeeping</span>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#81736D]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search room number or suite type..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-[#FBF6EF]/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F0809]"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(
            ['all', 'available', 'unavailable', 'occupied', 'cleaning', 'dirty', 'maintenance'] as const
          ).map((st) => (
              <button
                key={st}
                onClick={() => setFilterState(st)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize whitespace-nowrap transition ${
                  filterState === st
                    ? 'bg-[#4F0809] text-white shadow-xs'
                    : 'bg-[#FBF6EF] text-[#81736D] hover:text-[#302421]'
                }`}
              >
                {st}
              </button>
            )
          )}
        </div>
      </div>

      {/* ── Room Cards Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filteredRooms.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white border border-[#E8DCD2] rounded-2xl p-6">
            <div className="w-12 h-12 rounded-full bg-[#FBF6EF] text-[#B78A48] flex items-center justify-center mx-auto mb-3">
              <BedDouble className="w-6 h-6" />
            </div>
            <h3
              className="text-lg font-bold text-[#302421]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              No Palace Chambers Found
            </h3>
            <p className="text-xs text-[#81736D] max-w-sm mx-auto mt-1 mb-4">
              {rooms.length === 0
                ? 'No rooms exist in the palace inventory yet. Add your first chamber to start managing occupancy and housekeeping.'
                : 'No rooms match the current search or filter criteria.'}
            </p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#D8AA67]" />
              Add Chamber
            </button>
          </div>
        ) : (
          filteredRooms.map((room) => {
            const isOcc = room.housekeeping_state === 'occupied';
            const isUnavailable = room.housekeeping_state === 'unavailable';
            const isAvail = room.housekeeping_state === 'available';
            const isClean = room.housekeeping_state === 'cleaning';
            const roomImg =
              (room.images && room.images.length > 0)
                ? room.images[0]
                : (room.photos && room.photos.length > 0)
                ? room.photos[0]
                : (room.room_type?.photos && room.room_type.photos.length > 0)
                ? room.room_type.photos[0]
                : '/images/rooms/deluxe-garden.jpg';

            return (
              <div
                key={room.id}
                className={`p-3 rounded-xl border shadow-xs transition hover:shadow-md flex flex-col justify-between ${
                  isOcc
                    ? 'bg-white border-[#4F0809]/40'
                    : isUnavailable
                    ? 'bg-rose-50/50 border-rose-300'
                    : isAvail
                    ? 'bg-white border-[#2E7D32]/40'
                    : isClean
                    ? 'bg-amber-50/50 border-amber-300'
                    : 'bg-red-50/40 border-red-200'
                }`}
              >
                <div>
                  {/* Chamber Photo Thumbnail */}
                  <div
                    onClick={() => openEditModal(room)}
                    className="relative w-full h-24 rounded-lg overflow-hidden mb-2 bg-[#F5ECDC] group cursor-pointer"
                    title="Click to Edit Chamber"
                  >
                    <img
                      src={roomImg}
                      alt={`Room ${room.room_number}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-bold text-[#FFF8EB] font-mono">
                      № {room.room_number}
                    </div>
                    {((room.images && room.images.length > 1) || (room.photos && room.photos.length > 1)) && (
                      <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[9px] font-semibold text-[#FFF8EB] flex items-center gap-1">
                        <Camera className="w-3 h-3 text-[#D8AA67]" />
                        {(room.images || room.photos)?.length}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-base font-bold text-[#302421]"
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    >
                      Room {room.room_number}
                    </span>
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          isOcc
                            ? 'bg-[#4F0809] text-white'
                            : isUnavailable
                            ? 'bg-rose-100 text-rose-800'
                            : isAvail
                            ? 'bg-[#2E7D32]/15 text-[#2E7D32]'
                            : isClean
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {room.housekeeping_state}
                      </span>
                      <button
                        type="button"
                        onClick={() => openEditModal(room)}
                        title="Edit Chamber Details"
                        className="p-1 text-[#8F6628] hover:text-[#4F0809] hover:bg-[#F5ECDC] rounded transition cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoom(room.id, room.room_number)}
                        title="Delete Chamber"
                        className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#81736D] mb-1">
                    <span className="font-semibold text-[#8F6628] truncate">
                      {room.room_category || room.room_type?.name || 'Deluxe Room'}
                    </span>
                    <span className="font-bold text-[#4F0809] shrink-0">
                      ₹{((room.base_rate_minor || room.room_type?.base_rate_minor || 650000) / 100).toLocaleString('en-IN')}/nt
                    </span>
                  </div>
                  <div className="text-[9px] text-[#81736D] flex items-center justify-between truncate mb-2">
                    <span className="truncate">{room.bed_type || 'King Bed'}</span>
                    <span className="shrink-0 text-[#8F6628] font-medium">
                      {room.capacity || 2}G • {(room.amenities || room.room_type?.amenities || []).length} Amenities
                    </span>
                  </div>
                </div>

                {/* Quick Actions: Status Dropdown + Edit Button */}
                <div className="pt-2 border-t border-[#E8DCD2] flex items-center justify-between gap-1.5">
                  <select
                    value={room.housekeeping_state}
                    onChange={(e) => handleStateChange(room.id, e.target.value as any)}
                    className="flex-1 text-[10px] py-1 px-1.5 rounded-lg border border-[#E8DFCE] bg-[#F5ECDC] text-[#4F0809] font-semibold focus:ring-1 focus:ring-[#4F0809] focus:outline-none cursor-pointer"
                  >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                    <option value="occupied">Occupied</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="dirty">Dirty</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => openEditModal(room)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#F5ECDC] hover:bg-[#4F0809] text-[#4F0809] hover:text-[#FDF8EE] border border-[#D8AA67]/50 text-[10px] font-bold transition cursor-pointer shrink-0"
                    title="Edit Chamber Details"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Add / Edit Palace Chamber Modal (Royal Heritage Palace Theme) ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FDF8EE] border border-[#E8DFCE] rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative text-[#4F0809] animate-fade-in">
            {/* Royal Maroon Header with Gold Ornaments */}
            <div className="bg-gradient-to-r from-[#4F0809] via-[#651012] to-[#4F0809] text-[#FFF8EB] p-5 relative border-b border-[#D8AA67]/40 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingRoom(null);
                  setNewRoomImages([]);
                }}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#D8AA67] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                ✕
              </button>

              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#D8AA67]/20 border border-[#D8AA67]/40 flex items-center justify-center shrink-0 text-[#D8AA67] shadow-inner">
                  {editingRoom ? <Pencil className="w-5 h-5" /> : <BedDouble className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-bold text-[#D8AA67] tracking-[0.2em] uppercase">
                      Palace Inventory
                    </span>
                    <span className="text-[#D8AA67] text-[8px]">&#9830;</span>
                    <span className="text-[10px] text-[#FFF8EB]/80 font-medium">
                      {editingRoom ? `Editing Chamber № ${editingRoom.room_number}` : 'PMS Ledger'}
                    </span>
                  </div>
                  <h2
                    className="text-2xl font-bold text-[#FFF8EB] leading-tight"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    {editingRoom ? `Edit Palace Chamber (Room ${editingRoom.room_number})` : 'Add Palace Chamber'}
                  </h2>
                </div>
              </div>
            </div>

            {/* Error prompt */}
            {actionError && (
              <div className="m-4 p-3 rounded-xl bg-red-100 text-red-900 text-xs flex items-center space-x-2 border border-red-300 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleSaveRoom} className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Chamber Number */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1.5">
                  Chamber / Room Number *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-serif font-bold text-[#9C7A45]">
                    №
                  </span>
                  <input
                    type="text"
                    required
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    placeholder="e.g. 101, 204, Suite 301"
                    className="w-full h-11 pl-9 pr-3.5 text-xs sm:text-sm rounded-xl bg-[#F5ECDC] focus:bg-[#EFE2CC] border border-[#E8DFCE] focus:border-[#4F0809] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/50 font-semibold"
                  />
                </div>
              </div>

              {/* Chamber Type (Deluxe vs Non-Deluxe) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D]">
                    Chamber Category *
                  </label>
                  <span className="text-[10px] font-semibold text-[#9C7A45]">
                    Deluxe or Non-Deluxe
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {CHAMBER_CATEGORIES.map((cat) => {
                    const isSelected = newRoomTypeId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryChange(cat.id)}
                        className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#4F0809] bg-[#4F0809] text-[#FFF8EB] shadow-md ring-1 ring-[#D8AA67]'
                            : 'border-[#E8DFCE] bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-[#D8AA67]' : 'text-[#856B4D]'}`}>
                            {cat.badge}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#D8AA67]" />}
                        </div>
                        <div className="font-bold text-sm sm:text-base leading-snug">
                          {cat.name}
                        </div>
                        <div className={`text-[11px] font-medium mt-1 ${isSelected ? 'text-[#FFF8EB]/80' : 'text-[#856B4D]'}`}>
                          {cat.rate}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Per Night, Guest Capacity & Bed Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1.5">
                    Price / Night (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#9C7A45]">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="100"
                      required
                      value={newRoomPrice}
                      onChange={(e) => setNewRoomPrice(e.target.value)}
                      placeholder="6500"
                      className="w-full h-11 pl-7 pr-3 text-xs sm:text-sm rounded-xl bg-[#F5ECDC] focus:bg-[#EFE2CC] border border-[#E8DFCE] focus:border-[#4F0809] focus:outline-none text-[#4F0809] font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1.5">
                    Guest Capacity *
                  </label>
                  <div className="relative">
                    <Users className="w-3.5 h-3.5 text-[#9C7A45] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="1"
                      max="10"
                      required
                      value={newRoomCapacity}
                      onChange={(e) => setNewRoomCapacity(e.target.value)}
                      className="w-full h-11 pl-9 pr-3 text-xs sm:text-sm rounded-xl bg-[#F5ECDC] focus:bg-[#EFE2CC] border border-[#E8DFCE] focus:border-[#4F0809] focus:outline-none text-[#4F0809] font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1.5">
                    Bed Configuration *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoomBedType}
                    onChange={(e) => setNewRoomBedType(e.target.value)}
                    placeholder="Plush King Bed"
                    className="w-full h-11 px-3.5 text-xs sm:text-sm rounded-xl bg-[#F5ECDC] focus:bg-[#EFE2CC] border border-[#E8DFCE] focus:border-[#4F0809] focus:outline-none text-[#4F0809] font-semibold"
                  />
                </div>
              </div>

              {/* Chamber Housekeeping State */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1.5">
                  Chamber State *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'available', label: 'Available / Clean' },
                    { id: 'occupied', label: 'Occupied' },
                    { id: 'cleaning', label: 'Cleaning' },
                    { id: 'dirty', label: 'Needs Cleaning' },
                    { id: 'maintenance', label: 'Maintenance' },
                  ].map((s) => {
                    const isSel = newRoomState === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setNewRoomState(s.id as HousekeepingState)}
                        className={`py-2 px-2 rounded-xl border text-[11px] font-semibold text-center transition cursor-pointer ${
                          isSel
                            ? 'border-[#4F0809] bg-[#4F0809] text-[#FFF8EB] shadow-xs'
                            : 'border-[#E8DFCE] bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809]'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chamber Amenities (Toggleable + Custom Add) */}
              <div className="p-3.5 rounded-2xl bg-[#F5ECDC]/60 border border-[#E8DFCE] space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] uppercase tracking-wider font-bold text-[#856B4D]">
                    Chamber Amenities ({newRoomAmenities.length} Selected)
                  </label>
                  <span className="text-[10px] text-[#9C7A45] font-medium">
                    Click to toggle amenities
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {Array.from(new Set([...PRESET_AMENITIES, ...newRoomAmenities])).map((am) => {
                    const isIncluded = newRoomAmenities.includes(am);
                    return (
                      <button
                        key={am}
                        type="button"
                        onClick={() => toggleAmenity(am)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition cursor-pointer flex items-center gap-1 ${
                          isIncluded
                            ? 'bg-[#4F0809] text-[#FDF8EE] border-[#4F0809] shadow-2xs'
                            : 'bg-[#FDF8EE] text-[#856B4D] border-[#E8DFCE] hover:border-[#D8AA67]'
                        }`}
                      >
                        {isIncluded && <Check className="w-2.5 h-2.5 text-[#D8AA67]" />}
                        <span>{am}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    value={customAmenity}
                    onChange={(e) => setCustomAmenity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomAmenity();
                      }
                    }}
                    placeholder="Add custom amenity (e.g. Jharokha Seating, Jacuzzi)..."
                    className="flex-1 h-8 px-3 rounded-lg bg-[#FDF8EE] border border-[#E8DFCE] text-xs text-[#4F0809] placeholder-[#856B4D]/60 focus:border-[#4F0809] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAmenity}
                    className="px-3 h-8 rounded-lg bg-[#D8AA67]/25 hover:bg-[#D8AA67]/40 border border-[#D8AA67]/60 text-[#4F0809] text-[11px] font-bold transition cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Chamber Photographs / Gallery (5 - 6 Photos) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D]">
                      Chamber Photographs (5 - 6 Photos)
                    </label>
                    <span className="text-[10px] text-[#9C7A45]">
                      Upload 5 to 6 photos: Master view, bedroom, bathroom, balcony &amp; amenities
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-colors ${
                        newRoomImages.length >= 5
                          ? 'bg-[#2E7D32]/15 text-[#2E7D32] border border-[#2E7D32]/30'
                          : 'bg-[#D8AA67]/20 text-[#856B4D] border border-[#D8AA67]/40'
                      }`}
                    >
                      {newRoomImages.length >= 5 ? '✓ ' : ''}{newRoomImages.length} / 6 Photos
                    </span>
                  </div>
                </div>

                {/* Batch Upload & Drag-and-Drop Quick Bar */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-3 text-center transition flex items-center justify-between gap-3 mb-2.5 select-none ${
                    isDragging
                      ? 'border-[#4F0809] bg-[#EAE0D0] ring-2 ring-[#D8AA67]/40 scale-[0.99]'
                      : 'border-[#D8AA67]/60 hover:border-[#4F0809] bg-[#F5ECDC]/80 hover:bg-[#EFE2CC]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 text-left">
                    <div className="w-8 h-8 rounded-xl bg-[#4F0809]/10 border border-[#D8AA67]/40 flex items-center justify-center text-[#4F0809] shrink-0">
                      <Camera className="w-4 h-4 text-[#856B4D]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#4F0809]">
                        Drag &amp; drop all 5 - 6 photos together
                      </div>
                      <div className="text-[10px] text-[#856B4D]">
                        Select multiple images or upload slot by slot below
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="file"
                      id="room-batch-upload"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) handleBatchUpload(e.target.files);
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="room-batch-upload"
                      className="px-3 py-1.5 rounded-xl bg-[#4F0809] hover:bg-[#651012] text-[#FFF8EB] text-[11px] font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#D8AA67]" />
                      Upload 5-6 Photos
                    </label>

                    {newRoomImages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setNewRoomImages([])}
                        className="px-2 py-1 text-[10px] font-bold text-red-700 hover:text-red-900 transition cursor-pointer"
                        title="Remove all attached photos"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                {/* 6 Dedicated Chamber Photo Slots Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ROOM_PHOTO_SLOTS.map((slot, idx) => {
                    const img = newRoomImages[idx];
                    const inputId = `slot-photo-upload-${idx}`;

                    return (
                      <div
                        key={slot.id}
                        className="relative rounded-xl overflow-hidden border border-[#D8AA67]/50 bg-[#F5ECDC]/90 transition hover:shadow-xs group"
                      >
                        <input
                          type="file"
                          id={inputId}
                          accept="image/*"
                          onChange={(e) => handleSlotFileChange(idx, e)}
                          className="hidden"
                        />

                        {img ? (
                          /* Slot filled with image */
                          <div className="relative h-24 sm:h-26 w-full">
                            <img
                              src={img}
                              alt={slot.label}
                              className="w-full h-full object-cover"
                            />
                            {/* Slot Tag Badge */}
                            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/65 backdrop-blur-xs text-[9px] font-bold text-[#FFF8EB]">
                              {slot.badge}
                            </div>
                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSlotImage(idx);
                              }}
                              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center text-[10px] transition cursor-pointer shadow-xs"
                              title="Delete this photo"
                            >
                              ✕
                            </button>
                            {/* Replace Hover Overlay */}
                            <label
                              htmlFor={inputId}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[#FFF8EB] text-[10px] font-bold cursor-pointer gap-1"
                            >
                              <Camera className="w-4 h-4 text-[#D8AA67]" />
                              <span>Replace Photo</span>
                            </label>
                          </div>
                        ) : (
                          /* Empty Slot */
                          <label
                            htmlFor={inputId}
                            className="h-24 sm:h-26 p-2 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#EFE2CC] transition border-2 border-dashed border-[#D8AA67]/40 hover:border-[#4F0809] rounded-xl select-none"
                          >
                            <div className="w-7 h-7 rounded-lg bg-[#4F0809]/10 text-[#4F0809] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                              <Plus className="w-4 h-4 text-[#856B4D]" />
                            </div>
                            <span className="text-[10px] font-bold text-[#4F0809] leading-tight">
                              {slot.label}
                            </span>
                            <span className="text-[9px] text-[#856B4D]/80 mt-0.5">
                              {slot.desc}
                            </span>
                            <span className="text-[8px] font-semibold text-[#D8AA67] mt-1 bg-[#4F0809]/5 px-1.5 py-0.5 rounded">
                              + Photo {slot.id}
                            </span>
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chamber Description & Balcony Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1.5">
                    Chamber Description
                  </label>
                  <textarea
                    rows={2}
                    value={newRoomDescription}
                    onChange={(e) => setNewRoomDescription(e.target.value)}
                    placeholder="Royal suite description for website & booking ledger..."
                    className="w-full p-3 rounded-xl bg-[#F5ECDC] focus:bg-[#EFE2CC] border border-[#E8DFCE] focus:border-[#4F0809] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/50 text-xs resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1.5">
                    Balcony / Housekeeping Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={newRoomNotes}
                    onChange={(e) => setNewRoomNotes(e.target.value)}
                    placeholder="e.g. Palace courtyard garden view, deep marble bath, carved stone jharokha..."
                    className="w-full p-3 rounded-xl bg-[#F5ECDC] focus:bg-[#EFE2CC] border border-[#E8DFCE] focus:border-[#4F0809] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/50 text-xs resize-none"
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#E8DFCE]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingRoom(null);
                    setNewRoomImages([]);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809] text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#4F0809] hover:bg-[#6B1518] text-[#FFF8EB] text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin text-[#D8AA67]" />
                      <span>{editingRoom ? 'Updating Chamber...' : 'Saving Chamber...'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#D8AA67]" />
                      <span>{editingRoom ? 'Update Chamber' : 'Save Chamber'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
