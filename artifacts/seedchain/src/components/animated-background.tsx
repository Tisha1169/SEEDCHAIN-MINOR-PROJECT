import { useEffect, useRef } from "react";
import gsap from "gsap";

export function AnimatedBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const shapes = containerRef.current.querySelectorAll(".bg-shape");
    
    shapes.forEach((shape, i) => {
      gsap.to(shape, {
        x: "random(-100, 100)",
        y: "random(-100, 100)",
        rotation: "random(-180, 180)",
        duration: "random(10, 20)",
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: i * -2,
      });
    });

    return () => {
      gsap.killTweensOf(shapes);
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <div className="absolute inset-0 bg-background/50 backdrop-blur-[100px] z-10" />
      <div className="bg-shape absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[80px]" />
      <div className="bg-shape absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-secondary/20 blur-[100px]" />
      <div className="bg-shape absolute bottom-[-20%] left-[20%] w-[50%] h-[40%] rounded-full bg-accent/10 blur-[120px]" />
      <div className="bg-shape absolute bottom-[10%] right-[10%] w-[30%] h-[30%] rounded-full bg-primary/15 blur-[90px]" />
    </div>
  );
}
