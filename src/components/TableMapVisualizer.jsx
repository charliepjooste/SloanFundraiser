import React from 'react';
import { Users, CheckCircle2, AlertCircle } from 'lucide-react';

export default function TableMapVisualizer({ selectedTableNumber, onSelectTable, tablesData = [] }) {
  // Generate 35 Tables (each capacity 10 = 350 Total Capacity)
  const tables = Array.from({ length: 35 }, (_, i) => {
    const tableNo = i + 1;
    const existingTable = tablesData.find(t => t.id === `table_${tableNo}` || Number(t.tableNumber) === tableNo);
    const capacity = existingTable?.capacity || 10;
    const reserved = existingTable?.seatsReserved || (i === 0 ? 8 : i === 2 ? 10 : i === 4 ? 6 : i === 7 ? 10 : i === 12 ? 9 : i === 24 ? 10 : 2);
    const remaining = Math.max(0, capacity - reserved);
    const isFull = remaining === 0;

    return {
      tableNumber: tableNo,
      capacity,
      reserved,
      remaining,
      isFull
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Interactive Seating Map (35 Tables • 350 Capacity)
          </h3>
          <p className="text-xs text-purple-700 font-medium">Click a table to reserve seats or book a full private table of 10</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-emerald-700">
            <span className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-500"></span>
            Available
          </div>
          <div className="flex items-center gap-1.5 text-amber-700">
            <span className="w-3 h-3 rounded-full bg-amber-100 border border-amber-500"></span>
            Filling Fast
          </div>
          <div className="flex items-center gap-1.5 text-rose-700">
            <span className="w-3 h-3 rounded-full bg-rose-100 border border-rose-500"></span>
            Full
          </div>
        </div>
      </div>

      {/* Grid of 35 Tables */}
      <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-7 gap-2.5 p-4 rounded-2xl bg-white border border-purple-200 shadow-sm max-h-[420px] overflow-y-auto">
        {tables.map((table) => {
          const isSelected = selectedTableNumber === table.tableNumber;
          let statusBg = "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-500 hover:bg-emerald-50/50";
          
          if (table.isFull) {
            statusBg = "border-rose-200 bg-rose-50/70 text-rose-600 opacity-60 cursor-not-allowed";
          } else if (table.remaining <= 3) {
            statusBg = "border-amber-200 bg-amber-50/70 text-amber-800 hover:border-amber-500";
          }

          if (isSelected) {
            statusBg = "border-2 border-emerald-600 bg-emerald-50 text-slate-900 ring-2 ring-emerald-400 shadow-md";
          }

          return (
            <button
              key={table.tableNumber}
              type="button"
              disabled={table.isFull}
              onClick={() => onSelectTable(table.tableNumber)}
              className={`p-2.5 rounded-xl border text-left transition-all duration-200 relative ${statusBg}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-900">
                  T{table.tableNumber}
                </span>
                {isSelected && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                )}
                {table.isFull && (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                )}
              </div>

              {/* Table Graphic */}
              <div className="flex items-center justify-center my-0.5 py-0.5">
                <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center bg-white shadow-sm">
                  <span className="text-[10px] font-black">{table.reserved}/{table.capacity}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] mt-1 pt-1 border-t border-slate-200/80">
                <span className="text-slate-500">Free:</span>
                <span className={`font-bold ${table.remaining > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {table.remaining}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
