import React from 'react';
import { Search, Bell, History, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function TopBar() {
  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-8 sticky top-0 z-40">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input 
            type="text" 
            placeholder="SEARCH SYSTEM..." 
            className="w-full bg-surface border border-border pl-10 pr-4 py-2 text-xs uppercase tracking-widest focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Nav Links */}
      <nav className="hidden lg:flex items-center gap-8 mx-8">
        {['Direct Orders', 'Shipping', 'Reports'].map((link) => (
          <NavLink 
            key={link} 
            to={`/${link.toLowerCase().replace(' ', '-')}`}
            className={({ isActive }) => cn(
              "text-xs uppercase font-semibold tracking-widest transition-all pb-1 border-b-2",
              isActive ? "text-white border-accent" : "text-text-secondary border-transparent hover:text-white"
            )}
          >
            {link}
          </NavLink>
        ))}
      </nav>

      {/* User Actions */}
      <div className="flex items-center gap-6">
        <button className="text-text-secondary hover:text-white transition-colors relative">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full"></span>
        </button>
        <button className="text-text-secondary hover:text-white transition-colors">
          <History size={20} />
        </button>
        
        <div className="flex items-center gap-3 pl-4 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-white uppercase tracking-tighter">V. ROSSI</p>
            <p className="text-[8px] text-accent uppercase tracking-widest font-bold">Master Luthier</p>
          </div>
          <div className="w-8 h-8 bg-surface-elevated flex items-center justify-center border border-border">
            <User size={16} className="text-text-secondary" />
          </div>
        </div>
      </div>
    </header>
  );
}
