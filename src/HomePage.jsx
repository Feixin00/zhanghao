import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { ArrowDownRight } from "@phosphor-icons/react/ArrowDownRight";
import { CheckCircle } from "@phosphor-icons/react/CheckCircle";
import { List } from "@phosphor-icons/react/List";
import { Sparkle } from "@phosphor-icons/react/Sparkle";
import { X } from "@phosphor-icons/react/X";
import { Globe } from "@phosphor-icons/react/Globe";
import { FileText } from "@phosphor-icons/react/FileText";
import { Rss } from "@phosphor-icons/react/Rss";
import { ArrowUpRight } from "@phosphor-icons/react/ArrowUpRight";
import { CaretDown } from "@phosphor-icons/react/CaretDown";
import { CaretRight } from "@phosphor-icons/react/CaretRight";
import { SpeakerSimpleHigh } from "@phosphor-icons/react/SpeakerSimpleHigh";
import { SpeakerSimpleX } from "@phosphor-icons/react/SpeakerSimpleX";
import "./home-page.css";

const HOME_COPY = {
  zh: {
    pageTitle: "FlexibleFox 灵狐 · 创作工作台",
    homeLabel: "FlexibleFox 首页",
    navLabel: "首页导航",
    nav: ["产品能力", "工作方式", "关于灵狐"],
    startExperience: "开始体验",
    switchLanguage: "切换为英文",
    languageButton: "EN",
    openMenu: "打开菜单",
    closeMenu: "关闭菜单",
    startUsing: "开始使用",
    heroLine1: "灵感进来得更快",
    heroLine2: "创作从此",
    heroEmphasis: "更从容",
    heroDescription: "FlexibleFox 把内容发现、AI 创作与多平台发布连成一条清晰工作流。",
    heroActions: "Hero 操作",
    heroCta: "立即体验",
    mute: "静音",
    unmute: "取消静音",
    productPreview: "FlexibleFox 工作台预览",
    productStatus: "工作流运行中",
    productAlt: "FlexibleFox 内容工作台界面预览",
    featureHeadline: ["一个工作台，", "串起", "完整", "创作链路。", "减少", "工具之间的", "来回切换，", "把注意力", "留给", "真正重要的", "内容。"],
    sourceCard: {
      title: <>好内容，<br />收在一起。</>,
      description: "把分散的信息源，变成自己的灵感库。",
      label: "信息源示意",
      heading: "我的信息源",
      count: "3 个已连接",
      rows: [["精选网站", "发现新的观点"], ["订阅动态", "不错过每次更新"], ["我的文档", "留住有用的素材"]],
      footer: "灵感，持续汇入",
    },
    writingCard: {
      title: <>想法有了，<br />让 AI 接着写。</>,
      description: "从一个灵感，到第一份好稿。",
      label: "AI 创作示意",
      draft: "灵感草稿",
      draftCopy: <>把今天的灵感，<br />写成值得分享的故事。</>,
      status: "正在展开你的想法",
    },
    publishCard: { title: <>一次准备，<br />多端触达。</>, description: "让内容走得更远。", label: "多平台发布示意" },
    trackCard: { title: <>每一步，<br />心中有数。</>, description: "从草稿到上线，清晰可见。", progress: "发布进度", done: "已完成" },
    workflowTitle: <>不是更多工具，<br />而是更顺畅的方式</>,
    workflowBeforeStrong: "由专家为你配置平台，基于",
    workflowStrong: "企业版方案",
    workflowAfterStrong: "上线，随时准备与你一同成长。",
    workflowCta: "预约启动会议",
    steps: [
      { title: "建立信息源", description: "明确范围、结构与时间安排。无论是快速配置还是完整迁移，后续工作都交给我们。", icon: "calendar" },
      { title: "沉淀与创作", description: "与我们的团队协同工作，全程进展清晰可见。每一步都遵循最佳实践，并经过严格测试，确保质量。", icon: "users" },
      { title: "安排并发布", description: "安心上线，自信发布。我们的 AI 持续学习与改进，帮助你的团队轻松拓展业务。", icon: "rocket" },
    ],
    footerTitle: <>让好内容，<br />更稳定地发生</>,
    emailPlaceholder: "输入你的邮箱",
    emailLabel: "邮箱地址",
    waitlist: "加入候补名单",
    footerNavLabel: "页脚导航",
    footerGroups: [
      { title: "产品", links: [["产品能力", "#features"], ["工作方式", "#workflow"], ["关于灵狐", "#about"]] },
      { title: "公司", links: [["帮助中心", "#"], ["服务条款", "#"], ["安全保障", "#"]] },
      { title: "社交媒体", links: [["X（Twitter）", "#"], ["LinkedIn", "#"]] },
    ],
    copyright: "© 2026 FlexibleFox 灵狐。保留所有权利。",
  },
  en: {
    pageTitle: "FlexibleFox · Creative workspace",
    homeLabel: "FlexibleFox home",
    navLabel: "Homepage navigation",
    nav: ["Capabilities", "How it works", "About"],
    startExperience: "Get started",
    switchLanguage: "切换为中文",
    languageButton: "中文",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    startUsing: "Start creating",
    heroLine1: "Ideas come in faster",
    heroLine2: "Create with",
    heroEmphasis: "greater ease",
    heroDescription: "FlexibleFox connects content discovery, AI creation, and multi-platform publishing in one clear workflow.",
    heroActions: "Hero actions",
    heroCta: "Try it now",
    mute: "Mute",
    unmute: "Unmute",
    productPreview: "FlexibleFox workspace preview",
    productStatus: "Workflow running",
    productAlt: "FlexibleFox content workspace interface preview",
    featureHeadline: ["One workspace, ", "one seamless ", "creative flow. ", "Spend less time ", "switching tools ", "and more time ", "making work ", "that matters."],
    sourceCard: {
      title: <>Bring great content<br />together.</>,
      description: "Turn scattered sources into your own inspiration library.",
      label: "Source library preview",
      heading: "My sources",
      count: "3 connected",
      rows: [["Curated sites", "Discover fresh perspectives"], ["Subscriptions", "Never miss an update"], ["My documents", "Keep useful material close"]],
      footer: "Inspiration keeps flowing",
    },
    writingCard: {
      title: <>Have an idea?<br />Let AI keep writing.</>,
      description: "From one spark to a strong first draft.",
      label: "AI writing preview",
      draft: "Idea draft",
      draftCopy: <>Turn today's spark into<br />a story worth sharing.</>,
      status: "Developing your idea",
    },
    publishCard: { title: <>Prepare once.<br />Publish everywhere.</>, description: "Help your content travel further.", label: "Multi-platform publishing preview" },
    trackCard: { title: <>Every step.<br />Always in view.</>, description: "See progress clearly from draft to launch.", progress: "Publishing progress", done: "Complete" },
    workflowTitle: <>Not more tools.<br />A smoother way to work.</>,
    workflowBeforeStrong: "Our experts configure your platform and launch it on an ",
    workflowStrong: "enterprise-ready plan",
    workflowAfterStrong: ", ready to grow alongside your team.",
    workflowCta: "Book a kickoff call",
    steps: [
      { title: "Build your source library", description: "Define the scope, structure, and timeline. From a quick setup to a complete migration, we handle the work that follows.", icon: "calendar" },
      { title: "Create and refine", description: "Collaborate with our team while every step stays visible. Proven practices and rigorous testing keep the quality high.", icon: "users" },
      { title: "Schedule and publish", description: "Launch with confidence. Our AI keeps learning and improving to help your team scale with ease.", icon: "rocket" },
    ],
    footerTitle: <>Make great content<br />happen consistently.</>,
    emailPlaceholder: "Enter your email",
    emailLabel: "Email address",
    waitlist: "Join the waitlist",
    footerNavLabel: "Footer navigation",
    footerGroups: [
      { title: "Product", links: [["Capabilities", "#features"], ["How it works", "#workflow"], ["About", "#about"]] },
      { title: "Company", links: [["Help center", "#"], ["Terms", "#"], ["Security", "#"]] },
      { title: "Social", links: [["X (Twitter)", "#"], ["LinkedIn", "#"]] },
    ],
    copyright: "© 2026 FlexibleFox. All rights reserved.",
  },
};

const HERO_VIDEOS = [
  { src: "/assets/ai-immersive-hero.mp4", poster: "/assets/ai-immersive-hero.avif" },
  { src: "/assets/flower-metro-hero.mp4", poster: "/assets/flower-metro-hero.avif" },
  { src: "/assets/lips-bubbles-hero.mp4", poster: "/assets/lips-bubbles-hero.avif" },
  { src: "/assets/dreamlike-cats-hero.mp4", poster: "/assets/dreamlike-cats-hero.avif" },
];

function HeroVideoSequence({ muted }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const videoRefs = useRef([]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      if (index === activeIndex) {
        video.currentTime = 0;
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [activeIndex]);

  const showNextVideo = () => {
    setActiveIndex((index) => (index + 1) % HERO_VIDEOS.length);
  };

  return (
    <div className="hero-video-sequence" aria-hidden="true">
      {HERO_VIDEOS.map((video, index) => (
        <video
          key={video.src}
          ref={(element) => { videoRefs.current[index] = element; }}
          className={`hero-video${index === activeIndex ? " is-active" : ""}`}
          src={video.src}
          poster={video.poster}
          autoPlay={index === 0}
          muted={muted}
          playsInline
          preload={index === 0 ? "auto" : "metadata"}
          onCanPlay={(event) => {
            if (index === activeIndex) void event.currentTarget.play().catch(() => {});
          }}
          onEnded={showNextVideo}
          onError={showNextVideo}
        />
      ))}
    </div>
  );
}

// Same scroll range and per-word blur/opacity interpolation as the template's BlurInHeadline.
function BlurInHeadline({ words }) {
  const ref = useRef(null);
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const scrollRoot = ref.current?.closest(".home-content-layer") ?? window;
    let frame = 0;
    const update = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        if (!ref.current) return;
        const start = window.innerHeight * 0.9;
        const end = window.innerHeight * 0.25;
        setProgress(motion.matches ? 1 : Math.min(1, Math.max(0, (start - ref.current.getBoundingClientRect().top) / (start - end))));
      });
    };
    scrollRoot.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    motion.addEventListener("change", update);
    update();
    return () => {
      window.cancelAnimationFrame(frame);
      scrollRoot.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      motion.removeEventListener("change", update);
    };
  }, []);

  return (
    <div className="feature-blur-intro" ref={ref}>
      <h2 className="feature-blur-headline" aria-label={words.join("")}>
        {words.map((word, index) => {
          const reveal = Math.min(1, Math.max(0, progress * words.length - index));
          return <span key={word} aria-hidden="true" style={{ opacity: 0.15 + 0.85 * reveal, filter: `blur(${(1 - reveal) * 8}px)` }}>{word}</span>;
        })}
      </h2>
    </div>
  );
}

function WorkflowIcon({ name }) {
  if (name === "calendar") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 2v4M16 2v4" />
        <rect width="18" height="18" x="3" y="4" rx="2" />
        <path d="M3 10h18m-12 6 2 2 4-4" />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.128a4 4 0 0 1 0 7.744M22 21v-2a4 4 0 0 0-3-3.87" />
        <circle cx="9" cy="7" r="4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2zM9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

function Logo({ light = false, showMark = true }) {
  return (
    <span className={`home-logo${light ? " is-light" : ""}`}>
      {showMark && <img src="/assets/flexiblefox-logo-mark.png" alt="" aria-hidden="true" />}
      <span>FlexibleFox</span>
    </span>
  );
}

export default function HomePage() {
  const [language, setLanguage] = useState(() => {
    try {
      return window.localStorage.getItem("flexiblefox-language") === "en" ? "en" : "zh";
    } catch {
      return "zh";
    }
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroMuted, setHeroMuted] = useState(true);
  const [contentOpen, setContentOpen] = useState(false);
  const heroStageRef = useRef(null);
  const contentLayerRef = useRef(null);
  const contentInnerRef = useRef(null);
  const contentOpenRef = useRef(false);
  const workflowRef = useRef(null);
  const copy = HOME_COPY[language];
  const isEnglish = language === "en";

  useEffect(() => {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
  }, []);

  useEffect(() => {
    document.documentElement.lang = isEnglish ? "en" : "zh-CN";
    document.title = copy.pageTitle;
    try {
      window.localStorage.setItem("flexiblefox-language", language);
    } catch {
      // The language switch still works when storage is unavailable.
    }
  }, [copy.pageTitle, isEnglish, language]);

  useEffect(() => {
    const section = workflowRef.current;
    const contentLayer = contentLayerRef.current;
    const contentInner = contentInnerRef.current;
    if (!section || !contentLayer || !contentInner) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let isTransitioning = false;
    let transitionTimer = 0;
    let anchorTimer = 0;
    let touchStartY = null;

    const updateWorkflowProgress = () => {
      if (reducedMotion.matches) {
        section.style.setProperty("--workflow-progress", "1");
        return;
      }

      const bounds = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const start = viewportHeight * 0.3;
      const travel = Math.max(1, bounds.height - viewportHeight * 0.4);
      const progress = Math.min(1, Math.max(0, (start - bounds.top) / travel));
      section.style.setProperty("--workflow-progress", progress.toFixed(4));
    };

    const lenis = new Lenis({
      wrapper: contentLayer,
      content: contentInner,
      duration: reducedMotion.matches ? 0 : 1.6,
      easing: (value) => Math.min(1, 1.001 - 2 ** (-10 * value)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: !reducedMotion.matches,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    let frameId = 0;
    const frame = (time) => {
      lenis.raf(time);
      updateWorkflowProgress();
      frameId = window.requestAnimationFrame(frame);
    };

    const revealContent = (nextOpen) => {
      if (isTransitioning || contentOpenRef.current === nextOpen) return false;
      isTransitioning = true;
      contentOpenRef.current = nextOpen;
      setContentOpen(nextOpen);
      setMenuOpen(false);

      if (!nextOpen) {
        lenis.scrollTo(0, { immediate: true, force: true });
      }

      window.clearTimeout(transitionTimer);
      transitionTimer = window.setTimeout(() => {
        isTransitioning = false;
      }, reducedMotion.matches ? 20 : 320);
      return true;
    };

    const handleHeroWheel = (event) => {
      if (document.querySelector(".home-header.is-open")) return;

      if (isTransitioning) {
        event.preventDefault();
        return;
      }

      if (!contentOpenRef.current && event.deltaY > 0) {
        event.preventDefault();
        revealContent(true);
        return;
      }

      if (contentOpenRef.current && contentLayer.scrollTop <= 2 && event.deltaY < 0) {
        event.preventDefault();
        revealContent(false);
      }
    };

    const handleHeroKey = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select, button, a, [contenteditable='true']")) return;

      const goingDown = event.key === "ArrowDown" || event.key === "PageDown" || (event.key === " " && !event.shiftKey);
      const goingUp = event.key === "ArrowUp" || event.key === "PageUp" || (event.key === " " && event.shiftKey);

      if (goingDown && !contentOpenRef.current) {
        event.preventDefault();
        revealContent(true);
      } else if (goingUp && contentOpenRef.current && contentLayer.scrollTop <= 2) {
        event.preventDefault();
        revealContent(false);
      }
    };

    const handleTouchStart = (event) => {
      touchStartY = event.touches[0]?.clientY ?? null;
    };

    const handleTouchEnd = (event) => {
      if (touchStartY === null || isTransitioning) return;
      const touchEndY = event.changedTouches[0]?.clientY ?? touchStartY;
      const travel = touchStartY - touchEndY;
      touchStartY = null;

      if (!contentOpenRef.current && travel > 48) {
        revealContent(true);
      } else if (contentOpenRef.current && contentLayer.scrollTop <= 2 && travel < -48) {
        revealContent(false);
      }
    };

    const handleAnchorClick = (event) => {
      const anchor = event.target.closest?.('a[href^="#"]');
      const href = anchor?.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      setMenuOpen(false);

      if (!contentOpenRef.current) {
        revealContent(true);
        window.clearTimeout(anchorTimer);
        anchorTimer = window.setTimeout(() => {
          lenis.scrollTo(target, { force: true });
        }, reducedMotion.matches ? 0 : 320);
        return;
      }

      lenis.scrollTo(target, { force: true });
    };

    updateWorkflowProgress();
    frameId = window.requestAnimationFrame(frame);
    document.addEventListener("click", handleAnchorClick);
    window.addEventListener("wheel", handleHeroWheel, { passive: false, capture: true });
    window.addEventListener("keydown", handleHeroKey);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(transitionTimer);
      window.clearTimeout(anchorTimer);
      document.removeEventListener("click", handleAnchorClick);
      window.removeEventListener("wheel", handleHeroWheel, { capture: true });
      window.removeEventListener("keydown", handleHeroKey);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      lenis.destroy();
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className={`home-page${contentOpen ? " is-content-open" : ""}`} data-home-theme="light">
      <div className="site-frame site-frame-top" aria-hidden="true" />
      <div className="site-frame site-frame-bottom" aria-hidden="true" />
      <div className="site-frame site-frame-left" aria-hidden="true" />
      <div className="site-frame site-frame-right" aria-hidden="true" />
      <svg className="site-corner site-corner-top-left" width="50" height="50" viewBox="0 0 50 50" fill="none" aria-hidden="true">
        <path d="M5.50871e-06 0C-0.00788227 37.3001 8.99616 50.0116 50 50H5.50871e-06V0Z" fill="currentColor" />
      </svg>
      <svg className="site-corner site-corner-top-right" width="50" height="50" viewBox="0 0 50 50" fill="none" aria-hidden="true">
        <path d="M5.50871e-06 0C-0.00788227 37.3001 8.99616 50.0116 50 50H5.50871e-06V0Z" fill="currentColor" />
      </svg>
      <svg className="site-corner site-corner-bottom-left" width="50" height="50" viewBox="0 0 50 50" fill="none" aria-hidden="true">
        <path d="M5.50871e-06 0C-0.00788227 37.3001 8.99616 50.0116 50 50H5.50871e-06V0Z" fill="currentColor" />
      </svg>
      <svg className="site-corner site-corner-bottom-right" width="50" height="50" viewBox="0 0 50 50" fill="none" aria-hidden="true">
        <path d="M5.50871e-06 0C-0.00788227 37.3001 8.99616 50.0116 50 50H5.50871e-06V0Z" fill="currentColor" />
      </svg>

      <div className="home-stage">
        <section
          ref={heroStageRef}
          className="home-hero-stage"
          aria-labelledby="hero-title"
          aria-hidden={contentOpen}
          inert={contentOpen ? "" : undefined}
        >
          <header className={`home-header${menuOpen ? " is-open" : ""}`}>
            <div className="home-header-inner">
              <a className="home-brand" href="/" aria-label={copy.homeLabel} onClick={closeMenu}>
                <Logo light showMark={false} />
              </a>

              <nav className="home-nav" aria-label={copy.navLabel}>
                <a href="#features">{copy.nav[0]}</a>
                <a href="#workflow">{copy.nav[1]}</a>
                <a href="#about">{copy.nav[2]}</a>
              </nav>

              <div className="home-header-actions">
                <a className="home-start-cta" href="/register">
                  <span>{copy.startExperience}</span>
                  <CaretDown size={13} weight="bold" aria-hidden="true" />
                </a>
                <button
                  className="home-language"
                  type="button"
                  aria-label={copy.switchLanguage}
                  title={copy.switchLanguage}
                  aria-pressed={isEnglish}
                  onClick={() => setLanguage((current) => current === "zh" ? "en" : "zh")}
                >
                  {copy.languageButton}
                </button>
                <button
                  className="home-menu-button"
                  type="button"
                  aria-label={menuOpen ? copy.closeMenu : copy.openMenu}
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((current) => !current)}
                >
                  {menuOpen ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
                </button>
              </div>
            </div>

            <div className="home-mobile-menu">
              <a href="#features" onClick={closeMenu}><span>{copy.nav[0]}</span><CaretRight size={18} /></a>
              <a href="#workflow" onClick={closeMenu}><span>{copy.nav[1]}</span><CaretRight size={18} /></a>
              <a href="#about" onClick={closeMenu}><span>{copy.nav[2]}</span><CaretRight size={18} /></a>
              <a href="/register" onClick={closeMenu}><span>{copy.startExperience}</span><CaretRight size={18} /></a>
            </div>
          </header>

          <div className="home-hero">
            <HeroVideoSequence muted={heroMuted} />

            <a className="hero-motion-cue" href="/register">
              <span>{copy.startUsing}</span>
              <ArrowDownRight size={16} weight="bold" />
            </a>

            <div className="hero-content-bridge">
              <div className="hero-copy">
                <h1 id="hero-title">
                  <span>{copy.heroLine1}</span>
                  <span>{copy.heroLine2} <em>{copy.heroEmphasis}</em></span>
                </h1>
                <p>{copy.heroDescription}</p>
              </div>

              <div className="hero-actions" aria-label={copy.heroActions}>
                <a className="hero-action hero-action-primary" href="/register">
                  {copy.heroCta}
                  <ArrowDownRight size={17} weight="bold" />
                </a>
                <button
                  className="hero-sound-toggle"
                  type="button"
                  aria-label={heroMuted ? copy.unmute : copy.mute}
                  title={heroMuted ? copy.unmute : copy.mute}
                  aria-pressed={!heroMuted}
                  onClick={() => setHeroMuted((muted) => !muted)}
                >
                  {heroMuted
                    ? <SpeakerSimpleX size={18} weight="bold" />
                    : <SpeakerSimpleHigh size={18} weight="bold" />}
                </button>
              </div>
            </div>
          </div>
        </section>

        <div
          ref={contentLayerRef}
          className="home-content-layer"
          aria-hidden={!contentOpen}
          inert={contentOpen ? undefined : ""}
        >
          <div ref={contentInnerRef} className="home-content-inner">
          <main>
        <div className="hero-product-wrap">
            <div className="hero-product" aria-label={copy.productPreview}>
              <div className="hero-product-bar">
                <Logo />
                <span>{copy.productStatus}</span>
              </div>
              <img src="/assets/saas-dashboard.png" alt={copy.productAlt} />
            </div>
        </div>

        <section className="home-section home-features" id="features">
          <BlurInHeadline words={copy.featureHeadline} />

          <div className="feature-grid">
            <article className="feature-card feature-card-primary" tabIndex={0}>
              <div className="feature-copy"><h3>{copy.sourceCard.title}</h3><p>{copy.sourceCard.description}</p></div>
              <div className="source-preview" aria-label={copy.sourceCard.label}>
                <div className="preview-heading"><span>{copy.sourceCard.heading}</span><span className="preview-count">{copy.sourceCard.count}</span></div>
                {[Globe, Rss, FileText].map((Icon, index) => {
                  const [title, desc] = copy.sourceCard.rows[index];
                  return <div className="source-preview-row" key={title}><span className="source-preview-icon"><Icon size={22} /></span><div><strong>{title}</strong><small>{desc}</small></div><CheckCircle size={18} weight="fill" /></div>;
                })}
                <div className="source-preview-bottom"><span>{copy.sourceCard.footer}</span><ArrowDownRight size={20} /></div>
              </div>
            </article>
            <div className="feature-grid-secondary">
              <article className="feature-card feature-card-wide" tabIndex={0}>
                <div className="feature-copy"><h3>{copy.writingCard.title}</h3><p>{copy.writingCard.description}</p></div>
                <div className="writing-preview" aria-label={copy.writingCard.label}><div className="preview-heading"><Sparkle size={20} weight="fill" /><span>{copy.writingCard.draft}</span></div><p>{copy.writingCard.draftCopy}</p><div className="writing-lines"><i /><i /><i /></div><span className="writing-status"><span />{copy.writingCard.status}</span></div>
              </article>
              <div className="feature-grid-small">
                <article className="feature-card feature-card-small feature-publish" tabIndex={0}><div className="feature-copy"><h3>{copy.publishCard.title}</h3><p>{copy.publishCard.description}</p></div><div className="publish-preview" aria-label={copy.publishCard.label}><span><Globe size={25} /></span><span><FileText size={25} /></span><span className="publish-arrow"><ArrowUpRight size={25} /></span></div></article>
                <article className="feature-card feature-card-small feature-track" tabIndex={0}><div className="feature-copy"><h3>{copy.trackCard.title}</h3><p>{copy.trackCard.description}</p></div><div className="tracking-preview"><div><span>{copy.trackCard.progress}</span><strong><span className="track-rest">3 / 4</span><span className="track-done">{copy.trackCard.done} <CheckCircle size={15} weight="fill" /></span></strong></div><div className="tracking-bars"><i /><i /><i /><i /></div></div></article>
              </div>
            </div>
          </div>
        </section>

        <section ref={workflowRef} className="home-workflow" id="workflow">
          <div className="workflow-layout">
            <div className="workflow-intro">
              <h2>{copy.workflowTitle}</h2>
              <p>
                {copy.workflowBeforeStrong}<strong>{copy.workflowStrong}</strong>{copy.workflowAfterStrong}
              </p>
              <a href="#workflow">{copy.workflowCta}</a>
            </div>

            <div className="workflow-timeline">
              <div className="workflow-line" aria-hidden="true">
                <span />
              </div>
              <ol className="workflow-steps">
                {copy.steps.map(({ title, description, icon }, index) => (
                  <li key={title}>
                    <div className={`workflow-step${index === copy.steps.length - 1 ? " is-last" : ""}`}>
                      <span className="workflow-dot" aria-hidden="true">
                        <WorkflowIcon name={icon} />
                      </span>
                      <div className="workflow-step-copy">
                        <h3>{title}</h3>
                        <p>{description}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

          </main>

      <footer className="home-source-footer" id="about">
        <div className="footer-cta-wrap">
          <div className="footer-cta-card">
            <div className="footer-cta-image" aria-hidden="true" />
            <div className="footer-cta-content">
              <h2>{copy.footerTitle}</h2>
              <form className="footer-signup-form" onSubmit={(event) => event.preventDefault()}>
                <div className="footer-email-field">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                  </svg>
                  <input type="email" placeholder={copy.emailPlaceholder} aria-label={copy.emailLabel} />
                </div>
                <button type="submit">
                  {copy.waitlist}
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14m-7-7 7 7-7 7" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="footer-base">
          <div className="footer-base-inner">
            <div className="footer-main-row">
              <a className="footer-brand" href="#" aria-label={copy.homeLabel}>
                <span className="footer-brand-mark" aria-hidden="true" />
                <span>FlexibleFox</span>
              </a>

              <nav className="footer-nav" aria-label={copy.footerNavLabel}>
                {copy.footerGroups.map((group) => (
                  <div key={group.title}>
                    <h3>{group.title}</h3>
                    <ul>
                      {group.links.map(([label, href]) => <li key={label}><a href={href}>{label}</a></li>)}
                    </ul>
                  </div>
                ))}
              </nav>
            </div>

            <div className="footer-copyright">
              <p>{copy.copyright}</p>
            </div>
          </div>
        </div>
      </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
