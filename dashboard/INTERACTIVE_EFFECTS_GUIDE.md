# Interactive Effects Implementation Guide

## Overview
This guide explains how to use the interactive effects utilities in your React components to create premium, attention-grabbing animations without appearing AI-generated.

## Available Functions

### 1. `initializeInteractiveEffects()`
Initializes all interactive effects globally. Call this once on component mount.

```typescript
import { initializeInteractiveEffects } from '../utils/interactiveEffects';

useEffect(() => {
  const cleanup = initializeInteractiveEffects();
  return cleanup; // Cleanup on unmount
}, []);
```

**Features Enabled:**
- Scroll-triggered animations
- Parallax effects
- Magnetic button effects
- Cursor tracking

---

## Data Attributes for Interactive Effects

### `data-parallax="0.5"`
Enable parallax effect on an element. Value is the scroll speed multiplier (0-1).

```html
<div data-parallax="0.5">
  <!-- This element moves at 50% of scroll speed -->
</div>

<div data-parallax="0.3">
  <!-- Slower parallax effect -->
</div>
```

**Use Cases:**
- Background images
- Decorative elements
- Hero section graphics

---

### `data-magnetic`
Enable magnetic button effect - button moves toward cursor within 100px radius.

```html
<button data-magnetic className="landing2-btn">
  Hover to see magnetic effect
</button>
```

**How it Works:**
- Button follows cursor when nearby
- Smooth easing for natural motion
- Returns to original position on mouse leave

**Use Cases:**
- Call-to-action buttons
- Premium interactive buttons
- Game-like UI elements

---

### `data-track-cursor`
Enable cursor tracking - applies CSS variables for radial gradients.

```html
<div data-track-cursor className="landing2-card">
  <!-- Element uses --cursor-angle and --cursor-distance CSS vars -->
</div>
```

**CSS Variables Provided:**
- `--cursor-angle` - Angle in radians from element center
- `--cursor-distance` - Distance in pixels (max 200px)

**CSS Usage:**
```css
.custom-card[data-track-cursor] {
  background: radial-gradient(
    circle at var(--cursor-angle), 
    rgba(99, 102, 241, 0.3) 0%, 
    transparent 50%
  );
}
```

---

### `data-animate-scroll`
Element animates when scrolled into view.

```html
<div data-animate-scroll className="landing2-feature-card">
  <!-- Automatically animates with fade-in-up on scroll -->
</div>
```

---

## Usage Examples

### Example 1: Premium CTA Section
```typescript
import { createRippleEffect, smoothScrollTo } from '../utils/interactiveEffects';

export function CTASection() {
  return (
    <section id="cta-section">
      <h2>Ready to get started?</h2>
      
      <button 
        data-magnetic
        className="landing2-btn landing2-btn-primary"
        onClick={(e) => {
          createRippleEffect(e as any);
          smoothScrollTo('pricing');
        }}
      >
        View Pricing
      </button>
    </section>
  );
}
```

### Example 2: Interactive Feature Grid
```typescript
export function FeatureGrid() {
  return (
    <div className="landing2-features-grid">
      {features.map((feature, index) => (
        <div 
          key={index}
          data-animate-scroll
          data-track-cursor
          className="landing2-feature-card"
          style={{
            animationDelay: `${index * 0.1}s`
          }}
        >
          <div className="landing2-feature-icon">{feature.icon}</div>
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
        </div>
      ))}
    </div>
  );
}
```

### Example 3: Parallax Hero Section
```typescript
export function HeroSection() {
  return (
    <section className="landing2-hero">
      <div 
        data-parallax="0.3"
        style={{
          position: 'absolute',
          zIndex: -1,
          width: '100%',
          height: '100%'
        }}
      >
        <div className="hero-bg-graphic" />
      </div>
      
      <h1>Premium Design with Motion</h1>
    </section>
  );
}
```

### Example 4: Magnetic Navigation
```typescript
export function Navigation() {
  return (
    <nav>
      <button 
        data-magnetic
        className="nav-btn"
      >
        Home
      </button>
      
      <button 
        data-magnetic
        className="nav-btn"
      >
        Features
      </button>
    </nav>
  );
}
```

---

## Advanced: Custom Interactive Effects

### Add Text Animation
```typescript
import { createTextAnimation } from '../utils/interactiveEffects';

export function AnimatedHeading() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  
  useEffect(() => {
    if (headingRef.current) {
      createTextAnimation(headingRef.current, 'letter-animation');
    }
  }, []);
  
  return <h1 ref={headingRef}>Animated Text Here</h1>;
}
```

### Add CSS for Text Animation
```css
.letter-animation {
  animation: landing2-fade-in-up 0.6s ease forwards;
}

.letter-animation:nth-child(1) { animation-delay: 0s; }
.letter-animation:nth-child(2) { animation-delay: 0.05s; }
.letter-animation:nth-child(3) { animation-delay: 0.1s; }
/* ... and so on */
```

---

## CSS Helper Classes

### Animation Classes
```css
/* Fade in and move up */
.animate-in {
  animation: landing2-fade-in-up 0.6s ease forwards;
}

/* Glow pulse effect */
.glow-pulse {
  animation: landing2-glow 3s ease-in-out infinite;
}

/* Float animation */
.float-animation {
  animation: landing2-float 20s ease-in-out infinite;
}

/* Check bounce animation */
.check-bounce {
  animation: landing2-check-bounce 0.6s ease forwards;
}

/* Gradient shift */
.gradient-shift {
  animation: landing2-gradient-shift 8s ease infinite;
}
```

---

## Performance Tips

### 1. Use Passive Event Listeners
Already built-in for scroll and mousemove, but for custom events:
```typescript
element.addEventListener('scroll', handler, { passive: true });
```

### 2. Limit Parallax Elements
Too many parallax elements can cause jank. Use sparingly:
```html
<!-- ✅ Good: Single container with parallax -->
<div data-parallax="0.5">
  <Hero />
</div>

<!-- ❌ Avoid: Too many parallax elements -->
<div data-parallax="0.2"><Element1 /></div>
<div data-parallax="0.3"><Element2 /></div>
<div data-parallax="0.4"><Element3 /></div>
<!-- ... 20 more parallax elements -->
```

### 3. Use `will-change` Strategically
```css
.landing2-feature-card {
  will-change: transform;
  /* Animation is already optimized */
}
```

### 4. Lazy Load Animations
```typescript
const observer = createLazyAnimationObserver(
  '.landing2-app-card',
  'animate-in'
);
```

---

## Accessibility Considerations

### Respect Motion Preferences
```typescript
import { prefersReducedMotion } from '../utils/interactiveEffects';

if (!prefersReducedMotion()) {
  // Initialize animations
  initializeInteractiveEffects();
}
```

### Automatic Support
The CSS already includes:
```css
@media (prefers-reduced-motion: reduce) {
  .landing2-feature-card,
  .landing2-app-card,
  .landing2-pricing-card,
  .landing2-btn {
    transition: none !important;
    animation: none !important;
  }
}
```

### Keyboard Navigation
All interactive elements support tab navigation:
```html
<button data-magnetic className="landing2-btn" tabIndex={0}>
  Click or Tab+Enter
</button>
```

---

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| CSS Animations | ✅ | ✅ | ✅ | ✅ |
| Intersection Observer | ✅ | ✅ | ✅ | ✅ |
| CSS Variables | ✅ | ✅ | ✅ | ✅ |
| Backdrop Filter | ✅ | ✅ | ✅ (13+) | ✅ |
| Grid/Flexbox | ✅ | ✅ | ✅ | ✅ |

---

## Troubleshooting

### Animations Not Working?
1. Check that CSS file is imported: `import '../landing2.css'`
2. Verify elements have correct class names
3. Check console for errors
4. Ensure JavaScript is enabled

### Performance Issues?
1. Reduce number of parallax elements
2. Use `prefers-reduced-motion` check
3. Check DevTools Performance tab for jank
4. Disable animations during heavy computations

### Cursor Tracking Not Responsive?
1. Ensure element has `data-track-cursor` attribute
2. Check that CSS variables are being used
3. Verify mouse events are firing (check console)
4. Try reloading the page

---

## Next Steps

1. **Implement** these effects in your components
2. **Test** on different devices and browsers
3. **Monitor** performance using DevTools
4. **Iterate** based on user feedback
5. **Expand** to more interactive elements

For more information, see [INTERACTIVE_EFFECTS_CHANGELOG.md](./INTERACTIVE_EFFECTS_CHANGELOG.md)
