'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle2,
  RotateCw,
  CheckSquare,
  Square,
  Wrench,
  Search,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { Room, HousekeepingState, Reservation } from '@/lib/types';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { dataRepository } from '@/lib/data/repository';

export default function HousekeepingOperationsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'priority_turnover' | 'cleaning' | 'stayovers' | 'available'>('all');
  const [selectedRoomForChecklist, setSelectedRoomForChecklist] = useState<Room | null>(null);

  // Turnover checklist items
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>({
    linens: false,
    towels: false,
    minibar: false,
    sanitized: false,
    amenities: false,
    ac_lights: false,
  });

  useEffect(() => {
    // Clear legacy localStorage
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('dashboard_housekeeping');
      } catch {}
    }

    const unsubRooms = onSnapshot(
      collection(db, 'rooms'),
      (snap) => {
        if (!snap.empty) {
          setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Room[]);
        } else {
          setRooms(dataRepository.getRooms());
        }
        setIsLoading(false);
      },
      () => {
        setRooms(dataRepository.getRooms());
        setIsLoading(false);
      }
    );

    const unsubRes = onSnapshot(
      collection(db, 'reservations'),
      (snap) => {
        if (!snap.empty) {
          setReservations(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Reservation[]);
        } else {
          setReservations([]);
        }
      },
      () => setReservations([])
    );

    return () => {
      unsubRooms();
      unsubRes();
    };
  }, []);

  const loadHousekeepingData = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 400);
  };

  // Update housekeeping state via API & local sync
  const updateRoomState = async (roomId: string, nextState: HousekeepingState, notes?: string) => {
    try {
      await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          housekeeping_state: nextState,
          ...(notes ? { notes } : {}),
        }),
      });
    } catch {
      // Fallback local update
    }
    dataRepository.updateRoomHousekeeping(roomId, nextState);
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, housekeeping_state: nextState, ...(notes ? { notes } : {}) } : r))
    );
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Compute room urgency priorities
  const classifiedRooms = useMemo(() => {
    return rooms.map((room) => {
      // Find active or upcoming reservation for this room
      const activeRes = reservations.find((res) => res.room_id === room.id && res.status === 'checked_in');
      const arrivingRes = reservations.find(
        (res) => res.room_id === room.id && res.status === 'confirmed' && res.check_in === todayStr
      );

      let priorityLevel = 4; // default / available
      let priorityTag = 'Routine Clean';

      if (room.housekeeping_state === 'dirty') {
        if (arrivingRes) {
          priorityLevel = 1; // Highest: Arriving today!
          priorityTag = 'URGENT: Arrival Today';
        } else {
          priorityLevel = 2; // Vacant dirty
          priorityTag = 'Vacant Turnover';
        }
      } else if (room.housekeeping_state === 'cleaning') {
        priorityLevel = 2;
        priorityTag = 'In Progress';
      } else if (room.housekeeping_state === 'occupied') {
        priorityLevel = 3;
        priorityTag = 'Stayover Refresh';
      } else if (room.housekeeping_state === 'maintenance') {
        priorityLevel = 5;
        priorityTag = 'Maintenance Hold';
      }

      return {
        ...room,
        priorityLevel,
        priorityTag,
        activeRes,
        arrivingRes,
      };
    });
  }, [rooms, reservations, todayStr]);

  // Sort by priority level (1 highest, then 2, 3...)
  const sortedRooms = useMemo(() => {
    return [...classifiedRooms].sort((a, b) => {
      if (a.priorityLevel !== b.priorityLevel) return a.priorityLevel - b.priorityLevel;
      return a.room_number.localeCompare(b.room_number, undefined, { numeric: true });
    });
  }, [classifiedRooms]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return sortedRooms.filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        r.room_number.toLowerCase().includes(q) ||
        (r.room_type?.name && r.room_type.name.toLowerCase().includes(q));

      if (activeTab === 'priority_turnover') return r.priorityLevel === 1 || (r.housekeeping_state === 'dirty' && matchesSearch);
      if (activeTab === 'cleaning') return r.housekeeping_state === 'cleaning' && matchesSearch;
      if (activeTab === 'stayovers') return r.housekeeping_state === 'occupied' && matchesSearch;
      if (activeTab === 'available') return r.housekeeping_state === 'available' && matchesSearch;
      return matchesSearch;
    });
  }, [sortedRooms, searchQuery, activeTab]);

  // Summary counts
  const urgentCount = classifiedRooms.filter((r) => r.priorityLevel === 1).length;
  const dirtyCount = classifiedRooms.filter((r) => r.housekeeping_state === 'dirty').length;
  const cleaningCount = classifiedRooms.filter((r) => r.housekeeping_state === 'cleaning').length;
  const stayoverCount = classifiedRooms.filter((r) => r.housekeeping_state === 'occupied').length;
  const availableCount = classifiedRooms.filter((r) => r.housekeeping_state === 'available').length;

  const handleOpenChecklist = (room: Room) => {
    setSelectedRoomForChecklist(room);
    setChecklist({
      linens: false,
      towels: false,
      minibar: false,
      sanitized: false,
      amenities: false,
      ac_lights: false,
    });
  };

  const handleCompleteChecklist = () => {
    if (!selectedRoomForChecklist) return;
    updateRoomState(selectedRoomForChecklist.id, 'available', 'Cleaned & inspected via digital checklist');
    setSelectedRoomForChecklist(null);
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3D352C]">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#670E10] text-white text-[11px] font-bold border border-[#B08D57]/40">
              Palace Housekeeping &amp; Chambers
            </span>
            <span className="text-xs text-[#B08D57] font-semibold">Priority Turnover Queue</span>
          </div>
          <h1 className="font-heritage text-2xl sm:text-3xl font-bold text-[#FAF8F3]">
            Housekeeping &amp; Chamber Operations
          </h1>
          <p className="text-xs text-[#9A8E7F] mt-0.5">
            Turnover urgency ranking, one-tap mobile cleaning workflows, and digital inspection audit
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            size="sm"
            variant="outline"
            onClick={loadHousekeepingData}
            isLoading={isLoading}
            className="text-xs border-[#3D352C] text-[#FAF8F3] hover:bg-[#2A2420]"
          >
            <RotateCw className="w-3.5 h-3.5 mr-1.5" />
            <span>Sync Rooms</span>
          </Button>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-[#241F1A] border border-rose-900/60 shadow-xs">
          <span className="text-[11px] text-rose-400 font-bold uppercase tracking-wider block">Urgent Turnovers</span>
          <span className="font-heritage text-2xl font-bold text-rose-300 mt-1 block">{urgentCount}</span>
          <span className="text-[10px] text-[#9A8E7F]">Arriving today</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#241F1A] border border-amber-900/50 shadow-xs">
          <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider block">Dirty / Turnover</span>
          <span className="font-heritage text-2xl font-bold text-amber-300 mt-1 block">{dirtyCount}</span>
          <span className="text-[10px] text-[#9A8E7F]">Needs cleaning</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#241F1A] border border-blue-900/50 shadow-xs">
          <span className="text-[11px] text-blue-400 font-bold uppercase tracking-wider block">In Cleaning</span>
          <span className="font-heritage text-2xl font-bold text-blue-300 mt-1 block">{cleaningCount}</span>
          <span className="text-[10px] text-[#9A8E7F]">Maid inside chamber</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#241F1A] border border-[#3D352C] shadow-xs">
          <span className="text-[11px] text-[#B08D57] font-bold uppercase tracking-wider block">In-House Stayovers</span>
          <span className="font-heritage text-2xl font-bold text-[#FAF8F3] mt-1 block">{stayoverCount}</span>
          <span className="text-[10px] text-[#9A8E7F]">Daily refresh</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#241F1A] border border-emerald-900/50 shadow-xs">
          <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider block">Clean &amp; Inspected</span>
          <span className="font-heritage text-2xl font-bold text-emerald-300 mt-1 block">{availableCount}</span>
          <span className="text-[10px] text-[#9A8E7F]">Ready for keys</span>
        </div>
      </div>

      {/* ── Filter Tabs & Search Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#241F1A] p-3 rounded-xl border border-[#3D352C]">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#670E10] text-[#FAF8F3] shadow-xs'
                : 'text-[#9A8E7F] hover:text-[#FAF8F3] bg-[#2A2420]'
            }`}
          >
            All Chambers ({rooms.length})
          </button>
          <button
            onClick={() => setActiveTab('priority_turnover')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
              activeTab === 'priority_turnover'
                ? 'bg-rose-900 text-rose-100 shadow-xs'
                : 'text-rose-400 hover:text-rose-300 bg-[#2A2420]'
            }`}
          >
            <span>🔥 Priority Turnovers ({urgentCount + dirtyCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('cleaning')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'cleaning'
                ? 'bg-blue-900 text-blue-100 shadow-xs'
                : 'text-blue-400 hover:text-blue-300 bg-[#2A2420]'
            }`}
          >
            In Cleaning ({cleaningCount})
          </button>
          <button
            onClick={() => setActiveTab('stayovers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'stayovers'
                ? 'bg-[#8F7245] text-white shadow-xs'
                : 'text-[#B08D57] hover:text-[#FAF8F3] bg-[#2A2420]'
            }`}
          >
            Stayovers ({stayoverCount})
          </button>
          <button
            onClick={() => setActiveTab('available')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'available'
                ? 'bg-emerald-900 text-emerald-100 shadow-xs'
                : 'text-emerald-400 hover:text-emerald-300 bg-[#2A2420]'
            }`}
          >
            Inspected ({availableCount})
          </button>
        </div>

        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8F7245]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chamber # or suite..."
            className="w-full bg-[#2A2420] border border-[#3D352C] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#FAF8F3] placeholder-[#9A8E7F] focus:outline-none focus:border-[#B08D57]"
          />
        </div>
      </div>

      {/* ── Priority Queue Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRooms.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-[#241F1A] rounded-2xl border border-[#3D352C] text-[#9A8E7F]">
            No chambers matching current filter criteria.
          </div>
        ) : (
          filteredRooms.map((room) => {
            const hk = room.housekeeping_state;
            const isUrgent = room.priorityLevel === 1;

            return (
              <div
                key={room.id}
                className={`rounded-2xl p-5 border transition-all flex flex-col justify-between shadow-xs ${
                  isUrgent
                    ? 'bg-[#291717] border-rose-600/80 ring-1 ring-rose-500/50'
                    : hk === 'dirty'
                    ? 'bg-[#241F1A] border-amber-600/50'
                    : hk === 'cleaning'
                    ? 'bg-[#1C232B] border-blue-600/60'
                    : hk === 'occupied'
                    ? 'bg-[#241F1A] border-[#3D352C]'
                    : 'bg-[#19261E] border-emerald-700/60'
                }`}
              >
                <div>
                  {/* Top Chamber Bar */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${
                        isUrgent
                          ? 'bg-rose-900 text-rose-100 border border-rose-500'
                          : hk === 'available'
                          ? 'bg-emerald-900 text-emerald-100 border border-emerald-600'
                          : 'bg-[#2A2420] text-[#B08D57] border border-[#3D352C]'
                      }`}>
                        {room.room_number}
                      </div>
                      <div>
                        <h3 className="font-heritage text-base font-bold text-[#FAF8F3]">
                          Chamber {room.room_number}
                        </h3>
                        <span className="text-[11px] text-[#9A8E7F] block">
                          {room.room_type?.name || 'Heritage Suite'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isUrgent
                          ? 'bg-rose-950 text-rose-400 border border-rose-600 animate-pulse'
                          : hk === 'dirty'
                          ? 'bg-amber-950 text-amber-400 border border-amber-700'
                          : hk === 'cleaning'
                          ? 'bg-blue-950 text-blue-400 border border-blue-700'
                          : hk === 'occupied'
                          ? 'bg-stone-900 text-stone-300 border border-stone-700'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                      }`}
                    >
                      {room.priorityTag}
                    </span>
                  </div>

                  {/* Arriving Guest or In-House Context */}
                  {room.arrivingRes && (
                    <div className="mb-3 p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-xs text-rose-200 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-rose-400" />
                        <span className="font-semibold">{room.arrivingRes.guest?.name || 'Guest'} arrives today!</span>
                      </div>
                      <span className="font-mono text-[10px] text-rose-300">{room.arrivingRes.reference_code}</span>
                    </div>
                  )}

                  {room.activeRes && (
                    <div className="mb-3 p-2.5 rounded-xl bg-[#2A2420] border border-[#3D352C] text-xs text-[#FAF8F3] flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-[#B08D57]" />
                        <span>In-House: {room.activeRes.guest?.name || 'Guest'}</span>
                      </div>
                      <span className="text-[10px] text-[#9A8E7F]">Until {room.activeRes.check_out}</span>
                    </div>
                  )}

                  {room.notes && (
                    <p className="text-[11px] text-[#9A8E7F] mb-3 bg-[#2A2420]/60 p-2 rounded-lg border border-[#3D352C]">
                      📝 {room.notes}
                    </p>
                  )}
                </div>

                {/* Cleaner Action Flow Buttons */}
                <div className="pt-3 border-t border-[#3D352C] space-y-2">
                  {hk === 'dirty' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="gold"
                        onClick={() => updateRoomState(room.id, 'cleaning', 'Cleaner started chamber turnover')}
                        className="w-full text-xs"
                      >
                        Start Cleaning
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenChecklist(room)}
                        className="w-full text-xs text-[#FAF8F3] border-[#3D352C] hover:bg-[#2A2420]"
                      >
                        <CheckSquare className="w-3 h-3 mr-1" /> Checklist
                      </Button>
                    </div>
                  )}

                  {hk === 'cleaning' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenChecklist(room)}
                        className="w-full text-xs bg-emerald-800 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Mark Inspected
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateRoomState(room.id, 'maintenance', 'Reported snag during cleaning')}
                        className="w-full text-xs text-amber-400 hover:bg-amber-950/40"
                      >
                        <Wrench className="w-3 h-3 mr-1" /> Snag / Hold
                      </Button>
                    </div>
                  )}

                  {hk === 'occupied' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateRoomState(room.id, 'cleaning', 'Guest requested stayover refresh')}
                        className="w-full text-xs text-[#FAF8F3] border-[#3D352C] hover:bg-[#2A2420]"
                      >
                        Refresh Chamber
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateRoomState(room.id, 'dirty', 'Checked out / pending turnover')}
                        className="w-full text-xs text-[#9A8E7F] hover:text-[#FAF8F3]"
                      >
                        Mark Vacated
                      </Button>
                    </div>
                  )}

                  {hk === 'available' && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-400 font-bold flex items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Ready for Arrival
                      </span>
                      <button
                        onClick={() => updateRoomState(room.id, 'dirty', 'Reopened for inspection')}
                        className="text-[11px] text-[#9A8E7F] hover:text-[#FAF8F3] underline cursor-pointer"
                      >
                        Reset Dirty
                      </button>
                    </div>
                  )}

                  {hk === 'maintenance' && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-amber-400 font-bold flex items-center">
                        <Wrench className="w-3.5 h-3.5 mr-1" /> In Maintenance
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateRoomState(room.id, 'available', 'Maintenance completed and cleared')}
                        className="text-xs text-[#FAF8F3] border-[#3D352C]"
                      >
                        Release Room
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Chamber Inspection Checklist Modal ── */}
      {selectedRoomForChecklist && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedRoomForChecklist(null)}
          title={`Digital Inspection & Turnover: Room ${selectedRoomForChecklist.room_number}`}
          description={`Verify 6-point palace heritage standards before approving chamber for arrivals`}
        >
          <div className="space-y-4 text-xs text-[#241F1A]">
            <div className="space-y-2">
              {[
                { key: 'linens', label: 'Royal Linen & Silk Pillow Covers Changed' },
                { key: 'towels', label: 'Plush Bath Sheets & Robes Replaced' },
                { key: 'minibar', label: 'Minibar & Herbal Tea Service Restocked' },
                { key: 'sanitized', label: 'Marble Bathroom & Fixtures Deep Cleaned' },
                { key: 'amenities', label: 'Forest Essentials Toiletries Placed' },
                { key: 'ac_lights', label: 'Climate Control, Smart TV & Ambient Lights Tested' },
              ].map(({ key, label }) => {
                const checked = checklist[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setChecklist((prev) => ({ ...prev, [key]: !prev[key] }))}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                      checked
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold'
                        : 'bg-[#FAF8F3] border-[#D4CBBB] text-[#241F1A]'
                    }`}
                  >
                    <span>{label}</span>
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4 text-[#8F7245]" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-[#D4CBBB] flex justify-end space-x-3">
              <Button variant="ghost" onClick={() => setSelectedRoomForChecklist(null)}>
                Cancel
              </Button>
              <Button
                variant="gold"
                onClick={handleCompleteChecklist}
                className="flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve &amp; Mark Chamber Inspected</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
