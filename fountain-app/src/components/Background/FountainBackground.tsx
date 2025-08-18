import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
}

const FountainBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle system
    const createParticle = (): Particle => {
      const centerX = canvas.width / 2;
      const centerY = canvas.height * 0.7; // Fountain base position
      
      // Create spray pattern from center
      const angle = (Math.random() - 0.5) * Math.PI; // Upward spray
      const speed = Math.random() * 2 + 0.5;
      
      return {
        x: centerX + (Math.random() - 0.5) * 200, // Slight horizontal spread
        y: centerY,
        vx: Math.sin(angle) * speed * 0.3, // Gentle horizontal drift
        vy: Math.cos(angle) * speed * -1, // Upward movement
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.4 + 0.1,
        life: 0,
        maxLife: Math.random() * 200 + 100
      };
    };

    // Initialize particles
    const particles = particlesRef.current;
    for (let i = 0; i < 50; i++) {
      particles.push(createParticle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw particles
      particlesRef.current.forEach((particle, index) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.02; // Gravity effect
        particle.life++;
        
        // Fade out over lifetime
        particle.opacity = Math.max(0, (1 - particle.life / particle.maxLife) * 0.4);
        
        // Reset particle when it dies
        if (particle.life >= particle.maxLife || particle.y > canvas.height) {
          const newParticle = createParticle();
          particlesRef.current[index] = newParticle;
          return;
        }
        
        // Draw particle
        ctx.save();
        ctx.globalAlpha = particle.opacity;
        
        // Create droplet gradient
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size
        );
        gradient.addColorStop(0, 'rgba(14, 165, 233, 0.8)'); // Sky blue center
        gradient.addColorStop(0.5, 'rgba(56, 189, 248, 0.4)'); // Lighter blue
        gradient.addColorStop(1, 'rgba(14, 165, 233, 0.1)'); // Very light edge
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* CSS Background Effects */}
      <div className="fountain-background">
        {/* Base mist gradient */}
        <div className="fountain-mist"></div>
        
        {/* Fountain glow */}
        <div className="fountain-glow"></div>
        
        {/* Light refraction streaks */}
        <div className="fountain-refraction"></div>
        
        {/* Edge fade */}
        <div className="fountain-edge-fade"></div>
      </div>
      
      {/* Canvas for animated particles */}
      <canvas
        ref={canvasRef}
        className="fountain-particles"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
    </>
  );
};

export default FountainBackground;