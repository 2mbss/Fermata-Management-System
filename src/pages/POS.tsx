import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  CreditCard, 
  Banknote, 
  Wallet, 
  MoreHorizontal, 
  ShoppingCart, 
  Tag, 
  Percent, 
  X,
  CheckCircle2
} from 'lucide-react';
import { collection, onSnapshot, query, addDoc, doc, updateDoc, increment, serverTimestamp, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Product, CartItem, Transaction, Branch } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { cn, formatCurrency } from '../lib/utils';
import { useFirebase } from '../components/FirebaseProvider';

const CATEGORIES = [
  { id: '01', label: 'ALL INSTRUMENTS' },
  { id: '02', label: 'GUITARS' },
  { id: '03', label: 'AMPS' },
  { id: '04', label: 'ACCESSORIES' },
];

export default function POS() {
  const { userData } = useFirebase();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('01');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
  const [showInclusionModal, setShowInclusionModal] = useState<{show: boolean, itemId: string | null}>({show: false, itemId: null});
  const [inclusionText, setInclusionText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Only show products for the current branch
    const q = userData?.role === 'Super Admin' 
      ? query(collection(db, 'products'))
      : query(collection(db, 'products'), where('branch', '==', userData?.branch));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    return () => unsubscribe();
  }, [userData]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === '01' || p.category.toUpperCase() === CATEGORIES.find(c => c.id === activeCategory)?.label;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    if (product.stockQty <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQty) return prev;
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const product = products.find(p => p.id === id);
        const newQty = Math.max(1, item.quantity + delta);
        if (product && newQty > product.stockQty) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const addInclusion = () => {
    if (showInclusionModal.itemId && inclusionText) {
      setCart(prev => prev.map(item => {
        if (item.id === showInclusionModal.itemId) {
          return { ...item, inclusions: [...(item.inclusions || []), inclusionText] };
        }
        return item;
      }));
      setInclusionText('');
      setShowInclusionModal({show: false, itemId: null});
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = subtotal * (discount / 100);
  const taxableAmount = subtotal - discountAmount;
  const tax = taxableAmount * 0.12;
  const total = taxableAmount + tax;

  const handleConfirmPayment = async () => {
    if (cart.length === 0 || isProcessing) return;
    
    setIsProcessing(true);
    try {
      // 1. Save Transaction
      const transaction: Omit<Transaction, 'id'> = {
        items: cart.map(item => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          inclusions: item.inclusions || []
        })),
        subtotal,
        tax,
        discount: discountAmount,
        total,
        paymentMethod: 'Cash', // Default for now
        staffName: userData?.name || 'Unknown',
        branch: (userData?.branch as Branch) || 'Imus',
        timestamp: new Date().toISOString()
      };

      await addDoc(collection(db, 'transactions'), transaction);

      // 2. Update Stock Levels
      for (const item of cart) {
        const productRef = doc(db, 'products', item.id);
        await updateDoc(productRef, {
          stockQty: increment(-item.quantity)
        });
      }

      setCart([]);
      setDiscount(0);
      setDiscountReason('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-full gap-8 relative animate-in fade-in duration-500">
      {/* Main Panel: Product Grid */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-8">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "flex items-center gap-2 pb-2 border-b-2 transition-all",
                  activeCategory === cat.id 
                    ? "border-accent text-white" 
                    : "border-transparent text-text-secondary hover:text-white"
                )}
              >
                <span className="text-[10px] font-bold text-accent">{cat.id}</span>
                <span className="text-xs font-bold uppercase tracking-widest">{cat.label}</span>
              </button>
            ))}
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
            <input 
              type="text" 
              placeholder="SCAN OR SEARCH..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border pl-10 pr-4 py-2 text-[10px] uppercase tracking-widest focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto pr-2">
          {filteredProducts.map(product => (
            <div 
              key={product.id} 
              className={cn(
                "bg-surface border border-border group cursor-pointer hover:border-accent transition-all",
                product.stockQty <= 0 && "opacity-50 grayscale cursor-not-allowed"
              )}
              onClick={() => addToCart(product)}
            >
              <div className="aspect-[4/3] bg-background relative overflow-hidden">
                <img 
                  src={product.imageUrl} 
                  alt={product.name} 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  referrerPolicy="no-referrer"
                />
                <span className={cn(
                  "absolute top-3 right-3 px-2 py-1 text-[8px] font-bold uppercase tracking-widest",
                  product.stockQty <= product.lowStockThreshold ? "bg-accent text-white" : "bg-surface-elevated text-text-secondary"
                )}>
                  {product.stockQty <= 0 ? 'OUT OF STOCK' : product.stockQty <= product.lowStockThreshold ? 'LOW STOCK' : 'IN STOCK'}
                </span>
              </div>
              <div className="p-4">
                <p className="text-[9px] text-text-secondary uppercase tracking-[0.2em] mb-1">{product.category} / {product.brand}</p>
                <h4 className="text-sm font-bold text-white tracking-wider mb-2 uppercase">{product.name}</h4>
                <p className="text-lg font-bold text-accent">{formatCurrency(product.price)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-4 border-t border-border flex items-center gap-3">
          <div className="w-2 h-2 bg-status-green rounded-full animate-pulse"></div>
          <span className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">
            TERMINAL_01 READY · BRANCH: {userData?.branch?.toUpperCase() || 'SYSTEM'}
          </span>
        </div>
      </div>

      {/* Right Panel: POS Terminal */}
      <div className="w-[380px] flex flex-col gap-6">
        <Card className="flex-1 flex flex-col p-0">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white tracking-widest uppercase">TERMINAL_01 · ACTIVE SESSION</h3>
              <MoreHorizontal size={18} className="text-text-secondary" />
            </div>
            <div className="flex items-center justify-between bg-surface-elevated p-3 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-background flex items-center justify-center border border-border">
                  <span className="text-[10px] font-bold text-text-secondary">CL</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white uppercase tracking-tight">WALK-IN CUSTOMER</p>
                  <p className="text-[8px] text-text-secondary uppercase tracking-widest">GUEST_USER_094</p>
                </div>
              </div>
              <button className="text-text-secondary hover:text-white transition-colors">
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-50">
                <ShoppingCart size={48} className="mb-4" />
                <p className="text-xs uppercase tracking-widest font-bold">CART IS EMPTY</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-16 h-16 bg-background border border-border overflow-hidden">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] text-text-secondary uppercase tracking-widest mb-0.5">{item.category}</p>
                    <h5 className="text-xs font-bold text-white tracking-wider mb-1 uppercase">{item.name}</h5>
                    {item.inclusions && item.inclusions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {item.inclusions.map((inc, idx) => (
                          <span key={idx} className="text-[8px] bg-accent/10 text-accent border border-accent/30 px-1 py-0.5 uppercase font-bold">{inc}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-border">
                          <button onClick={() => updateQty(item.id, -1)} className="px-2 py-1 text-text-secondary hover:text-white transition-colors border-r border-border">
                            <Minus size={10} />
                          </button>
                          <span className="px-3 py-1 text-[10px] font-bold text-white">{item.quantity}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="px-2 py-1 text-text-secondary hover:text-white transition-colors border-l border-border">
                            <Plus size={10} />
                          </button>
                        </div>
                        <button 
                          onClick={() => setShowInclusionModal({show: true, itemId: item.id})}
                          className="text-[8px] text-text-secondary hover:text-white uppercase font-bold border border-border px-2 py-1"
                        >
                          + INCLUSION
                        </button>
                      </div>
                      <p className="text-xs font-bold text-white">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-surface-elevated border-t border-border space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-text-secondary uppercase tracking-widest font-bold">
                <span>SUBTOTAL</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[10px] text-accent uppercase tracking-widest font-bold">
                  <span>DISCOUNT ({discount}%)</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[10px] text-text-secondary uppercase tracking-widest font-bold">
                <span>TAX (12%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-white tracking-tight pt-2 border-t border-border/50">
                <span>TOTAL</span>
                <span className="text-accent">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" className="py-3 text-[10px]">PARK SALE</Button>
              <Button 
                variant="secondary"
                onClick={() => setShowDiscountModal(true)}
                className="py-3 text-[10px] flex items-center justify-center gap-2"
              >
                <Tag size={12} />
                <span>DISCOUNT</span>
              </Button>
            </div>

            <Button 
              onClick={handleConfirmPayment}
              disabled={cart.length === 0 || isProcessing}
              className="w-full py-4 text-sm tracking-widest"
            >
              {isProcessing ? 'PROCESSING...' : 'CONFIRM PAYMENT'}
            </Button>
            
            <div className="flex justify-between items-center pt-2">
              <p className="text-[8px] text-text-muted uppercase tracking-widest font-bold">SYSTEM_LOAD · OPTIMIZED</p>
              <div className="flex gap-2">
                <CreditCard size={12} className="text-text-muted" />
                <Banknote size={12} className="text-text-muted" />
                <Wallet size={12} className="text-text-muted" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md animate-in fade-in zoom-in duration-300">
          <div className="text-center">
            <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
              <CheckCircle2 size={48} className="text-green-500" />
            </div>
            <h2 className="text-4xl font-bold text-white tracking-tighter uppercase">TRANSACTION_COMPLETE</h2>
            <p className="text-[10px] text-text-secondary uppercase tracking-[0.4em] mt-2 font-bold">PRINTING RECEIPT · UPDATING INVENTORY</p>
          </div>
        </div>
      )}

      {/* Inclusion Modal */}
      {showInclusionModal.show && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
          <Card className="w-full max-w-md p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-bold text-white tracking-widest uppercase">ADD INCLUSION</h3>
                <p className="text-[9px] text-text-secondary uppercase tracking-widest mt-1">ATTACH BUNDLED ITEMS</p>
              </div>
              <button onClick={() => setShowInclusionModal({show: false, itemId: null})} className="text-text-secondary hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-6">
              <Input 
                label="ITEM DESCRIPTION"
                value={inclusionText}
                onChange={(e) => setInclusionText(e.target.value)}
                placeholder="E.G. GUITAR STRAP, PICKS, CASE..."
                autoFocus
              />
              <div className="flex gap-4">
                <Button 
                  variant="secondary"
                  onClick={() => setShowInclusionModal({show: false, itemId: null})}
                  className="flex-1"
                >
                  CANCEL
                </Button>
                <Button 
                  onClick={addInclusion}
                  className="flex-1"
                >
                  ADD TO ITEM
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
          <Card className="w-full max-w-md p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-bold text-white tracking-widest uppercase">APPLY DISCOUNT</h3>
                <p className="text-[9px] text-text-secondary uppercase tracking-widest mt-1">MANAGER OVERRIDE REQUIRED</p>
              </div>
              <button onClick={() => setShowDiscountModal(false)} className="text-text-secondary hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <Input 
                label="DISCOUNT PERCENTAGE (%)"
                type="number" 
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                placeholder="0"
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">REASON FOR DISCOUNT</label>
                <textarea 
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="w-full fermata-input h-24 resize-none uppercase text-[10px] tracking-widest py-3"
                  placeholder="E.G. PROMO CODE, LOYALTY, DAMAGE..."
                />
              </div>
              <div className="flex gap-4">
                <Button 
                  variant="secondary"
                  onClick={() => setShowDiscountModal(false)}
                  className="flex-1"
                >
                  CANCEL
                </Button>
                <Button 
                  onClick={() => setShowDiscountModal(false)}
                  className="flex-1"
                >
                  APPLY
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
