

    gsap.registerPlugin(ScrollTrigger);

    const DESKTOP = window.matchMedia("(min-width: 1024px)");
    let teardownDesktop = null;
    let splideInstance  = null;

    /* ================= Desktop (>=1024px): pinned horizontal scroll + rise-on-enter ================= */
    // Shrinks a card's text (title/desc/footer) just enough that it fits the fixed
    // card height with NO clipping and NO internal scroll — computed once per card
    // from the actual overflow ratio (not a slow iterative loop). Floors at 70% size
    // so text never becomes unreadably small; ordinary-length copy is left untouched.
    function fitCardText(card) {
      const body  = card.querySelector(".niche-body");
      if (!body) return;
      const title = body.querySelector("h3");
      const desc  = body.querySelector(".niche-desc");
      const foot  = body.querySelector(".niche-footer");
      const els   = [title, desc, foot].filter(Boolean);
      if (!els.length) return;

      // reset to natural size first so we measure fresh, not a previously-shrunk state
      els.forEach((el) => { el.style.fontSize = ""; });

      const available = body.clientHeight;
      const natural   = body.scrollHeight;
      if (natural <= available || available === 0) return; // already fits

      const scale = Math.max(0.7, available / natural);
      els.forEach((el) => {
        const basePx = parseFloat(getComputedStyle(el).fontSize);
        el.style.fontSize = (basePx * scale) + "px";
      });
    }
    function fitAllCards(section) {
      section.querySelectorAll(".niche__desktop .niche-card").forEach(fitCardText);
    }
    function resetCardText(section) {
      section.querySelectorAll(".niche__desktop .niche-desc, .niche__desktop .niche-footer, .niche__desktop h3")
        .forEach((el) => { el.style.fontSize = ""; });
    }

    function buildDesktop() {
      const section  = document.querySelector(".niche");
      const pin      = section.querySelector(".niche__pin");
      const viewport = section.querySelector(".niche__viewport");
      const track    = section.querySelector(".niche__track");
      const items    = gsap.utils.toArray(section.querySelectorAll(".niche__item"));
      const setY     = items.map(el => gsap.quickSetter(el, "y", "px"));

      const riseAmount = () => parseFloat(getComputedStyle(section).getPropertyValue("--rise")) || 100;

      function setCardWidth() {
        const vw      = viewport.clientWidth;
        const padLeft = parseFloat(getComputedStyle(track).paddingLeft) || 0;
        const gap     = parseFloat(getComputedStyle(track).columnGap) || 0;
        const perView = parseFloat(getComputedStyle(section).getPropertyValue("--per-view")) || 2.5;
        const w = ((vw - padLeft) - gap * 2) / perView;
        section.style.setProperty("--card-w", w + "px");
      }
      ScrollTrigger.addEventListener("refreshInit", setCardWidth);
      setCardWidth();

      const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
      const move = gsap.to(track, { x: () => -distance(), ease: "none" });

      const M = { targets: [], slot: 1, rise: 100 };
      function measure() {
        const vpLeft  = viewport.getBoundingClientRect().left;
        const padLeft = parseFloat(getComputedStyle(track).paddingLeft) || 0;
        const gap     = parseFloat(getComputedStyle(track).columnGap) || 0;
        const cardW   = items[0].offsetWidth;
        const slot    = cardW + gap;
        const dist    = distance();
        const fixedSettle = vpLeft + padLeft + slot;

        M.slot = slot;
        M.rise = riseAmount();
        M.targets = items.map((_, i) => {
          const naturalLeft = vpLeft + padLeft + i * slot;
          const maxReachLeft = naturalLeft - dist;
          return Math.max(fixedSettle, maxReachLeft);
        });
      }

      function applyRise(progress) {
        if (progress >= 0.999) {
          setY.forEach((set) => set(0));
          return;
        }
        for (let i = 0; i < items.length; i++) {
          const left = items[i].getBoundingClientRect().left;
          let p = (left - M.targets[i]) / M.slot;
          p = p < 0 ? 0 : p > 1 ? 1 : p;
          setY[i](p * M.rise);
        }
      }

      const st = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: () => "+=" + distance(),
        pin: pin,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        animation: move,
        onRefresh: (self) => { measure(); applyRise(self.progress); fitAllCards(section); },
        onUpdate:  (self) => applyRise(self.progress)
      });

      measure();
      applyRise(st.progress);
      ScrollTrigger.refresh();
      fitAllCards(section);

      return () => {
        ScrollTrigger.removeEventListener("refreshInit", setCardWidth);
        st.kill();
        gsap.set(track, { clearProps: "transform" });
        gsap.set(items, { clearProps: "transform" });
        section.style.removeProperty("--card-w");
        resetCardText(section);
      };
    }

    /* ================= Mobile/Tablet (<1024px): Splide, 1 per view on phones ================= */
    function mountSplide() {
      if (splideInstance) return splideInstance;
      splideInstance = new Splide(".niche__splide", {
        type: "slide",
        perPage: 2,          // tablet default (this whole instance only exists below 1024px anyway)
        gap: "24px",
        padding: { left: "max(1rem, 5vw)", right: "32px" },
        arrows: true,
        pagination: true,
        breakpoints: {
          639: { perPage: 1, padding: { left: "1rem", right: "1rem" } } // phones: exactly 1 per slide
        }
      });
      splideInstance.mount();
      return splideInstance;
    }
    function unmountSplide() {
      if (splideInstance) { splideInstance.destroy(); splideInstance = null; }
    }

    function handleBreakpoint(e) {
      if (e.matches) {
        unmountSplide();
        if (!teardownDesktop) teardownDesktop = buildDesktop();
      } else {
        if (teardownDesktop) { teardownDesktop(); teardownDesktop = null; }
        mountSplide();
      }
    }

    handleBreakpoint(DESKTOP);
    DESKTOP.addEventListener("change", handleBreakpoint);

    window.addEventListener("load", () => ScrollTrigger.refresh());



// ============================================
// MOBILE MENU & NAVBAR
// ============================================
// Desktop dropdown: + / − icon toggle
document.addEventListener("DOMContentLoaded", function () {
  const desktopDropdown = document.querySelector(".desktop-dropdown");
  const dropdownIcon = document.querySelector(".desktop-dropdown-icon");

  if (desktopDropdown && dropdownIcon) {
    desktopDropdown.addEventListener("mouseenter", function () {
      dropdownIcon.textContent = "−";
    });
    desktopDropdown.addEventListener("mouseleave", function () {
      dropdownIcon.textContent = "+";
    });
  }
});

// ── Mobile 2-panel menu ──
document.addEventListener("DOMContentLoaded", function () {
  const overlay = document.getElementById("mobile-overlay");
  const wrapper = document.getElementById("mobile-menu-wrapper");
  const mmMain = document.getElementById("mm-main");
  const mmServices = document.getElementById("mm-services");
  const toggleBtn = document.getElementById("mobile-menu-toggle");
  const closeBtn = document.getElementById("mm-close");
  const servicesTrig = document.getElementById("mm-services-trigger");
  const backBtn = document.getElementById("mm-back");
  const servicesClose = document.getElementById("mm-services-close");

  function openMenu() {
    wrapper.classList.add("active");
    overlay.classList.add("active");
    wrapper.classList.remove("services-open");
    document.body.style.overflow = "hidden";
  }

  function closeMenu() {
    wrapper.classList.remove("active", "services-open");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  function openServices() {
    wrapper.classList.add("services-open");
  }

  function closeServices() {
    wrapper.classList.remove("services-open");
  }

  // Open via hamburger
  toggleBtn && toggleBtn.addEventListener("click", openMenu);

  // Close buttons
  closeBtn && closeBtn.addEventListener("click", closeMenu);
  servicesClose && servicesClose.addEventListener("click", closeMenu);

  // Overlay click → close
  overlay && overlay.addEventListener("click", closeMenu);

  // SERVICES → slide to panel 2
  servicesTrig && servicesTrig.addEventListener("click", openServices);

  // BACK → slide back to panel 1
  backBtn && backBtn.addEventListener("click", closeServices);

  // Close nav links (non-services) also close menu
  document.querySelectorAll(".mm-nav-link:not(button)").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  // Service cards close menu
  document.querySelectorAll(".mm-service-card").forEach((card) => {
    card.addEventListener("click", closeMenu);
  });

  // Resize: close on desktop
  window.addEventListener("resize", function () {
    if (window.innerWidth >= 1024) closeMenu();
  });
});

//full width and height menu -

(function () {
  const overlay = document.getElementById("pixxen-menu");
  const topPanel = document.getElementById("menu-top");
  const botPanel = document.getElementById("menu-bottom");
  const closeBtn = document.getElementById("menu-close");
  const openBtn = document.getElementById("desktop-sidebar");
  const cols = document.querySelectorAll(".nav-col");
  const logoWrap = document.getElementById("bottom-logo");

  const DESKTOP_MIN = 1024;
  function isDesktop() {
    return window.innerWidth >= DESKTOP_MIN;
  }

  // ─── Pre-set initial states ───────────────────────────────────
  gsap.set(topPanel, { y: "-100%" });
  gsap.set(botPanel, { y: "100%" });
  gsap.set(cols, { y: 40, opacity: 0 });
  gsap.set(logoWrap, { y: 30, opacity: 0 });

  let isOpen = false;
  let isAnimating = false;

  // ─── OPEN ─
  function openMenu() {
    if (!isDesktop() || isOpen || isAnimating) return;
    isAnimating = true;

    document.body.classList.add("menu-open");
    overlay.classList.add("is-open");

    const tl = gsap.timeline({
      onComplete: () => {
        isOpen = true;
        isAnimating = false;
      },
    });

    tl.to(topPanel, { y: "0%", duration: 0.75, ease: "power4.out" }, 0);
    tl.to(botPanel, { y: "0%", duration: 0.75, ease: "power4.out" }, 0);
    tl.to(
      cols,
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.08, ease: "power3.out" },
      0.45,
    );
    tl.to(
      logoWrap,
      { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" },
      0.5,
    );
  }

  // ─── CLOSE ───
  function closeMenu() {
    if (!isOpen || isAnimating) return;
    isAnimating = true;

    const tl = gsap.timeline({
      onComplete: () => {
        isOpen = false;
        isAnimating = false;
        overlay.classList.remove("is-open");
        document.body.classList.remove("menu-open");
        gsap.set(cols, { y: 40, opacity: 0 });
        gsap.set(logoWrap, { y: 30, opacity: 0 });
      },
    });

    tl.to(
      [...cols].reverse(),
      { y: -20, opacity: 0, duration: 0.3, stagger: 0.04, ease: "power2.in" },
      0,
    );
    tl.to(
      logoWrap,
      { y: 20, opacity: 0, duration: 0.25, ease: "power2.in" },
      0,
    );
    tl.to(topPanel, { y: "-100%", duration: 0.65, ease: "power4.in" }, 0.2);
    tl.to(botPanel, { y: "100%", duration: 0.65, ease: "power4.in" }, 0.2);
  }

  // Resize: viewport
  window.addEventListener("resize", () => {
    if (!isDesktop() && isOpen) {
      gsap.killTweensOf([topPanel, botPanel, cols, logoWrap]);
      gsap.set(topPanel, { y: "-100%" });
      gsap.set(botPanel, { y: "100%" });
      gsap.set(cols, { y: 40, opacity: 0 });
      gsap.set(logoWrap, { y: 30, opacity: 0 });
      overlay.classList.remove("is-open");
      document.body.classList.remove("menu-open");
      isOpen = false;
      isAnimating = false;
    }
  });

  // ─── Events
  openBtn.addEventListener("click", openMenu);
  closeBtn.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  // Prevent background scroll when menu open
  const style = document.createElement("style");
  style.textContent = `body.menu-open { overflow: hidden; }`;
  document.head.appendChild(style);
})();

// ============================================
// BANNER LINE SHAPE ANIMATION
// ============================================
// const checkAndAnimate = () => {
//     const svgElement = document.querySelector('.banner-line-shape');

//     if (!svgElement || typeof gsap === 'undefined') return;

//     const horizontalLines = svgElement.querySelectorAll('rect:not([transform])');
//     const verticalLines = svgElement.querySelectorAll('rect[transform*="rotate"]');

//     if (horizontalLines.length === 0 && verticalLines.length === 0) return;

//     const tl = gsap.timeline({
//         delay: 1,
//         defaults: {
//             ease: "power2.inOut"
//         }
//     });

//     if (horizontalLines.length > 0) {
//         tl.fromTo(horizontalLines,
//             {
//                 scaleX: 0,
//                 transformOrigin: "left center"
//             },
//             {
//                 scaleX: 1,
//                 duration: 0.8,
//                 stagger: 0.15
//             }
//         );
//     }

//     if (verticalLines.length > 0) {
//         tl.fromTo(verticalLines,
//             {
//                 scaleY: 0,
//                 transformOrigin: "center top"
//             },
//             {
//                 scaleY: 1,
//                 duration: 0.8,
//                 stagger: 0.15
//             },
//             "-=0.3"
//         );
//     }
// };

// window.addEventListener('load', checkAndAnimate);

// ============================================
// 3D SHAPE ANIMATION (Home + About Page)
// ============================================
document.addEventListener("DOMContentLoaded", function () {
  if (typeof gsap === "undefined") return;

  const shapes = document.querySelectorAll(".shape-3d");

  if (shapes.length === 0) return;

  document.addEventListener("mousemove", function (event) {
    const x = event.clientX / window.innerWidth - 0.5;
    const y = event.clientY / window.innerHeight - 0.5;

    shapes.forEach((shape) => {
      gsap.to(shape, {
        duration: 0.4,
        x: x * 50,
        y: y * 30,
        rotationY: x * 15,
        rotationX: -y * 15,
        rotationZ: x * 5,
        scale: 1 + (Math.abs(x) + Math.abs(y)) * 0.1,
        ease: "power1.out",
        overwrite: "auto",
      });
    });
  });
});

// ============================================
// VIDEO SLIDER
// ============================================
document.addEventListener("DOMContentLoaded", function () {
  const videoSliderElement = document.getElementById("video-slider");

  if (!videoSliderElement || typeof Splide === "undefined") return;

  const splide = new Splide("#video-slider", {
    type: "loop",
    drag: "free",
    focus: "center",
    perPage: 5,
    gap: "12px",
    arrows: false,
    pagination: false,
    // autoScroll:false,
    autoScroll: {
      speed: 1,
      pauseOnHover: true,
      pauseOnFocus: true,
    },
    breakpoints: {
      1536: { perPage: 5 },
      1280: { perPage: 4 },
      1024: { perPage: 3, gap: "10px" },
      768: { perPage: 2.5 },
      640: { perPage: 1.5, gap: "8px" },
    },
  });

  if (window.splide && window.splide.Extensions) {
    splide.mount(window.splide.Extensions);
  } else {
    splide.mount();
  }

  const videoCards = document.querySelectorAll(".video-card");

  if (videoCards.length > 0) {
    videoCards.forEach((card) => {
      const video = card.querySelector(".video-element");
      if (!video) return;

      let isPlaying = false;

      card.addEventListener("mouseenter", function () {
        if (!isPlaying) {
          video.currentTime = 0;
          video.play().catch((err) => console.log("Video play error:", err));
          isPlaying = true;
        }
      });

      card.addEventListener("mouseleave", function () {
        if (isPlaying) {
          video.pause();
          video.currentTime = 0;
          isPlaying = false;
        }
      });

      video.addEventListener("ended", function () {
        if (isPlaying) {
          video.currentTime = 0;
          video.play();
        }
      });
    });

    splide.on("move", function () {
      videoCards.forEach((card) => {
        const video = card.querySelector(".video-element");
        if (video) {
          video.pause();
          video.currentTime = 0;
        }
      });
    });
  }
});

// ============================================
// WORK PROGRESS PATH ANIMATION
// ============================================
if (typeof gsap !== "undefined" && gsap.registerPlugin) {
  gsap.registerPlugin(ScrollTrigger);
}

if (window.innerWidth >= 1024) {
  const path = document.querySelector("#draw-path");
  const workProgress = document.querySelector(".work-progress");

  if (path && workProgress && typeof gsap !== "undefined") {
    const pathLength = path.getTotalLength();

    gsap.set(path, {
      strokeDasharray: pathLength,
      strokeDashoffset: pathLength,
    });

    const processItems = document.querySelectorAll(".process-item");

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".work-progress",
        start: "top 80%",
        end: "bottom 20%",
        toggleActions: "play none none none",
      },
    });

    tl.to(path, {
      strokeDashoffset: 0,
      duration: 4,
      ease: "power1.inOut",
    });

    if (processItems.length > 0) {
      tl.to(
        ".process-item",
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.7,
          ease: "power2.out",
        },
        0.5,
      );
    }
  }
}

// ============================================
// OVERVIEW COUNTER
// ============================================
const counterSections = document.querySelectorAll(
  ".overview-counter, .about-counter, .design-counter, .branding-counter, .scss-counter, .web-counter",
);

if (counterSections.length > 0 && typeof gsap !== "undefined") {
  if (gsap.registerPlugin) {
    gsap.registerPlugin(ScrollTrigger);
  }

  counterSections.forEach((counterSection) => {
    const counters = counterSection.querySelectorAll(".counter");

    if (counters.length > 0) {
      counters.forEach((counter) => {
        const target = +counter.getAttribute("data-target");

        gsap.to(counter, {
          innerText: target,
          duration: 2,
          ease: "power2.out",
          snap: { innerText: 1 },
          scrollTrigger: {
            trigger: counter,
            start: "top 90%",
            toggleActions: "play none none none",
          },
          onUpdate: function () {
            counter.innerHTML = Math.ceil(this.targets()[0].innerText);
          },
        });
      });
    }
  });
}

// ============================================
// TESTIMONIAL SLIDER
// ============================================
document.addEventListener("DOMContentLoaded", function () {
  const testimonialSlider = document.getElementById("testimonial-slider");

  if (!testimonialSlider || typeof Splide === "undefined") return;

  const splide = new Splide("#testimonial-slider", {
    type: "loop",
    perPage: 3,
    gap: "2rem",
    arrows: false,
    pagination: false,
    drag: "free",
    focus: "center",

    autoScroll: {
      speed: 1,
      pauseOnHover: true,
      pauseOnFocus: false,
    },

    breakpoints: {
      1024: {
        perPage: 2,
        gap: "1.5rem",
      },
      768: {
        perPage: 1,
        gap: "1rem",
      },
    },
  });

  splide.mount(window.splide.Extensions);

  const prevArrow = document.getElementById("prev-arrow");
  const nextArrow = document.getElementById("next-arrow");

  if (prevArrow) {
    prevArrow.addEventListener("click", function () {
      splide.Components.AutoScroll.pause(); // auto scroll stop
      splide.go("<"); // manual slide
      splide.Components.AutoScroll.play(); // abar start
    });
  }

  if (nextArrow) {
    nextArrow.addEventListener("click", function () {
      splide.Components.AutoScroll.pause();
      splide.go(">");
      splide.Components.AutoScroll.play();
    });
  }
});

// ============================================
// FAQ ACCORDION
// ============================================
document.addEventListener("DOMContentLoaded", function () {
  const faqItems = document.querySelectorAll(".faq-item");

  if (faqItems.length === 0 || typeof gsap === "undefined") return;

  // Initialize all FAQ items as collapsed
  faqItems.forEach((item) => {
    const answer = item.querySelector(".faq-answer");
    const icon = item.querySelector(".plus-icon");

    // Remove active class from all items
    item.classList.remove("active");

    // Set all answers to height 0
    if (answer) {
      gsap.set(answer, { height: 0 });
    }

    // Set all icons to rotation 0
    if (icon) {
      gsap.set(icon, { rotation: 0 });
    }
  });

  // Add click event listeners
  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");
    const icon = item.querySelector(".plus-icon");

    if (!question) return;

    question.addEventListener("click", () => {
      const isActive = item.classList.contains("active");

      // Close all other items
      faqItems.forEach((otherItem) => {
        const otherAnswer = otherItem.querySelector(".faq-answer");
        const otherIcon = otherItem.querySelector(".plus-icon");

        otherItem.classList.remove("active");

        if (otherAnswer) {
          gsap.to(otherAnswer, {
            height: 0,
            duration: 0.4,
            ease: "power2.inOut",
          });
        }
        if (otherIcon) {
          gsap.to(otherIcon, {
            rotation: 0,
            duration: 0.3,
            ease: "power2.inOut",
          });
        }
      });

      // Open clicked item if it wasn't active
      if (!isActive) {
        item.classList.add("active");

        if (answer) {
          gsap.to(answer, {
            height: "auto",
            duration: 0.4,
            ease: "power2.inOut",
          });
        }
        if (icon) {
          gsap.to(icon, {
            rotation: 45,
            duration: 0.3,
            ease: "power2.inOut",
          });
        }
      }
    });
  });
});

// ============================================
// GRADIENT BACKGROUND ANIMATION (UPDATED)
// ============================================
if (typeof gsap !== "undefined" && gsap.registerPlugin) {
  gsap.registerPlugin(ScrollTrigger);
}

function applyGradientAnimation(sectionSelector) {
  const sections = document.querySelectorAll(sectionSelector);

  if (sections.length === 0 || typeof gsap === "undefined") return;

  sections.forEach((section, index) => {
    const gradientOverlay1 = document.createElement("div");
    gradientOverlay1.style.cssText = `
            position: absolute;
            inset: 0;
            opacity: 0;
            background: radial-gradient(50% 27.56% at 50% -10%, rgba(6, 81, 54, 0.8) 0%, transparent 100%);
            pointer-events: none;
            z-index: 0;
            filter: blur(40px);
        `;

    const gradientOverlay2 = document.createElement("div");
    gradientOverlay2.style.cssText = `
            position: absolute;
            inset: 0;
            opacity: 0;
            background: radial-gradient(50% 27.56% at 50% 0%, #065136 0%, #002417 100%);
            pointer-events: none;
            z-index: 0;
        `;

    section.insertBefore(gradientOverlay1, section.firstChild);
    section.insertBefore(gradientOverlay2, section.firstChild);

    const masterTl = gsap.timeline({
      scrollTrigger: {
        trigger: section, // Unique trigger for each section
        start: "top 108%",
        end: "top 25%",
        scrub: 2,
        markers: false,
      },
    });

    masterTl.to(
      gradientOverlay1,
      {
        opacity: 0.6,
        scale: 1.1,
        duration: 1,
        ease: "power2.inOut",
      },
      0,
    );

    masterTl.to(
      gradientOverlay2,
      {
        opacity: 1,
        backgroundPosition: "50% 8%",
        duration: 1,
        ease: "power2.inOut",
      },
      0,
    );

    const contentWrapper = section.querySelector(
      ".cta-wrap, .teamwrap, .workprocess-wrap > div",
    );
    if (contentWrapper) {
      masterTl.from(
        contentWrapper,
        {
          y: 25,
          opacity: 0.85,
          duration: 1,
          ease: "power1.out",
        },
        0.2,
      );
    }
  });
}

applyGradientAnimation(".cta-section");
applyGradientAnimation(".teamsection");
applyGradientAnimation(".work-progress");

// ============================================
// OVERVIEW/ABOUT COUNTER (UPDATED)
// ============================================

// ============================================
// CONTACT FORM GRADIENT BACKGROUND ANIMATION
// ============================================
if (typeof gsap !== "undefined" && gsap.registerPlugin) {
  gsap.registerPlugin(ScrollTrigger);
}

function applyContactGradientAnimation(sectionSelector) {
  const sections = document.querySelectorAll(sectionSelector);

  if (sections.length === 0 || typeof gsap === "undefined") return;

  sections.forEach((section, index) => {
    // Create main gradient overlay
    const gradientOverlay = document.createElement("div");
    gradientOverlay.style.cssText = `
            position: absolute;
            inset: 0;
            opacity: 0;
            background: radial-gradient(
                40% 20% at 50% 100%,
                #065136 0%,
                #002417 100%
            );
            pointer-events: none;
            z-index: 1;
            border-radius: 1.5rem;
        `;

    // Create blur overlay for depth
    const blurOverlay = document.createElement("div");
    blurOverlay.style.cssText = `
            position: absolute;
            inset: 0;
            opacity: 0;
            background: radial-gradient(
                45% 25% at 50% 95%,
                rgba(6, 81, 54, 0.9) 0%,
                transparent 100%
            );
            pointer-events: none;
            z-index: 0;
            filter: blur(60px);
            border-radius: 1.5rem;
        `;

    section.insertBefore(gradientOverlay, section.firstChild);
    section.insertBefore(blurOverlay, section.firstChild);

    const masterTl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "bottom 95%",
        end: "bottom 50%",
        scrub: 1.5,
      },
    });

    masterTl.to(
      blurOverlay,
      {
        opacity: 0.8,
        scale: 1.15,
        duration: 1.5,
        ease: "power2.inOut",
      },
      0,
    );

    masterTl.to(
      gradientOverlay,
      {
        opacity: 1,
        scale: 1.05,
        duration: 1.5,
        ease: "power2.inOut",
      },
      0,
    );
  });
}

// Initialize gradient animation when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  // Small delay to ensure DOM is fully ready
  setTimeout(() => {
    applyContactGradientAnimation(".anatomy");
  }, 100);
});

//normal bg gradient

if (typeof gsap !== "undefined" && gsap.registerPlugin) {
  gsap.registerPlugin(ScrollTrigger);
}

function applyLinearGradientOnScroll() {
  const sections = document.querySelectorAll(".bg-linear-gradient");

  if (sections.length === 0 || typeof gsap === "undefined") return;

  sections.forEach((section) => {
    // Create a wrapper div for the gradient
    const gradientBg = document.createElement("div");
    gradientBg.style.cssText = `
            position: absolute;
            inset: 0;
            opacity: 0;
            background: linear-gradient(180deg, var(--dark-shade-1, #002417) 0%, var(--dark-extra-dark, #001B11) 100%);
            pointer-events: none;
            z-index: 0;
        `;

    section.insertBefore(gradientBg, section.firstChild);

    // Animate gradient on scroll
    gsap.to(gradientBg, {
      opacity: 1,
      scrollTrigger: {
        trigger: section,
        start: "top 70%",
        end: "top 60%",
        scrub: 1,
      },
    });
  });
}

// Call the function
applyLinearGradientOnScroll();

//phase background scroll

if (typeof gsap !== "undefined" && gsap.registerPlugin) {
  gsap.registerPlugin(ScrollTrigger);
}

function applyPhaseBackgroundAnimation(sectionSelector) {
  const sections = document.querySelectorAll(sectionSelector);

  if (sections.length === 0 || typeof gsap === "undefined") return;

  sections.forEach((section, index) => {
    // Create background wrapper with Tailwind classes
    const backgroundWrapper = document.createElement("div");
    backgroundWrapper.className =
      "absolute inset-0 opacity-0 pointer-events-none z-0 rounded-3xl border-white/16 bg-gradient-to-b from-white/10 to-transparent backdrop-blur-[0px]";

    section.insertBefore(backgroundWrapper, section.firstChild);

    const masterTl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top 70%",
        end: "top 60%",
        scrub: 1.5,
      },
    });

    masterTl.to(
      backgroundWrapper,
      {
        opacity: 1,
        duration: 1.5,
        ease: "power2.inOut",
      },
      0,
    );
  });
}

// Initialize animation when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  // Small delay to ensure DOM is fully ready
  setTimeout(() => {
    applyPhaseBackgroundAnimation(".phase-bg");
  }, 100);
});

// ============================================
// TOOLS BACKGROUND IMAGE TRANSITION
// ============================================
function applyBackgroundImageTransition(sectionSelector) {
  const section = document.querySelector(sectionSelector);
  const imageOverlay = section
    ? section.querySelector(".tools-bg-overlay")
    : null;

  if (!section || !imageOverlay || typeof gsap === "undefined") return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: sectionSelector,
      start: "bottom 95%",
      end: "bottom 88%",
      scrub: 2,
      markers: false,
    },
  });

  tl.to(imageOverlay, {
    opacity: 1,
    filter: "blur(0px)",
    scale: 1,
    duration: 1,
    ease: "power2.inOut",
  });

  const contentWrapper = section.querySelector(".toolswrap");
  if (contentWrapper) {
    gsap.from(contentWrapper, {
      scrollTrigger: {
        trigger: sectionSelector,
        start: "bottom 75%",
        end: "bottom 35%",
        scrub: 1.5,
      },
      y: 30,
      opacity: 1,
      duration: 1,
      ease: "power1.out",
    });
  }
}

applyBackgroundImageTransition(".tools-technology");

// video section in team page

document.addEventListener("DOMContentLoaded", function () {
  // Prothome check korbe 'team-video-section' class-ti page-e ache kina
  const videoSection = document.querySelector(".team-video-section");

  if (videoSection) {
    // Jodi class-ti thake, tobei baki elements gulo khujbe
    const playButton = document.getElementById("playButton");
    const videoThumbnail = document.getElementById("videoThumbnail");
    const videoPlayer = document.getElementById("videoPlayer");

    // Check kora bhalo j elements gulo thikmoto ache kina (Error avoid korar jonno)
    if (playButton && videoThumbnail && videoPlayer) {
      // Play Button Click Handler
      playButton.addEventListener("click", function () {
        playButton.classList.add("hidden-scale");
        videoThumbnail.classList.add("hidden-fade");

        setTimeout(() => {
          videoPlayer.classList.add("visible");
          videoPlayer.play();
        }, 300);
      });

      // Video Ends Handler
      videoPlayer.addEventListener("ended", function () {
        videoPlayer.classList.remove("visible");
        videoThumbnail.classList.remove("hidden-fade");
        playButton.classList.remove("hidden-scale");
      });

      // Pause Handling
      videoPlayer.addEventListener("pause", function () {
        if (videoPlayer.currentTime === 0 || videoPlayer.ended) {
          videoPlayer.classList.remove("visible");
          videoThumbnail.classList.remove("hidden-fade");
          playButton.classList.remove("hidden-scale");
        }
      });
    }
  }
});

//blog tab

// Tab Functionality
function initBlogTab() {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabPanes = document.querySelectorAll(".tab-pane");

  if (tabButtons.length === 0 || tabPanes.length === 0) return;

  function switchTab(tabId) {
    // Remove active class from all buttons
    tabButtons.forEach((button) => {
      button.classList.remove("active");
      button.classList.add("inactive");
    });

    // Remove active class from all panes
    tabPanes.forEach((pane) => {
      pane.classList.remove("active");
    });

    // Add active class to clicked button
    const activeButton = document.querySelector(`[data-tab="${tabId}"]`);
    if (activeButton) {
      activeButton.classList.remove("inactive");
      activeButton.classList.add("active");
    }

    // Show corresponding tab pane
    const activePane = document.getElementById(tabId);
    if (activePane) {
      activePane.classList.add("active");

      // Check load more button visibility when switching tabs
      checkLoadMoreButton();
    }
  }

  // Add click event listeners to all buttons
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = button.getAttribute("data-tab");
      if (tabId) {
        switchTab(tabId);
      }
    });
  });
}

// Load More Functionality
function initLoadMore() {
  const loadMoreBtn = document.getElementById("loadMoreBtn");

  if (!loadMoreBtn) return;

  // Initial check
  checkLoadMoreButton();

  loadMoreBtn.addEventListener("click", function () {
    // Get current active tab
    const activeTab = document.querySelector(".tab-pane.active");
    if (!activeTab) return;

    // Get all hidden blog items in active tab
    const hiddenBlogs = activeTab.querySelectorAll(".blogitem.blog-hidden");

    if (hiddenBlogs.length === 0) {
      // No more items to load
      loadMoreBtn.style.display = "none";
      return;
    }

    // Show next 12 items (or remaining items if less than 12)
    const itemsToShow = Math.min(12, hiddenBlogs.length);

    for (let i = 0; i < itemsToShow; i++) {
      const blog = hiddenBlogs[i];

      setTimeout(() => {
        blog.classList.remove("blog-hidden");
        blog.style.opacity = "0";
        blog.style.transform = "translateY(20px)";

        setTimeout(() => {
          blog.style.transition = "opacity 0.5s ease, transform 0.5s ease";
          blog.style.opacity = "1";
          blog.style.transform = "translateY(0)";
        }, 50);
      }, i * 50);
    }

    // Check if there are more hidden items after showing these 12
    setTimeout(
      () => {
        checkLoadMoreButton();
      },
      itemsToShow * 50 + 500,
    );
  });
}

// Check if load more button should be visible
function checkLoadMoreButton() {
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const activeTab = document.querySelector(".tab-pane.active");

  if (!loadMoreBtn || !activeTab) return;

  const hiddenBlogs = activeTab.querySelectorAll(".blogitem.blog-hidden");

  if (hiddenBlogs.length > 0) {
    loadMoreBtn.style.display = "inline-flex";
  } else {
    loadMoreBtn.style.display = "none";
  }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", function () {
  initBlogTab();
  initLoadMore();
});

//terms condition and privacy policy

// Check if the wrapper exists before running the script
const termWrap = document.querySelector(".term-wrap");

if (termWrap) {
  // Table of Contents Collapsible functionality
  const tocSidebar = document.querySelector(".toc-sidebar");
  const tocHeader = document.querySelector(".toc-header");

  // Set initial collapsed state on mobile
  function setInitialState() {
    if (window.innerWidth <= 1024) {
      tocSidebar.classList.add("collapsed");
    }
  }

  // Toggle collapse/expand on header click
  if (tocHeader) {
    tocHeader.addEventListener("click", function () {
      tocSidebar.classList.toggle("collapsed");
    });
  }

  // Table of Contents navigation functionality
  const tocLinks = document.querySelectorAll(".toc-link");
  const sections = document.querySelectorAll(".content-section");

  // Smooth scroll on TOC link click
  tocLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = link.getAttribute("href");
      const targetSection = document.querySelector(targetId);

      if (targetSection) {
        targetSection.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        // Auto-collapse TOC on mobile after clicking a link
        if (window.innerWidth <= 1024) {
          tocSidebar.classList.add("collapsed");
        }
      }
    });
  });

  // Highlight active section on scroll
  function updateActiveSection() {
    let currentSection = "";

    sections.forEach(function (section) {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;

      // Check if current scroll position is within section bounds
      if (window.scrollY >= sectionTop - 100) {
        currentSection = section.getAttribute("id");
      }
    });

    // Update active link styling
    tocLinks.forEach(function (link) {
      link.classList.remove("active");
      if (link.getAttribute("href") === "#" + currentSection) {
        link.classList.add("active");
      }
    });
  }

  // Throttle scroll event for better performance
  let scrollTimeout;
  window.addEventListener("scroll", function () {
    if (scrollTimeout) {
      window.cancelAnimationFrame(scrollTimeout);
    }
    scrollTimeout = window.requestAnimationFrame(function () {
      updateActiveSection();
    });
  });

  // Initialize on page load
  setInitialState();
  updateActiveSection();

  // Re-check collapsed state on window resize
  window.addEventListener("resize", function () {
    if (window.innerWidth > 1024) {
      tocSidebar.classList.remove("collapsed");
    }
  });
}

// career section

const careerSection = document.querySelector(".career");

if (careerSection) {
  // Variables
  const tabButtons = document.querySelectorAll(".tab-button");
  const jobCards = document.querySelectorAll(".job-card");
  const loadMoreBtn = document.querySelector(".load-more-btn");
  const loadMoreContainer = document.querySelector(".load-more-container");
  let currentCategory = "all";
  let visibleCount = 5;

  // Initialize - Show first 5 items
  function initializeJobs() {
    jobCards.forEach((card, index) => {
      const cardIndex = parseInt(card.getAttribute("data-index"));
      if (cardIndex < 5) {
        card.classList.remove("hidden");
        card.classList.add("show");
      } else {
        card.classList.add("hidden");
        card.classList.remove("show");
      }
    });
    checkLoadMoreButton();
  }

  // Check if Load More button should be visible
  function checkLoadMoreButton() {
    const filteredCards = Array.from(jobCards).filter((card) => {
      const cardCategory = card.getAttribute("data-category");
      return currentCategory === "all" || cardCategory === currentCategory;
    });

    const visibleCards = filteredCards.filter(
      (card) => !card.classList.contains("hidden"),
    );

    if (visibleCards.length >= filteredCards.length) {
      loadMoreContainer.classList.add("hidden");
    } else {
      loadMoreContainer.classList.remove("hidden");
    }
  }

  // Tab Filter Functionality
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all buttons
      tabButtons.forEach((btn) => {
        btn.classList.remove("active", "bg-green1", "text-green5", "font-bold");
        btn.classList.add("bg-dark-shade3", "text-white", "font-medium");
      });

      // Add active class to clicked button
      button.classList.add("active", "bg-green1", "text-green5", "font-bold");
      button.classList.remove("bg-dark-shade3", "text-white", "font-medium");

      // Get selected category
      currentCategory = button.getAttribute("data-category");

      // Reset visible count
      visibleCount = 5;

      // Filter job cards
      const filteredCards = Array.from(jobCards).filter((card) => {
        const cardCategory = card.getAttribute("data-category");
        return currentCategory === "all" || cardCategory === currentCategory;
      });

      // Hide all cards first
      jobCards.forEach((card) => {
        card.classList.add("hidden");
        card.classList.remove("show");
      });

      // Show first 5 of filtered cards
      filteredCards.slice(0, 5).forEach((card) => {
        card.classList.remove("hidden");
        card.classList.add("show");
      });

      checkLoadMoreButton();
    });
  });

  // Load More Functionality
  loadMoreBtn.addEventListener("click", () => {
    const filteredCards = Array.from(jobCards).filter((card) => {
      const cardCategory = card.getAttribute("data-category");
      const isMatch =
        currentCategory === "all" || cardCategory === currentCategory;
      return isMatch;
    });

    const hiddenCards = filteredCards.filter((card) =>
      card.classList.contains("hidden"),
    );
    const cardsToShow = hiddenCards.slice(0, 5);

    cardsToShow.forEach((card) => {
      card.classList.remove("hidden");
      card.classList.add("show");
    });

    visibleCount += 5;
    checkLoadMoreButton();
  });

  // Initialize on page load
  initializeJobs();
}

// service section scroll box counter

document.addEventListener("DOMContentLoaded", function () {
  const phaseItems = document.querySelectorAll(".phase-single-item");
  const counterNumber = document.querySelector(".counter-number");

  if (!phaseItems.length || !counterNumber) return;

  let lastActivePhase = "1";

  const updateCounter = () => {
    const triggerPoint = window.innerHeight / 2;
    let currentPhase = lastActivePhase;

    phaseItems.forEach((item) => {
      const rect = item.getBoundingClientRect();
      // If the top of the item has crossed the middle of the screen
      if (rect.top <= triggerPoint) {
        currentPhase = item.getAttribute("data-phase");
      }
    });

    if (currentPhase !== lastActivePhase) {
      lastActivePhase = currentPhase;

      // Animation for number change
      counterNumber.style.opacity = "0";
      counterNumber.style.transform = "translateY(10px)";

      setTimeout(() => {
        counterNumber.textContent = currentPhase;
        counterNumber.style.opacity = "1";
        counterNumber.style.transform = "translateY(0)";
      }, 150);
    }
  };

  window.addEventListener("scroll", updateCounter, { passive: true });
  window.addEventListener("resize", updateCounter);
  updateCounter(); // Initial check
});

//blog details

// Calculate Reading Time
function calculateReadingTime() {
  const content = document.querySelector(".blog-details-content");
  const readingTimeElement = document.querySelector(".toc-blog-title");

  if (!content || !readingTimeElement) return;

  // Get all text content
  const text = content.innerText || content.textContent;

  const words = text.trim().split(/\s+/).length;

  const wordsPerMinute = 225;
  const readingTime = Math.ceil(words / wordsPerMinute);

  readingTimeElement.textContent = `${readingTime} Min Read`;
}

// Reading Progress Bar
function updateReadingProgress() {
  const content = document.querySelector(".blog-details-content");
  const progressBar = document.querySelector(".reading-progress-bar");

  if (!content || !progressBar) return;

  const contentRect = content.getBoundingClientRect();
  const contentHeight = content.offsetHeight;
  const viewportHeight = window.innerHeight;
  const scrollableHeight = contentHeight - viewportHeight;

  // Calculate scroll progress
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const contentTop = content.offsetTop;
  const scrolled = scrollTop - contentTop;
  const progress = Math.min(
    Math.max((scrolled / scrollableHeight) * 100, 0),
    100,
  );

  progressBar.style.width = progress + "%";
}

// Dynamic Table of Contents Generator
function generateTableOfContents() {
  const content = document.querySelector(".blog-details-content");
  const tocList = document.querySelector(".toc-blog-list");

  if (!content || !tocList) return;

  const headings = content.querySelectorAll("h2");

  tocList.innerHTML = "";

  headings.forEach((heading, index) => {
    const headingId = `section-${index}`;
    heading.setAttribute("id", headingId);

    const innerSpans = heading.querySelectorAll(".gr-word-inner");
    const headingText =
      innerSpans.length > 0
        ? Array.from(innerSpans)
            .map((s) => s.textContent)
            .join(" ")
        : heading.textContent;

    const li = document.createElement("li");
    li.className = "toc-blog-item";

    const a = document.createElement("a");
    a.href = `#${headingId}`;
    a.innerHTML = `<span class="header-highlight">${headingText}</span>`;

    li.appendChild(a);
    tocList.appendChild(li);
  });
}

// Active Section Highlighting
function highlightActiveSection() {
  const headings = document.querySelectorAll(".blog-details-content h2");
  const tocItems = document.querySelectorAll(".toc-blog-item");

  if (!headings.length || !tocItems.length) return;

  let activeIndex = -1;

  headings.forEach((heading, index) => {
    const rect = heading.getBoundingClientRect();
    // Check if heading is in viewport (with some offset from top)
    if (rect.top <= 150) {
      activeIndex = index;
    }
  });

  // Remove active class from all items
  tocItems.forEach((item) => item.classList.remove("active"));

  // Add active class to current section
  if (activeIndex >= 0 && tocItems[activeIndex]) {
    tocItems[activeIndex].classList.add("active");
  }
}

// Smooth Scroll to Section
function initSmoothScroll() {
  const tocLinks = document.querySelectorAll(".toc-blog-item a");

  tocLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();

      const targetId = this.getAttribute("href");
      const targetSection = document.querySelector(targetId);

      if (targetSection) {
        const offsetTop = targetSection.offsetTop - 100; // 100px offset from top

        window.scrollTo({
          top: offsetTop,
          behavior: "smooth",
        });
      }
    });
  });
}

// Initialize all functions
function initBlogDetails() {
  calculateReadingTime();

  setTimeout(() => {
    generateTableOfContents();
    initSmoothScroll();
  }, 100);

  window.addEventListener("scroll", () => {
    updateReadingProgress();
    highlightActiveSection();
  });

  updateReadingProgress();
  highlightActiveSection();
}

// Run when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initBlogDetails);
} else {
  initBlogDetails();
}

// play video on scroll
const plySection = document.querySelector("section.plyvideo");

if (plySection) {
  const plyVideo = plySection.querySelector("video");

  if (plyVideo) {
    // Ensure video is ready to replay
    plyVideo.loop = false;
    plyVideo.muted = true; // required for autoplay in most browsers

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            plyVideo.currentTime = 0;
            plyVideo.play().catch(() => {});
          } else {
            plyVideo.pause();
            plyVideo.currentTime = 0;
          }
        });
      },
      { threshold: 0 }, // fires as soon as any pixel enters/leaves
    );

    observer.observe(plySection);
  }
}

// lotti aniamtion

const icons = document.querySelectorAll(".iconanimation");
const icons2 = document.querySelectorAll(".iconanimation-banner");

icons.forEach((icon) => {
  const animationPath = icon.getAttribute("data-animation");

  lottie.loadAnimation({
    container: icon,
    renderer: "svg",
    loop: true,
    autoplay: true,
    path: animationPath,
  });
});
icons2.forEach((icon) => {
  const animationPath = icon.getAttribute("data-animation");

  lottie.loadAnimation({
    container: icon,
    renderer: "svg",
    loop: false,
    autoplay: true,
    path: animationPath,
  });
});

//smooth scroll

// Initialize Lenis
const lenis = new Lenis({
  duration: 1.4,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  direction: "vertical",
  gestureDirection: "vertical",
  smoothWheel: true,
  wheelMultiplier: 1.3,
  infinite: false,
});

lenis.on("scroll", ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);

//load more for industries

// Industries Load More / Show Less
const allIndustriesGrid = document.querySelector(".all-served-industries");

if (allIndustriesGrid) {
  const loadMoreBtn = document.querySelector(".load-more-btn");
  const allItems = Array.from(
    allIndustriesGrid.querySelectorAll(".served-industries"),
  );
  const btnTextUp = loadMoreBtn.querySelector(".t-up");
  const btnTextDown = loadMoreBtn.querySelector(".t-down");

  const getItemsPerPage = () => (window.innerWidth >= 768 ? 12 : 8);

  let currentVisible = 0;
  let isExpanded = false;

  const updateButtonText = (text) => {
    btnTextUp.textContent = text;
    btnTextDown.textContent = text;
  };

  const showItems = () => {
    const perPage = getItemsPerPage();
    currentVisible = currentVisible + perPage;

    allItems.forEach((item, index) => {
      item.style.display = index < currentVisible ? "" : "none";
    });

    if (currentVisible >= allItems.length) {
      currentVisible = allItems.length;
      isExpanded = true;
      updateButtonText("SHOW LESS");
    }
  };

  const hideItems = () => {
    const perPage = getItemsPerPage();
    currentVisible = perPage;
    isExpanded = false;

    allItems.forEach((item, index) => {
      item.style.display = index < currentVisible ? "" : "none";
    });

    updateButtonText("LOAD MORE");
  };

  // Initially hide all items
  allItems.forEach((item) => (item.style.display = "none"));

  // Show first batch on load
  showItems();

  // Toggle on click
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      if (isExpanded) {
        hideItems();
      } else {
        showItems();
      }
    });
  }
}

// Pixxen Landscaping js start

// Landscapping Banner animation
document.addEventListener("DOMContentLoaded", () => {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    console.warn("GSAP or ScrollTrigger is not loaded.");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const hero = document.querySelector(".landscaping-banner");

  if (!hero) return;

  const header = hero.querySelector(".landscaping-hero-header");
  const paragraphs = hero.querySelectorAll(".landscaping-hero-paragraph");
  const price = hero.querySelector(".landscaping-hero-price");
  const border = hero.querySelector(".landscaping-hero-border");
  const checkmarks = hero.querySelector(".landscaping-hero-checkmarks");
  const checkmarkItems = hero.querySelectorAll(
    ".landscaping-hero-checkmark-item",
  );

  // --------------------------------------------------
  // Reduced motion
  // --------------------------------------------------
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.set(
      [header, paragraphs, price, border, checkmarks, ...checkmarkItems],
      {
        clearProps: "all",
      },
    );

    return;
  }

  // --------------------------------------------------
  // Initial states
  // --------------------------------------------------

  // Header
  if (header) {
    gsap.set(header, {
      y: 80,
      opacity: 0,
      clipPath: "inset(100% 0% 0% 0%)",
    });
  }

  // Paragraphs
  if (paragraphs.length) {
    gsap.set(paragraphs, {
      y: 35,
      opacity: 0,
      filter: "blur(8px)",
    });
  }

  // Price
  if (price) {
    gsap.set(price, {
      y: 40,
      opacity: 0,
      scale: 0.94,
      filter: "blur(12px)",
    });
  }

  // Border
  if (border) {
    gsap.set(border, {
      scaleX: 0,
      transformOrigin: "left center",
      opacity: 0,
    });
  }

  // Checkmark wrapper
  if (checkmarks) {
    gsap.set(checkmarks, {
      opacity: 1,
    });
  }

  // Individual checkmarks
  if (checkmarkItems.length) {
    gsap.set(checkmarkItems, {
      y: 30,
      opacity: 0,
      filter: "blur(6px)",
    });
  }

  // --------------------------------------------------
  // Premium entrance timeline
  // --------------------------------------------------

  const tl = gsap.timeline({
    defaults: {
      ease: "power3.out",
    },
    scrollTrigger: {
      trigger: hero,
      start: "top 78%",
      once: true,
    },
  });

  // 1. Header — cinematic masked reveal
  if (header) {
    tl.to(
      header,
      {
        y: 0,
        opacity: 1,
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 1.25,
        ease: "power4.out",
      },
      0,
    );
  }

  // 2. Left paragraph(s)
  if (paragraphs.length) {
    tl.to(
      paragraphs,
      {
        y: 0,
        opacity: 1,
        filter: "blur(0px)",
        duration: 0.9,
        stagger: 0.18,
        ease: "power3.out",
      },
      "-=0.75",
    );
  }

  // 3. Horizontal divider draw
  if (border) {
    tl.to(
      border,
      {
        scaleX: 1,
        opacity: 1,
        duration: 1.1,
        ease: "power3.inOut",
      },
      "-=0.65",
    );
  }

  // 4. Pricing block — focus reveal
  if (price) {
    tl.to(
      price,
      {
        y: 0,
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        duration: 1,
        ease: "power3.out",
      },
      "-=0.7",
    );
  }

  // 5. Checkmark items — staggered cinematic entrance
  if (checkmarkItems.length) {
    tl.to(
      checkmarkItems,
      {
        y: 0,
        opacity: 1,
        filter: "blur(0px)",
        duration: 0.7,
        stagger: 0.12,
        ease: "power3.out",
      },
      "-=0.55",
    );
  }

  // --------------------------------------------------
  // Optional premium hover effect on checkmarks
  // --------------------------------------------------

  checkmarkItems.forEach((item) => {
    const icon = item.querySelector("img");

    item.addEventListener("mouseenter", () => {
      gsap.to(item, {
        x: 5,
        duration: 0.35,
        ease: "power2.out",
      });

      if (icon) {
        gsap.to(icon, {
          scale: 1.15,
          rotate: 5,
          duration: 0.35,
          ease: "power2.out",
        });
      }
    });

    item.addEventListener("mouseleave", () => {
      gsap.to(item, {
        x: 0,
        duration: 0.35,
        ease: "power2.out",
      });

      if (icon) {
        gsap.to(icon, {
          scale: 1,
          rotate: 0,
          duration: 0.35,
          ease: "power2.out",
        });
      }
    });
  });

  // --------------------------------------------------
  // Refresh ScrollTrigger after fonts/layout settle
  // --------------------------------------------------

  window.addEventListener("load", () => {
    ScrollTrigger.refresh();
  });
});

// Landscaping image reveal animate
gsap.registerPlugin(ScrollTrigger);

gsap.utils.toArray(".landscaping-image-reveal").forEach((img) => {
  // Natural fade + scale reveal
  gsap.fromTo(
    img,
    {
      opacity: 0,
      scale: 1.04,
    },
    {
      opacity: 1,
      scale: 1,
      duration: 1.8,
      ease: "power2.out",
      scrollTrigger: {
        trigger: img,
        start: "top 88%",
        once: true,
      },
    },
  );

  // Subtle parallax
  gsap.fromTo(
    img,
    {
      yPercent: -3,
    },
    {
      yPercent: 3,
      ease: "none",
      scrollTrigger: {
        trigger: img,
        start: "top bottom",
        end: "bottom top",
        scrub: 1.5,
      },
    },
  );
});

// Landscaping CTA button animation
document.addEventListener("DOMContentLoaded", () => {
  const MAGNETIC_MAX_DISTANCE = 12; // px -- movement can never exceed this, however far the mouse goes
  const clamp = (value) =>
    Math.max(-MAGNETIC_MAX_DISTANCE, Math.min(MAGNETIC_MAX_DISTANCE, value));

  // ---- grouped magnetic buttons inside .landscaping-btn-cta ----
  document.querySelectorAll(".landscaping-btn-cta").forEach((group) => {
    const magneticChildren = group.querySelectorAll(
      ".landscaping-magnetic-btn",
    );

    group.addEventListener("mousemove", (e) => {
      const rect = group.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      magneticChildren.forEach((child) => {
        gsap.to(child, {
          x: clamp(x * 0.15),
          y: clamp(y * 0.15),
          duration: 0.4,
          ease: "power3.out",
        });
      });
    });

    group.addEventListener("mouseleave", () => {
      magneticChildren.forEach((child) => {
        gsap.to(child, {
          x: 0,
          y: 0,
          duration: 0.6,
          ease: "elastic.out(1, 0.4)",
        });
      });
    });
  });

  // ---- standalone magnetic buttons ----
  document.querySelectorAll(".landscaping-magnetic-btn").forEach((btn) => {
    if (btn.closest(".landscaping-btn-cta")) return; // already handled by group logic

    btn.addEventListener("mousemove", (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      gsap.to(btn, {
        x: clamp(x * 0.2),
        y: clamp(y * 0.2),
        duration: 0.4,
        ease: "power3.out",
      });
    });

    btn.addEventListener("mouseleave", () => {
      gsap.to(btn, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: "elastic.out(1, 0.4)",
      });
    });
  });
});

// Insurance FAQ accordion
document.addEventListener("DOMContentLoaded", function () {
  const faqItems = document.querySelectorAll(".insurance-faq-item");

  faqItems.forEach(function (item) {
    const trigger = item.querySelector(".insurance-faq-trigger");
    const content = item.querySelector(".insurance-faq-content");
    const icon = item.querySelector(".insurance-icon-close img");

    trigger.addEventListener("click", function () {
      const isOpen = item.classList.contains("active");

      // Close all FAQs
      faqItems.forEach(function (faq) {
        faq.classList.remove("active");

        const faqContent = faq.querySelector(".insurance-faq-content");
        const faqIcon = faq.querySelector(".insurance-icon-close img");

        faqContent.style.maxHeight = "0px";

        if (faqIcon) {
          faqIcon.style.transform = "rotate(0deg)";
        }
      });

      // Open clicked FAQ
      if (!isOpen) {
        item.classList.add("active");

        content.style.maxHeight = content.scrollHeight + "px";

        if (icon) {
          icon.style.transform = "rotate(45deg)";
        }
      }
    });
  });
});

// Landscaping Testimonial slider
document.addEventListener("DOMContentLoaded", function () {
  const splideElements = document.querySelectorAll("#landscaping-client-feedback-slider");

  splideElements.forEach(function (element) {
    const splide = new Splide(element, {
      type: "loop",
      perPage: 2,
      perMove: 1,
      gap: "32px",
      padding: "330px",
      drag: true,
      autoplay: true,
      interval: 4000,
      arrows: false,
      pagination: false,
      speed: 1800,
      updateOnMove: true,

      breakpoints: {
        1600: {
          padding: "220px",
        },
        1400: {
          padding: "200px",
          gap: "32px"
        },
        1279: {
          padding: "130px",
          gap: "24px",
        },
        1023: {
          perPage: 2,
          padding: "15px",
          gap: "16px",
        },
        767: {
          perPage: 1,
          padding: "60px",
          gap: "16px",
        },
        450: {
          perPage: 1,
          padding: "60px",
          gap: "16px",
        },
        400: {
          perPage: 1,
          padding: "40px",
          gap: "16px",
        },
      },
    });

    splide.mount();
  });
});

// Landscaping FAQ 
document.querySelectorAll('.landscaping-faq-item').forEach((item) => {
  const btn = item.querySelector('.landscaping-faq-question-btn');
  btn.addEventListener('click', () => {
    const isOpen = item.classList.contains('is-open');

    // Close all other items (accordion behavior)
    document.querySelectorAll('.landscaping-faq-item.is-open').forEach((openItem) => {
      if (openItem !== item) {
        openItem.classList.remove('is-open');
        openItem.querySelector('.landscaping-faq-question-btn').setAttribute('aria-expanded', 'false');
      }
    });

    item.classList.toggle('is-open', !isOpen);
    btn.setAttribute('aria-expanded', String(!isOpen));
  });
});

// landscaping section heading
function initHeadingReveal() {
  const headings = document.querySelectorAll('.landscaping-heading-reveal');

  headings.forEach((heading) => {
    gsap.set(heading, {
      opacity: 0,
      y: 30,
      filter: 'blur(4px)'
    });

    gsap.to(heading, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 1.2,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: heading,
        start: 'top 85%',
        toggleActions: 'play none none none',
        once: true
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', initHeadingReveal);

// 



