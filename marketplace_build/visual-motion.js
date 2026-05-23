(function () {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const root = document.documentElement;
  let frame = null;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  function apply() {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    root.style.setProperty("--mx", currentX.toFixed(2) + "px");
    root.style.setProperty("--my", currentY.toFixed(2) + "px");
    if (Math.abs(targetX - currentX) > 0.2 || Math.abs(targetY - currentY) > 0.2) {
      frame = requestAnimationFrame(apply);
    } else {
      frame = null;
    }
  }

  function schedule() {
    if (!frame) {
      frame = requestAnimationFrame(apply);
    }
  }

  window.addEventListener("mousemove", function (event) {
    const x = event.clientX / window.innerWidth - 0.5;
    const y = event.clientY / window.innerHeight - 0.5;
    targetX = x * 36;
    targetY = y * 28;
    schedule();
  }, { passive: true });

  window.addEventListener("mouseleave", function () {
    targetX = 0;
    targetY = 0;
    schedule();
  });

  window.addEventListener("deviceorientation", function (event) {
    if (typeof event.gamma !== "number" || typeof event.beta !== "number") return;
    targetX = Math.max(-22, Math.min(22, event.gamma * 0.8));
    targetY = Math.max(-18, Math.min(18, (event.beta - 45) * 0.25));
    schedule();
  }, { passive: true });
})();
