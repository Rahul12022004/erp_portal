<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import {
    ArrowRight, BookOpen, Bus, ChevronDown, ChevronRight,
    GraduationCap, IdCard, Menu, Moon, School2, ShieldCheck,
    Star, Sun, Users, Wallet, X, Clock, CheckCircle,
    BarChart3, FileText, Settings, Mail, Phone, MapPin,
    Globe, Linkedin, Twitter, Youtube,
  } from 'lucide-svelte';

  const brand = '#2AA889';
  const brandDeep = '#1d7a68';

  let darkMode = $state(false);
  let mobileMenuOpen = $state(false);
  let openFaq = $state<number | null>(null);
  let scrollProgress = $state(0);

  onMount(() => {
    const stored = localStorage.getItem('school-erp-theme');
    if (stored) darkMode = stored === 'dark';

    const handleScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress = total > 0 ? window.scrollY / total : 0;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  });

  $effect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('school-erp-theme', darkMode ? 'dark' : 'light');
  });

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    mobileMenuOpen = false;
  }

  function reveal(node: HTMLElement) {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { node.classList.add('revealed'); observer.disconnect(); }
    }, { threshold: 0.15 });
    observer.observe(node);
    return { destroy: () => observer.disconnect() };
  }

  const navItems = [
    { label: 'Features', id: 'features' },
    { label: 'Modules', id: 'modules' },
    { label: 'How It Works', id: 'how-it-works' },
    { label: 'Pricing', id: 'pricing' },
    { label: 'FAQ', id: 'faq' },
    { label: 'Contact', id: 'cta' },
  ];

  const features = [
    { title: 'Student Management', icon: Users, text: 'Complete student profiles, academic records, attendance tracking, and class management in one seamless system.', headColor: '#2AA889' },
    { title: 'Admission System', icon: GraduationCap, text: 'Digitize student onboarding, document uploads, approval workflows, and admission forms.', headColor: '#ec4899' },
    { title: 'Fee Management', icon: Wallet, text: 'Track class-wise fees, transport charges, generate receipts, and monitor payment due dates.', headColor: '#3b82f6' },
    { title: 'Transport Management', icon: Bus, text: 'Plan bus routes, manage stops, assign students to vehicles, and track daily travel operations.', headColor: '#f59e0b' },
    { title: 'Visitor Management', icon: IdCard, text: 'Generate digital visitor passes, scan arrivals, track check-in/check-out, and keep campus secure.', headColor: '#8b5cf6' },
    { title: 'Staff & Payroll', icon: Settings, text: 'Manage staff records, payroll processing, role-based permissions, and leave approvals.', headColor: '#f59e0b' },
  ];

  const steps = [
    { num: '01', title: 'Add Your School', desc: 'Register your school in minutes with basic info, admin details, and choose your subscription plan.' },
    { num: '02', title: 'Centralize Data', desc: 'Import or add students, staff, classes, and fee structures. Everything syncs across modules.' },
    { num: '03', title: 'Automate Tasks', desc: 'Enable auto-attendance, fee reminders, announcements, and visitor pass generation.' },
    { num: '04', title: 'Monitor & Grow', desc: 'Track performance with live dashboards, generate reports, and make data-driven decisions.' },
  ];

  const testimonials = [
    { name: 'Ritu Sharma', role: 'School Administrator', school: 'Delhi Public School', text: 'This ERP helped us organize admissions, fees, and campus operations in one beautiful workflow. Our staff adoption rate was incredible.', avatar: 'RS', color: '#2AA889' },
    { name: 'Ajay Thomas', role: 'Principal', school: "St. Mary's Convent", text: "The interface feels premium, and our teachers started using it without any training sessions. The attendance module alone saves us 2 hours daily.", avatar: 'AT', color: '#8b5cf6' },
    { name: 'Pooja Menon', role: 'Operations Head', school: 'Greenfield International', text: 'Our data is now connected across finance, transport, and attendance without any manual effort. The visitor pass system is a game-changer.', avatar: 'PM', color: '#f59e0b' },
  ];

  const trustedBy = ['Delhi Public School', "St. Mary's Convent", 'Greenfield Academy', 'Oxford International', 'Cambridge High'];

  const faqs = [
    { q: 'How long does it take to set up?', a: 'Most schools are up and running within 2–3 hours. Our onboarding wizard guides you through every step — from school registration to importing your first student records.' },
    { q: 'Is my school data secure?', a: 'Absolutely. All data is encrypted at rest and in transit using industry-standard protocols. We also maintain daily backups and follow GDPR-level privacy practices.' },
    { q: 'Can I try it before buying?', a: 'Yes. Sign up for a free 14-day trial with no credit card required. You\'ll get full access to all modules so you can evaluate everything before committing.' },
    { q: 'What support do you provide?', a: 'We offer email, live chat, and phone support. Standard plans get priority email support, while Premium plans include a dedicated account manager and phone access.' },
    { q: 'Can I switch plans later?', a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.' },
    { q: 'Do you offer custom packages for large institutions?', a: 'For schools with 500+ students or multiple campuses, we offer custom Enterprise packages. Contact our sales team for a tailored quote.' },
  ];

  const pricing = [
    {
      name: 'Basic', price: '₹2,999', period: 'per month', note: 'For small institutions getting started',
      color: '#94a3b8', badge: 'Best for Small Schools', highlight: 'Essential tools',
      points: [
        { text: 'Unlimited student records', included: true },
        { text: 'Attendance tracking', included: true },
        { text: 'School announcements', included: true },
        { text: 'Basic fee tracking', included: true },
        { text: 'Up to 3 admin users', included: true },
        { text: 'Finance & payroll', included: false },
        { text: 'Transport management', included: false },
        { text: 'Visitor pass system', included: false },
        { text: 'Priority support', included: false },
      ],
    },
    {
      name: 'Standard', price: '₹6,999', period: 'per month', note: 'Most popular for growing schools',
      color: brand, badge: 'Most Popular', highlight: 'Everything in Basic +', featured: true,
      points: [
        { text: 'Unlimited student records', included: true },
        { text: 'Attendance + leave management', included: true },
        { text: 'Admissions & approvals', included: true },
        { text: 'Complete finance & fee tracking', included: true },
        { text: 'Up to 10 admin users', included: true },
        { text: 'Staff payroll & role management', included: true },
        { text: 'Class & exam management', included: true },
        { text: 'Transport & hostel', included: false },
        { text: 'Priority support (4hr response)', included: true },
      ],
    },
    {
      name: 'Premium', price: '₹11,999', period: 'per month', note: 'Complete campus control',
      color: '#8b5cf6', badge: 'Complete Suite', highlight: 'Everything in Standard +',
      points: [
        { text: 'Unlimited students & staff', included: true },
        { text: 'Advanced attendance + leave', included: true },
        { text: 'Admissions with auto-approval', included: true },
        { text: 'Full finance, payroll & receipts', included: true },
        { text: 'Unlimited admin users', included: true },
        { text: 'Transport route management', included: true },
        { text: 'Visitor pass + QR scanning', included: true },
        { text: 'Inventory & library management', included: true },
        { text: 'Dedicated account manager', included: true },
      ],
    },
  ];
</script>

<svelte:head><title>School ERP — Smart Campus Operations</title></svelte:head>

<!-- Scroll progress bar -->
<div class="fixed left-0 right-0 top-0 z-[100] h-1 origin-left bg-gradient-to-r from-[#2AA889] to-[#1d7a68] shadow-[0_0_10px_rgba(42,168,137,0.5)]"
  style="transform: scaleX({scrollProgress})"></div>

<div class="min-h-screen bg-[#eef1f5] text-slate-900 dark:bg-slate-950 dark:text-slate-100 overflow-x-hidden">

  <!-- ── Header ── -->
  <header class="sticky top-0 z-50 border-b border-white/80 bg-white/80 backdrop-blur-xl shadow-sm dark:border-slate-800/60 dark:bg-slate-950/90">
    <div class="container mx-auto max-w-[1600px] flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
      <button type="button" onclick={() => scrollTo('hero')} class="flex items-center gap-3 cursor-pointer">
        <div class="flex h-12 w-12 items-center justify-center rounded-3xl text-white shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.2),-6px_-6px_12px_rgba(255,255,255,0.08)]"
          style="background: linear-gradient(135deg, {brand}, {brandDeep})">
          <School2 class="h-5 w-5" />
        </div>
        <div class="text-left">
          <p class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-900 dark:text-white">School ERP</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">Smart campus operations</p>
        </div>
      </button>

      <nav class="hidden items-center gap-8 md:flex">
        {#each navItems as item}
          <button type="button" onclick={() => scrollTo(item.id)} class="text-sm font-medium text-slate-600 transition hover:text-[#2AA889] cursor-pointer dark:text-slate-300 dark:hover:text-white">
            {item.label}
          </button>
        {/each}
      </nav>

      <div class="hidden items-center gap-3 md:flex">
        <button type="button" onclick={() => goto('/school-login')}
          class="rounded-[20px] shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] border border-white/80 bg-white/90 px-5 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 hover:shadow-[4px_4px_8px_#c8ccd1,-4px_-4px_8px_#ffffff] transition-all">
          Login
        </button>
        <button type="button" onclick={() => goto('/signup')}
          class="rounded-[20px] bg-gradient-to-br from-[#2AA889] to-[#1d7a68] px-6 py-2.5 text-sm font-semibold text-white shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] hover:scale-[1.04] transition-transform">
          Get Started
        </button>
        <button type="button" onclick={() => darkMode = !darkMode}
          class="rounded-[20px] shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] border border-white/80 bg-white/90 p-2.5 dark:border-slate-700 dark:bg-slate-900/90 transition-all hover:shadow-[4px_4px_8px_#c8ccd1,-4px_-4px_8px_#ffffff]">
          {#if darkMode}
            <Sun class="h-5 w-5 text-amber-400" />
          {:else}
            <Moon class="h-5 w-5 text-slate-600" />
          {/if}
        </button>
      </div>

      <button type="button" onclick={() => mobileMenuOpen = !mobileMenuOpen}
        class="rounded-[20px] shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] border border-white/80 bg-white/90 p-2 dark:border-slate-700 dark:bg-slate-900/90 md:hidden">
        {#if mobileMenuOpen}
          <X class="h-5 w-5 text-slate-600 dark:text-slate-200" />
        {:else}
          <Menu class="h-5 w-5 text-slate-600 dark:text-slate-200" />
        {/if}
      </button>
    </div>

    {#if mobileMenuOpen}
      <div class="border-t border-slate-200 bg-white/95 backdrop-blur-xl px-4 py-4 dark:border-slate-700 dark:bg-slate-950/95 md:hidden">
        <div class="flex flex-col gap-3">
          {#each navItems as item}
            <button type="button" onclick={() => scrollTo(item.id)}
              class="rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer">
              {item.label}
            </button>
          {/each}
          <div class="mt-2 flex items-center gap-3">
            <button type="button" onclick={() => goto('/school-login')}
              class="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              Login
            </button>
            <button type="button" onclick={() => goto('/signup')}
              class="flex-1 rounded-full bg-gradient-to-br from-[#2AA889] to-[#1d7a68] px-4 py-3 text-sm font-semibold text-white">
              Start
            </button>
          </div>
        </div>
      </div>
    {/if}
  </header>

  <main class="relative z-10">

    <!-- ── 1. HERO ── -->
    <section id="hero" class="relative overflow-hidden">
      <div class="pointer-events-none absolute inset-0 z-0">
        <div class="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#2AA889]/10 blur-3xl"></div>
        <div class="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#8b5cf6]/10 blur-3xl"></div>
        <div class="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f59e0b]/8 blur-3xl"></div>
      </div>

      <div class="container relative z-10 mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:grid lg:grid-cols-[1fr_1fr] lg:px-8 lg:py-28">
        <div use:reveal class="reveal-on-scroll max-w-2xl">
          <span class="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2AA889] shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] dark:bg-slate-900/90">
            <Star class="h-3 w-3 fill-current" />
            All-in-one school ERP
          </span>
          <h1 class="mt-8 text-5xl font-semibold leading-tight tracking-[-0.04em] text-slate-950 dark:text-white sm:text-6xl lg:text-7xl">
            All-in-One<br />
            <span class="bg-gradient-to-r from-[#2AA889] to-[#1d7a68] bg-clip-text text-transparent">School ERP</span><br />
            System
          </h1>
          <p class="mt-6 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            Manage students, fees, transport, visitors, and more — all from one beautiful, modern platform built for every school workflow.
          </p>
          <div class="mt-10 flex flex-wrap gap-4">
            <button type="button" onclick={() => goto('/signup')}
              class="inline-flex items-center gap-2 rounded-[22px] bg-gradient-to-br from-[#2AA889] to-[#1d7a68] px-7 py-4 text-sm font-semibold text-white shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] hover:scale-[1.04] transition-transform">
              Get Started Free
              <ArrowRight class="h-4 w-4" />
            </button>
            <button type="button" onclick={() => scrollTo('pricing')}
              class="inline-flex items-center gap-2 rounded-[20px] shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] border border-white/80 bg-white/90 px-7 py-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 hover:scale-[1.03] transition-transform">
              Book Demo
            </button>
          </div>

          <div class="mt-12 grid gap-4 sm:grid-cols-3">
            {#each [{ value: '35+', label: 'ERP modules' }, { value: '500+', label: 'Schools' }, { value: '99%', label: 'Uptime' }] as item}
              <div class="bg-white/90 rounded-[24px] shadow-[8px_8px_16px_#c8ccd1,-8px_-8px_16px_#ffffff] dark:bg-slate-900/90 dark:shadow-[8px_8px_16px_rgba(0,0,0,0.18),-8px_-8px_16px_rgba(255,255,255,0.06)] px-5 py-5 text-center">
                <p class="text-3xl font-semibold text-[#2AA889]">{item.value}</p>
                <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
              </div>
            {/each}
          </div>
        </div>

        <div use:reveal class="reveal-on-scroll mt-12 lg:mt-0 flex items-center justify-center">
          <!-- Hero Character -->
          <div class="relative mx-auto w-full max-w-[480px] float-anim">
            <div class="backdrop-blur-[5px] bg-white rounded-[36px] p-6 shadow-[-35px_35px_68px_0px_rgba(42,168,137,0.5),inset_5px_-5px_16px_0px_rgba(42,168,137,0.6),inset_0px_11px_28px_0px_rgb(255,255,255)] dark:bg-slate-900 dark:shadow-[-35px_35px_68px_0px_rgba(42,168,137,0.3),inset_5px_-5px_16px_0px_rgba(42,168,137,0.4)]">
              <svg viewBox="0 0 420 340" class="w-full" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <filter id="heroShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="rgba(0,0,0,0.12)" />
                  </filter>
                </defs>
                <ellipse cx="210" cy="320" rx="90" ry="10" fill="rgba(0,0,0,0.08)" />
                <rect x="165" y="160" width="90" height="80" rx="16" fill="#b3e0d4" />
                <rect x="172" y="167" width="76" height="66" rx="12" fill="#5dd4b8" opacity="0.4" />
                <ellipse cx="210" cy="200" rx="55" ry="65" fill="#2AA889" />
                <ellipse cx="200" cy="185" rx="35" ry="40" fill="#5dd4b8" opacity="0.3" />
                <ellipse cx="225" cy="220" rx="20" ry="25" fill="#1d7a68" opacity="0.3" />
                <ellipse cx="155" cy="230" rx="18" ry="45" fill="#E8B89A" transform="rotate(-20 155 230)" />
                <ellipse cx="148" cy="238" rx="14" ry="38" fill="#F4C4A0" opacity="0.5" transform="rotate(-20 148 238)" />
                <ellipse cx="265" cy="230" rx="18" ry="45" fill="#E8B89A" transform="rotate(20 265 230)" />
                <ellipse cx="272" cy="238" rx="14" ry="38" fill="#F4C4A0" opacity="0.5" transform="rotate(20 272 238)" />
                <rect x="110" y="240" width="200" height="12" rx="6" fill="#b3e0d4" />
                <rect x="110" y="240" width="200" height="6" rx="3" fill="#5dd4b8" opacity="0.5" />
                <rect x="130" y="220" width="160" height="90" rx="10" fill="#2AA889" />
                <rect x="136" y="226" width="148" height="78" rx="6" fill="#e6f6f2" />
                <rect x="146" y="240" width="80" height="6" rx="3" fill="#2AA889" opacity="0.4" />
                <rect x="146" y="252" width="50" height="6" rx="3" fill="#2AA889" opacity="0.3" />
                <rect x="146" y="264" width="65" height="6" rx="3" fill="#2AA889" opacity="0.3" />
                <rect x="146" y="276" width="40" height="6" rx="3" fill="#2AA889" opacity="0.2" />
                <rect x="195" y="130" width="30" height="25" rx="10" fill="#E8B89A" />
                <ellipse cx="210" cy="95" rx="65" ry="60" fill="#E8B89A" />
                <ellipse cx="195" cy="75" rx="40" ry="32" fill="#F4C4A0" opacity="0.5" />
                <ellipse cx="225" cy="115" rx="25" ry="20" fill="#D4957A" opacity="0.3" />
                <ellipse cx="210" cy="58" rx="60" ry="38" fill="#4A3728" />
                <ellipse cx="195" cy="50" rx="35" ry="22" fill="#6B4A38" opacity="0.6" />
                <ellipse cx="188" cy="92" rx="9" ry="10" fill="#4A3728" />
                <ellipse cx="232" cy="92" rx="9" ry="10" fill="#4A3728" />
                <circle cx="191" cy="89" r="3" fill="white" opacity="0.9" />
                <circle cx="235" cy="89" r="3" fill="white" opacity="0.9" />
                <rect x="178" y="78" width="20" height="4" rx="2" fill="#4A3728" opacity="0.7" />
                <rect x="222" y="78" width="20" height="4" rx="2" fill="#4A3728" opacity="0.7" />
                <ellipse cx="172" cy="105" rx="14" ry="9" fill="#F4A0A0" opacity="0.45" />
                <ellipse cx="248" cy="105" rx="14" ry="9" fill="#F4A0A0" opacity="0.45" />
                <path d="M198 115 Q210 125 222 115" stroke="#C47A60" stroke-width="3" stroke-linecap="round" fill="none" />
                <g filter="url(#heroShadow)">
                  <rect x="280" y="40" width="80" height="36" rx="14" fill="white" />
                  <polygon points="282,70 290,76 282,76" fill="white" />
                  <circle cx="296" cy="58" r="10" fill="#2AA889" opacity="0.2" />
                  <rect x="312" y="52" width="38" height="5" rx="2.5" fill="#2AA889" opacity="0.4" />
                  <rect x="312" y="60" width="25" height="5" rx="2.5" fill="#2AA889" opacity="0.25" />
                </g>
              </svg>
              <div class="mt-4 grid grid-cols-3 gap-3">
                {#each [{ label: 'Live Dashboard', color: brand }, { label: 'Real-time Data', color: '#8b5cf6' }, { label: 'Auto Reports', color: '#f59e0b' }] as item}
                  <div class="rounded-[14px] bg-[#f0faf7] p-3 text-center dark:bg-slate-800">
                    <p class="text-xs font-semibold" style="color: {item.color}">{item.label}</p>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Floating mini cards -->
            <div class="backdrop-blur-[5px] bg-white rounded-[20px] px-4 py-3 shadow-[-35px_35px_68px_0px_rgba(42,168,137,0.5),inset_5px_-5px_16px_0px_rgba(42,168,137,0.6),inset_0px_11px_28px_0px_rgb(255,255,255)] dark:bg-slate-900 absolute -top-4 -right-4 float-anim-mini">
              <div class="flex items-center gap-2">
                <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2AA889]/15">
                  <CheckCircle class="h-4 w-4 text-[#2AA889]" />
                </div>
                <div>
                  <p class="text-xs font-semibold text-slate-700 dark:text-white">Visitor Scanned</p>
                  <p class="text-xs text-[#2AA889] font-semibold">+1 just now</p>
                </div>
              </div>
            </div>
            <div class="backdrop-blur-[5px] bg-white rounded-[20px] px-4 py-3 shadow-[-35px_35px_68px_0px_rgba(42,168,137,0.5),inset_5px_-5px_16px_0px_rgba(42,168,137,0.6),inset_0px_11px_28px_0px_rgb(255,255,255)] dark:bg-slate-900 absolute -bottom-3 -left-4 float-anim-slow">
              <div class="flex items-center gap-2">
                <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-[#10b981]/15">
                  <CheckCircle class="h-4 w-4 text-[#10b981]" />
                </div>
                <div>
                  <p class="text-xs font-semibold text-slate-700 dark:text-white">Fee Collected</p>
                  <p class="text-xs text-[#10b981] font-semibold">₹12,400 today</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── 2. DASHBOARD PREVIEW ── -->
    <section id="modules" class="container mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div use:reveal class="reveal-on-scroll mx-auto max-w-3xl text-center">
        <span class="inline-flex rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2AA889] shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] dark:bg-slate-900/90">
          Dashboard Preview
        </span>
        <h2 class="mt-6 text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl">
          A premium interface your team will love
        </h2>
        <p class="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">
          Soft shadows, rounded cards, and clear hierarchy — designed to feel modern without sacrificing clarity.
        </p>
      </div>
      <div class="mt-12">
        <div use:reveal class="reveal-on-scroll bg-white/90 rounded-[36px] p-8 shadow-[8px_8px_16px_#c8ccd1,-8px_-8px_16px_#ffffff] dark:bg-slate-900/90 dark:shadow-[8px_8px_16px_rgba(0,0,0,0.18),-8px_-8px_16px_rgba(255,255,255,0.06)]">
          <div class="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div class="rounded-[28px] bg-gradient-to-br from-[#f0faf7] to-[#e6f6f2] p-6 dark:from-slate-800 dark:to-slate-900">
              <div class="flex items-center gap-4">
                <div class="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#2AA889] to-[#1d7a68] shadow-[4px_4px_8px_#c8ccd1,-4px_-4px_8px_#ffffff]">
                  <School2 class="h-7 w-7 text-white" />
                </div>
                <div>
                  <p class="text-lg font-semibold text-slate-800 dark:text-white">Greenfield Academy</p>
                  <p class="text-sm text-slate-500 dark:text-slate-400">Established 2005</p>
                </div>
              </div>
              <div class="mt-6 space-y-3">
                {#each [{ label: 'Admin', value: 'Rajesh Kumar' }, { label: 'Plan', value: 'Premium' }, { label: 'Students', value: '1,248' }, { label: 'Staff', value: '86' }] as item}
                  <div class="flex items-center justify-between rounded-[16px] bg-white/70 p-3 px-4 shadow-[3px_3px_6px_#c8ccd1,-3px_-3px_6px_#ffffff] dark:bg-slate-800/70">
                    <span class="text-xs text-slate-500 dark:text-slate-400">{item.label}</span>
                    <span class="text-sm font-semibold text-slate-800 dark:text-white">{item.value}</span>
                  </div>
                {/each}
              </div>
            </div>
            <div class="rounded-[28px] bg-gradient-to-br from-[#f5f7fa] to-[#eef1f5] p-6 dark:from-slate-800 dark:to-slate-900">
              <div class="flex items-center justify-between mb-4">
                <p class="text-sm font-semibold text-slate-500 dark:text-slate-400">All Modules</p>
                <span class="rounded-full bg-[#2AA889]/15 px-3 py-1 text-xs font-medium text-[#2AA889]">6 Active</span>
              </div>
              <div class="grid grid-cols-3 gap-3">
                {#each [
                  { label: 'Students', icon: Users, active: true, color: '#2AA889' },
                  { label: 'Finance', icon: Wallet, active: true, color: '#f59e0b' },
                  { label: 'Transport', icon: Bus, active: true, color: '#8b5cf6' },
                  { label: 'Library', icon: BookOpen, active: true, color: '#10b981' },
                  { label: 'Attendance', icon: Clock, active: true, color: '#3b82f6' },
                  { label: 'Hostel', icon: School2, active: false, color: '#94a3b8' },
                  { label: 'Staff', icon: GraduationCap, active: true, color: '#ec4899' },
                  { label: 'Exams', icon: FileText, active: false, color: '#94a3b8' },
                  { label: 'Reports', icon: BarChart3, active: true, color: '#f97316' },
                ] as mod}
                  {@const ModIcon = mod.icon}
                  <div class="flex flex-col items-center gap-2 rounded-[18px] p-4 transition-all {mod.active ? 'bg-white/80 shadow-[3px_3px_6px_#c8ccd1,-3px_-3px_6px_#ffffff] dark:bg-slate-800/80' : 'bg-slate-200/70 dark:bg-slate-700/50'}">
                    <div class="flex h-10 w-10 items-center justify-center rounded-2xl" style="background: {mod.color}20">
                      <ModIcon class="h-5 w-5" style="color: {mod.active ? mod.color : '#94a3b8'}" />
                    </div>
                    <span class="text-xs font-medium {mod.active ? 'text-slate-700 dark:text-white' : 'text-slate-400'}">{mod.label}</span>
                  </div>
                {/each}
              </div>
              <div class="mt-5 flex gap-3">
                {#each [{ label: 'Revenue', value: '₹5.6L', color: '#10b981' }, { label: 'Attendance', value: '94%', color: '#3b82f6' }, { label: 'Pending', value: '8', color: '#f59e0b' }] as stat}
                  <div class="flex-1 rounded-[14px] bg-white/80 p-3 text-center shadow-[2px_2px_4px_#c8ccd1,-2px_-2px_4px_#ffffff] dark:bg-slate-800/80">
                    <p class="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                    <p class="text-sm font-semibold" style="color: {stat.color}">{stat.value}</p>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── 3. FEATURES ── -->
    <section id="features" class="container mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div use:reveal class="reveal-on-scroll mx-auto max-w-3xl text-center">
        <span class="inline-flex rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2AA889] shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] dark:bg-slate-900/90">Features</span>
        <h2 class="mt-6 text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl">Everything your school needs, in one place</h2>
        <p class="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">From student profiles to transport and payroll — all modules work together seamlessly.</p>
      </div>
      <div class="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {#each features as f}
          {@const FeatureIcon = f.icon}
          <div use:reveal class="reveal-on-scroll bg-white/90 rounded-[24px] p-7 shadow-[8px_8px_16px_#c8ccd1,-8px_-8px_16px_#ffffff] dark:bg-slate-900/90 dark:shadow-[8px_8px_16px_rgba(0,0,0,0.18),-8px_-8px_16px_rgba(255,255,255,0.06)] cursor-pointer group hover:-translate-y-2 transition-transform duration-300">
            <div class="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#e6f6f2] to-[#b3e0d4] shadow-[inset_6px_6px_12px_rgba(255,255,255,0.8),inset_-6px_-6px_12px_rgba(179,224,212,0.4)] group-hover:shadow-[inset_8px_8px_16px_rgba(255,255,255,0.9)] transition-all duration-300">
              <FeatureIcon class="h-7 w-7 text-[#2AA889]" />
            </div>
            <h3 class="mt-6 text-xl font-semibold text-slate-800 dark:text-white">{f.title}</h3>
            <p class="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{f.text}</p>
          </div>
        {/each}
      </div>
    </section>

    <!-- ── 4. SPLIT: Manage Everything ── -->
    <section class="container mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div class="grid items-center gap-12 lg:grid-cols-2">
        <div use:reveal class="reveal-on-scroll">
          <div class="backdrop-blur-[5px] bg-white rounded-[30px] p-6 overflow-hidden shadow-[-35px_35px_68px_0px_rgba(42,168,137,0.5),inset_5px_-5px_16px_0px_rgba(42,168,137,0.6),inset_0px_11px_28px_0px_rgb(255,255,255)] dark:bg-slate-900">
            <img src="/feature1.png" alt="School management dashboard" class="w-full h-auto rounded-[24px] object-cover" />
          </div>
        </div>
        <div use:reveal class="reveal-on-scroll">
          <span class="inline-flex rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2AA889] shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] dark:bg-slate-900/90">Simple & Powerful</span>
          <h2 class="mt-6 text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl">Manage everything<br />easily</h2>
          <p class="mt-5 text-base leading-8 text-slate-600 dark:text-slate-300">
            Stop juggling multiple disconnected tools. Our ERP connects admissions, academics, finance, transport, and more — so your team spends less time on paperwork and more time on what matters.
          </p>
          <div class="mt-8 space-y-3">
            {#each ['Auto-attendance with smart notifications', 'Fee reminders and payment tracking', 'Visitor pass QR scanning', 'Staff payroll with leave sync'] as item}
              <div class="flex items-center gap-3">
                <div class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#2AA889]/15">
                  <CheckCircle class="h-4 w-4 text-[#2AA889]" />
                </div>
                <span class="text-sm text-slate-700 dark:text-slate-300">{item}</span>
              </div>
            {/each}
          </div>
          <button type="button" onclick={() => goto('/signup')}
            class="mt-8 inline-flex items-center gap-2 rounded-[20px] bg-gradient-to-br from-[#2AA889] to-[#1d7a68] px-7 py-4 text-sm font-semibold text-white shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] hover:scale-[1.04] transition-transform">
            Start Free Trial <ArrowRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>

    <!-- ── 5. VISITOR MANAGEMENT ── -->
    <section class="container mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div use:reveal class="reveal-on-scroll">
        <div class="relative overflow-hidden rounded-[36px] border border-[#2AA889]/20 bg-gradient-to-br from-[#0e3d32] to-[#1a2e28] p-10 shadow-[12px_12px_24px_rgba(0,0,0,0.25),-12px_-12px_24px_rgba(255,255,255,0.05)] hover:scale-[1.01] transition-transform duration-300">
          <div class="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-[#2AA889]/20 blur-3xl"></div>
          <div class="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#2AA889]/10 blur-3xl"></div>
          <div class="relative z-10 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <div class="inline-flex items-center gap-2 rounded-full bg-[#2AA889]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2AA889]">
                <IdCard class="h-3 w-3" />
                Featured Module
              </div>
              <h2 class="mt-6 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">Visitor Management System</h2>
              <p class="mt-5 text-base leading-8 text-slate-300">
                Generate digital visitor passes, scan arrivals with QR codes, track check-in/check-out times, and maintain a full visitor log.
              </p>
              <div class="mt-8 space-y-3">
                {#each ['Instant digital visitor pass generation', 'QR code check-in & check-out', 'Full visitor history & reports', 'Auto-notify host staff on arrival'] as item}
                  <div class="flex items-center gap-3">
                    <div class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#2AA889]/25">
                      <CheckCircle class="h-4 w-4 text-[#2AA889]" />
                    </div>
                    <span class="text-sm text-slate-200">{item}</span>
                  </div>
                {/each}
              </div>
              <button type="button" onclick={() => goto('/signup')}
                class="mt-8 inline-flex items-center gap-2 rounded-[20px] bg-gradient-to-br from-[#2AA889] to-[#239C7F] px-7 py-4 text-sm font-semibold text-white shadow-[6px_6px_12px_rgba(0,0,0,0.3)] hover:scale-[1.04] transition-transform">
                Try It Free <ChevronRight class="h-4 w-4" />
              </button>
            </div>
            <div class="flex items-center justify-center">
              <img src="/feature2.webp" alt="Visitor management system" class="max-w-full h-auto rounded-[24px] object-cover shadow-xl" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── 6. HOW IT WORKS ── -->
    <section id="how-it-works" class="container mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div use:reveal class="reveal-on-scroll mx-auto max-w-3xl text-center">
        <span class="inline-flex rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2AA889] shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] dark:bg-slate-900/90">How It Works</span>
        <h2 class="mt-6 text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl">From setup to automation in 4 steps</h2>
        <p class="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">A simple rollout path that helps schools centralize data and automate operations progressively.</p>
      </div>
      <div class="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {#each steps as s}
          <div use:reveal class="reveal-on-scroll bg-white/90 rounded-[26px] p-7 text-center shadow-[8px_8px_16px_#c8ccd1,-8px_-8px_16px_#ffffff] dark:bg-slate-900/90 dark:shadow-[8px_8px_16px_rgba(0,0,0,0.18),-8px_-8px_16px_rgba(255,255,255,0.06)] hover:-translate-y-2 transition-transform duration-300">
            <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#2AA889] to-[#1d7a68] text-xl font-bold text-white shadow-[4px_4px_8px_#c8ccd1,-4px_-4px_8px_#ffffff]">
              {s.num}
            </div>
            <h3 class="mt-5 text-lg font-semibold text-slate-800 dark:text-white">{s.title}</h3>
            <p class="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{s.desc}</p>
          </div>
        {/each}
      </div>
    </section>

    <!-- ── 7. TESTIMONIALS ── -->
    <section class="container mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div use:reveal class="reveal-on-scroll mx-auto max-w-3xl text-center">
        <span class="inline-flex rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2AA889] shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] dark:bg-slate-900/90">Testimonials</span>
        <h2 class="mt-6 text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl">Trusted by school leaders</h2>
      </div>
      <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <span class="text-xs text-slate-400 font-medium">Trusted by:</span>
        {#each trustedBy as school}
          <span class="bg-white/90 rounded-full px-4 py-1.5 text-xs font-medium text-slate-600 shadow-[8px_8px_16px_#c8ccd1,-8px_-8px_16px_#ffffff] dark:bg-slate-900/90 dark:text-slate-300">{school}</span>
        {/each}
      </div>
      <div class="mt-10 grid gap-6 md:grid-cols-3">
        {#each testimonials as t}
          <div use:reveal class="reveal-on-scroll bg-white/90 rounded-[26px] p-7 shadow-[8px_8px_16px_#c8ccd1,-8px_-8px_16px_#ffffff] dark:bg-slate-900/90 dark:shadow-[8px_8px_16px_rgba(0,0,0,0.18)] hover:-translate-y-2 transition-transform duration-300">
            <div class="flex items-center gap-3 mb-5">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl text-white font-bold text-sm"
                style="background: linear-gradient(135deg, {t.color}, {t.color}88)">
                {t.avatar}
              </div>
              <div>
                <p class="font-semibold text-slate-800 dark:text-white">{t.name}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">{t.role} • {t.school}</p>
              </div>
            </div>
            <div class="flex gap-1 mb-4">
              {#each [1,2,3,4,5] as _}
                <Star class="h-3.5 w-3.5 fill-current text-amber-400" />
              {/each}
            </div>
            <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-400">"{t.text}"</p>
          </div>
        {/each}
      </div>
    </section>

    <!-- ── 8. FAQ ── -->
    <section id="faq" class="container mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div use:reveal class="reveal-on-scroll mx-auto max-w-3xl text-center">
        <span class="inline-flex rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2AA889] shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] dark:bg-slate-900/90">FAQ</span>
        <h2 class="mt-6 text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl">Got questions? We've got answers.</h2>
      </div>
      <div class="mx-auto mt-12 max-w-3xl space-y-3">
        {#each faqs as faq, i}
          <div class="bg-white/90 rounded-[20px] overflow-hidden shadow-[8px_8px_16px_#c8ccd1,-8px_-8px_16px_#ffffff] dark:bg-slate-900/90 dark:shadow-[8px_8px_16px_rgba(0,0,0,0.18)]">
            <button type="button" onclick={() => openFaq = openFaq === i ? null : i}
              class="flex w-full items-center justify-between p-6 text-left cursor-pointer">
              <span class="pr-4 text-base font-semibold text-slate-800 dark:text-white">{faq.q}</span>
              <ChevronDown class="h-5 w-5 flex-shrink-0 text-[#2AA889] transition-transform duration-300 {openFaq === i ? 'rotate-180' : ''}" />
            </button>
            {#if openFaq === i}
              <div class="px-6 pb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{faq.a}</div>
            {/if}
          </div>
        {/each}
      </div>
    </section>

    <!-- ── 9. PRICING ── -->
    <section id="pricing" class="container mx-auto max-w-[1600px] px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div use:reveal class="reveal-on-scroll mx-auto max-w-3xl text-center">
        <span class="inline-flex rounded-full bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2AA889] shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] dark:bg-slate-900/90">Pricing</span>
        <h2 class="mt-6 text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl">Transparent pricing, no hidden fees</h2>
        <p class="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">Choose the plan that fits your school. Upgrade or cancel anytime.</p>
      </div>
      <div class="mt-12 grid gap-6 lg:grid-cols-3">
        {#each pricing as plan}
          <div use:reveal class="reveal-on-scroll">
            <div class="relative overflow-hidden rounded-[30px] p-8 hover:-translate-y-2 transition-transform duration-300 {plan.featured ? 'bg-gradient-to-br from-[#2AA889] to-[#1d7a68] text-white shadow-[12px_12px_24px_rgba(42,168,137,0.35),-12px_-12px_24px_rgba(255,255,255,0.1)]' : 'bg-white/90 shadow-[8px_8px_16px_#c8ccd1,-8px_-8px_16px_#ffffff] dark:bg-slate-900/90'}">
              {#if plan.featured}
                <div class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                  Most Popular
                </div>
              {/if}
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-sm font-semibold uppercase tracking-[0.16em] {plan.featured ? 'text-white/75' : 'text-slate-500 dark:text-slate-400'}">{plan.name}</p>
                  <p class="mt-5 text-4xl font-semibold tracking-[-0.05em] {plan.featured ? 'text-white' : 'text-slate-950 dark:text-white'}">{plan.price}</p>
                  <p class="text-sm {plan.featured ? 'text-white/70' : 'text-slate-400'}">{plan.period}</p>
                </div>
                <div class="rounded-2xl px-3 py-1.5 text-xs font-semibold {plan.featured ? 'bg-white/20 text-white' : 'bg-[#2AA889]/10 text-[#2AA889]'}">{plan.badge}</div>
              </div>
              <p class="mt-3 text-sm {plan.featured ? 'text-white/85' : 'text-slate-600 dark:text-slate-400'}">{plan.note}</p>
              <div class="my-5 h-px {plan.featured ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}"></div>
              <p class="text-xs font-semibold uppercase tracking-[0.12em] mb-3 {plan.featured ? 'text-white/60' : 'text-slate-500 dark:text-slate-400'}">{plan.highlight}</p>
              <div class="space-y-2.5">
                {#each plan.points as point}
                  <div class="flex items-center gap-3">
                    <div class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full {point.included ? (plan.featured ? 'bg-white/20' : 'bg-[#2AA889]/15') : 'bg-slate-100 dark:bg-slate-800'}">
                      {#if point.included}
                        <ShieldCheck class="h-3.5 w-3.5" style="color: {plan.featured ? 'white' : brand}" />
                      {:else}
                        <X class="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                      {/if}
                    </div>
                    <span class="text-sm {point.included ? (plan.featured ? 'text-white/90' : 'text-slate-700 dark:text-slate-300') : (plan.featured ? 'text-white/40' : 'text-slate-400')}">{point.text}</span>
                  </div>
                {/each}
              </div>
              <button type="button" onclick={() => goto('/signup')}
                class="mt-8 w-full rounded-full py-3.5 text-sm font-semibold transition-all hover:scale-[1.03] {plan.featured ? 'bg-white text-[#2AA889] shadow-[4px_4px_8px_rgba(0,0,0,0.15)]' : 'bg-gradient-to-br from-[#2AA889] to-[#1d7a68] text-white'}">
                Choose {plan.name}
              </button>
              <p class="mt-3 text-center text-xs {plan.featured ? 'text-white/60' : 'text-slate-400'}">14-day free trial • No credit card</p>
            </div>
          </div>
        {/each}
      </div>
      <div class="mt-10 text-center">
        <p class="text-sm text-slate-500 dark:text-slate-400">
          All prices in INR, excluding GST. Need a custom quote?
          <button type="button" onclick={() => scrollTo('cta')} class="text-[#2AA889] font-medium hover:underline ml-1">Contact sales</button>
        </p>
      </div>
    </section>

    <!-- ── 10. CTA ── -->
    <section id="cta" class="container mx-auto max-w-[1600px] px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-28">
      <div use:reveal class="reveal-on-scroll">
        <div class="backdrop-blur-[5px] bg-white rounded-[36px] border border-[#2AA889]/10 p-14 shadow-[-35px_35px_68px_0px_rgba(42,168,137,0.5),inset_5px_-5px_16px_0px_rgba(42,168,137,0.6),inset_0px_11px_28px_0px_rgb(255,255,255)] dark:bg-slate-900 relative overflow-hidden">
          <div class="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-[#2AA889]/20 blur-3xl"></div>
          <div class="relative z-10 flex flex-col lg:flex-row items-center justify-center gap-8">
            <div class="flex-1 text-center lg:text-left">
              <h2 class="text-4xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl">
                Start Managing Your School Smarter
              </h2>
              <p class="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300 lg:mx-0">
                Replace scattered tools with one premium ERP designed for school leaders, admin staff, and educators.
              </p>
            </div>
            <div class="flex items-center gap-6">
              <button type="button" onclick={() => goto('/signup')}
                class="inline-flex items-center gap-2 rounded-[22px] bg-gradient-to-br from-[#2AA889] to-[#1d7a68] px-10 py-5 text-base font-semibold text-white shadow-[8px_8px_16px_#c8ccd1,-8px_-8px_16px_#ffffff] hover:scale-[1.05] transition-transform">
                Get Started Free <ArrowRight class="h-5 w-5" />
              </button>
              <img src="/feature4.png" alt="" class="h-32 w-auto object-contain hidden lg:block" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── FOOTER ── -->
    <footer class="border-t border-white/80 bg-white/90 dark:border-slate-800 dark:bg-slate-950/90">
      <div class="container mx-auto max-w-[1600px] px-4 py-14 sm:px-6 lg:px-8">
        <div class="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div class="lg:col-span-1">
            <div class="flex items-center gap-3 mb-4">
              <div class="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-[4px_4px_8px_#c8ccd1,-4px_-4px_8px_#ffffff]"
                style="background: linear-gradient(135deg, {brand}, {brandDeep})">
                <School2 class="h-5 w-5" />
              </div>
              <div>
                <p class="font-semibold text-slate-900 dark:text-white">School ERP</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">Smart campus operations</p>
              </div>
            </div>
            <p class="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
              The all-in-one platform trusted by 500+ schools across India for managing admissions, fees, transport, visitors, and more.
            </p>
            <div class="flex items-center gap-3 mt-5">
              {#each [{ icon: Globe, label: 'Website' }, { icon: Twitter, label: 'Twitter' }, { icon: Linkedin, label: 'LinkedIn' }, { icon: Youtube, label: 'YouTube' }] as social}
                {@const SocialIcon = social.icon}
                <button type="button" aria-label={social.label}
                  class="flex h-10 w-10 items-center justify-center rounded-xl border border-white/80 bg-white/90 text-slate-500 shadow-[6px_6px_12px_#c8ccd1,-6px_-6px_12px_#ffffff] hover:-translate-y-0.5 transition-transform dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300">
                  <SocialIcon class="h-4 w-4" />
                </button>
              {/each}
            </div>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-[0.12em]">Product</h4>
            <ul class="space-y-3">
              {#each ['Features', 'Modules', 'Pricing', 'Updates', 'Roadmap'] as item}
                <li>
                  <button type="button" onclick={() => scrollTo(item === 'Features' ? 'features' : item === 'Modules' ? 'modules' : item === 'Pricing' ? 'pricing' : 'hero')}
                    class="text-sm text-slate-500 dark:text-slate-400 hover:text-[#2AA889] transition-colors cursor-pointer">{item}</button>
                </li>
              {/each}
            </ul>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-[0.12em]">Company</h4>
            <ul class="space-y-3">
              {#each ['About Us', 'Blog', 'Careers', 'Press Kit', 'Partners'] as item}
                <li><button type="button" class="text-sm text-slate-500 dark:text-slate-400 hover:text-[#2AA889] transition-colors">{item}</button></li>
              {/each}
            </ul>
          </div>

          <div>
            <h4 class="text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-[0.12em]">Support</h4>
            <ul class="space-y-3 mb-6">
              {#each ['Help Center', 'Documentation', 'API Reference', 'Status Page', 'Community'] as item}
                <li><button type="button" class="text-sm text-slate-500 dark:text-slate-400 hover:text-[#2AA889] transition-colors">{item}</button></li>
              {/each}
            </ul>
            <h4 class="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-[0.12em]">Contact</h4>
            <ul class="space-y-2.5">
              {#each [{ icon: Mail, text: 'hello@schoolerp.in' }, { icon: Phone, text: '+91 98765 43210' }, { icon: MapPin, text: 'Bangalore, India' }] as c}
                {@const ContactIcon = c.icon}
                <li class="flex items-center gap-2">
                  <ContactIcon class="h-3.5 w-3.5 text-[#2AA889] flex-shrink-0" />
                  <span class="text-sm text-slate-500 dark:text-slate-400">{c.text}</span>
                </li>
              {/each}
            </ul>
          </div>
        </div>

        <div class="mt-12 border-t border-slate-200/60 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex flex-wrap items-center gap-1 text-xs text-slate-400">
            <span>© 2026 School ERP. All rights reserved.</span>
            <span class="text-slate-300 dark:text-slate-700">•</span>
            {#each ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Sitemap'] as item}
              <button type="button" class="hover:text-[#2AA889] transition-colors">{item}</button>
            {/each}
          </div>
          <div class="flex items-center gap-2">
            <div class="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
            <span class="text-xs text-slate-400">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>

  </main>
</div>

<style>
  .reveal-on-scroll {
    opacity: 0;
    transform: translateY(32px);
    transition: opacity 0.7s ease-out, transform 0.7s ease-out;
  }
  :global(.reveal-on-scroll.revealed) {
    opacity: 1;
    transform: translateY(0);
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-14px); }
  }
  @keyframes floatMini {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  @keyframes floatSlow {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(8px); }
  }
  .float-anim { animation: float 4.5s ease-in-out infinite; }
  .float-anim-mini { animation: floatMini 3.5s ease-in-out infinite 0.5s; }
  .float-anim-slow { animation: floatSlow 3.8s ease-in-out infinite 1s; }
</style>
