import { useEffect, useRef } from 'react';
import { 
  initializeInteractiveEffects, 
  createRippleEffect, 
  smoothScrollTo,
  addRippleStyles 
} from '../utils/interactiveEffects';

/**
 * Interactive Effects Demo Component
 * Shows all available interactive effects and how to use them
 */
export default function InteractiveEffectsDemo() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    addRippleStyles();
    const cleanup = initializeInteractiveEffects();
    return cleanup;
  }, []);

  return (
    <div className="interactive-demo-shell" style={{ minHeight: '100vh', padding: '2rem' }}>
      {/* Header */}
      <header style={{ marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', textAlign: 'center' }}>
          Interactive Effects Demo
        </h1>
        <p style={{ 
          fontSize: '1.1rem', 
          textAlign: 'center', 
          maxWidth: '600px',
          margin: '0 auto',
          color: '#a0aec0'
        }}>
          Explore all available interactive effects with examples and explanations
        </p>
      </header>

      {/* Table of Contents */}
      <nav style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '4rem'
      }}>
        {[
          { id: 'parallax', label: '📍 Parallax Effect' },
          { id: 'track-cursor', label: '👁️ Cursor Tracking' },
          { id: 'magnetic', label: '🧲 Magnetic Buttons' },
          { id: 'scroll-anim', label: '🎬 Scroll Animations' },
          { id: 'ripple', label: '💥 Ripple Effect' }
        ].map(item => (
          <button
            key={item.id}
            data-magnetic
            onClick={() => smoothScrollTo(item.id)}
            style={{
              padding: '1rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div ref={containerRef}>
        {/* Section 1: Parallax Effect */}
        <section id="parallax" style={{ marginBottom: '6rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>1. Parallax Effect</h2>
          
          <div style={{
            position: 'relative',
            height: '400px',
            borderRadius: '16px',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            marginBottom: '2rem'
          }}>
            <div
              data-parallax="0.3"
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                background: 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
                zIndex: 1
              }}
            />
            <div
              data-parallax="0.5"
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                background: 'radial-gradient(circle at 20% 50%, rgba(6, 182, 212, 0.2) 0%, transparent 70%)',
                zIndex: 1
              }}
            />
            
            <div style={{
              position: 'relative',
              zIndex: 2,
              padding: '3rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center'
            }}>
              <div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Scroll to see parallax</h3>
                <p style={{ color: '#a0aec0' }}>Background elements move at different speeds</p>
              </div>
            </div>
          </div>

          <div style={{
            background: 'rgba(99, 102, 241, 0.05)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            fontFamily: 'monospace',
            fontSize: '0.9rem'
          }}>
            <code>{`<div data-parallax="0.3">
  Background element
</div>`}</code>
          </div>
        </section>

        {/* Section 2: Cursor Tracking */}
        <section id="track-cursor" style={{ marginBottom: '6rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>2. Cursor Tracking</h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem',
            marginBottom: '2rem'
          }}>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                data-track-cursor
                style={{
                  padding: '2rem',
                  borderRadius: '16px',
                  background: `linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)`,
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                } as any}
              >
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '16px',
                  pointerEvents: 'none'
                }} />
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Card {i}</h3>
                <p style={{ color: '#a0aec0', fontSize: '0.95rem' }}>
                  Move your cursor over this card to see the effect
                </p>
              </div>
            ))}
          </div>

          <div style={{
            background: 'rgba(99, 102, 241, 0.05)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            fontFamily: 'monospace',
            fontSize: '0.9rem'
          }}>
            <code>{`<div data-track-cursor>
  Cursor aware element
</div>`}</code>
          </div>
        </section>

        {/* Section 3: Magnetic Buttons */}
        <section id="magnetic" style={{ marginBottom: '6rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>3. Magnetic Button Effect</h2>
          
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '2rem',
            marginBottom: '2rem',
            justifyContent: 'center'
          }}>
            <button
              data-magnetic
              onClick={(e) => createRippleEffect(e as any)}
              style={{
                padding: '1rem 2rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              Hover to attract
            </button>

            <button
              data-magnetic
              onClick={(e) => createRippleEffect(e as any)}
              style={{
                padding: '1rem 2rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #14b8a6 0%, #6366f1 100%)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              Magnetic Field
            </button>

            <button
              data-magnetic
              onClick={(e) => createRippleEffect(e as any)}
              style={{
                padding: '1rem 2rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #ec4899 0%, #6366f1 100%)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              Click Me
            </button>
          </div>

          <div style={{
            background: 'rgba(99, 102, 241, 0.05)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            fontFamily: 'monospace',
            fontSize: '0.9rem'
          }}>
            <code>{`<button data-magnetic>
  Hover for magnetic effect
</button>`}</code>
          </div>
        </section>

        {/* Section 4: Scroll Animations */}
        <section id="scroll-anim" style={{ marginBottom: '6rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>4. Scroll Triggered Animations</h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '2rem',
            marginBottom: '2rem'
          }}>
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                data-animate-scroll
                style={{
                  padding: '2rem',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  animation: 'landing2-fade-in-up 0.8s ease forwards',
                  opacity: 0,
                  animationDelay: `${i * 0.1}s`,
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                  {['⚡', '💬', '🎯', '📊', '🔗', '🔒'][i]}
                </div>
                <h3 style={{ fontSize: '1rem' }}>Feature {i + 1}</h3>
                <p style={{ color: '#a0aec0', fontSize: '0.9rem' }}>
                  Scroll down to see animation
                </p>
              </div>
            ))}
          </div>

          <div style={{
            background: 'rgba(99, 102, 241, 0.05)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            fontFamily: 'monospace',
            fontSize: '0.9rem'
          }}>
            <code>{`<div data-animate-scroll>
  Animates when scrolled into view
</div>`}</code>
          </div>
        </section>

        {/* Section 5: Ripple Effect */}
        <section id="ripple" style={{ marginBottom: '6rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>5. Ripple Click Effect</h2>
          
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '2rem'
          }}>
            <button
              onClick={(e) => createRippleEffect(e as any)}
              style={{
                padding: '1.5rem 3rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '1.1rem',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              Click for ripple effect
            </button>
          </div>

          <div style={{
            background: 'rgba(99, 102, 241, 0.05)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            fontFamily: 'monospace',
            fontSize: '0.9rem'
          }}>
            <code>{`import { createRippleEffect } from './utils/interactiveEffects';

<button onClick={(e) => createRippleEffect(e)}>
  Click for ripple
</button>`}</code>
          </div>
        </section>

        {/* Footer */}
        <footer style={{
          textAlign: 'center',
          padding: '3rem 0',
          borderTop: '1px solid rgba(99, 102, 241, 0.2)',
          color: '#a0aec0'
        }}>
          <p>More effects available in <code style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>src/utils/interactiveEffects.ts</code></p>
          <p>See <code style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>INTERACTIVE_EFFECTS_GUIDE.md</code> for implementation details</p>
        </footer>
      </div>
    </div>
  );
}
