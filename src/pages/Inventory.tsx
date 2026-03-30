import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  MoreVertical, 
  AlertCircle, 
  X,
  Package,
  ArrowUpRight
} from 'lucide-react';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Product, Branch } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { formatCurrency, cn } from '../lib/utils';
import { useFirebase } from '../components/FirebaseProvider';

export default function Inventory() {
  const { userData } = useFirebase();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<Branch | 'All'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    return () => unsubscribe();
  }, []);

  const filteredInventory = products.filter(item => {
    const matchesBranch = selectedBranch === 'All' || item.branch === selectedBranch;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBranch && matchesSearch;
  });

  const lowStockProducts = products.filter(p => p.stockQty <= p.lowStockThreshold);

  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productData = {
      sku: formData.get('sku') as string,
      name: formData.get('name') as string,
      brand: formData.get('brand') as string,
      category: formData.get('category') as string,
      price: Number(formData.get('price')),
      costPrice: Number(formData.get('costPrice')),
      stockQty: Number(formData.get('stockQty')),
      lowStockThreshold: Number(formData.get('lowStockThreshold')),
      branch: formData.get('branch') as any,
      status: 'IN STOCK',
      imageUrl: 'https://picsum.photos/seed/guitar/400/300',
      description: formData.get('description') as string
    };

    if (productData.stockQty <= productData.lowStockThreshold) {
      productData.status = 'LOW STOCK';
    } else if (productData.stockQty === 0) {
      productData.status = 'OUT OF STOCK';
    }

    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id), productData);
      } else {
        await addDoc(collection(db, 'products'), productData);
      }
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      handleFirestoreError(error, editingProduct ? OperationType.UPDATE : OperationType.CREATE, 'products');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
      }
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-6xl font-bold text-white tracking-tighter mb-2 uppercase">INVENTORY</h1>
          <p className="text-sm text-text-secondary uppercase tracking-[0.3em] font-medium">
            <span className="text-accent">{products.length} TOTAL SKUS</span> · MASTER CONTROL PANEL
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="secondary" className="flex items-center gap-2">
            <Download size={16} />
            <span className="text-[10px]">EXPORT PDF</span>
          </Button>
          <Button onClick={() => { setEditingProduct(null); setIsModalOpen(true); }} className="flex items-center gap-2">
            <Plus size={16} />
            <span className="text-[10px]">ADD PRODUCT</span>
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input 
            type="text" 
            placeholder="SEARCH BY NAME, SKU, OR BRAND..." 
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

      {/* Inventory Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-elevated border-b border-border">
                <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">PRODUCT INFO</th>
                <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">SKU / CATEGORY</th>
                <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">BRANCH</th>
                <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">STOCK LEVEL</th>
                <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">PRICE</th>
                <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest">STATUS</th>
                <th className="p-5 text-[10px] font-bold text-text-secondary uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-20 text-center">
                    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-[10px] text-text-muted uppercase tracking-widest">FETCHING_DATA...</p>
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-20 text-center">
                    <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">NO PRODUCTS FOUND</p>
                  </td>
                </tr>
              ) : filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-surface-elevated transition-colors group">
                  <td className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-background border border-border overflow-hidden">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white tracking-wider uppercase">{item.name}</p>
                        <p className="text-[9px] text-text-secondary uppercase tracking-widest">{item.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <p className="text-xs font-bold text-white uppercase tracking-tighter">{item.sku}</p>
                    <p className="text-[9px] text-text-secondary uppercase tracking-widest">{item.category}</p>
                  </td>
                  <td className="p-5">
                    <p className="text-[10px] font-bold text-white uppercase tracking-widest">{item.branch}</p>
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-lg font-bold",
                        item.stockQty <= item.lowStockThreshold ? "text-accent" : "text-white"
                      )}>{item.stockQty}</span>
                      <div className="flex-1 min-w-[60px] h-1 bg-background overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all",
                            item.stockQty <= item.lowStockThreshold ? "bg-accent" : "bg-status-green"
                          )} 
                          style={{ width: `${Math.min(100, (item.stockQty / 10) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <p className="text-xs font-bold text-white">{formatCurrency(item.price)}</p>
                    <p className="text-[9px] text-text-muted uppercase tracking-widest">COST: {formatCurrency(item.costPrice)}</p>
                  </td>
                  <td className="p-5">
                    <span className={cn(
                      "px-2 py-1 text-[8px] font-bold uppercase tracking-widest",
                      item.status === 'LOW STOCK' ? "bg-accent text-white" : "bg-surface-elevated text-text-secondary"
                    )}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-5 text-right">
                    <button 
                      onClick={() => { setEditingProduct(item); setIsModalOpen(true); }}
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
      </Card>

      {/* Low Stock Alerts Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="CRITICAL STOCK ALERTS" className="border-l-4 border-l-accent">
          <div className="space-y-4">
            {lowStockProducts.length === 0 ? (
              <p className="text-[10px] text-text-muted uppercase tracking-widest text-center py-4">NO CRITICAL ALERTS</p>
            ) : lowStockProducts.map(item => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-surface-elevated border border-border">
                <div className="flex items-center gap-4">
                  <AlertCircle className="text-accent" size={20} />
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-wider">{item.name}</p>
                    <p className="text-[9px] text-text-secondary uppercase tracking-widest">{item.branch} · {item.stockQty} REMAINING</p>
                  </div>
                </div>
                <button className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline">REORDER NOW</button>
              </div>
            ))}
          </div>
        </Card>
        
        <Card title="RECENT INVENTORY LOGS" subtitle="LAST 24 HOURS">
          <div className="space-y-4">
            {[
              { time: '08:42 AM', action: 'STOCK IN: FENDER STRATOCASTER (+2)', user: 'V. ROSSI' },
              { time: '09:15 AM', action: 'STOCK OUT: GIBSON LES PAUL (-1)', user: 'A. MARQUEZ' },
              { time: '10:30 AM', action: 'ADJUSTMENT: D\'ADDARIO NYXL (-5)', user: 'J. CAMARINES' },
            ].map((log, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest py-2 border-b border-border last:border-0">
                <div className="flex gap-4">
                  <span className="text-text-muted">{log.time}</span>
                  <span className="text-white">{log.action}</span>
                </div>
                <span className="text-text-secondary">PIC: {log.user}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-2xl p-8 border-accent/20 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tighter uppercase">
                  {editingProduct ? 'EDIT PRODUCT' : 'ADD NEW PRODUCT'}
                </h2>
                <p className="text-[10px] text-text-secondary uppercase tracking-[0.4em] mt-1 font-bold">
                  {editingProduct ? `SKU: ${editingProduct.sku}` : 'CREATE_NEW_ENTRY'}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-text-muted hover:text-white">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="SKU / BARCODE" name="sku" defaultValue={editingProduct?.sku} required />
                <Input label="PRODUCT NAME" name="name" defaultValue={editingProduct?.name} required />
                <Input label="BRAND" name="brand" defaultValue={editingProduct?.brand} required />
                <Input label="CATEGORY" name="category" defaultValue={editingProduct?.category} required />
                <Input label="PRICE (PHP)" name="price" type="number" defaultValue={editingProduct?.price} required />
                <Input label="COST PRICE (PHP)" name="costPrice" type="number" defaultValue={editingProduct?.costPrice} required />
                <Input label="STOCK QUANTITY" name="stockQty" type="number" defaultValue={editingProduct?.stockQty} required />
                <Input label="LOW STOCK THRESHOLD" name="lowStockThreshold" type="number" defaultValue={editingProduct?.lowStockThreshold} required />
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">BRANCH</label>
                  <select name="branch" defaultValue={editingProduct?.branch || 'Imus'} className="fermata-input w-full">
                    <option value="Imus">IMUS, CAVITE</option>
                    <option value="Quezon City">QUEZON CITY</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">DESCRIPTION</label>
                <textarea 
                  name="description" 
                  defaultValue={editingProduct?.description}
                  className="fermata-input w-full min-h-[100px] py-3 uppercase text-[10px] tracking-widest"
                  required
                />
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t border-border">
                {editingProduct && (
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => handleDeleteProduct(editingProduct.id)}
                    className="bg-accent/10 text-accent hover:bg-accent hover:text-white border-accent/20"
                  >
                    DELETE PRODUCT
                  </Button>
                )}
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                  CANCEL
                </Button>
                <Button type="submit">
                  {editingProduct ? 'UPDATE PRODUCT' : 'SAVE PRODUCT'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
