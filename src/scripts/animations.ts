import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function initAnimations() {
  // Single element fade-ins
  const targets = document.querySelectorAll('[data-animate]');
  targets.forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        once: true,
      },
    });
  });

  // Staggered children groups
  const groups = document.querySelectorAll('[data-animate-group]');
  groups.forEach((group) => {
    const children = group.querySelectorAll('[data-animate-child]');
    gsap.to(children, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.12,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: group,
        start: 'top 85%',
        once: true,
      },
    });
  });
}

document.addEventListener('DOMContentLoaded', initAnimations);
document.addEventListener('astro:page-load', () => {
  ScrollTrigger.getAll().forEach((t) => t.kill());
  initAnimations();
});
