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
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { roomsService } from '@/lib/services/rooms-service';
import { dataRepository } from '@/lib/data/repository';
import type { Room, HousekeepingState, RoomType } from '@/lib/types';

export default function RoomsHousekeepingPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [filterState, setFilterState] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Add room modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomTypeId, setNewRoomTypeId] = useState('');
  const [newRoomState, setNewRoomState] = useState<HousekeepingState>('available');
  const [newRoomNotes, setNewRoomNotes] = useState('');

  useEffect(() => {
    // Clear legacy localStorage
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('dashboard_rooms');
      } catch {}
    }

    setRoomTypes(dataRepository.getRoomTypes());
    const rts = dataRepository.getRoomTypes();
    if (rts.length > 0 && !newRoomTypeId) {
      setNewRoomTypeId(rts[0].id);
    }

    const unsubRooms = onSnapshot(
      collection(db, 'rooms'),
      (snap) => {
        if (!snap.empty) {
          setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Room[]);
        } else {
          setRooms(dataRepository.getRooms());
        }
      },
      () => setRooms(dataRepository.getRooms())
    );

    const unsubTypes = onSnapshot(
      collection(db, 'room_types'),
      (snap) => {
        if (!snap.empty) {
          setRoomTypes(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as RoomType[]);
        }
      },
      () => {}
    );

    return () => {
      unsubRooms();
      unsubTypes();
    };
  }, []);

  const fetchRoomsData = useCallback(() => {
    // Maintained for manual reload
  }, []);

  const handleStateChange = async (roomId: string, newState: HousekeepingState) => {
    try {
      await roomsService.updateRoomHousekeeping(roomId, newState);
    } catch {
      dataRepository.updateRoomHousekeeping(roomId, newState);
    }
  };

  const handleDeleteRoom = (roomId: string, roomNumber: string) => {
    if (window.confirm(`Are you sure you want to delete Room ${roomNumber}?`)) {
      dataRepository.deleteRoom(roomId);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber || !newRoomTypeId) return;

    try {
      await roomsService.addRoom({
        room_number: newRoomNumber.trim(),
        room_type_id: newRoomTypeId,
        housekeeping_state: newRoomState,
        notes: newRoomNotes || null,
      });
    } catch {
      dataRepository.addRoom({
        room_number: newRoomNumber.trim(),
        room_type_id: newRoomTypeId,
        housekeeping_state: newRoomState,
        notes: newRoomNotes || null,
      });
    }

    setIsAddModalOpen(false);
    setNewRoomNumber('');
    setNewRoomNotes('');
    fetchRoomsData();
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        r.room_number.toLowerCase().includes(q) ||
        (r.room_type?.name && r.room_type.name.toLowerCase().includes(q));
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
            Real-time palace chamber status, housekeeping state management, and suite allocations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRoomsData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8DCD2] bg-white text-[#4F0809] hover:bg-[#F6EAE0] text-xs font-medium shadow-xs transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-xs transition"
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
          {(['all', 'available', 'occupied', 'cleaning', 'dirty', 'maintenance'] as const).map(
            (st) => (
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
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#D8AA67]" />
              Add Chamber
            </button>
          </div>
        ) : (
          filteredRooms.map((room) => {
            const isOcc = room.housekeeping_state === 'occupied';
            const isAvail = room.housekeeping_state === 'available';
            const isClean = room.housekeeping_state === 'cleaning';
            const isDirty = room.housekeeping_state === 'dirty';

            return (
              <div
                key={room.id}
                className={`p-3 rounded-xl border shadow-xs transition hover:shadow-md flex flex-col justify-between ${
                  isOcc
                    ? 'bg-white border-[#4F0809]/40'
                    : isAvail
                    ? 'bg-white border-[#2E7D32]/40'
                    : isClean
                    ? 'bg-amber-50/50 border-amber-300'
                    : 'bg-red-50/40 border-red-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-base font-bold text-[#302421]"
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    >
                      Room {room.room_number}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          isOcc
                            ? 'bg-[#4F0809] text-white'
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
                        onClick={() => handleDeleteRoom(room.id, room.room_number)}
                        title="Delete Chamber"
                        className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-[10px] text-[#81736D] truncate mb-2">
                    {room.room_type?.name || 'Heritage Suite'}
                  </div>
                </div>

                {/* Quick Actions Dropdown */}
                <div className="pt-2 border-t border-[#E8DCD2] flex items-center justify-between gap-1.5">
                  <select
                    value={room.housekeeping_state}
                    onChange={(e) => handleStateChange(room.id, e.target.value as any)}
                    className="w-full text-[10px] py-1 px-1.5 rounded border border-[#E8DCD2] bg-[#FBF6EF] text-[#302421] focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="dirty">Dirty</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Add Room Modal ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DCD2] rounded-2xl max-w-md w-full p-5 shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#FBF6EF] text-[#81736D]"
            >
              ✕
            </button>
            <h2
              className="text-xl font-bold text-[#4F0809] mb-1"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Add Palace Chamber
            </h2>
            <p className="text-xs text-[#81736D] mb-4">
              Register a new room or royal suite in the inventory
            </p>

            <form onSubmit={handleCreateRoom} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Chamber / Room Number *
                </label>
                <input
                  type="text"
                  required
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  placeholder="e.g. 401"
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                    Chamber Type *
                  </label>
                  <select
                    value={newRoomTypeId}
                    onChange={(e) => setNewRoomTypeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                  >
                    {roomTypes.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                    Initial State
                  </label>
                  <select
                    value={newRoomState}
                    onChange={(e) => setNewRoomState(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                  >
                    <option value="available">Available / Clean</option>
                    <option value="occupied">Occupied</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="dirty">Dirty</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Chamber Amenities / Balcony Notes
                </label>
                <textarea
                  rows={2}
                  value={newRoomNotes}
                  onChange={(e) => setNewRoomNotes(e.target.value)}
                  placeholder="e.g. Aravalli view, marble bathtub, heritage jharokha..."
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#E8DCD2] text-[#81736D] hover:bg-[#FBF6EF] text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-sm transition"
                >
                  Save Chamber
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
