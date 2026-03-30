import React, { useState, useEffect } from 'react';
import { BrainCircuit, Zap, AlertTriangle, TrendingUp, BarChart, Globe, DollarSign, Award, Loader2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { cn, formatCurrency } from '../lib/utils';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { generateDSSInsights } from '../services/gemini';

interface DSSData {
  criticalAlert: {
    title: string;
    description: string;
    actionLabel: string;
  };
  marketMetrics: {
    label: string;
    value: string;
    trend: string;
  }[];
  recommendation: {
    title: string;
    description: string;
    currentPrice: number;
    recommendedPrice: number;
    targetSku: string;
    confidence: string;
  };
  predictiveTrends: {
    category: string;
    title: string;
    description: string;
    probability: string;
  }[];
}

const METRIC_ICONS: Record<string, any> = {
  'MARKET SHIFT': Globe,
  'INVENTORY ALPHA': BarChart,
  'CURRENCY FLUX': DollarSign,
  'BRAND EQUITY': Award,
};

export default function DSS() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<DSSData | null>(null);
  const [lastSync, setLastSync] = useState(new Date().toISOString());

  useEffect(() => {
    const fetchDataAndGenerateInsights = async () => {
      try {
        setLoading(true);
        
        // Fetch products
        const productsSnap = await getDocs(query(collection(db, 'products'), limit(50)));
        const products = productsSnap.docs.map(doc => doc.data());

        // Fetch recent transactions (last 50)
        const transactionsSnap = await getDocs(query(
          collection(db, 'transactions'),
          orderBy('timestamp', 'desc'),
          limit(50)
        ));
        const transactions = transactionsSnap.docs.map(doc => doc.data());

        // Fetch recent bookings (last 50)
        const bookingsSnap = await getDocs(query(
          collection(db, 'bookings'),
          orderBy('createdAt', 'desc'),
          limit(50)
        ));
        const bookings = bookingsSnap.docs.map(doc => doc.data());

        const dataForAI = {
          products: products.map(p => ({ name: p.name, category: p.category, stock: p.stock, price: p.price })),
          recentSales: transactions.map(t => ({ total: t.total, itemsCount: t.items.length, branch: t.branch })),
          recentBookings: bookings.map(b => ({ serviceType: b.serviceType, status: b.status, branch: b.branch }))
        };

        const result = await generateDSSInsights(dataForAI);
        if (result) {
          setInsights(result);
        }
        setLastSync(new Date().toISOString());
      } catch (error) {
        console.error("Error in DSS data lifecycle:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDataAndGenerateInsights();
  }, []);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 border-2 border-accent/20 rounded-full"></div>
          <div className="w-20 h-20 border-t-2 border-accent rounded-full animate-spin absolute top-0 left-0"></div>
          <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-accent animate-pulse" size={32} />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white tracking-tighter mb-2 uppercase">SYNCHRONIZING NEURAL ENGINE</h2>
          <p className="text-[10px] text-text-secondary font-bold uppercase tracking-[0.3em] animate-pulse">
            ANALYZING MARKET FLUX · CALCULATING INVENTORY ALPHA
          </p>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="text-accent" size={48} />
        <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">ENGINE OFFLINE</h2>
        <p className="text-sm text-text-secondary">Unable to generate AI insights at this time.</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 fermata-button-primary px-8 py-3"
        >
          RETRY CONNECTION
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-7xl font-bold tracking-tighter leading-none mb-2">
            <span className="text-white">FERMATA</span> <span className="text-accent">DSS</span>
          </h1>
          <p className="text-xs text-text-secondary uppercase tracking-[0.4em] font-bold">
            AI-DRIVEN DECISION SUPPORT SYSTEM · REAL-TIME MARKET INTELLIGENCE
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">LIVE_SYNC: {lastSync.replace('T', ' ').split('.')[0]}</p>
          <p className="text-[10px] text-accent font-bold uppercase tracking-widest">LATENCY: 14MS</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Alerts & Metrics */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="bg-accent border-accent relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 -mr-16 -mt-16 rotate-45"></div>
            <div className="relative z-10">
              <span className="inline-block px-2 py-1 bg-white text-accent text-[8px] font-bold uppercase tracking-widest mb-4">CRITICAL ALERT</span>
              <h3 className="text-2xl font-bold text-white tracking-tight mb-2 uppercase">{insights.criticalAlert.title}</h3>
              <p className="text-xs text-white/80 font-medium mb-6 leading-relaxed">
                {insights.criticalAlert.description}
              </p>
              <div className="flex gap-3">
                <button className="bg-white text-accent px-4 py-2 text-[10px] font-bold uppercase tracking-widest">{insights.criticalAlert.actionLabel}</button>
                <button className="text-white border border-white/30 px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10">DISMISS</button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            {insights.marketMetrics.map((metric) => {
              const Icon = METRIC_ICONS[metric.label] || BarChart;
              return (
                <div key={metric.label} className="bg-surface border border-border p-4 flex flex-col gap-3">
                  <Icon size={16} className="text-text-secondary" />
                  <div>
                    <p className="text-[9px] text-text-secondary font-bold uppercase tracking-widest mb-1">{metric.label}</p>
                    <p className="text-xl font-bold text-white">{metric.value}</p>
                    <p className={cn(
                      "text-[8px] font-bold mt-1",
                      metric.trend.startsWith('+') ? "text-green-500" : "text-accent"
                    )}>{metric.trend}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: AI Recommendation */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-surface-elevated text-text-secondary text-[8px] font-bold uppercase tracking-widest border border-border">AI RECOMMENDATION · 084-ALPHA</span>
                <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
              </div>
              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">CONFIDENCE: {insights.recommendation.confidence}</span>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row gap-10">
              <div className="flex-1 space-y-6">
                <h2 className="text-4xl font-bold text-white tracking-tight leading-tight uppercase">{insights.recommendation.title}</h2>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {insights.recommendation.description}
                </p>
                
                <div className="grid grid-cols-2 gap-6 py-6 border-y border-border">
                  <div>
                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-1">CURRENT PRICE</p>
                    <p className="text-2xl font-bold text-text-muted line-through">{formatCurrency(insights.recommendation.currentPrice)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-accent font-bold uppercase tracking-widest mb-1">RECOMMENDED PRICE</p>
                    <p className="text-3xl font-bold text-white">{formatCurrency(insights.recommendation.recommendedPrice)}</p>
                  </div>
                </div>

                <button className="w-full fermata-button-primary flex items-center justify-center gap-3 py-5">
                  <Zap size={18} />
                  <span>EXECUTE ADJUSTMENT ⚡</span>
                </button>
              </div>

              <div className="w-full lg:w-72 aspect-[3/4] bg-background border border-border overflow-hidden relative group">
                <img 
                  src={`https://picsum.photos/seed/${insights.recommendation.targetSku}/600/800`} 
                  alt="Product" 
                  className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 transition-all"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6">
                  <p className="text-[10px] text-accent font-bold uppercase tracking-widest mb-1">TARGET SKU</p>
                  <p className="text-sm font-bold text-white uppercase tracking-wider">{insights.recommendation.targetSku}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom Section: Predictive Trends */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-lg font-bold text-white tracking-widest uppercase">PREDICTIVE TRENDS</h2>
          <div className="flex gap-2">
            <button className="p-2 bg-surface border border-border text-text-secondary hover:text-white transition-colors">←</button>
            <button className="p-2 bg-surface border border-border text-text-secondary hover:text-white transition-colors">→</button>
          </div>
        </div>

        <div className="flex gap-6 overflow-x-auto pb-4">
          {insights.predictiveTrends.map((trend) => (
            <div key={trend.title} className="min-w-[320px] bg-surface border border-border p-6 flex flex-col gap-4">
              <span className="text-[9px] text-accent font-bold uppercase tracking-widest">{trend.category}</span>
              <h4 className="text-lg font-bold text-white tracking-wider uppercase">{trend.title}</h4>
              <p className="text-xs text-text-secondary leading-relaxed">{trend.description}</p>
              <div className="mt-auto pt-4 border-t border-border">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">PROBABILITY</span>
                  <span className="text-[10px] text-white font-bold">{trend.probability}</span>
                </div>
                <div className="h-1 w-full bg-background overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: trend.probability }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
