import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw, AlertCircle, CheckCircle2, Clock, TrendingUp,
  Calendar as CalendarIcon, FlaskConical, Briefcase, Printer,
  ShoppingBag, Settings, Activity, ChevronRight, Flame, Zap,
  Layers, Award, AlertTriangle, GitBranch
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer, Tooltip, ComposedChart, Line, CartesianGrid, Legend
} from 'recharts';
import useSettings from './useSettings.js';
import SettingsPanel from './SettingsPanel.jsx';

// ============================================================================
// DESIGN TOKENS
// ============================================================================

const AREA_META = {
  '🔬 PhD':           { color: '#5DADE2', bg: 'rgba(93,173,226,0.12)',  border: 'rgba(93,173,226,0.35)',  label: 'PhD',       icon: FlaskConical },
  '💼 P1 Freelance':  { color: '#BB8FCE', bg: 'rgba(187,143,206,0.12)', border: 'rgba(187,143,206,0.35)', label: 'Freelance', icon: Briefcase    },
  '🖨️ P2 STL':       { color: '#F39C12', bg: 'rgba(243,156,18,0.12)',  border: 'rgba(243,156,18,0.35)',  label: 'STL',       icon: Printer      },
  '🛍️ P3 POD':       { color: '#EC7063', bg: 'rgba(236,112,99,0.12)',  border: 'rgba(236,112,99,0.35)',  label: 'POD',       icon: ShoppingBag  },
  '⚙️ Admin':         { color: '#95A5A6', bg: 'rgba(149,165,166,0.12)', border: 'rgba(149,165,166,0.35)', label: 'Admin',     icon: Settings     },
};

const STATUS_META = {
  '🔲 To Do':       { color: '#E74C3C', label: 'To Do' },
  '⏳ In Progress':  { color: '#F1C40F', label: 'In Progress' },
  '✅ Done':         { color: '#2ECC71', label: 'Done' },
  '🚫 Blocked':      { color: '#7F8C8D', label: 'Blocked' },
};

const PRIORITY_META = {
  '🔴 High':   { color: '#E74C3C', rank: 0 },
  '🟡 Medium': { color: '#F39C12', rank: 1 },
  '🟢 Low':    { color: '#27AE60', rank: 2 },
};

// Fixed reference dates (update if your viva date changes)
const VIVA_DATE = new Date('2026-11-15');
const BUILD_DEADLINE = new Date('2026-06-01');

// ============================================================================
// HELPERS
// ============================================================================

const daysBetween = (a, b) => Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
const formatDate = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

const isOverdue = (t, today) => t.status !== '✅ Done' && t.dueDate && new Date(t.dueDate) < today;
const isDueThisWeek = (t) => t.week === 'This Week' && t.status !== '✅ Done';

// ============================================================================
// PRIMITIVES
// ============================================================================

const Card = ({ children, className = '', accent }) => (
  <div
    className={`rounded-lg border border-zinc-800/80 bg-zinc-950/40 backdrop-blur-sm p-5 ${className}`}
    style={accent ? { borderLeftColor: accent, borderLeftWidth: '2px' } : {}}
  >
    {children}
  </div>
);

const KPICard = ({ label, value, sub, icon: Icon, accent = '#94a3b8' }) => (
  <Card>
    <div className="flex items-start justify-between mb-3">
      <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-medium">{label}</span>
      {Icon && <Icon size={14} style={{ color: accent }} />}
    </div>
    <div className="font-display text-4xl leading-none mb-1.5" style={{ color: accent }}>{value}</div>
    {sub && <div className="text-xs text-zinc-500">{sub}</div>}
  </Card>
);

const SectionTitle = ({ children, accent }) => (
  <div className="flex items-baseline gap-3 mb-4">
    <div className="h-px flex-shrink-0 w-6" style={{ background: accent || '#52525b' }} />
    <h3 className="text-[11px] uppercase tracking-[0.22em] text-zinc-400 font-semibold">{children}</h3>
    <div className="h-px flex-1 bg-zinc-800" />
  </div>
);

// ============================================================================
// CALENDAR
// ============================================================================

const CalendarView = ({ tasks, today }) => {
  const renderMonth = (offset) => {
    const mStart = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const mEnd = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0);
    const fd = (mStart.getDay() + 6) % 7;
    const dim = mEnd.getDate();

    const tbd = {};
    tasks.forEach(t => {
      if (!t.dueDate) return;
      const d = new Date(t.dueDate);
      if (d.getMonth() === mStart.getMonth() && d.getFullYear() === mStart.getFullYear()) {
        const k = d.getDate();
        if (!tbd[k]) tbd[k] = [];
        tbd[k].push(t);
      }
    });

    return (
      <div className="flex-1 min-w-0">
        <div className="font-display text-xl text-zinc-200 mb-3">
          {mStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['M','T','W','T','F','S','S'].map((d,i) => (
            <div key={i} className="text-[9px] uppercase tracking-widest text-zinc-600 text-center py-1 font-medium">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: fd }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: dim }).map((_, i) => {
            const day = i + 1;
            const isToday = offset === 0 && day === today.getDate();
            const dayTasks = tbd[day] || [];
            return (
              <div
                key={day}
                className={`aspect-square rounded border p-1 flex flex-col ${
                  isToday
                    ? 'bg-amber-500/10 border-amber-500/40'
                    : dayTasks.length
                      ? 'bg-zinc-900/60 border-zinc-700/50'
                      : 'bg-zinc-950/30 border-zinc-800/40'
                } hover:border-zinc-600 transition-colors`}
              >
                <div className={`text-[10px] font-mono ${isToday ? 'text-amber-400 font-bold' : 'text-zinc-500'}`}>
                  {day}
                </div>
                <div className="flex-1 flex flex-wrap gap-0.5 mt-1 content-start">
                  {dayTasks.slice(0, 6).map((t, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: AREA_META[t.area]?.color || '#666' }}
                      title={t.task}
                    />
                  ))}
                  {dayTasks.length > 6 && (
                    <div className="text-[8px] text-zinc-500 font-mono">+{dayTasks.length - 6}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {renderMonth(0)}
      {renderMonth(1)}
    </div>
  );
};

// ============================================================================
// TIMELINE
// ============================================================================

const TimelineView = ({ tasks, today }) => {
  const weeks = useMemo(() => {
    const monday = new Date(today);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return Array.from({ length: 12 }, (_, i) => {
      const start = new Date(monday);
      start.setDate(start.getDate() + i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { start, end, idx: i };
    });
  }, [today]);

  const taskWithWeek = tasks.filter(t => t.dueDate).map(t => {
    const d = new Date(t.dueDate);
    const weekIdx = weeks.findIndex(w => d >= w.start && d <= w.end);
    return { ...t, weekIdx };
  }).filter(t => t.weekIdx >= 0);

  const byArea = {};
  taskWithWeek.forEach(t => {
    if (!byArea[t.area]) byArea[t.area] = [];
    byArea[t.area].push(t);
  });

  const areaOrder = Object.keys(AREA_META).filter(a => byArea[a]?.length);

  if (!areaOrder.length) {
    return <div className="text-xs text-zinc-500 italic text-center py-8">No upcoming tasks in the next 12 weeks.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: `90px repeat(12, 1fr)` }}>
          <div />
          {weeks.map(w => (
            <div key={w.idx} className="text-[9px] text-zinc-600 font-mono text-center">
              {formatDate(w.start)}
            </div>
          ))}
        </div>
        {areaOrder.map(area => {
          const meta = AREA_META[area];
          const Icon = meta.icon;
          return (
            <div key={area} className="grid gap-1 mb-1 items-center" style={{ gridTemplateColumns: `90px repeat(12, 1fr)` }}>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                <Icon size={10} style={{ color: meta.color }} />
                <span className="font-medium">{meta.label}</span>
              </div>
              {weeks.map(w => {
                const wt = byArea[area].filter(t => t.weekIdx === w.idx);
                if (!wt.length) return <div key={w.idx} className="h-6 rounded bg-zinc-950/30 border border-zinc-900" />;
                return (
                  <div
                    key={w.idx}
                    className="h-6 rounded border flex items-center justify-center text-[10px] font-mono font-semibold"
                    style={{ background: meta.bg, borderColor: meta.border, color: meta.color }}
                    title={wt.map(t => t.task).join('\n')}
                  >
                    {wt.length}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// PRIORITY LIST
// ============================================================================

const PriorityList = ({ tasks, today, limit = 10, density = 'comfortable' }) => {
  const sorted = useMemo(() => {
    return [...tasks]
      .filter(t => t.status !== '✅ Done')
      .sort((a, b) => {
        const pa = PRIORITY_META[a.priority]?.rank ?? 99;
        const pb = PRIORITY_META[b.priority]?.rank ?? 99;
        if (pa !== pb) return pa - pb;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      })
      .slice(0, limit);
  }, [tasks, limit]);

  if (!sorted.length) {
    return <div className="text-xs text-zinc-500 italic py-8 text-center">No open tasks.</div>;
  }

  const compact = density === 'compact' || density === 'focus';

  return (
    <div className={compact ? 'space-y-1' : 'space-y-1.5'}>
      {sorted.map((t, i) => {
        const meta = AREA_META[t.area];
        const overdue = isOverdue(t, today);
        const days = t.dueDate ? daysBetween(today, new Date(t.dueDate)) : null;
        return (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-md border border-zinc-800/60 bg-zinc-950/40 ${compact ? 'px-2 py-1' : 'px-3 py-2'} hover:border-zinc-700 transition-colors`}
          >
            <div className={`w-1 ${compact ? 'h-6' : 'h-8'} rounded`} style={{ background: PRIORITY_META[t.priority]?.color || '#666' }} />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-zinc-200 font-medium truncate">{t.task}</div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: meta?.color }}>
                  {meta?.label || '—'}
                </span>
                {days !== null && (
                  <span className={`text-[10px] font-mono ${overdue ? 'text-red-400' : 'text-zinc-500'}`}>
                    {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'today' : `in ${days}d`}
                  </span>
                )}
                {t.timeEst != null && (
                  <span className="text-[10px] font-mono text-zinc-600">{t.timeEst}h</span>
                )}
              </div>
            </div>
            <ChevronRight size={14} className="text-zinc-700" />
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// CHARTS
// ============================================================================

const StatusDonut = ({ tasks }) => {
  const data = useMemo(() => {
    const counts = {};
    tasks.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
    return Object.entries(counts).map(([k, v]) => ({
      name: STATUS_META[k]?.label || k,
      value: v,
      color: STATUS_META[k]?.color || '#666',
    }));
  }, [tasks]);

  const total = tasks.length;
  const done = tasks.filter(t => t.status === '✅ Done').length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  if (!total) return <div className="text-xs text-zinc-500 text-center py-12 italic">No tasks yet.</div>;

  return (
    <div className="relative h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value" stroke="none">
            {data.map((e, i) => <Cell key={i} fill={e.color} />)}
          </Pie>
          <Tooltip contentStyle={{ background: '#0a0a0c', border: '1px solid #2a2a35', borderRadius: 6, fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="font-display text-3xl text-zinc-100">{pct}%</div>
        <div className="text-[10px] uppercase tracking-widest text-zinc-500">complete</div>
      </div>
    </div>
  );
};

const AreaBar = ({ tasks }) => {
  const data = useMemo(() => {
    const m = {};
    tasks.forEach(t => {
      if (!m[t.area]) m[t.area] = { area: AREA_META[t.area]?.label || t.area, total: 0, color: AREA_META[t.area]?.color };
      m[t.area].total += 1;
    });
    return Object.values(m);
  }, [tasks]);

  if (!data.length) return <div className="text-xs text-zinc-500 text-center py-12 italic">No tasks yet.</div>;

  return (
    <ResponsiveContainer width="100%" height={192}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke="#27272a" />
        <XAxis type="number" stroke="#52525b" fontSize={10} tickLine={false} />
        <YAxis type="category" dataKey="area" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} width={70} />
        <Tooltip contentStyle={{ background: '#0a0a0c', border: '1px solid #2a2a35', borderRadius: 6, fontSize: 11 }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="total" radius={[0, 3, 3, 0]}>
          {data.map((e, i) => <Cell key={i} fill={e.color} fillOpacity={0.85} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

const HoursChart = ({ tasks }) => {
  const data = useMemo(() => {
    const m = {};
    Object.keys(AREA_META).forEach(a => { m[a] = { area: AREA_META[a].label, hours: 0, color: AREA_META[a].color }; });
    tasks.filter(t => t.status !== '✅ Done').forEach(t => {
      if (m[t.area]) m[t.area].hours += t.timeEst || 0;
    });
    return Object.values(m).filter(d => d.hours > 0);
  }, [tasks]);

  if (!data.length) return <div className="text-xs text-zinc-500 text-center py-12 italic">No estimated hours.</div>;

  return (
    <ResponsiveContainer width="100%" height={192}>
      <BarChart data={data} margin={{ top: 12, right: 8, bottom: 4, left: -16 }}>
        <CartesianGrid vertical={false} stroke="#27272a" />
        <XAxis dataKey="area" stroke="#52525b" fontSize={9} tickLine={false} />
        <YAxis stroke="#52525b" fontSize={9} tickLine={false} />
        <Tooltip contentStyle={{ background: '#0a0a0c', border: '1px solid #2a2a35', borderRadius: 6, fontSize: 11 }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} formatter={(v) => [`${v}h`, 'Estimated']} />
        <Bar dataKey="hours" radius={[3, 3, 0, 0]}>
          {data.map((e, i) => <Cell key={i} fill={e.color} fillOpacity={0.7} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

const RevenueChart = ({ revenue, fmt = (v) => `£${v}` }) => {
  const data = (revenue || []).map(r => ({
    month: r.month?.split(' ')[0].slice(0, 3) || '?',
    Target: r.target || 0,
    Freelance: r.freelance || 0,
    STL: r.stl || 0,
    POD: r.pod || 0,
  }));

  if (!data.length) return <div className="text-xs text-zinc-500 text-center py-12 italic">No revenue records yet.</div>;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: -8 }}>
        <CartesianGrid vertical={false} stroke="#27272a" />
        <XAxis dataKey="month" stroke="#71717a" fontSize={10} tickLine={false} />
        <YAxis stroke="#52525b" fontSize={10} tickLine={false} tickFormatter={(v) => fmt(v)} />
        <Tooltip contentStyle={{ background: '#0a0a0c', border: '1px solid #2a2a35', borderRadius: 6, fontSize: 11 }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} formatter={(v) => [fmt(v), '']} />
        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
        <Bar dataKey="Freelance" stackId="a" fill="#BB8FCE" />
        <Bar dataKey="STL"       stackId="a" fill="#F39C12" />
        <Bar dataKey="POD"       stackId="a" fill="#EC7063" radius={[3, 3, 0, 0]} />
        <Line dataKey="Target" stroke="#71717a" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

// ============================================================================
// PHASE STRIP
// ============================================================================

const PHD_PHASES = [
  { id: 'build',     label: 'Build Sprint',       start: '2026-05-28', end: '2026-06-01' },
  { id: 'surgery',   label: 'Surgery & Pipeline', start: '2026-06-02', end: '2026-08-15' },
  { id: 'experiments', label: 'Experiments',      start: '2026-08-16', end: '2026-09-30' },
  { id: 'viva',      label: 'Viva Prep',          start: '2026-10-01', end: '2026-11-15' },
];

const PhdPhaseStrip = ({ today }) => {
  const currentIdx = PHD_PHASES.findIndex(p => {
    const s = new Date(p.start), e = new Date(p.end);
    return today >= s && today <= e;
  });

  return (
    <div className="flex flex-col md:flex-row gap-1.5">
      {PHD_PHASES.map((p, i) => {
        const isPast = i < currentIdx;
        const isCurrent = i === currentIdx;
        const e = new Date(p.end);
        const daysLeft = isCurrent ? daysBetween(today, e) : null;
        return (
          <div
            key={p.id}
            className={`flex-1 rounded p-2.5 border transition-all ${
              isCurrent ? 'bg-blue-500/10 border-blue-400/50' :
              isPast    ? 'bg-zinc-900/40 border-zinc-800/50 opacity-50' :
                          'bg-zinc-950/30 border-zinc-800/40 opacity-60'
            }`}
          >
            <div className={`text-[9px] uppercase tracking-widest font-semibold ${isCurrent ? 'text-blue-300' : 'text-zinc-500'}`}>
              Phase {i + 1}
            </div>
            <div className={`text-xs font-medium mt-0.5 ${isCurrent ? 'text-zinc-100' : 'text-zinc-400'}`}>
              {p.label}
            </div>
            <div className="text-[10px] text-zinc-500 font-mono mt-1">
              {formatDate(new Date(p.start))} → {formatDate(e)}
            </div>
            {isCurrent && (
              <div className="text-[10px] text-blue-300 font-mono mt-1 flex items-center gap-1">
                <Flame size={9} /> {daysLeft}d left
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// INSIGHTS PANELS
// ============================================================================

const PhdInsights = ({ tasks, today }) => {
  const buildTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) <= BUILD_DEADLINE);
  const buildDone = buildTasks.filter(t => t.status === '✅ Done').length;
  const buildPct = buildTasks.length ? Math.round((buildDone / buildTasks.length) * 100) : 0;
  const daysToBuild = daysBetween(today, BUILD_DEADLINE);
  const daysToViva = daysBetween(today, VIVA_DATE);

  return (
    <Card accent="#5DADE2">
      <SectionTitle accent="#5DADE2">PhD Insights</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded border border-red-500/30 bg-red-950/20 p-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-red-400 font-semibold">
            <Flame size={12} /> Build Deadline
          </div>
          <div className="font-display text-4xl text-red-300 mt-2">{Math.max(0, daysToBuild)}d</div>
          <div className="text-xs text-zinc-400 mt-1">{buildPct}% complete · {buildTasks.length - buildDone} tasks left</div>
          <div className="h-1.5 bg-zinc-800 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-red-400 transition-all" style={{ width: `${buildPct}%` }} />
          </div>
        </div>
        <div className="rounded border border-amber-500/30 bg-amber-950/20 p-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-amber-400 font-semibold">
            <Award size={12} /> Viva
          </div>
          <div className="font-display text-4xl text-amber-300 mt-2">{daysToViva}d</div>
          <div className="text-xs text-zinc-400 mt-1">approx. mid-November 2026</div>
          <div className="text-[10px] text-zinc-500 mt-3 font-mono">
            ~{Math.round(daysToViva / 7)} weeks · {Math.round(daysToViva / 30)} months
          </div>
        </div>
        <div className="rounded border border-blue-500/30 bg-blue-950/20 p-4">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-blue-400 font-semibold">
            <GitBranch size={12} /> Pipeline Backlog
          </div>
          <div className="text-xs text-zinc-300 mt-3 space-y-1">
            <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-zinc-500" /> ΔF/F computation</div>
            <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-zinc-500" /> 2D place field binning</div>
            <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-zinc-500" /> Spatial info (Skaggs)</div>
            <div className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-zinc-500" /> Cross-session tracking</div>
          </div>
          <div className="text-[10px] text-blue-400 mt-3 font-mono">Use surgery recovery window</div>
        </div>
      </div>
    </Card>
  );
};

const FreelanceInsights = ({ tasks, revenue, fmt = (v) => `£${v}` }) => {
  const setupDone = tasks.filter(t => t.status === '✅ Done').length;
  const setupPct = tasks.length ? Math.round((setupDone / tasks.length) * 100) : 0;
  const totalRevenue = (revenue || []).reduce((a, r) => a + (r.freelance || 0), 0);
  const totalProposals = (revenue || []).reduce((a, r) => a + (r.proposals || 0), 0);

  return (
    <Card accent="#BB8FCE">
      <SectionTitle accent="#BB8FCE">Freelance Insights</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded border border-purple-500/30 bg-purple-950/20 p-4">
          <div className="text-[10px] uppercase tracking-widest text-purple-300 font-semibold">Platform Launch</div>
          <div className="font-display text-4xl text-purple-200 mt-2">{setupPct}%</div>
          <div className="text-xs text-zinc-400 mt-1">{setupDone}/{tasks.length} setup tasks done</div>
          <div className="h-1.5 bg-zinc-800 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-purple-400 transition-all" style={{ width: `${setupPct}%` }} />
          </div>
          <div className="text-[10px] text-zinc-500 mt-2 font-mono">Target: live by Jun 7</div>
        </div>
        <div className="rounded border border-zinc-700 bg-zinc-900/40 p-4">
          <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Revenue Progress</div>
          <div className="font-display text-4xl text-zinc-100 mt-2">{fmt(totalRevenue)}</div>
          <div className="text-xs text-zinc-500 mt-1">of {fmt(1500)}/mo target</div>
          <div className="text-[10px] text-zinc-500 mt-3 font-mono">{totalProposals} proposals sent total</div>
        </div>
        <div className="rounded border border-zinc-700 bg-zinc-900/40 p-4">
          <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Rate Targets</div>
          <div className="font-display text-3xl text-zinc-100 mt-2">{fmt(55)} → {fmt(85)}</div>
          <div className="text-xs text-zinc-500 mt-1">starting → target hourly</div>
          <div className="text-[10px] text-zinc-500 mt-3 font-mono">Convert to retainers ASAP</div>
        </div>
      </div>
    </Card>
  );
};

const StlInsights = ({ tasks, revenue, fmt = (v) => `£${v}` }) => {
  const setupDone = tasks.filter(t => t.status === '✅ Done').length;
  const setupPct = tasks.length ? Math.round((setupDone / tasks.length) * 100) : 0;
  const totalDesigns = (revenue || []).reduce((a, r) => a + (r.stlDesigns || 0), 0);
  const totalRev = (revenue || []).reduce((a, r) => a + (r.stl || 0), 0);
  const revPerDesign = totalDesigns > 0 ? totalRev / totalDesigns : null;

  return (
    <Card accent="#F39C12">
      <SectionTitle accent="#F39C12">STL Insights</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded border border-orange-500/30 bg-orange-950/20 p-4">
          <div className="text-[10px] uppercase tracking-widest text-orange-300 font-semibold">Platform Setup</div>
          <div className="font-display text-4xl text-orange-200 mt-2">{setupPct}%</div>
          <div className="text-xs text-zinc-400 mt-1">Cults3D · MyMiniFactory</div>
          <div className="h-1.5 bg-zinc-800 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-orange-400 transition-all" style={{ width: `${setupPct}%` }} />
          </div>
        </div>
        <div className="rounded border border-zinc-700 bg-zinc-900/40 p-4">
          <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Catalogue</div>
          <div className="font-display text-4xl text-zinc-100 mt-2">{totalDesigns}</div>
          <div className="text-xs text-zinc-500 mt-1">designs published</div>
          <div className="text-[10px] text-zinc-500 mt-3 font-mono">Target: 2–3 / week</div>
        </div>
        <div className="rounded border border-zinc-700 bg-zinc-900/40 p-4">
          <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Revenue Density</div>
          <div className="font-display text-4xl text-zinc-100 mt-2">{revPerDesign != null ? fmt(revPerDesign) : '—'}</div>
          <div className="text-xs text-zinc-500 mt-1">per design (cumulative)</div>
          <div className="text-[10px] text-zinc-500 mt-3 font-mono">Goal: {fmt(400)}/mo passive</div>
        </div>
      </div>
    </Card>
  );
};

const PodInsights = ({ tasks, revenue }) => {
  const setupDone = tasks.filter(t => t.status === '✅ Done').length;
  const setupPct = tasks.length ? Math.round((setupDone / tasks.length) * 100) : 0;
  const totalListings = (revenue || []).reduce((a, r) => a + (r.podListings || 0), 0);

  return (
    <Card accent="#EC7063">
      <SectionTitle accent="#EC7063">POD Insights</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded border border-rose-500/30 bg-rose-950/20 p-4">
          <div className="text-[10px] uppercase tracking-widest text-rose-300 font-semibold">Platform Setup</div>
          <div className="font-display text-4xl text-rose-200 mt-2">{setupPct}%</div>
          <div className="text-xs text-zinc-400 mt-1">Etsy · Printify · EverBee</div>
          <div className="h-1.5 bg-zinc-800 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-rose-400 transition-all" style={{ width: `${setupPct}%` }} />
          </div>
        </div>
        <div className="rounded border border-zinc-700 bg-zinc-900/40 p-4">
          <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Listings</div>
          <div className="font-display text-4xl text-zinc-100 mt-2">{totalListings}</div>
          <div className="text-xs text-zinc-500 mt-1">live on Etsy</div>
          <div className="text-[10px] text-zinc-500 mt-3 font-mono">Target: 3–5 / week</div>
        </div>
        <div className="rounded border border-zinc-700 bg-zinc-900/40 p-4">
          <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Niche Priority</div>
          <div className="font-display text-xl text-zinc-100 mt-2">Lab humour</div>
          <div className="text-xs text-zinc-500 mt-1">highest conversion first</div>
          <div className="text-[10px] text-zinc-500 mt-3 font-mono">Then sci art → geometric</div>
        </div>
      </div>
    </Card>
  );
};

const AdminInsights = ({ tasks }) => {
  const setupDone = tasks.filter(t => t.status === '✅ Done').length;
  const setupPct = tasks.length ? Math.round((setupDone / tasks.length) * 100) : 0;

  return (
    <Card accent="#95A5A6">
      <SectionTitle accent="#95A5A6">Compliance & Tooling</SectionTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded border border-zinc-600 bg-zinc-900/40 p-4">
          <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Compliance</div>
          <div className="font-display text-4xl text-zinc-100 mt-2">{setupPct}%</div>
          <div className="text-xs text-zinc-500 mt-1">HMRC · tax account · Wave</div>
          <div className="h-1.5 bg-zinc-800 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-zinc-400 transition-all" style={{ width: `${setupPct}%` }} />
          </div>
        </div>
        <div className="rounded border border-zinc-700 bg-zinc-900/40 p-4">
          <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Tax Buffer</div>
          <div className="font-display text-4xl text-zinc-100 mt-2">25%</div>
          <div className="text-xs text-zinc-500 mt-1">of freelance income</div>
          <div className="text-[10px] text-zinc-500 mt-3 font-mono">Set aside from day 1</div>
        </div>
        <div className="rounded border border-zinc-700 bg-zinc-900/40 p-4">
          <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Friday Review</div>
          <div className="font-display text-4xl text-zinc-100 mt-2">30m</div>
          <div className="text-xs text-zinc-500 mt-1">weekly admin time</div>
          <div className="text-[10px] text-zinc-500 mt-3 font-mono">Invoicing · Toggl · summary</div>
        </div>
      </div>
    </Card>
  );
};

const PriorityHoursChart = ({ tasks }) => {
  const data = useMemo(() => {
    const m = { '🔴 High': 0, '🟡 Medium': 0, '🟢 Low': 0 };
    tasks.filter(t => t.status !== '✅ Done').forEach(t => {
      m[t.priority] = (m[t.priority] || 0) + (t.timeEst || 0);
    });
    return Object.entries(m).map(([k, v]) => ({
      priority: k.split(' ').slice(1).join(' '),
      hours: v,
      color: PRIORITY_META[k]?.color,
    })).filter(d => d.hours > 0);
  }, [tasks]);

  if (!data.length) return <div className="text-xs text-zinc-500 text-center py-12 italic">No open tasks.</div>;

  return (
    <ResponsiveContainer width="100%" height={192}>
      <BarChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: -16 }}>
        <CartesianGrid vertical={false} stroke="#27272a" />
        <XAxis dataKey="priority" stroke="#71717a" fontSize={10} tickLine={false} />
        <YAxis stroke="#52525b" fontSize={10} tickLine={false} />
        <Tooltip contentStyle={{ background: '#0a0a0c', border: '1px solid #2a2a35', borderRadius: 6, fontSize: 11 }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} formatter={(v) => [`${v}h`, '']} />
        <Bar dataKey="hours" radius={[3, 3, 0, 0]}>
          {data.map((e, i) => <Cell key={i} fill={e.color} fillOpacity={0.85} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

// ============================================================================
// TAB COMPONENTS
// ============================================================================

const OverviewTab = ({ tasks, revenue, today, fmt, density = 'comfortable' }) => {
  const stats = useMemo(() => {
    const open = tasks.filter(t => t.status !== '✅ Done');
    const overdue = tasks.filter(t => isOverdue(t, today));
    const thisWeek = tasks.filter(isDueThisWeek);
    const hoursThisWeek = thisWeek.reduce((a, t) => a + (t.timeEst || 0), 0);
    const done = tasks.filter(t => t.status === '✅ Done').length;
    return { open: open.length, overdue: overdue.length, thisWeek: thisWeek.length, hoursThisWeek, done };
  }, [tasks, today]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Open Tasks" value={stats.open} icon={Activity} accent="#e8e8f0" sub={`${stats.done} completed`} />
        <KPICard label="This Week" value={stats.thisWeek} icon={Zap} accent="#5DADE2" sub={`${stats.hoursThisWeek}h estimated`} />
        <KPICard label="Overdue" value={stats.overdue} icon={AlertTriangle} accent={stats.overdue ? '#E74C3C' : '#52525b'} sub={stats.overdue ? 'action needed' : 'all on track'} />
        <KPICard label="Days to Viva" value={daysBetween(today, VIVA_DATE)} icon={Award} accent="#F1C40F" sub="approx. mid-Nov" />
      </div>

      <Card><SectionTitle accent="#5DADE2">PhD Phase</SectionTitle><PhdPhaseStrip today={today} /></Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card><SectionTitle>Calendar — Next 2 Months</SectionTitle><CalendarView tasks={tasks} today={today} /></Card>
        </div>
        <Card><SectionTitle>Priority Queue</SectionTitle><PriorityList tasks={tasks} today={today} limit={8} density={density} /></Card>
      </div>

      {density !== 'focus' && (
        <>
          <Card><SectionTitle>12-Week Timeline</SectionTitle><TimelineView tasks={tasks} today={today} /></Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card><SectionTitle>Status Mix</SectionTitle><StatusDonut tasks={tasks} /></Card>
            <Card><SectionTitle>Tasks by Area</SectionTitle><AreaBar tasks={tasks} /></Card>
            <Card><SectionTitle>Open Hours by Area</SectionTitle><HoursChart tasks={tasks} /></Card>
          </div>

          <Card>
            <SectionTitle>Revenue Trajectory — June → October</SectionTitle>
            <RevenueChart revenue={revenue} fmt={fmt} />
            <div className="text-[10px] text-zinc-500 mt-2 italic">Dashed line = monthly target. Bars stack actuals by pillar.</div>
          </Card>
        </>
      )}
    </div>
  );
};

const ProjectTab = ({ area, tasks, today, insights, density = 'comfortable' }) => {
  const meta = AREA_META[area];

  const stats = useMemo(() => {
    const open = tasks.filter(t => t.status !== '✅ Done').length;
    const done = tasks.filter(t => t.status === '✅ Done').length;
    const overdue = tasks.filter(t => isOverdue(t, today)).length;
    const totalHours = tasks.filter(t => t.status !== '✅ Done').reduce((a, t) => a + (t.timeEst || 0), 0);
    const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    return { open, done, overdue, totalHours, pct };
  }, [tasks, today]);

  if (!tasks.length && !insights) {
    return (
      <Card>
        <div className="py-12 text-center">
          <meta.icon size={32} className="mx-auto mb-3 text-zinc-700" />
          <div className="text-zinc-500">No tasks yet for {meta.label}.</div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Open" value={stats.open} icon={Activity} accent={meta.color} sub={`${stats.done} done · ${stats.pct}%`} />
        <KPICard label="Hours Est." value={`${stats.totalHours}h`} icon={Clock} accent={meta.color} sub="open tasks only" />
        <KPICard label="Overdue" value={stats.overdue} icon={AlertTriangle} accent={stats.overdue ? '#E74C3C' : '#52525b'} />
        <KPICard label="Completion" value={`${stats.pct}%`} icon={CheckCircle2} accent={meta.color} sub={`${stats.done} / ${tasks.length}`} />
      </div>

      {density !== 'focus' && insights}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card accent={meta.color}><SectionTitle accent={meta.color}>Calendar</SectionTitle><CalendarView tasks={tasks} today={today} /></Card>
        </div>
        <Card accent={meta.color}><SectionTitle accent={meta.color}>Priority Queue</SectionTitle><PriorityList tasks={tasks} today={today} limit={10} density={density} /></Card>
      </div>

      {density !== 'focus' && (
        <>
          <Card accent={meta.color}><SectionTitle accent={meta.color}>Timeline</SectionTitle><TimelineView tasks={tasks} today={today} /></Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card accent={meta.color}><SectionTitle accent={meta.color}>Status Distribution</SectionTitle><StatusDonut tasks={tasks} /></Card>
            <Card accent={meta.color}><SectionTitle accent={meta.color}>Hours by Priority</SectionTitle><PriorityHoursChart tasks={tasks} /></Card>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// MAIN APP
// ============================================================================

export default function App() {
  const { settings, updateSetting, resetSettings } = useSettings();
  const [tasks, setTasks] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [syncedAt, setSyncedAt] = useState(null);
  const [activeTab, setActiveTab] = useState(settings.landingTab || 'overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const today = useMemo(() => new Date(), []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Cache-busting query string forces fresh JSON on manual refresh
      const url = `${import.meta.env.BASE_URL}data.json?t=${Date.now()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTasks(data.tasks || []);
      setRevenue(data.revenue || []);
      setSyncedAt(data.syncedAt ? new Date(data.syncedAt) : null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Optional auto-refresh: re-fetch data.json on a timer.
  // The Notion sync itself is hourly via GitHub Actions; this just keeps the
  // open browser tab in step with the latest published data.json.
  useEffect(() => {
    if (!settings.autoRefresh) return;
    const minutes = Math.max(1, settings.autoRefreshMinutes || 15);
    const id = setInterval(() => { loadData(); }, minutes * 60 * 1000);
    return () => clearInterval(id);
  }, [settings.autoRefresh, settings.autoRefreshMinutes]);

  // Apply the "hide completed" preference at the top level so every tab,
  // chart and stat sees a single consistent view of the task list.
  const visibleTasks = useMemo(
    () => settings.hideCompleted ? tasks.filter(t => t.status !== '✅ Done') : tasks,
    [tasks, settings.hideCompleted]
  );

  // Currency formatter — respects settings.currency + settings.numberLocale.
  // Whole-pound (or equivalent) precision matches the original hardcoded UI.
  const fmt = useMemo(() => {
    const f = new Intl.NumberFormat(settings.numberLocale, {
      style: 'currency',
      currency: settings.currency,
      maximumFractionDigits: 0,
    });
    return (v) => f.format(v || 0);
  }, [settings.numberLocale, settings.currency]);

  const tabs = [
    { id: 'overview',        label: 'Overview',  icon: Layers,        color: '#e8e8f0' },
    { id: '🔬 PhD',          label: 'PhD',       icon: FlaskConical,  color: AREA_META['🔬 PhD'].color },
    { id: '💼 P1 Freelance', label: 'Freelance', icon: Briefcase,     color: AREA_META['💼 P1 Freelance'].color },
    { id: '🖨️ P2 STL',      label: 'STL',       icon: Printer,       color: AREA_META['🖨️ P2 STL'].color },
    { id: '🛍️ P3 POD',      label: 'POD',       icon: ShoppingBag,   color: AREA_META['🛍️ P3 POD'].color },
    { id: '⚙️ Admin',        label: 'Admin',     icon: Settings,      color: AREA_META['⚙️ Admin'].color },
  ];

  const filterArea = (area) => visibleTasks.filter(t => t.area === area);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <h1 className="font-display text-3xl italic text-zinc-100">Command Centre</h1>
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono">PhD · Income · Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-500 font-mono">
              {syncedAt
                ? `synced ${syncedAt.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                : loading ? 'loading…' : 'no data'}
            </span>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded border border-zinc-700 hover:border-zinc-500 text-xs text-zinc-300 transition-colors disabled:opacity-50"
              title="Reload from data.json (does NOT trigger a Notion sync — for that, run the GitHub Action)"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Loading…' : 'Reload'}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded border border-zinc-700 hover:border-zinc-500 text-zinc-300 transition-colors"
              title="Settings"
              aria-label="Open settings"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto px-6 flex gap-1 overflow-x-auto">
          {tabs.map(t => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                  active ? 'text-zinc-100' : 'text-zinc-500 border-transparent hover:text-zinc-300'
                }`}
                style={active ? { borderColor: t.color } : {}}
              >
                <Icon size={13} style={{ color: active ? t.color : undefined }} />
                {t.label}
              </button>
            );
          })}
        </div>
      </header>

      {error && (
        <div className="max-w-[1600px] mx-auto px-6 pt-4">
          <div className="rounded border border-red-500/40 bg-red-950/20 px-4 py-2 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle size={14} /> Failed to load data.json: {error}
          </div>
        </div>
      )}

      {loading && !tasks.length && (
        <div className="max-w-[1600px] mx-auto px-6 py-12 text-center text-zinc-500 text-sm">
          Loading dashboard…
        </div>
      )}

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {activeTab === 'overview' && <OverviewTab tasks={visibleTasks} revenue={revenue} today={today} fmt={fmt} density={settings.density} />}
        {activeTab === '🔬 PhD' && (
          <ProjectTab area="🔬 PhD" tasks={filterArea('🔬 PhD')} today={today} density={settings.density}
            insights={<PhdInsights tasks={filterArea('🔬 PhD')} today={today} />} />
        )}
        {activeTab === '💼 P1 Freelance' && (
          <ProjectTab area="💼 P1 Freelance" tasks={filterArea('💼 P1 Freelance')} today={today} density={settings.density}
            insights={<FreelanceInsights tasks={filterArea('💼 P1 Freelance')} revenue={revenue} fmt={fmt} />} />
        )}
        {activeTab === '🖨️ P2 STL' && (
          <ProjectTab area="🖨️ P2 STL" tasks={filterArea('🖨️ P2 STL')} today={today} density={settings.density}
            insights={<StlInsights tasks={filterArea('🖨️ P2 STL')} revenue={revenue} fmt={fmt} />} />
        )}
        {activeTab === '🛍️ P3 POD' && (
          <ProjectTab area="🛍️ P3 POD" tasks={filterArea('🛍️ P3 POD')} today={today} density={settings.density}
            insights={<PodInsights tasks={filterArea('🛍️ P3 POD')} revenue={revenue} />} />
        )}
        {activeTab === '⚙️ Admin' && (
          <ProjectTab area="⚙️ Admin" tasks={filterArea('⚙️ Admin')} today={today} density={settings.density}
            insights={<AdminInsights tasks={filterArea('⚙️ Admin')} />} />
        )}
      </main>

      <footer className="max-w-[1600px] mx-auto px-6 py-6 border-t border-zinc-900 mt-12">
        <div className="text-[10px] text-zinc-600 font-mono">
          {tasks.length} tasks · {revenue.length} months · Synced from Notion via GitHub Actions
        </div>
      </footer>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        updateSetting={updateSetting}
        resetSettings={resetSettings}
      />
    </div>
  );
}
