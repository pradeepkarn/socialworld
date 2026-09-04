'use client';

import React, { useState, useEffect } from 'react';
import { IShop, IProduct, IInventoryItem } from '@/types/game';
import {
  X,
  ShoppingBag,
  Cpu,
  Eye,
  Footprints,
  Shirt,
  Briefcase,
  Zap,
  Coffee,
  HeartPulse,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Package,
} from 'lucide-react';

interface ShopUIProps {
  shop: IShop | null;
  credits: number;
  inventory: IInventoryItem[];
  onPurchase: (productId: string) => { success: boolean; message: string };
  onClose: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Cpu: <Cpu size={22} />,
  Eye: <Eye size={22} />,
  Footprints: <Footprints size={22} />,
  Shirt: <Shirt size={22} />,
  Briefcase: <Briefcase size={22} />,
  Zap: <Zap size={22} />,
  Coffee: <Coffee size={22} />,
  HeartPulse: <HeartPulse size={22} />,
  CreditCard: <CreditCard size={22} />,
};

/**
 * =========================================================================
 * ShopUI - Cyberpunk Glassmorphic Commerce Modal
 * =========================================================================
 * WHAT IT DOES:
 * - Full-screen overlay modal that opens when the player presses 'E' near a shop.
 * - Displays store items, descriptions, prices, player credit balance, and inventory.
 *
 * KEY UI CONCEPTS:
 * - Dynamic Store Theme: Adapts its borders, icons, and buttons to match the
 *   shop's neon color (`shop.bannerColor` -> cyan for CyberMart, hot pink for Neon Cafe).
 * - Keyboard Escape Listener: Pressing [ESC] automatically closes the modal
 *   and returns control back to the 3D game.
 * - Glassmorphism: Semi-transparent backdrop filter blur (`backdropFilter: 'blur(8px)'`)
 *   giving a premium modern futuristic look.
 */
export const ShopUI: React.FC<ShopUIProps> = ({
  shop,
  credits,
  inventory,
  onPurchase,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'inventory'>('catalog');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!shop) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shop, onClose]);

  if (!shop) return null;

  const bannerColor = shop.bannerColor || '#00e5ff';

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  const handleBuy = (product: IProduct) => {
    const res = onPurchase(product.id);
    if (res.success) {
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
  };

  const getTabStyle = (isActive: boolean): React.CSSProperties => ({
    background: 'transparent',
    borderTopStyle: 'none',
    borderLeftStyle: 'none',
    borderRightStyle: 'none',
    borderBottomWidth: '2px',
    borderBottomStyle: 'solid',
    borderBottomColor: isActive ? bannerColor : 'transparent',
    color: isActive ? '#f8fafc' : '#94a3b8',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'color 0.2s, border-bottom-color 0.2s',
    outline: 'none',
  });

  return (
    <div id="shop-modal-overlay" style={styles.overlay}>
      <div style={{ ...styles.modal, borderColor: bannerColor }}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={{ ...styles.shopBadge, borderColor: bannerColor, color: bannerColor }}>
              <ShoppingBag size={18} />
              <span>{shop.category}</span>
            </div>
            <h2 style={styles.shopTitle}>{shop.name}</h2>
            <p style={styles.shopTagline}>{shop.tagline}</p>
          </div>

          <div style={styles.headerRight}>
            <div style={styles.walletBox}>
              <span style={styles.walletLabel}>Credits</span>
              <span style={styles.walletAmount}>${credits.toLocaleString()}</span>
            </div>

            <button
              id="shop-close-btn"
              onClick={onClose}
              style={styles.closeBtn}
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div style={styles.tabsRow}>
          <button
            onClick={() => setActiveTab('catalog')}
            style={getTabStyle(activeTab === 'catalog')}
          >
            <ShoppingBag size={16} />
            <span>Store Products ({shop.products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            style={getTabStyle(activeTab === 'inventory')}
          >
            <Package size={16} />
            <span>My Inventory ({inventory.length})</span>
          </button>
        </div>

        {/* Toast Alert */}
        {toast && (
          <div
            style={{
              ...styles.toast,
              backgroundColor: toast.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              borderColor: toast.type === 'success' ? '#10b981' : '#ef4444',
            }}
          >
            {toast.type === 'success' ? <CheckCircle2 size={18} color="#10b981" /> : <AlertCircle size={18} color="#ef4444" />}
            <span style={{ color: toast.type === 'success' ? '#6ee7b7' : '#fca5a5' }}>
              {toast.message}
            </span>
          </div>
        )}

        {/* Body Content */}
        <div style={styles.contentScroll}>
          {activeTab === 'catalog' ? (
            <div style={styles.productGrid}>
              {shop.products.map((product) => {
                const canAfford = credits >= product.price;
                return (
                  <div key={product.id} style={styles.productCard}>
                    <div style={styles.cardTop}>
                      <div style={{ ...styles.iconBox, color: bannerColor }}>
                        {ICON_MAP[product.icon] || <Package size={22} />}
                      </div>
                      <span style={styles.categoryBadge}>{product.category}</span>
                    </div>

                    <h4 style={styles.productName}>{product.name}</h4>
                    <p style={styles.productDesc}>{product.description}</p>

                    <div style={styles.cardBottom}>
                      <div style={styles.priceTag}>
                        <span style={styles.dollarSign}>$</span>
                        <span style={styles.priceValue}>{product.price}</span>
                      </div>

                      <button
                        id={`buy-btn-${product.id}`}
                        onClick={() => handleBuy(product)}
                        disabled={!canAfford}
                        style={{
                          ...styles.buyBtn,
                          backgroundColor: canAfford ? bannerColor : '#334155',
                          color: canAfford ? '#0a0d14' : '#94a3b8',
                          cursor: canAfford ? 'pointer' : 'not-allowed',
                        }}
                      >
                        {canAfford ? 'Purchase' : 'Insufficient $'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={styles.productGrid}>
              {inventory.map((item) => (
                <div key={item.id} style={styles.inventoryCard}>
                  <div style={styles.cardTop}>
                    <div style={{ ...styles.iconBox, color: '#10b981' }}>
                      {ICON_MAP[item.icon] || <Package size={22} />}
                    </div>
                    <span style={styles.quantityBadge}>x{item.quantity}</span>
                  </div>
                  <h4 style={styles.productName}>{item.name}</h4>
                  <p style={styles.productDesc}>{item.description}</p>
                  <div style={styles.inventoryMeta}>
                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>Acquired</span>
                    {item.equipped && <span style={styles.equippedTag}>EQUIPPED</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div style={styles.footer}>
          <span style={styles.footerHint}>Press [ESC] or click close to return to the city</span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(5, 8, 15, 0.75)',
    backdropFilter: 'blur(8px)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  modal: {
    width: '100%',
    maxWidth: '820px',
    maxHeight: '85vh',
    backgroundColor: 'rgba(11, 15, 25, 0.95)',
    border: '1px solid #00e5ff',
    borderRadius: '16px',
    boxShadow: '0 0 50px rgba(0, 229, 255, 0.2), 0 20px 40px rgba(0,0,0,0.8)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '24px 28px 18px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  shopBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    border: '1px solid',
    borderRadius: '20px',
    padding: '2px 10px',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
    width: 'fit-content',
    marginBottom: '4px',
  },
  shopTitle: {
    margin: 0,
    color: '#f8fafc',
    fontSize: '24px',
    fontWeight: '800',
    letterSpacing: '-0.5px',
  },
  shopTagline: {
    margin: 0,
    color: '#94a3b8',
    fontSize: '14px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  walletBox: {
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '10px',
    padding: '8px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  walletLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: '#94a3b8',
    fontWeight: '700',
  },
  walletAmount: {
    fontSize: '20px',
    color: '#34d399',
    fontWeight: '800',
  },
  closeBtn: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: 'none',
    color: '#f1f5f9',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  tabsRow: {
    display: 'flex',
    padding: '0 28px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    gap: '8px',
  },
  toast: {
    margin: '12px 28px 0',
    padding: '10px 16px',
    borderRadius: '8px',
    borderWidth: '1px',
    borderStyle: 'solid',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    fontWeight: '600',
  },
  contentScroll: {
    padding: '24px 28px',
    overflowY: 'auto',
    flex: 1,
  },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '16px',
  },
  productCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s, border-color 0.2s',
  },
  inventoryCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  iconBox: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    background: 'rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBadge: {
    fontSize: '11px',
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: '0.6px',
  },
  quantityBadge: {
    fontSize: '13px',
    color: '#10b981',
    fontWeight: '800',
    background: 'rgba(16, 185, 129, 0.15)',
    padding: '2px 8px',
    borderRadius: '6px',
  },
  productName: {
    margin: '0 0 6px 0',
    color: '#f1f5f9',
    fontSize: '16px',
    fontWeight: '700',
  },
  productDesc: {
    margin: '0 0 16px 0',
    color: '#94a3b8',
    fontSize: '13px',
    lineHeight: '1.4',
    flex: 1,
  },
  cardBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  priceTag: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '2px',
  },
  dollarSign: {
    color: '#34d399',
    fontSize: '14px',
    fontWeight: '700',
  },
  priceValue: {
    color: '#f8fafc',
    fontSize: '18px',
    fontWeight: '800',
  },
  buyBtn: {
    border: 'none',
    borderRadius: '8px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: '700',
    letterSpacing: '0.4px',
    transition: 'transform 0.15s, opacity 0.15s',
  },
  inventoryMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  equippedTag: {
    fontSize: '10px',
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: '0.8px',
    background: 'rgba(56, 189, 248, 0.15)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  footer: {
    padding: '14px 28px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    justifyContent: 'center',
  },
  footerHint: {
    color: '#64748b',
    fontSize: '13px',
  },
};
