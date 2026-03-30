import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Cell, PieChart, Pie
} from 'recharts';
import { collection, onSnapshot, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Transaction, Booking } from '../types';
import { Card, StatCard } from '../components/ui/Card';
import { formatCurrency, cn } from '../lib/utils';
import { useFirebase } from '../components/FirebaseProvider';

export default function Analytics() {
  const { userData } = useFirebase();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch last 30 days of transactions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const qTransactions = query(
      collection(db, 'transactions'), 
      where('timestamp', '>=', Timestamp.fromDate(thirtyDaysAgo)),
      orderBy('timestamp', 'desc')
    );

    const unsubscribeTransactions = onSnapshot(qTransactions, (snapshot) => {
      const transList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as Transaction[];
      setTransactions(transList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    const qBookings = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubscribeBookings = onSnapshot(qBookings, (snapshot) => {
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

    return () => {
      unsubscribeTransactions();
      unsubscribeBookings();
    };
  }, []);

  // Process data for charts
  const revenueByDay = transactions.reduce((acc: any, trans) => {
    const day = trans.timestamp.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    if (!acc[day]) acc[day] = { day, current: 0, projected: 50000 }; // Mock projected for comparison
    acc[day].current += trans.total;
    return acc;
  }, {});

  const DAYS_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const revenueData = DAYS_ORDER.map(day => revenueByDay[day] || { day, current: 0, projected: 50000 });

  const velocityByHour = transactions.reduce((acc: any, trans) => {
    const hour = trans.timestamp.getHours().toString().padStart(2, '0') + ':00';
    if (!acc[hour]) acc[hour] = { time: hour, value: 0 };
    acc[hour].value += 1;
    return acc;
  }, {});

  const velocityData = Object.values(velocityByHour).sort((a: any, b: any) => a.time.localeCompare(b.time));

  const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
  const avgOrderValue = transactions.length > 0 ? totalRevenue / transactions.length : 0;
  const completedBookings = bookings.filter(b => b.status === 'Completed' || b.status === 'Claimed').length;
  const workshopEfficiency = bookings.length > 0 ? (completedBookings / bookings.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">COMPILING_ANALYTICS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <p className="text-[11px] text-accent uppercase font-bold tracking-[0.4em]">FERMATA PERFORMANCE SUITE</p>
        <div className="flex items-end justify-between">
          <h1 className="text-7xl font-bold text-white tracking-tighter leading-none">BUSINESS ANALYTICS</h1>
          <div className="flex bg-surface border border-border p-1">
            <button className="px-4 py-2 text-[10px] font-bold bg-accent text-white uppercase tracking-widest">LAST 30 DAYS</button>
            <button className="px-4 py-2 text-[10px] font-bold text-text-secondary hover:text-white uppercase tracking-widest">YEAR TO DATE</button>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="TOTAL REVENUE (30D)" value={formatCurrency(totalRevenue)} trend="+12.4%" />
        <StatCard label="TRANSACTIONS" value={transactions.length.toString()} trend="+5.2%" />
        <StatCard label="AVG ORDER VALUE" value={formatCurrency(avgOrderValue)} trend="-2.1%" trendType="down" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="WEEKLY REVENUE PERFORMANCE" subtitle="REAL-TIME SALES DATA">
          <div className="h-[300px] mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  stroke="#555" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#555" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `₱${val/1000}K`}
                />
                <Tooltip 
                  cursor={{ fill: '#222' }}
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '0px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar dataKey="current" fill="#DC2626" radius={0} />
                <Bar dataKey="projected" fill="#3D3D3D" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="SALES VELOCITY" subtitle="TRANSACTION VOLUME BY HOUR">
          <div className="h-[300px] mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={velocityData.length > 0 ? velocityData : [{time: '00:00', value: 0}]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#555" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#555" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: '0px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#DC2626" 
                  strokeWidth={3} 
                  dot={{ fill: '#DC2626', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
            <div>
              <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">TOTAL ITEMS</p>
              <p className="text-xl font-bold text-white">{transactions.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.quantity, 0), 0)}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">DISCOUNTS</p>
              <p className="text-xl font-bold text-white">{formatCurrency(transactions.reduce((sum, t) => sum + t.discount, 0))}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-secondary uppercase font-bold mb-1">TAX COLLECTED</p>
              <p className="text-xl font-bold text-white">{formatCurrency(transactions.reduce((sum, t) => sum + t.tax, 0))}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Gauges & Image Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card title="WORKSHOP EFFICIENCY" className="flex flex-col items-center justify-center text-center">
          <div className="relative w-48 h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[{ value: workshopEfficiency }, { value: 100 - workshopEfficiency }]}
                  innerRadius={60}
                  outerRadius={80}
                  startAngle={90}
                  endAngle={450}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#DC2626" />
                  <Cell fill="#2A2A2A" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-white">{Math.round(workshopEfficiency)}%</span>
              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">COMPLETION</span>
            </div>
          </div>
        </Card>

        <Card title="SERVICE QUEUE STATUS" className="flex flex-col items-center justify-center text-center">
          <div className="relative w-48 h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Completed', value: completedBookings },
                    { name: 'Pending', value: bookings.length - completedBookings }
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  startAngle={90}
                  endAngle={450}
                  dataKey="value"
                  stroke="none"
                >
                  <Cell fill="#555" />
                  <Cell fill="#2A2A2A" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-white">{completedBookings}</span>
              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">DONE / {bookings.length}</span>
            </div>
          </div>
        </Card>

        <div className="bg-surface border border-border relative overflow-hidden group cursor-pointer">
          <img 
            src="https://picsum.photos/seed/workshop/600/800" 
            alt="Workshop" 
            className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 p-8 flex flex-col justify-end">
            <h3 className="text-2xl font-bold text-white tracking-tight mb-2">EXPLORE REPAIR BACKLOG</h3>
            <p className="text-xs text-accent font-bold uppercase tracking-widest">VIEW DETAIL →</p>
          </div>
        </div>
      </div>

      {/* Bottom Metrics Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-10 border-t border-border">
        <div>
          <h4 className="text-5xl font-bold text-white tracking-tighter mb-2">{(totalRevenue / 300000).toFixed(1)}X</h4>
          <p className="text-xs text-text-secondary uppercase font-bold tracking-widest">INVENTORY TURN (EST)</p>
        </div>
        <div>
          <h4 className="text-5xl font-bold text-white tracking-tighter mb-2">{Math.round(workshopEfficiency)}%</h4>
          <p className="text-xs text-text-secondary uppercase font-bold tracking-widest">LABOR EFFICIENCY</p>
        </div>
        <div>
          <h4 className="text-5xl font-bold text-white tracking-tighter mb-2">38.5%</h4>
          <p className="text-xs text-text-secondary uppercase font-bold tracking-widest">MARGIN HEALTH</p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 text-text-muted">
        <div className="w-2 h-2 bg-status-green rounded-full"></div>
        <span className="text-[10px] uppercase tracking-widest font-bold">OPERATIONAL</span>
      </div>
    </div>
  );
}
