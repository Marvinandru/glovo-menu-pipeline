"use client";

import React from "react";

interface MenuItem {
  item_name: string;
  description: string;
  price: string;
  category: string;
}

interface ExtractedTableProps {
  items: MenuItem[];
}

export default function ExtractedTable({ items }: ExtractedTableProps) {
  if (!items || items.length === 0) return null;

  // Group by category
  const grouped = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const cat = item.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="bg-zinc-800/60 border border-zinc-700 rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-zinc-700">
        <h3 className="font-semibold text-zinc-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Extracted Menu Items
          <span className="ml-auto text-xs font-normal text-zinc-500 bg-zinc-700/50 px-2.5 py-1 rounded-full">
            {items.length} items
          </span>
        </h3>
      </div>

      <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-800 z-10">
            <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider">
              <th className="px-5 py-3 font-medium">#</th>
              <th className="px-5 py-3 font-medium">Item Name</th>
              <th className="px-5 py-3 font-medium hidden md:table-cell">Description</th>
              <th className="px-5 py-3 font-medium">Price</th>
              <th className="px-5 py-3 font-medium">Category</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700/50">
            {Object.entries(grouped).map(([category, catItems]) => (
              <React.Fragment key={category}>
                {catItems.map((item, i) => {
                  const globalIndex =
                    items.findIndex(
                      (it) =>
                        it.item_name === item.item_name &&
                        it.price === item.price
                    ) + 1;
                  return (
                    <tr
                      key={`${category}-${i}`}
                      className="hover:bg-zinc-700/20 transition-colors"
                    >
                      <td className="px-5 py-3 text-zinc-600 font-mono text-xs">
                        {globalIndex}
                      </td>
                      <td className="px-5 py-3 font-medium text-zinc-200">
                        {item.item_name}
                      </td>
                      <td className="px-5 py-3 text-zinc-400 hidden md:table-cell max-w-xs truncate">
                        {item.description}
                      </td>
                      <td className="px-5 py-3 text-emerald-400 font-medium whitespace-nowrap">
                        {item.price}
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2.5 py-1 bg-zinc-700/50 text-zinc-400 rounded-full text-xs">
                          {category}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
