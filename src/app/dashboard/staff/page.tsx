'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  IdCard,
  Search,
  Plus,
  Download,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Mail,
  UserCheck,
  UserX,
  Trash2,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
  X,
  AlertTriangle,
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { StaffMember } from '@/lib/types';

const ROLES_LIST = [
  { value: 'admin', label: 'Administrator', badgeColor: 'bg-[#4F0809] text-white' },
  { value: 'manager', label: 'General Manager', badgeColor: 'bg-[#B78A48] text-white' },
  { value: 'receptionist', label: 'Front Desk Receptionist', badgeColor: 'bg-indigo-100 text-indigo-800' },
  { value: 'kitchen', label: 'Head Chef / Culinary', badgeColor: 'bg-amber-100 text-amber-800' },
  { value: 'waiter', label: 'Floor Steward / Waiter', badgeColor: 'bg-blue-100 text-blue-800' },
  { value: 'housekeeping', label: 'Housekeeping Staff', badgeColor: 'bg-purple-100 text-purple-800' },
  { value: 'accountant', label: 'Accounts & Billing', badgeColor: 'bg-emerald-100 text-emerald-800' },
];

export default function StaffRolesPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add staff form - ONLY: name, phone, email, role, password, confirmPassword
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('manager');
  const [formPassword, setFormPassword] = useState('');
  const [formConfirmPassword, setFormConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/staff');
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
      }
    } catch {
      showToast('error', 'Failed to load staff list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Clear legacy localStorage
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('dashboard_staff');
      } catch {}
    }

    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((docSnap) => {
            const u = docSnap.data();
            return {
              id: docSnap.id,
              name: u.name || 'Staff Member',
              email: u.email || '',
              phone: u.phone || '',
              role: u.role || 'manager',
              status: (u.is_active ? 'active' : 'on_leave') as StaffMember['status'],
              is_active: u.is_active ?? true,
              created_at: u.created_at?.toDate?.()?.toISOString() || u.created_at || new Date().toISOString(),
            };
          });
          setStaff(list);
        } else {
          loadData();
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Real-time staff listener error:', err);
        loadData();
      }
    );

    return () => unsub();
  }, []);

  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'all' || s.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [staff, searchQuery, roleFilter]);

  // Real Calculated Metrics
  const totalStaff = staff.length;
  const activeCount = staff.filter((s) => s.status === 'active').length;
  const onLeaveCount = staff.filter((s) => s.status === 'on_leave').length;
  const distinctRoles = new Set(staff.map((s) => s.role)).size;

  const handleToggleStatus = async (id: string, current: StaffMember['status']) => {
    const next = current === 'active' ? 'on_leave' : 'active';
    // Optimistic UI update
    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: next, is_active: next === 'active' } : s))
    );

    try {
      const res = await fetch('/api/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: next }),
      });
      if (res.ok) {
        showToast('success', `Status updated to ${next === 'active' ? 'Active' : 'On Leave'}.`);
      } else {
        showToast('error', 'Failed to update status.');
        await loadData();
      }
    } catch {
      showToast('error', 'Network error updating status.');
      await loadData();
    }
  };

  const handleDeleteStaff = async (member: StaffMember) => {
    const confirmed = window.confirm(`Permanently remove ${member.name} from the staff roster?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/staff?id=${member.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setStaff((prev) => prev.filter((s) => s.id !== member.id));
        showToast('success', `Removed ${member.name} from staff.`);
      } else {
        showToast('error', 'Failed to delete staff member.');
      }
    } catch {
      showToast('error', 'Network error deleting staff.');
    }
  };

  const handleClearAll = async () => {
    const confirmed = window.confirm('Permanently clear all staff records? This cannot be undone.');
    if (!confirmed) return;

    try {
      const res = await fetch('/api/staff?clearAll=true', { method: 'DELETE' });
      if (res.ok) {
        setStaff([]);
        showToast('success', 'All staff records cleared.');
      }
    } catch {
      showToast('error', 'Error clearing staff records.');
    }
  };

  // Add staff submission
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Please enter the employee full name.');
      return;
    }
    if (!formPhone.trim()) {
      setFormError('Please enter mobile number.');
      return;
    }
    if (!formEmail.trim()) {
      setFormError('Please enter email address.');
      return;
    }
    if (!formPassword) {
      setFormError('Please enter a password (min 6 characters).');
      return;
    }
    if (formPassword.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    if (formPassword !== formConfirmPassword) {
      setFormError('Password and Confirm Password do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim().toLowerCase(),
          role: formRole,
          password: formPassword,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast('success', `Staff member ${formName.trim()} registered successfully.`);
        setIsAddModalOpen(false);
        setFormName('');
        setFormPhone('');
        setFormEmail('');
        setFormPassword('');
        setFormConfirmPassword('');
        setFormError('');
        await loadData();
      } else {
        const err = await res.json();
        setFormError(err.error || 'Failed to create staff member.');
      }
    } catch {
      setFormError('Network error connecting to staff service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Staff ID,Name,Mobile,Email,Role,Status,Created At'];
    const rows = filteredStaff.map((s) => [
      `"${s.id}"`,
      `"${s.name}"`,
      `"${s.phone}"`,
      `"${s.email}"`,
      `"${s.role}"`,
      s.status || 'active',
      `"${s.created_at}"`,
    ].join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rajmahal_staff_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRoleBadge = (roleKey: string) => {
    const found = ROLES_LIST.find((r) => r.value === roleKey);
    return {
      label: found ? found.label : roleKey.toUpperCase(),
      color: found ? found.badgeColor : 'bg-gray-100 text-gray-800',
    };
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
            notification.type === 'success'
              ? 'bg-[#EAF5EE] text-[#1D703F] border-[#C3E4CD]'
              : 'bg-[#FDF0ED] text-[#B02A37] border-[#F8D2CD]'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#1D703F]" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-[#B02A37]" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8DCD2]">
        <div>
          <h1
            className="text-2xl font-bold text-[#4F0809]"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Palace Staff &amp; Operational Roles
          </h1>
          <p className="text-xs text-[#81736D] mt-0.5">
            Manage hotel personnel, system roles, login credentials, and active staff rosters
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {totalStaff > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium shadow-xs transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Staff</span>
            </button>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8DCD2] bg-white text-[#4F0809] hover:bg-[#F6EAE0] text-xs font-medium shadow-xs transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8DCD2] bg-white text-[#4F0809] hover:bg-[#F6EAE0] text-xs font-medium shadow-xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Staff</span>
          </button>

          <button
            onClick={() => {
              setFormError('');
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#D8AA67]" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* ── Metric Summary (Real Live Data) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
              Total Personnel
            </div>
            <div className="text-xl font-bold text-[#302421] mt-0.5">{totalStaff}</div>
            <div className="text-[10px] text-[#2E7D32] font-medium mt-0.5">Registered staff</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FBF6EF] border border-[#E8DCD2] flex items-center justify-center text-[#4F0809]">
            <IdCard className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
              Active on Roster
            </div>
            <div className="text-xl font-bold text-[#2E7D32] mt-0.5">{activeCount}</div>
            <div className="text-[10px] text-[#81736D] mt-0.5">Ready for duties</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#2E7D32]/10 border border-[#2E7D32]/20 flex items-center justify-center text-[#2E7D32]">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
              On Leave
            </div>
            <div className="text-xl font-bold text-[#B78A48] mt-0.5">{onLeaveCount}</div>
            <div className="text-[10px] text-[#81736D] mt-0.5">Off duty personnel</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FBF6EF] border border-[#E8DCD2] flex items-center justify-center text-[#B78A48]">
            <UserX className="w-4 h-4 text-[#B78A48]" />
          </div>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
              Roles in Service
            </div>
            <div className="text-xl font-bold text-[#4F0809] mt-0.5">{distinctRoles} Roles</div>
            <div className="text-[10px] text-[#2E7D32] font-medium mt-0.5">Active operational roles</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FBF6EF] border border-[#E8DCD2] flex items-center justify-center text-[#4F0809]">
            <ShieldCheck className="w-4 h-4 text-[#D8AA67]" />
          </div>
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
            placeholder="Search staff name, mobile, email, or role..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-[#FBF6EF]/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F0809]"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {[
            { label: 'All Roles', value: 'all' },
            { label: 'Admin', value: 'admin' },
            { label: 'Manager', value: 'manager' },
            { label: 'Receptionist', value: 'receptionist' },
            { label: 'Kitchen Chef', value: 'kitchen' },
            { label: 'Floor Steward', value: 'waiter' },
            { label: 'Housekeeping', value: 'housekeeping' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setRoleFilter(tab.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                roleFilter === tab.value
                  ? 'bg-[#4F0809] text-white shadow-xs'
                  : 'bg-[#FBF6EF] text-[#81736D] hover:text-[#302421]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Staff Table ── */}
      <div className="bg-white border border-[#E8DCD2] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E8DCD2] bg-[#FBF6EF]/75 text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
                <th className="py-2.5 px-3">Staff ID</th>
                <th className="py-2.5 px-3">Employee Name</th>
                <th className="py-2.5 px-3">Operational Role</th>
                <th className="py-2.5 px-3">Mobile No.</th>
                <th className="py-2.5 px-3">Email Address</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DCD2]/70 text-[#302421]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#81736D]">
                    <RefreshCw className="w-6 h-6 text-[#D8AA67] animate-spin mx-auto mb-2" />
                    <span>Loading registered staff roster...</span>
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#81736D]">
                    <IdCard className="w-8 h-8 text-[#D8AA67] mx-auto mb-2 opacity-60" />
                    <div className="font-semibold text-sm text-[#4F0809]">No Staff Members Registered</div>
                    <div className="text-xs text-[#81736D] mt-0.5">
                      All mock data has been purged. Click &quot;Add Staff Member&quot; to register your team.
                    </div>
                    <button
                      onClick={() => setIsAddModalOpen(true)}
                      className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#D8AA67]" />
                      <span>Add Staff Member</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => {
                  const roleBadge = getRoleBadge(member.role);
                  const isActive = (member.status || 'active') === 'active';

                  return (
                    <tr key={member.id} className="hover:bg-[#FBF6EF]/50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-[#4F0809] font-mono text-[11px]">
                        {member.id}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#302421] text-xs">{member.name}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${roleBadge.color}`}
                        >
                          {roleBadge.label}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-medium text-[#302421]">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-[#B78A48]" />
                          <span>{member.phone}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-[#81736D]">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-[#81736D]" />
                          <span>{member.email}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isActive
                              ? 'bg-[#2E7D32]/15 text-[#2E7D32] border border-[#2E7D32]/30'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#2E7D32]' : 'bg-amber-600'}`} />
                          <span>{isActive ? 'Active' : 'On Leave'}</span>
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleStatus(member.id, member.status || 'active')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer border ${
                              isActive
                                ? 'bg-white border-[#E8DCD2] hover:bg-[#FBF6EF] text-[#81736D]'
                                : 'bg-[#2E7D32]/10 border-[#2E7D32]/30 hover:bg-[#2E7D32]/20 text-[#2E7D32]'
                            }`}
                          >
                            {isActive ? 'Mark Leave' : 'Set Active'}
                          </button>

                          <button
                            onClick={() => handleDeleteStaff(member)}
                            className="p-1 rounded-md text-[#81736D] hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
                            title="Delete staff member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Staff Modal (Only Name, Mobile, Email, Role, Password, Confirm Password) ── */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-white border border-[#E8DCD2] rounded-2xl max-w-md w-full p-6 shadow-2xl relative cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-[#FBF6EF] text-[#81736D] hover:text-[#4F0809] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-[#4F0809] text-[#D8AA67] flex items-center justify-center">
                <IdCard className="w-4 h-4" />
              </div>
              <h2
                className="text-xl font-bold text-[#4F0809]"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Add Staff Member
              </h2>
            </div>
            <p className="text-xs text-[#81736D] mb-4">
              Enter employee credentials and assign their operational system role
            </p>

            {formError && (
              <div className="p-2.5 mb-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
              {/* 1. Name */}
              <div>
                <label className="block text-[11px] font-semibold text-[#4F0809] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Vikramaditya Singh"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/50 focus:bg-white focus:outline-none focus:border-[#4F0809]"
                />
              </div>

              {/* 2. Mobile No. & 3. Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#4F0809] mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/50 focus:bg-white focus:outline-none focus:border-[#4F0809]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#4F0809] mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="staff@rajmahal.com"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/50 focus:bg-white focus:outline-none focus:border-[#4F0809]"
                  />
                </div>
              </div>

              {/* 4. Role */}
              <div>
                <label className="block text-[11px] font-semibold text-[#4F0809] mb-1">
                  Operational Role *
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/50 focus:bg-white focus:outline-none focus:border-[#4F0809]"
                >
                  {ROLES_LIST.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Password & 6. Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#4F0809] mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full pl-3 pr-8 py-2 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/50 focus:bg-white focus:outline-none focus:border-[#4F0809]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#81736D] hover:text-[#4F0809]"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#4F0809] mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formConfirmPassword}
                    onChange={(e) => setFormConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/50 focus:bg-white focus:outline-none focus:border-[#4F0809]"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E8DCD2]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E8DCD2] text-[#81736D] hover:bg-[#FBF6EF] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#4F0809] hover:bg-[#6B1518] text-white font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Add Staff Member</span>
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
