'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { formatMoney } from '@/lib/utils/money';
import { TapeChart } from '@/components/dashboard/reservations/tape-chart';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Reservation, Room } from '@/lib/types';
import {
  Search,
  LogIn,
  LogOut,
  XCircle,
  Phone,
  LayoutList,
  CalendarDays,
} from 'lucide-react';

export default function ReservationsDashboardPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('chart');
  const [selectedResForCheckIn, setSelectedResForCheckIn] = useState<Reservation | null>(null);
  const [assignedRoomId, setAssignedRoomId] = useState('');

  React.useEffect(() => {
    // Clear legacy localStorage
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('dashboard_reservations');
      } catch {}
    }

    const unsubRes = onSnapshot(
      collection(db, 'reservations'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Reservation[];
          list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
          setReservations(list);
        }
        setIsLoading(false);
      },
      () => {
        loadData();
      }
    );

    const unsubRooms = onSnapshot(
      collection(db, 'rooms'),
      (snap) => {
        if (!snap.empty) {
          setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Room[]);
        }
      },
      () => {}
    );

    return () => {
      unsubRes();
      unsubRooms();
    };
  }, []);

  const loadData = async () => {
    try {
      const [resData, roomData] = await Promise.all([
        fetch('/api/reservations').then((r) => (r.ok ? r.json() : { reservations: [] })),
        fetch('/api/rooms').then((r) => (r.ok ? r.json() : { rooms: [] })),
      ]);
      setReservations(resData.reservations || []);
      setRooms(roomData.rooms || []);
    } catch (err) {
      console.error('Failed to load reservations data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const availableRooms = rooms.filter((r) => r.housekeeping_state === 'available');

  const filtered = reservations.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchTerm) {
      const matchName = r.guest?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchRef = r.reference_code?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPhone = r.guest?.phone?.includes(searchTerm);
      return matchName || matchRef || matchPhone;
    }
    return true;
  });

  const handleCheckInConfirm = async () => {
    if (!selectedResForCheckIn || !assignedRoomId) return;

    try {
      await Promise.all([
        fetch(`/api/reservations/${selectedResForCheckIn.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'checked_in', room_id: assignedRoomId }),
        }),
        fetch(`/api/rooms/${assignedRoomId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ housekeeping_state: 'occupied' }),
        }),
      ]);
      await loadData();
    } catch (err) {
      console.error('Failed to check in guest:', err);
    } finally {
      setSelectedResForCheckIn(null);
      setAssignedRoomId('');
    }
  };

  const handleCheckOut = async (res: Reservation) => {
    try {
      const promises: Promise<any>[] = [
        fetch(`/api/reservations/${res.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'checked_out' }),
        }),
      ];
      if (res.room_id) {
        promises.push(
          fetch(`/api/rooms/${res.room_id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ housekeeping_state: 'dirty' }),
          })
        );
      }
      await Promise.all(promises);
      await loadData();
    } catch (err) {
      console.error('Failed to check out guest:', err);
    }
  };

  const handleCancel = async (res: Reservation) => {
    try {
      await fetch(`/api/reservations/${res.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      await loadData();
    } catch (err) {
      console.error('Failed to cancel reservation:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#3D352C]">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#670E10] text-white text-[11px] font-bold border border-[#B08D57]/40">
              Front Desk & Concierge
            </span>
            <span className="text-xs text-[#B08D57] font-semibold">Guest Manifest &amp; Tape Chart</span>
          </div>
          <h1 className="font-heritage text-2xl sm:text-3xl font-bold text-[#FAF8F3]">
            Chamber Operations &amp; Guest Manifest
          </h1>
        </div>

        {/* View Switcher and Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* List vs Tape Chart Toggle */}
          <div className="flex items-center bg-[#2A2420] p-1 rounded-xl border border-[#3D352C]">
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                viewMode === 'chart'
                  ? 'bg-[#670E10] text-[#FAF8F3] shadow-xs'
                  : 'text-[#9A8E7F] hover:text-[#FAF8F3]'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>14-Day Tape Chart</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                viewMode === 'list'
                  ? 'bg-[#670E10] text-[#FAF8F3] shadow-xs'
                  : 'text-[#9A8E7F] hover:text-[#FAF8F3]'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Manifest Table</span>
            </button>
          </div>

          {viewMode === 'list' && (
            <>
              <div className="relative">
                <Search className="w-4 h-4 text-[#8F7245] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search reference or guest..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#2A2420] border border-[#3D352C] rounded-xl pl-9 pr-3 py-2 text-xs text-[#FAF8F3] placeholder-[#9A8E7F] focus:outline-none focus:border-[#B08D57] w-52"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#2A2420] border border-[#3D352C] rounded-xl px-3 py-2 text-xs text-[#FAF8F3] focus:outline-none focus:border-[#B08D57]"
              >
                <option value="all">All Statuses</option>
                <option value="confirmed">Confirmed</option>
                <option value="checked_in">Checked In</option>
                <option value="checked_out">Checked Out</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'chart' ? (
        <TapeChart
          reservations={reservations}
          rooms={rooms}
          onCheckIn={(res, roomId) => {
            setSelectedResForCheckIn(res);
            setAssignedRoomId(roomId || availableRooms[0]?.id || '');
          }}
          onCheckOut={handleCheckOut}
          onRefresh={loadData}
        />
      ) : (
        /* Manifest Table */
        <div className="rounded-2xl bg-[#241F1A] border border-[#3D352C] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#2A2420] text-[#B08D57] uppercase tracking-wider font-semibold border-b border-[#3D352C]">
                <tr>
                  <th className="py-3.5 px-4">Ref Code</th>
                  <th className="py-3.5 px-4">Guest</th>
                  <th className="py-3.5 px-4">Chamber</th>
                  <th className="py-3.5 px-4">Dates</th>
                  <th className="py-3.5 px-4">Tariff</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3D352C] text-[#FAF8F3]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#9A8E7F]">
                      No reservations matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((res) => (
                    <tr key={res.id} className="hover:bg-[#2A2420]/80 transition-colors">
                      <td className="py-4 px-4 font-mono font-bold text-[#C9A96E]">
                        {res.reference_code}
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-semibold text-[#FAF8F3] block">
                          {res.guest?.name || 'Walk-in Guest'}
                        </span>
                        <span className="text-[#9A8E7F] text-[11px] flex items-center">
                          <Phone className="w-3 h-3 mr-1 text-[#8F7245]" /> {res.guest?.phone}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-[#FAF8F3] block font-medium">{res.room_type?.name}</span>
                        <span className="text-[#9A8E7F] text-[11px]">
                          Room: {res.room?.room_number || 'Unassigned'}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-[#FAF8F3] block font-medium">
                          {res.check_in} &rarr; {res.check_out}
                        </span>
                        <span className="text-[#9A8E7F] text-[11px]">{res.party_size} Guests</span>
                      </td>

                      <td className="py-4 px-4 font-mono font-bold text-[#C9A96E]">
                        {formatMoney(res.rate_snapshot_minor)}
                      </td>

                      <td className="py-4 px-4">
                        <Badge
                          size="sm"
                          variant={
                            res.status === 'checked_in'
                              ? 'emerald'
                              : res.status === 'confirmed'
                              ? 'gold'
                              : res.status === 'checked_out'
                              ? 'blue'
                              : 'slate'
                          }
                        >
                          {res.status.replace('_', ' ')}
                        </Badge>
                      </td>

                      <td className="py-4 px-4 text-right space-x-2">
                        {res.status === 'confirmed' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setSelectedResForCheckIn(res);
                              setAssignedRoomId(availableRooms[0]?.id || '');
                            }}
                          >
                            <LogIn className="w-3 h-3 mr-1" /> Check In
                          </Button>
                        )}

                        {res.status === 'checked_in' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleCheckOut(res)}
                          >
                            <LogOut className="w-3 h-3 mr-1" /> Check Out
                          </Button>
                        )}

                        {res.status === 'confirmed' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancel(res)}
                            className="text-[#9B2226] hover:bg-[#9B2226]/20"
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Check In Modal */}
      {selectedResForCheckIn && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedResForCheckIn(null)}
          title="Guest Check-in & Key Issuance"
          description={`Assign chamber and confirm arrival for ${selectedResForCheckIn.guest?.name}`}
        >
          <div className="space-y-4">
            <div>
              <span className="text-xs text-[#9A8E7F] block mb-1">Booked Chamber Category</span>
              <span className="text-sm font-bold text-[#FAF8F3]">
                {selectedResForCheckIn.room_type?.name}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#B08D57] mb-1.5">
                Assign Clean Available Room
              </label>
              <select
                value={assignedRoomId}
                onChange={(e) => setAssignedRoomId(e.target.value)}
                className="w-full bg-[#2A2420] border border-[#3D352C] rounded-xl px-4 py-2.5 text-sm text-[#FAF8F3] focus:outline-none focus:border-[#B08D57]"
              >
                {availableRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    Room {room.room_number} ({room.room_type?.name || 'Suite'}) — Clean & Inspected
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-[#3D352C]">
              <Button variant="ghost" onClick={() => setSelectedResForCheckIn(null)}>
                Cancel
              </Button>
              <Button onClick={handleCheckInConfirm} variant="primary">
                Complete Check-In & Issue Key
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
