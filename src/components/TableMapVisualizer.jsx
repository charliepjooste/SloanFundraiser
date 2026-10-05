import React from 'react';
import { Users, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { getBookingSeatCount } from '../firebase';

export default function TableMapVisualizer({ selectedTableNumber, onSelectTable, tablesData = [], bookings = [] }) {
  // Generate 40 Tables (Tables 1-35 public, Tables 36-40 Admin Only; each capacity 10 = 400 Total Capacity)
  const tables = Array.from({ length: 40 }, (_, i) => {
    const tableNo = i + 1;
    const isAdminOnly = tableNo > 35;
    
    // Check bookings first for accurate real-time count
    const tableBookings = (bookings || []).filter(
      b => Number(b.tableNumber) === tableNo && getBookingSeatCount(b) > 0
    );
    const bookingsSeats = tableBookings.reduce(
      (sum, b) => sum + getBookingSeatCount(b), 
      0
    );

    const existingTable = tablesData.find(t => t.id === `table_${tableNo}` || Number(t.tableNumber) === tableNo);
    const capacity = existingTable?.capacity || 10;
    const reserved = bookings && bookings.length > 0 ? bookingsSeats : (existingTable?.seatsReserved || 0);
    const remaining = Math.max(0, capacity - reserved);
    const isFull = remaining === 0 || reserved >= capacity;
    const isOverbooked = reserved > capacity;
    const tableName = (existingTable?.tableName || '').trim();
    const tableNote = (existingTable?.tableNote || '').trim();

    return {
      tableNumber: tableNo,
      capacity,
      reserved,
      remaining,
      isFull,
      isOverbooked,
      isAdminOnly,
      guestCount: tableBookings.length,
      tableName,
      tableNote
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Live Seating Map (40 Tables • 400 Capacity)
          </h3>
          <p className="text-xs text-purple-700 font-medium">Click any table to filter and inspect assigned guests & available seats</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
          <div className="flex items-center gap-1.5 text-emerald-700">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            Available
          </div>
          <div className="flex items-center gap-1.5 text-amber-700">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            Filling Fast (≤3)
          </div>
          <div className="flex items-center gap-1.5 text-rose-700">
            <span className="w-3 h-3 rounded-full bg-rose-500"></span>
            FULL
          </div>
          <div className="flex items-center gap-1.5 text-purple-700">
            <span className="w-3 h-3 rounded-full bg-purple-600"></span>
            Overbooked (&gt;10)
          </div>
          <div className="flex items-center gap-1 text-[11px] text-purple-900 bg-purple-100 px-2 py-0.5 rounded-lg border border-purple-300 font-extrabold">
            <span>🔒 T36-40 Admin</span>
          </div>
        </div>
      </div>

      {/* Grid of 40 Tables */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5 p-4 rounded-2xl bg-white border border-purple-200 shadow-sm max-h-[460px] overflow-y-auto">
        {tables.map((table) => {
          const isSelected = selectedTableNumber === table.tableNumber;
          let statusBg = "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-500 hover:bg-emerald-50/50";
          let badgeBg = "bg-emerald-100 text-emerald-800 border-emerald-300";
          
          if (table.isOverbooked) {
            statusBg = "border-purple-300 bg-purple-50 text-purple-900 shadow-xs";
            badgeBg = "bg-purple-100 text-purple-900 border-purple-300";
          } else if (table.isFull) {
            statusBg = "border-rose-300 bg-rose-50 text-rose-900 shadow-xs";
            badgeBg = "bg-rose-100 text-rose-800 border-rose-300";
          } else if (table.remaining <= 3) {
            statusBg = "border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-500 shadow-xs";
            badgeBg = "bg-amber-100 text-amber-900 border-amber-300";
          }

          if (table.isAdminOnly) {
            statusBg += " ring-1 ring-purple-300";
          }

          if (isSelected) {
            statusBg = "border-2 border-emerald-600 bg-emerald-50 text-slate-900 ring-2 ring-emerald-400 shadow-md";
          }

          return (
            <button
              key={table.tableNumber}
              type="button"
              onClick={() => onSelectTable && onSelectTable(table.tableNumber)}
              className={`p-2.5 rounded-xl border text-left transition-all duration-200 relative cursor-pointer ${statusBg}`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-950 flex items-center gap-1">
                  Table #{table.tableNumber}
                  {table.isAdminOnly && <span className="text-[8px] px-1 py-0.2 rounded bg-purple-200 text-purple-950 font-black">🔒</span>}
                </span>
                {isSelected && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                )}
                {table.isOverbooked && !isSelected && (
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                )}
                {table.isFull && !table.isOverbooked && !isSelected && (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                )}
              </div>

              {table.tableName && (
                <div className="text-[9px] font-black text-purple-950 truncate px-1 py-0.5 rounded bg-purple-100/90 text-center mb-1 border border-purple-200" title={table.tableName}>
                  🏷️ {table.tableName}
                </div>
              )}

              {/* Table Graphic showing Seats Left */}
              <div className="flex items-center justify-center my-1 py-0.5">
                <div className={`w-10 h-10 rounded-full border-2 flex flex-col items-center justify-center bg-white shadow-xs ${
                  table.isOverbooked
                    ? 'border-purple-500 text-purple-800'
                    : table.isFull 
                    ? 'border-rose-500 text-rose-700' 
                    : table.remaining <= 3 
                    ? 'border-amber-500 text-amber-800' 
                    : 'border-emerald-500 text-emerald-800'
                }`}>
                  <span className="text-[11px] font-black leading-none">
                    {table.isOverbooked ? `+${table.reserved - table.capacity}` : table.isFull ? '0' : table.remaining}
                  </span>
                  <span className="text-[7px] font-black uppercase tracking-tight leading-none mt-0.5">
                    {table.isOverbooked ? 'OVER' : table.isFull ? 'FULL' : 'LEFT'}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between text-[10px] mt-1 pt-1 border-t border-slate-200/80 font-bold">
                <span className="text-slate-600 font-semibold">Seats:</span>
                <span className={`px-1.5 py-0.5 rounded font-black border text-[9px] ${badgeBg}`}>
                  {table.isOverbooked ? `🟣 ${table.reserved}/10 Over` : table.isFull ? '🔴 FULL' : `${table.remaining} Left`}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
