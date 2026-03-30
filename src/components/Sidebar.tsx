import React from 'react';
import { NavLink } from 'react-router-dom';
import { Plus, Settings, LifeBuoy } from 'lucide-react';
import { NAV_ITEMS, BOTTOM_NAV_ITEMS } from '../constants';
import { cn } from '../lib/utils';

export default function Sidebar() {
  return (
    <aside className="w-[220px] h-screen bg-background border-r border-border flex flex-col fixed left-0 top-0 z-50">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white tracking-tighter">FERMATA</h1>
        <p className="text-[10px] text-text-secondary uppercase tracking-[0.2em] -mt-1">Musical Instruments</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-0 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-6 py-3 text-sm font-medium uppercase tracking-wider transition-all border-l-[3px]",
                    isActive 
                      ? "text-accent border-accent bg-accent/5" 
                      : "text-text-secondary border-transparent hover:text-white hover:bg-surface"
                  )
                }
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 space-y-4">
        <button className="w-full fermata-button-primary flex items-center justify-center gap-2 py-4">
          <Plus size={18} />
          <span>New Entry</span>
        </button>
        
        <ul className="space-y-1 border-t border-border pt-4">
          {BOTTOM_NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-2 py-2 text-xs font-medium uppercase tracking-wider transition-all",
                    isActive ? "text-white" : "text-text-secondary hover:text-white"
                  )
                }
              >
                <item.icon size={14} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
