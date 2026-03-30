import React, { useState, useEffect } from 'react';
import { Plus, User, Shield, MapPin, MoreVertical, Check, X, Loader2, Save, Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';
import { User as UserType, Branch, Role } from '../types';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Users() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserType[];
      setUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, {
        role: editingUser.role,
        branch: editingUser.branch || null,
        active: editingUser.active
      });
      setIsModalOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const toggleStatus = async (user: UserType) => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { active: !user.active });
    } catch (error) {
      console.error("Error toggling user status:", error);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={48} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-6xl font-bold text-white tracking-tighter mb-2 uppercase">USER MANAGEMENT</h1>
          <p className="text-sm text-text-secondary uppercase tracking-[0.3em] font-medium">
            <span className="text-accent">{users.length} TOTAL ACCOUNTS</span> · ACCESS CONTROL LIST
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-elevated border-b border-border">
                  <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">USER IDENTITY</th>
                  <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">ROLE / BRANCH</th>
                  <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">STATUS</th>
                  <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className={cn(
                    "hover:bg-surface-elevated transition-colors",
                    !user.active && "opacity-50 grayscale"
                  )}>
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-background border border-border flex items-center justify-center">
                          <User size={18} className="text-text-secondary" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white tracking-wider">{user.name}</p>
                          <p className="text-[9px] text-text-secondary uppercase tracking-widest">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield size={12} className="text-accent" />
                        <p className="text-[10px] font-bold text-white uppercase tracking-widest">{user.role}</p>
                      </div>
                      {user.branch && (
                        <div className="flex items-center gap-2">
                          <MapPin size={12} className="text-text-secondary" />
                          <p className="text-[9px] text-text-secondary uppercase tracking-widest">{user.branch}</p>
                        </div>
                      )}
                    </td>
                    <td className="p-5">
                      <button 
                        onClick={() => toggleStatus(user)}
                        className={cn(
                          "px-2 py-1 text-[8px] font-bold uppercase tracking-widest flex items-center gap-1.5",
                          user.active ? "text-status-green bg-status-green/10" : "text-status-red bg-status-red/10"
                        )}
                      >
                        <div className={cn("w-1.5 h-1.5 rounded-full", user.active ? "bg-status-green" : "bg-status-red")}></div>
                        {user.active ? 'ACTIVE' : 'DISABLED'}
                      </button>
                    </td>
                    <td className="p-5 text-right">
                      <button 
                        onClick={() => {
                          setEditingUser(user);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-text-secondary hover:text-white transition-colors"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <div className="space-y-8">
          <Card title="PERMISSION OVERVIEW" subtitle="GRANULAR ACCESS CONTROL">
            <div className="space-y-6">
              {[
                { label: 'SUPER ADMIN', desc: 'Full system access across all branches and modules.' },
                { label: 'BRANCH MANAGER', desc: 'Manage inventory and view analytics for assigned branch.' },
                { label: 'BRANCH STAFF', desc: 'Process sales and manage workshop queue for assigned branch.' },
              ].map(p => (
                <div key={p.label} className="flex gap-4">
                  <div className="mt-1">
                    <div className="w-4 h-4 border border-accent flex items-center justify-center">
                      <Check size={10} className="text-accent" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-1">{p.label}</p>
                    <p className="text-[9px] text-text-secondary leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Edit User Modal */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface border border-border">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight uppercase">EDIT USER ACCESS</h3>
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">{editingUser.email}</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-text-secondary hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">ASSIGNED ROLE</label>
                <select 
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as Role })}
                  className="w-full bg-background border border-border p-4 text-xs font-bold text-white uppercase tracking-widest focus:border-accent outline-none"
                >
                  <option value="Super Admin">Super Admin</option>
                  <option value="Branch Manager">Branch Manager</option>
                  <option value="Branch Staff">Branch Staff</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">ASSIGNED BRANCH</label>
                <select 
                  value={editingUser.branch || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, branch: e.target.value as Branch || undefined })}
                  className="w-full bg-background border border-border p-4 text-xs font-bold text-white uppercase tracking-widest focus:border-accent outline-none"
                >
                  <option value="">NO BRANCH ASSIGNED</option>
                  <option value="Imus">Imus</option>
                  <option value="Quezon City">Quezon City</option>
                </select>
              </div>

              <div className="flex items-center gap-3 py-4 border-y border-border">
                <button
                  type="button"
                  onClick={() => setEditingUser({ ...editingUser, active: !editingUser.active })}
                  className={cn(
                    "w-12 h-6 rounded-full relative transition-colors",
                    editingUser.active ? "bg-status-green" : "bg-surface-elevated"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    editingUser.active ? "left-7" : "left-1"
                  )}></div>
                </button>
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                  ACCOUNT STATUS: {editingUser.active ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-surface-elevated border border-border text-white py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-border transition-colors"
                >
                  CANCEL
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-accent text-white py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-accent/80 transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={14} />
                  SAVE CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
