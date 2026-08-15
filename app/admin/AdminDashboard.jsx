"use client";

import React, { useState, useMemo } from 'react';
import {
  Users, Activity, Clock, Crown, Eye, BarChart3, Search,
  ChevronDown, ChevronUp, Sparkles, Calendar, Target, TrendingUp, AlertCircle
} from 'lucide-react';

const formatRelativeTime = (dateString) => {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "Unknown";
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${diffDays}d ago`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  }).format(new Date(dateString));
};

const getInitials = (firstName, lastName, email) => {
  if (firstName && lastName) return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  if (firstName) return firstName.charAt(0).toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  return '?';
};

const ToggleSwitch = ({ checked, onChange, disabled }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-[44px] items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#7E72A8] focus:ring-offset-2 focus:ring-offset-white ${
        checked ? 'bg-[#7E72A8]' : 'bg-black/10'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
          checked ? 'translate-x-[24px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  );
};

const StatCard = ({ title, value, icon: Icon, accentColor }) => (
  <div className="flex items-center p-5 rounded-2xl bg-white/60 border border-[var(--tk-border-solid)] backdrop-blur-md transition-all duration-300 hover:bg-black/5">
    <div className="p-3 rounded-xl mr-4" style={{ backgroundColor: `${accentColor}1A`, color: accentColor }}>
      <Icon size={24} strokeWidth={2} />
    </div>
    <div>
      <p className="text-sm font-medium text-[var(--tk-text-muted)] mb-1" style={{ fontFamily: 'var(--font-body)' }}>{title}</p>
      <h3 className="text-2xl font-semibold text-[var(--tk-text-primary)] tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
        {value.toLocaleString()}
      </h3>
    </div>
  </div>
);

const ScoreCircle = ({ score }) => {
  if (score === null || score === undefined) return <span className="text-[var(--tk-text-faint)] italic">N/A</span>;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f97316' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-12 h-12 transform -rotate-90">
        <circle
          cx="24" cy="24" r={radius}
          stroke="currentColor" strokeWidth="4" fill="transparent"
          className="text-black/10"
        />
        <circle
          cx="24" cy="24" r={radius}
          stroke={color} strokeWidth="4" fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-xs font-semibold text-[var(--tk-text-primary)]">{score}</span>
    </div>
  );
};

export default function AdminDashboard({ initialUsers = [], initialStats = {} }) {
  const [users, setUsers] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [togglingMap, setTogglingMap] = useState({}); // Track loading state per user

  const toggleExpand = (userId) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleToggleSubscription = async (userId, currentStatus) => {
    if (togglingMap[userId]) return;
    
    const newStatus = !currentStatus;
    
    // Optimistic update
    setUsers(currentUsers => 
      currentUsers.map(u => 
        u._id === userId ? { ...u, isSubscribed: newStatus } : u
      )
    );
    setTogglingMap(prev => ({ ...prev, [userId]: true }));

    try {
      const res = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSubscribed: newStatus })
      });

      if (!res.ok) throw new Error('Failed to update subscription');
      // On success, no need to do anything since we optimistically updated
    } catch (error) {
      console.error(error);
      // Revert on error
      setUsers(currentUsers => 
        currentUsers.map(u => 
          u._id === userId ? { ...u, isSubscribed: currentStatus } : u
        )
      );
      alert('Failed to update subscription. Please try again.');
    } finally {
      setTogglingMap(prev => ({ ...prev, [userId]: false }));
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const searchMatch = 
        (user.firstName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.lastName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      let filterMatch = true;
      if (filter === 'Active') filterMatch = user.isActive;
      if (filter === 'Inactive') filterMatch = !user.isActive;
      if (filter === 'Subscribed') filterMatch = user.isSubscribed;

      return searchMatch && filterMatch;
    });
  }, [users, searchTerm, filter]);

  return (
    <div className="min-h-screen bg-[var(--tk-bg-primary)] text-[var(--tk-text-primary)] p-6 md:p-8 font-sans selection:bg-[#7E72A8]/30 animate-in fade-in duration-500" style={{ fontFamily: 'var(--font-body)' }}>
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Ops Console
        </h1>
        <p className="text-[var(--tk-text-muted)]">Manage users, monitor activity, and oversee TintKin operations.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard title="Total Users" value={initialStats.totalUsers || 0} icon={Users} accentColor="#7E72A8" />
        <StatCard title="Active Users" value={initialStats.activeUsers || 0} icon={Activity} accentColor="#22c55e" />
        <StatCard title="Inactive Users" value={initialStats.inactiveUsers || 0} icon={Clock} accentColor="#6b7280" />
        <StatCard title="Subscribed" value={initialStats.subscribedUsers || 0} icon={Crown} accentColor="#eab308" />
        <StatCard title="Total Scans" value={initialStats.totalScans || 0} icon={Eye} accentColor="#5A6A3B" />
        <StatCard title="Simulations" value={initialStats.totalSimulations || 0} icon={BarChart3} accentColor="#f97316" />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white/60 p-4 rounded-2xl border border-[var(--tk-border-solid)] backdrop-blur-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tk-text-faint)]" size={18} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/80 border border-[var(--tk-border-solid)] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7E72A8]/50 focus:border-transparent transition-all placeholder:text-[var(--tk-text-faint)] text-[var(--tk-text-primary)]"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
          {['All', 'Active', 'Inactive', 'Subscribed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                filter === f 
                  ? 'bg-black text-white shadow-lg shadow-black/10' 
                  : 'bg-white/60 text-[var(--tk-text-muted)] hover:bg-black/5 hover:text-[var(--tk-text-primary)] border border-[var(--tk-border-solid)]'
              }`}
            >
              {f}
            </button>
          ))}
          <div className="ml-2 px-3 py-1 bg-black/5 rounded-lg text-xs font-medium text-[var(--tk-text-muted)]">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'result' : 'results'}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white/60 border border-[var(--tk-border-solid)] rounded-2xl backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-black/[0.02] border-b border-[var(--tk-border-solid)] text-[var(--tk-text-muted)]">
              <tr>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Subscription</th>
                <th className="px-6 py-4 font-medium">Skin Type</th>
                <th className="px-6 py-4 font-medium">Scans</th>
                <th className="px-6 py-4 font-medium">Last Active</th>
                <th className="px-6 py-4 font-medium">Joined</th>
                <th className="px-6 py-4 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user, idx) => {
                  const isExpanded = expandedRows.has(user._id);
                  return (
                    <React.Fragment key={user._id}>
                      <tr 
                        className={`group transition-colors ${idx % 2 === 0 ? 'bg-transparent' : 'bg-black/[0.01]'} hover:bg-black/[0.03]`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-black/5 to-black/10 flex items-center justify-center border border-black/10 overflow-hidden shrink-0">
                              {user.imageUrl ? (
                                <img src={user.imageUrl} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-sm font-semibold text-[var(--tk-text-muted)]">
                                  {getInitials(user.firstName, user.lastName, user.email)}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-[var(--tk-text-primary)] flex items-center gap-1.5">
                                {user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}` : 'Unnamed User'}
                                {user.isSubscribed && <Crown size={14} className="text-[#eab308] fill-[#eab308]/20" />}
                              </div>
                              <div className="text-[var(--tk-text-faint)] text-xs mt-0.5">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-gray-400'}`} />
                            <span className={user.isActive ? 'text-[var(--tk-text-primary)]' : 'text-[var(--tk-text-faint)]'}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <ToggleSwitch 
                            checked={user.isSubscribed} 
                            onChange={() => handleToggleSubscription(user._id, user.isSubscribed)}
                            disabled={togglingMap[user._id]}
                          />
                        </td>
                        <td className="px-6 py-4 text-[var(--tk-text-muted)] capitalize">
                          {user.skinType ? user.skinType.replace('_', ' ') : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-[var(--tk-text-primary)]">
                            <span className="font-medium">{user.scanCount || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[var(--tk-text-muted)]">
                          {formatRelativeTime(user.lastSignInAt || user.lastScan)}
                        </td>
                        <td className="px-6 py-4 text-[var(--tk-text-muted)]">
                          {formatDate(user.clerkCreatedAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => toggleExpand(user._id)}
                            className="p-1.5 rounded-lg bg-black/5 hover:bg-black/10 text-[var(--tk-text-muted)] hover:text-[var(--tk-text-primary)] transition-colors"
                          >
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </td>
                      </tr>
                      {/* Expanded Row Content */}
                      {isExpanded && (
                        <tr className="bg-black/5 border-b-0">
                          <td colSpan="8" className="p-0">
                            <div className="px-6 py-6 border-l-2 border-[#7E72A8] ml-[2px] animate-in slide-in-from-top-2 fade-in duration-300">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                
                                {/* Analytics & Scores */}
                                <div className="space-y-4">
                                  <h4 className="text-sm font-medium text-[var(--tk-text-faint)] uppercase tracking-wider flex items-center gap-2">
                                    <Sparkles size={14} /> Analytics
                                  </h4>
                                  <div className="flex items-center gap-6 bg-white/40 p-4 rounded-xl border border-[var(--tk-border-solid)]">
                                    <div className="flex flex-col items-center">
                                      <ScoreCircle score={user.latestScore} />
                                      <span className="text-xs text-[var(--tk-text-muted)] mt-2">Latest Score</span>
                                    </div>
                                    <div className="h-10 w-px bg-black/10" />
                                    <div>
                                      <div className="text-2xl font-semibold text-[var(--tk-text-primary)]">
                                        {user.latestSkinAge !== null && user.latestSkinAge !== undefined ? user.latestSkinAge : <span className="text-[var(--tk-text-faint)] text-lg">N/A</span>}
                                      </div>
                                      <span className="text-xs text-[var(--tk-text-muted)]">Skin Age</span>
                                    </div>
                                    <div className="h-10 w-px bg-black/10" />
                                    <div>
                                      <div className="text-2xl font-semibold text-[var(--tk-text-primary)]">{user.simulationCount || 0}</div>
                                      <span className="text-xs text-[var(--tk-text-muted)]">Simulations</span>
                                    </div>
                                  </div>
                                </div>

                                {/* User Profile Info */}
                                <div className="space-y-4">
                                  <h4 className="text-sm font-medium text-[var(--tk-text-faint)] uppercase tracking-wider flex items-center gap-2">
                                    <Target size={14} /> Profile & Goals
                                  </h4>
                                  <div className="bg-white/40 p-4 rounded-xl border border-[var(--tk-border-solid)] space-y-3">
                                    <div>
                                      <span className="text-xs text-[var(--tk-text-muted)] block mb-1">Skin Goals</span>
                                      {user.goals && user.goals.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                          {user.goals.map((goal, i) => (
                                            <span key={i} className="px-2 py-0.5 rounded text-xs bg-black/5 text-[var(--tk-text-primary)] border border-black/5">
                                              {goal}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-sm text-[var(--tk-text-faint)] italic">None specified</span>
                                      )}
                                    </div>
                                    {user.customGoal && (
                                      <div>
                                        <span className="text-xs text-[var(--tk-text-muted)] block mb-1">Custom Goal</span>
                                        <p className="text-sm text-[var(--tk-text-primary)] bg-black/5 p-2 rounded-lg border border-black/5">
                                          "{user.customGoal}"
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Timeline & Status */}
                                <div className="space-y-4">
                                  <h4 className="text-sm font-medium text-[var(--tk-text-faint)] uppercase tracking-wider flex items-center gap-2">
                                    <Calendar size={14} /> Timeline
                                  </h4>
                                  <div className="bg-white/40 p-4 rounded-xl border border-[var(--tk-border-solid)] space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                      <span className="text-[var(--tk-text-muted)]">Birth Date</span>
                                      <span className="text-[var(--tk-text-primary)]">{formatDate(user.birthDate)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                      <span className="text-[var(--tk-text-muted)]">Last Scan</span>
                                      <span className="text-[var(--tk-text-primary)]">{formatDate(user.lastScan)}</span>
                                    </div>
                                    {user.isSubscribed && (
                                      <div className="flex justify-between items-center text-sm pt-2 border-t border-[var(--tk-border-solid)]">
                                        <span className="text-[#eab308] flex items-center gap-1 font-medium">
                                          <Crown size={12} /> Subscribed Since
                                        </span>
                                        <span className="text-[#eab308] font-medium">{formatDate(user.subscribedAt)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-[var(--tk-text-faint)] space-y-3">
                      <AlertCircle size={32} className="opacity-50" />
                      <p>No users found matching your criteria.</p>
                      <button 
                        onClick={() => { setSearchTerm(''); setFilter('All'); }}
                        className="text-sm text-[#7E72A8] hover:underline font-medium"
                      >
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
