import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, orderBy, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Booking, Branch } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { cn, formatDate } from '../lib/utils';
import { useFirebase } from '../components/FirebaseProvider';
import { Plus, X, Search, Filter, MoreVertical, Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Workshop() {
  const { userData } = useFirebase();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<Branch | 'All'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Booking[];
      setBookings(bookingList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });

    return () => unsubscribe();
  }, []);

  const filteredBookings = bookings.filter(booking => {
    const matchesBranch = selectedBranch === 'All' || booking.branch === selectedBranch;
    const matchesSearch = booking.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         booking.instrumentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         booking.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBranch && matchesSearch;
  });

  const activeJobs = bookings.filter(b => b.status === 'Ongoing');
  const pendingJobs = bookings.filter(b => b.status === 'Pending');

  const handleSaveBooking = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const bookingData = {
      customerName: formData.get('customerName') as string,
      contact: formData.get('contact') as string,
      email: formData.get('email') as string,
      instrumentType: formData.get('instrumentType') as string,
      description: formData.get('description') as string,
      preferredDate: formData.get('preferredDate') as string,
      branch: formData.get('branch') as Branch,
      status: (formData.get('status') as any) || 'Pending',
      progress: Number(formData.get('progress') || 0),
      technician: formData.get('technician') as string,
      createdAt: editingBooking ? editingBooking.createdAt : Timestamp.now()
    };

    try {
      if (editingBooking) {
        await updateDoc(doc(db, 'bookings', editingBooking.id), bookingData);
      } else {
        await addDoc(collection(db, 'bookings'), bookingData);
      }
      setIsModalOpen(false);
      setEditingBooking(null);
    } catch (error) {
      handleFirestoreError(error, editingBooking ? OperationType.UPDATE : OperationType.CREATE, 'bookings');
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      try {
        await deleteDoc(doc(db, 'bookings', id));
        setIsModalOpen(false);
        setEditingBooking(null);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `bookings/${id}`);
      }
    }
  };

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-6xl font-bold text-white tracking-tighter mb-2 uppercase">SERVICE QUEUE</h1>
          <p className="text-sm text-text-secondary uppercase tracking-[0.3em] font-medium">
            <span className="text-accent">{activeJobs.length} ACTIVE PROJECTS</span> · {formatDate(new Date())}
          </p>
        </div>
        <div className="flex gap-4">
          <Button onClick={() => { setEditingBooking(null); setIsModalOpen(true); }} className="flex items-center gap-2">
            <Plus size={16} />
            <span className="text-[10px]">NEW WORK ORDER</span>
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'TOTAL QUEUE', value: bookings.length, icon: Clock, color: 'text-white' },
          { label: 'ACTIVE PULSE', value: activeJobs.length, icon: AlertCircle, color: 'text-accent' },
          { label: 'PENDING', value: pendingJobs.length, icon: Clock, color: 'text-text-muted' },
          { label: 'COMPLETED', value: bookings.filter(b => b.status === 'Completed').length, icon: CheckCircle2, color: 'text-status-green' },
        ].map((stat) => (
          <Card key={stat.label} className="p-6 bg-surface/50 border-border/50">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">{stat.label}</p>
                <p className={cn("text-3xl font-bold tracking-tighter", stat.color)}>{stat.value}</p>
              </div>
              <stat.icon size={20} className={stat.color} />
            </div>
          </Card>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input 
            type="text" 
            placeholder="SEARCH BY CLIENT, INSTRUMENT, OR REF_ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-border pl-12 pr-4 py-4 text-xs uppercase tracking-widest focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex bg-surface border border-border p-1">
          {['All', 'Imus', 'Quezon City'].map((branch) => (
            <button
              key={branch}
              onClick={() => setSelectedBranch(branch as any)}
              className={cn(
                "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all",
                selectedBranch === branch ? "bg-accent text-white" : "text-text-secondary hover:text-white"
              )}
            >
              {branch}
            </button>
          ))}
        </div>
      </div>

      {/* Job Cards & Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <h2 className="text-lg font-bold text-white tracking-widest uppercase border-b border-border pb-4">DETAILED WORK ORDERS</h2>
          
          <div className="bg-surface border border-border overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-elevated border-b border-border">
                  <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">PROJECT NAME</th>
                  <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">SERIAL / DESC</th>
                  <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">CLIENT</th>
                  <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">STATUS</th>
                  <th className="p-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">PROGRESS</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-20 text-center">
                      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-[10px] text-text-muted uppercase tracking-widest">SYNCING_QUEUE...</p>
                    </td>
                  </tr>
                ) : filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-20 text-center">
                      <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">NO WORK ORDERS FOUND</p>
                    </td>
                  </tr>
                ) : filteredBookings.map((job) => (
                  <tr key={job.id} className="hover:bg-surface-elevated transition-colors group">
                    <td className="p-4">
                      <p className="text-xs font-bold text-white tracking-wider uppercase">{job.instrumentType}</p>
                      <p className="text-[9px] text-text-secondary uppercase tracking-widest">REF_ID: {job.id.slice(-6).toUpperCase()}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-[10px] text-text-secondary line-clamp-1 uppercase">{job.description}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-xs font-bold text-white uppercase">{job.customerName}</p>
                      <p className="text-[9px] text-text-secondary">{job.contact}</p>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-1 text-[8px] font-bold uppercase tracking-widest",
                        job.status === 'Ongoing' ? "bg-accent/20 text-accent border border-accent/50" : 
                        job.status === 'Completed' ? "bg-status-green/20 text-status-green border border-status-green/50" :
                        "bg-surface-elevated text-text-secondary"
                      )}>
                        {job.status === 'Ongoing' ? 'ACTIVE PULSE' : job.status}
                      </span>
                    </td>
                    <td className="p-4 w-48">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1 bg-background overflow-hidden">
                          <div className="h-full bg-accent transition-all duration-500" style={{ width: `${job.progress}%` }}></div>
                        </div>
                        <span className="text-[10px] font-bold text-white">{job.progress}%</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => { setEditingBooking(job); setIsModalOpen(true); }}
                        className="p-2 text-text-secondary hover:text-white transition-colors"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-bold text-white tracking-widest uppercase border-b border-border pb-4">ACTIVE JOBS</h2>
          {activeJobs.length === 0 ? (
            <div className="bg-surface border border-border p-8 text-center">
              <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">NO ACTIVE PROJECTS</p>
            </div>
          ) : activeJobs.slice(0, 3).map(job => (
            <div key={job.id} className="bg-accent p-6 flex flex-col gap-4 relative overflow-hidden group cursor-pointer" onClick={() => { setEditingBooking(job); setIsModalOpen(true); }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 -mr-16 -mt-16 rotate-45 group-hover:rotate-90 transition-transform duration-700"></div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">IN PROGRESS</p>
                  <h3 className="text-xl font-bold text-white tracking-tight uppercase">{job.instrumentType}</h3>
                </div>
                <div className="w-10 h-10 bg-white/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{job.id.slice(-2).toUpperCase()}</span>
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-xs text-white font-medium mb-4 opacity-90 line-clamp-2 uppercase">{job.description}</p>
                <div className="flex justify-between items-center text-[10px] font-bold text-white uppercase tracking-widest mb-2">
                  <span>CLIENT: {job.customerName}</span>
                  <span>{job.progress}%</span>
                </div>
                <div className="h-1 w-full bg-black/20 overflow-hidden">
                  <div className="h-full bg-white transition-all duration-500" style={{ width: `${job.progress}%` }}></div>
                </div>
              </div>
            </div>
          ))}
          
          <div className="bg-surface border border-border p-6">
            <p className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mb-4">UPCOMING APPOINTMENTS</p>
            <div className="space-y-4">
              {pendingJobs.length === 0 ? (
                <p className="text-[10px] text-text-muted uppercase tracking-widest text-center py-4">NO UPCOMING APPOINTMENTS</p>
              ) : pendingJobs.slice(0, 3).map(job => (
                <div key={job.id} className="flex items-center gap-4 p-3 bg-background border border-border hover:border-accent transition-colors cursor-pointer" onClick={() => { setEditingBooking(job); setIsModalOpen(true); }}>
                  <div className="text-center border-r border-border pr-4 min-w-[60px]">
                    <p className="text-[9px] text-text-secondary font-bold uppercase">{new Date(job.preferredDate).toLocaleString('default', { month: 'short' })}</p>
                    <p className="text-lg font-bold text-white">{new Date(job.preferredDate).getDate()}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white uppercase">{job.instrumentType}</p>
                    <p className="text-[9px] text-text-secondary uppercase line-clamp-1">{job.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-2xl p-8 border-accent/20 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tighter uppercase">
                  {editingBooking ? 'EDIT WORK ORDER' : 'NEW WORK ORDER'}
                </h2>
                <p className="text-[10px] text-text-secondary uppercase tracking-[0.4em] mt-1 font-bold">
                  {editingBooking ? `REF_ID: ${editingBooking.id.toUpperCase()}` : 'CREATE_NEW_SERVICE_ENTRY'}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-text-muted hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveBooking} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="CUSTOMER NAME" name="customerName" defaultValue={editingBooking?.customerName} required />
                <Input label="CONTACT NUMBER" name="contact" defaultValue={editingBooking?.contact} required />
                <Input label="EMAIL ADDRESS" name="email" type="email" defaultValue={editingBooking?.email} required />
                <Input label="INSTRUMENT TYPE / MODEL" name="instrumentType" defaultValue={editingBooking?.instrumentType} required />
                <Input label="PREFERRED DATE" name="preferredDate" type="date" defaultValue={editingBooking?.preferredDate} required />
                <Input label="TECHNICIAN ASSIGNED" name="technician" defaultValue={editingBooking?.technician} />
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">BRANCH</label>
                  <select name="branch" defaultValue={editingBooking?.branch || userData?.branch || 'Imus'} className="fermata-input w-full">
                    <option value="Imus">IMUS, CAVITE</option>
                    <option value="Quezon City">QUEZON CITY</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">STATUS</label>
                  <select name="status" defaultValue={editingBooking?.status || 'Pending'} className="fermata-input w-full">
                    <option value="Pending">PENDING</option>
                    <option value="Ongoing">ONGOING</option>
                    <option value="Completed">COMPLETED</option>
                    <option value="Claimed">CLAIMED</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">PROGRESS ({editingBooking?.progress || 0}%)</label>
                  <input 
                    type="range" 
                    name="progress" 
                    min="0" 
                    max="100" 
                    defaultValue={editingBooking?.progress || 0}
                    className="w-full accent-accent bg-surface-elevated h-2 rounded-none appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">SERVICE DESCRIPTION / NOTES</label>
                <textarea 
                  name="description" 
                  defaultValue={editingBooking?.description}
                  className="fermata-input w-full min-h-[100px] py-3 uppercase text-[10px] tracking-widest"
                  required
                />
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t border-border">
                {editingBooking && (
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => handleDeleteBooking(editingBooking.id)}
                    className="bg-accent/10 text-accent hover:bg-accent hover:text-white border-accent/20"
                  >
                    DELETE ORDER
                  </Button>
                )}
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                  CANCEL
                </Button>
                <Button type="submit">
                  {editingBooking ? 'UPDATE ORDER' : 'SAVE ORDER'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <div className="mt-auto pt-4 flex items-center justify-end gap-3 text-text-muted">
        <div className="w-2 h-2 bg-status-green rounded-full"></div>
        <span className="text-[10px] uppercase tracking-widest font-bold">WORKSHOP SYNCED · ENCRYPTED_LINK_04</span>
      </div>
    </div>
  );
}
