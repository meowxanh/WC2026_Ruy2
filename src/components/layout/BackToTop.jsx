import { useState, useEffect } from "react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    const startY = window.scrollY;
    const duration = 600; // 600ms cho hiệu ứng trượt mượt mà
    const startTime = performance.now();

    const animateScroll = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      
      // Hàm easing: easeOutCubic (bắt đầu nhanh và chậm dần đều về đích)
      const ease = 1 - Math.pow(1 - progress, 3);
      
      window.scrollTo(0, startY * (1 - ease));

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  };

  return (
    <button
      onClick={scrollToTop}
      className={`back-to-top-btn ${visible ? "back-to-top-btn--visible" : ""}`}
      title="Lên đầu trang"
      aria-label="Lên đầu trang"
    >
      ↑
    </button>
  );
}
