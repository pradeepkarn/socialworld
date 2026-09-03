import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  Compass,
  ShoppingBag,
  Sun,
  Shield,
  Layers,
  Zap,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div style={styles.container}>
      {/* Background glow effects */}
      <div style={styles.glowTop}></div>
      <div style={styles.glowBottom}></div>

      {/* Navigation Header */}
      <header style={styles.header}>
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>
            <Sparkles size={20} color="#00e5ff" />
          </div>
          <span style={styles.logoText}>NEOVERSE</span>
        </div>
        <div style={styles.navLinks}>
          <span style={styles.badgeVersion}>Milestone 1 Prototype</span>
        </div>
      </header>

      {/* Hero Section */}
      <section style={styles.heroSection}>
        <div style={styles.pillBadge}>
          <Zap size={14} color="#00e5ff" />
          <span>Next.js + Babylon.js 3D Virtual City</span>
        </div>

        <h1 style={styles.heroTitle}>
          Step Into The <span style={styles.gradientText}>Virtual City</span> of Tomorrow
        </h1>

        <p style={styles.heroSubtitle}>
          An interactive, high-performance 3D urban metaverse prototype. Explore city avenues,
          interact with cybernetic shops, sprint across civic plazas, and experience seamless
          day-to-night lighting.
        </p>

        <div style={styles.ctaRow}>
          <Link href="/game" style={styles.primaryBtn} id="enter-city-btn">
            <span>ENTER CITY (3D PROTOTYPE)</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section style={styles.featuresSection}>
        <h2 style={styles.sectionHeading}>BUILT ON A MODULAR 3D FOUNDATION</h2>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={{ ...styles.cardIcon, color: '#00e5ff' }}>
              <Compass size={24} />
            </div>
            <h3 style={styles.cardTitle}>Structured City Engine</h3>
            <p style={styles.cardDesc}>
              Modular roads, sidewalks with curbs, high-rise skyscrapers, civic plaza with
              holographic monuments, and instanced LED streetlamps.
            </p>
          </div>

          <div style={styles.card}>
            <div style={{ ...styles.cardIcon, color: '#ff2a85' }}>
              <Shield size={24} />
            </div>
            <h3 style={styles.cardTitle}>3rd-Person Animated Player</h3>
            <p style={styles.cardDesc}>
              Fluid WASD controller with camera-relative movement, smooth rotation, jumping physics,
              and procedural animation states (Idle, Walk, Run, Jump).
            </p>
          </div>

          <div style={styles.card}>
            <div style={{ ...styles.cardIcon, color: '#34d399' }}>
              <ShoppingBag size={24} />
            </div>
            <h3 style={styles.cardTitle}>Interactive Cyber Stores</h3>
            <p style={styles.cardDesc}>
              Proximity trigger detection, glowing storefronts, in-game wallet currency, product
              catalogs, and persistent player inventory.
            </p>
          </div>

          <div style={styles.card}>
            <div style={{ ...styles.cardIcon, color: '#fbbf24' }}>
              <Sun size={24} />
            </div>
            <h3 style={styles.cardTitle}>Dynamic Day / Night Cycle</h3>
            <p style={styles.cardDesc}>
              PBR environment with directional sunlight, soft cascaded shadow maps, atmospheric
              fog, glowing neon signs, and nighttime streetlights.
            </p>
          </div>

          <div style={styles.card}>
            <div style={{ ...styles.cardIcon, color: '#38bdf8' }}>
              <Layers size={24} />
            </div>
            <h3 style={styles.cardTitle}>Decoupled React / Babylon</h3>
            <p style={styles.cardDesc}>
              Zero per-frame React re-renders. Discrete event subscriptions, throttled radar minimap,
              and clean lifecycle disposal.
            </p>
          </div>

          <div style={styles.card}>
            <div style={{ ...styles.cardIcon, color: '#a855f7' }}>
              <Sparkles size={24} />
            </div>
            <h3 style={styles.cardTitle}>Multiplayer-Ready Architecture</h3>
            <p style={styles.cardDesc}>
              Pre-built network packet schemas and client synchronization abstractions ready for
              WebSocket server replication.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <span>NeoVerse Virtual City • Powered by Next.js & Babylon.js</span>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    backgroundColor: '#060911',
    color: '#f8fafc',
    overflow: 'hidden',
  },
  glowTop: {
    position: 'absolute',
    top: '-150px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '600px',
    height: '600px',
    background: 'radial-gradient(circle, rgba(0, 229, 255, 0.15) 0%, rgba(0,0,0,0) 70%)',
    pointerEvents: 'none',
  },
  glowBottom: {
    position: 'absolute',
    bottom: '-100px',
    right: '-100px',
    width: '500px',
    height: '500px',
    background: 'radial-gradient(circle, rgba(255, 42, 133, 0.1) 0%, rgba(0,0,0,0) 70%)',
    pointerEvents: 'none',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 48px',
    zIndex: 10,
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    background: 'rgba(0, 229, 255, 0.1)',
    border: '1px solid rgba(0, 229, 255, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: '900',
    letterSpacing: '3px',
    color: '#f8fafc',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
  },
  badgeVersion: {
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.6px',
    color: '#00e5ff',
    border: '1px solid rgba(0, 229, 255, 0.3)',
    padding: '4px 12px',
    borderRadius: '20px',
    background: 'rgba(0, 229, 255, 0.05)',
  },
  heroSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '60px 24px 40px',
    zIndex: 10,
    maxWidth: '900px',
    margin: '0 auto',
  },
  pillBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(0, 229, 255, 0.3)',
    padding: '6px 16px',
    borderRadius: '30px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: '28px',
  },
  heroTitle: {
    fontSize: 'clamp(36px, 6vw, 64px)',
    fontWeight: '900',
    lineHeight: '1.1',
    letterSpacing: '-1.5px',
    marginBottom: '20px',
  },
  gradientText: {
    background: 'linear-gradient(135deg, #00e5ff 0%, #a855f7 50%, #ff2a85 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  heroSubtitle: {
    fontSize: '18px',
    lineHeight: '1.6',
    color: '#94a3b8',
    maxWidth: '680px',
    marginBottom: '36px',
  },
  ctaRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '12px',
    background: 'linear-gradient(135deg, #00e5ff 0%, #0077ff 100%)',
    color: '#060911',
    padding: '16px 36px',
    borderRadius: '12px',
    fontWeight: '800',
    fontSize: '15px',
    letterSpacing: '1px',
    textDecoration: 'none',
    boxShadow: '0 0 30px rgba(0, 229, 255, 0.4)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  featuresSection: {
    padding: '60px 48px',
    maxWidth: '1200px',
    margin: '0 auto',
    zIndex: 10,
    width: '100%',
  },
  sectionHeading: {
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: '800',
    letterSpacing: '2.5px',
    color: '#00e5ff',
    marginBottom: '40px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '24px',
  },
  card: {
    background: 'rgba(13, 19, 33, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '28px',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
  },
  cardIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: 'rgba(255, 255, 255, 0.04)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '18px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '10px',
    color: '#f1f5f9',
  },
  cardDesc: {
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#94a3b8',
  },
  footer: {
    marginTop: 'auto',
    padding: '24px 48px',
    textAlign: 'center',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    color: '#64748b',
    fontSize: '13px',
    zIndex: 10,
  },
};
