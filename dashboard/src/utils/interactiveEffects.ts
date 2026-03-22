/**
 * Interactive Effects Utilities
 * Provides advanced animations and interactive effects for the landing pages
 */

export const initializeInteractiveEffects = () => {
  // Scroll-triggered animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all elements with animate-on-scroll class
  document.querySelectorAll('[data-animate-scroll]').forEach(el => {
    observer.observe(el);
  });

  // Parallax effect for background elements
  const handleParallax = () => {
    const scrollY = window.scrollY;
    const parallaxElements = document.querySelectorAll('[data-parallax]');
    
    parallaxElements.forEach(element => {
      const speed = parseFloat((element as HTMLElement).dataset.parallax || '0.5');
      const offset = scrollY * speed;
      (element as HTMLElement).style.transform = `translateY(${offset}px)`;
    });
  };

  window.addEventListener('scroll', handleParallax, { passive: true });

  // Magnetic button effect
  const magneticButtons = document.querySelectorAll('[data-magnetic]');
  
  magneticButtons.forEach(button => {
    button.addEventListener('mousemove', ((e: Event) => {
      const mouseEvent = e as MouseEvent;
      const rect = button.getBoundingClientRect();
      const x = mouseEvent.clientX - rect.left - rect.width / 2;
      const y = mouseEvent.clientY - rect.top - rect.height / 2;
      
      const distance = Math.sqrt(x * x + y * y);
      const maxDistance = 100;
      
      if (distance < maxDistance) {
        const strength = 1 - distance / maxDistance;
        const moveX = (x / distance) * strength * 15;
        const moveY = (y / distance) * strength * 15;
        
        (button as HTMLElement).style.transform = `translate(${moveX}px, ${moveY}px)`;
      }
    }) as EventListener);

    button.addEventListener('mouseleave', () => {
      (button as HTMLElement).style.transform = 'translate(0, 0)';
    });
  });

  // Cursor tracking for visual effects
  const trackingElements = document.querySelectorAll('[data-track-cursor]');
  
  if (trackingElements.length > 0) {
    document.addEventListener('mousemove', ((e: Event) => {
      const mouseEvent = e as MouseEvent;
      trackingElements.forEach(element => {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const angle = Math.atan2(mouseEvent.clientY - centerY, mouseEvent.clientX - centerX);
        const distance = Math.hypot(mouseEvent.clientX - centerX, mouseEvent.clientY - centerY);
        
        (element as HTMLElement).style.setProperty('--cursor-angle', `${angle}rad`);
        (element as HTMLElement).style.setProperty('--cursor-distance', `${Math.min(distance, 200)}px`);
      });
    }) as EventListener, { passive: true });
  }

  // Cleanup function
  return () => {
    observer.disconnect();
    window.removeEventListener('scroll', handleParallax);
  };
};

/**
 * Text animation effect - stagger letters in animation
 */
export const createTextAnimation = (element: HTMLElement, animationClass: string) => {
  const text = element.textContent || '';
  element.innerHTML = text.split('').map(char => 
    `<span class="${animationClass}" style="display: inline-block">${char}</span>`
  ).join('');
};

/**
 * Smooth scroll to element
 */
export const smoothScrollTo = (elementId: string, offset = 0) => {
  const element = document.getElementById(elementId);
  if (element) {
    const top = element.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({
      top,
      behavior: 'smooth'
    });
  }
};

/**
 * Create ripple effect on click
 */
export const createRippleEffect = (event: MouseEvent) => {
  const button = event.currentTarget as HTMLElement;
  const ripple = document.createElement('span');
  
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.className = 'ripple-effect';
  
  button.appendChild(ripple);
  
  setTimeout(() => ripple.remove(), 600);
};

/**
 * Detect reduce motion preference
 */
export const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Create intersection observer for lazy animations
 */
export const createLazyAnimationObserver = (selector: string, animationClass: string) => {
  const elements = document.querySelectorAll(selector);
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.classList.contains(animationClass)) {
        entry.target.classList.add(animationClass);
      }
    });
  }, { threshold: 0.1 });

  elements.forEach(el => observer.observe(el));
  
  return observer;
};

/**
 * Remove ripple effect CSS if not present
 */
export const addRippleStyles = () => {
  if (!document.getElementById('ripple-styles')) {
    const style = document.createElement('style');
    style.id = 'ripple-styles';
    style.textContent = `
      .ripple-effect {
        position: absolute;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255,255,255,0.8), rgba(255,255,255,0));
        pointer-events: none;
        animation: ripple-animation 0.6s ease-out;
      }
      
      @keyframes ripple-animation {
        from {
          opacity: 1;
          transform: scale(0);
        }
        to {
          opacity: 0;
          transform: scale(1);
        }
      }
    `;
    document.head.appendChild(style);
  }
};
