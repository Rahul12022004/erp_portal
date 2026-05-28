<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  // ─── Types ─────────────────────────────────────────────────────────────────

  type AnnouncementAudience = 'All' | 'Students' | 'Teachers' | 'Parents' | 'Staff';
  type AnnouncementPriority = 'Normal' | 'Important' | 'Urgent';
  type AnnouncementStatus = 'Draft' | 'Published';
  type AnnouncementFilter = 'All' | 'Draft' | 'Published' | 'Pinned';

  type AnnouncementItem = {
    id: string;
    title: string;
    message: string;
    audience: AnnouncementAudience;
    priority: AnnouncementPriority;
    status: AnnouncementStatus;
    publishDate: string;
    isPinned: boolean;
    createdAt: string;
  };

  type AnnouncementFormValues = {
    title: string;
    message: string;
    audience: AnnouncementAudience;
    priority: AnnouncementPriority;
    status: AnnouncementStatus;
    publishDate: string;
    isPinned: boolean;
  };

  type ChannelKey = 'APP' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'FACEBOOK' | 'INSTAGRAM' | 'WEBSITE';

  type CommunicationStats = {
    activeCampaigns: number;
    scheduledCount: number;
    whatsappSends24h: number;
    emailSmsSentWeek: number;
  };

  type CampaignChannel = { channel: ChannelKey; isEnabled: boolean };

  type Campaign = {
    id: string;
    title: string;
    subtitle?: string;
    channels: CampaignChannel[];
    audienceLabel: string;
    status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'CANCELLED';
    scheduledAt?: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH';
    approvalStatus: 'NONE' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
    ownerName: string;
  };

  type CampaignFormState = {
    title: string;
    internalNote: string;
    publicCaption: string;
    messageBody: string;
    channels: ChannelKey[];
    audience: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH';
    scheduleEnabled: boolean;
    scheduledAt: string;
    approvalRequired: boolean;
  };

  type MessageTemplate = {
    _id: string;
    name: string;
    subject?: string;
    body: string;
    category: string;
  };

  type TemplateFormState = {
    name: string;
    subject: string;
    body: string;
    category: string;
  };

  type ActiveTab = 'announcements' | 'campaigns' | 'calendar' | 'templates';

  type BackendAnnouncement = {
    // Go backend (PascalCase)
    ID?: string;
    Title?: string;
    Message?: string;
    Author?: string;
    CreatedAt?: string;
    // legacy camelCase
    _id?: string;
    title?: string;
    message?: string;
    author?: string;
    createdAt?: string;
  };

  type AnnouncementMetaRecord = {
    audience: AnnouncementAudience;
    priority: AnnouncementPriority;
    publishDate: string;
    isPinned: boolean;
  };

  // ─── Constants ──────────────────────────────────────────────────────────────

  const AUDIENCE_OPTIONS: AnnouncementAudience[] = ['All', 'Students', 'Teachers', 'Parents', 'Staff'];
  const PRIORITY_OPTIONS: AnnouncementPriority[] = ['Normal', 'Important', 'Urgent'];
  const STATUS_OPTIONS: AnnouncementStatus[] = ['Draft', 'Published'];
  const FILTER_OPTIONS: AnnouncementFilter[] = ['All', 'Draft', 'Published', 'Pinned'];

  const CAMPAIGN_AUDIENCE_OPTIONS = ['All', 'Parents', 'Students', 'Teachers', 'Staff'];

  const ALL_CHANNELS: { key: ChannelKey; label: string }[] = [
    { key: 'APP', label: 'In-App' },
    { key: 'EMAIL', label: 'Email' },
    { key: 'SMS', label: 'SMS' },
    { key: 'WHATSAPP', label: 'WhatsApp' },
    { key: 'FACEBOOK', label: 'Facebook' },
    { key: 'INSTAGRAM', label: 'Instagram' },
    { key: 'WEBSITE', label: 'Website' },
  ];

  const ALL_CHANNEL_KEYS: ChannelKey[] = ALL_CHANNELS.map((c) => c.key);

  const CONNECTED_CHANNELS: { key: ChannelKey; label: string; connected: boolean }[] = [
    { key: 'APP', label: 'In-App', connected: true },
    { key: 'EMAIL', label: 'Email', connected: true },
    { key: 'SMS', label: 'SMS', connected: false },
    { key: 'WHATSAPP', label: 'WhatsApp', connected: false },
    { key: 'FACEBOOK', label: 'Facebook', connected: false },
    { key: 'INSTAGRAM', label: 'Instagram', connected: false },
  ];

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const CHANNEL_COLOR: Record<ChannelKey, string> = {
    APP:       'bg-blue-100 text-blue-700',
    EMAIL:     'bg-purple-100 text-purple-700',
    SMS:       'bg-green-100 text-green-700',
    WHATSAPP:  'bg-emerald-100 text-emerald-700',
    FACEBOOK:  'bg-blue-100 text-blue-600',
    INSTAGRAM: 'bg-pink-100 text-pink-600',
    WEBSITE:   'bg-cyan-100 text-cyan-700',
  };

  const CHANNEL_LABEL: Record<ChannelKey, string> = {
    APP: 'In-App', EMAIL: 'Email', SMS: 'SMS',
    WHATSAPP: 'WhatsApp', FACEBOOK: 'Facebook',
    INSTAGRAM: 'Instagram', WEBSITE: 'Website',
  };

  const PRIORITY_COLOR: Record<'LOW' | 'NORMAL' | 'HIGH', string> = {
    LOW:    'bg-slate-100 text-slate-600',
    NORMAL: 'bg-sky-100 text-sky-700',
    HIGH:   'bg-orange-100 text-orange-700',
  };

  const STATUS_COLOR: Record<Campaign['status'], string> = {
    SCHEDULED: 'bg-amber-100 text-amber-700',
    SENT:      'bg-green-100 text-green-700',
    DRAFT:     'bg-slate-100 text-slate-600',
    CANCELLED: 'bg-red-100 text-red-600',
  };

  const AUDIENCE_BADGE: Record<AnnouncementAudience, string> = {
    All:      'border-slate-200 bg-slate-50 text-slate-700',
    Students: 'border-sky-200 bg-sky-50 text-sky-700',
    Teachers: 'border-violet-200 bg-violet-50 text-violet-700',
    Parents:  'border-emerald-200 bg-emerald-50 text-emerald-700',
    Staff:    'border-amber-200 bg-amber-50 text-amber-700',
  };

  const PRIORITY_BADGE: Record<AnnouncementPriority, string> = {
    Normal:    'border-slate-200 bg-slate-50 text-slate-700',
    Important: 'border-orange-200 bg-orange-50 text-orange-700',
    Urgent:    'border-rose-200 bg-rose-50 text-rose-700',
  };

  const STATUS_BADGE: Record<AnnouncementStatus, string> = {
    Draft:     'border-dashed border-slate-300 bg-slate-100 text-slate-700',
    Published: 'border-emerald-200 bg-emerald-100 text-emerald-700',
  };

  // ─── schoolId ──────────────────────────────────────────────────────────────

  const schoolId = $derived($page.data.user?.schoolId ?? '');
  const schoolName = $derived($page.data.user?.schoolName ?? 'School');
  const authorName = $derived($page.data.user?.name ?? 'School Administration');

  // ─── LocalStorage helpers ──────────────────────────────────────────────────

  function metaKey(sid: string) { return `school-communication-meta:${sid}`; }
  function draftsKey(sid: string) { return `school-communication-drafts:${sid}`; }

  function loadMeta(sid: string): Record<string, AnnouncementMetaRecord> {
    try { const r = localStorage.getItem(metaKey(sid)); return r ? JSON.parse(r) : {}; } catch { return {}; }
  }
  function saveMeta(sid: string, v: Record<string, AnnouncementMetaRecord>) {
    localStorage.setItem(metaKey(sid), JSON.stringify(v));
  }
  function loadDrafts(sid: string): AnnouncementItem[] {
    try { const r = localStorage.getItem(draftsKey(sid)); return r ? JSON.parse(r) : []; } catch { return []; }
  }
  function saveDrafts(sid: string, v: AnnouncementItem[]) {
    localStorage.setItem(draftsKey(sid), JSON.stringify(v));
  }

  function sortItems(items: AnnouncementItem[]): AnnouncementItem[] {
    return [...items].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return Number(b.isPinned) - Number(a.isPinned);
      return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
    });
  }

  function isDraft(id: string) { return id.startsWith('draft-'); }

  function newId() {
    return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ann-${Date.now()}`;
  }
  function newDraftId() { return `draft-${newId()}`; }

  function mapBackend(a: BackendAnnouncement, meta: Record<string, AnnouncementMetaRecord>): AnnouncementItem {
    const id = a.ID ?? a._id ?? '';
    const createdAt = String(a.CreatedAt ?? a.createdAt ?? '');
    const m = meta[id];
    return {
      id,
      title:    a.Title ?? a.title ?? '',
      message:  a.Message ?? a.message ?? '',
      audience: m?.audience ?? 'All',
      priority: m?.priority ?? 'Normal',
      status: 'Published',
      publishDate: m?.publishDate ?? (createdAt ? new Date(createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
      isPinned: m?.isPinned ?? false,
      createdAt,
    };
  }

  function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const m = typeof document !== 'undefined' && document.cookie.match(/(?:^|;\s*)client_token=([^;]*)/);
    const token = m ? decodeURIComponent(m[1]) : null;
    return fetch(url, {
      ...init,
      headers: { ...(init.headers as Record<string, string> ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  }

  function normalizeCampaign(raw: Record<string, unknown>): Campaign {
    const rawStatus = String(raw.Status ?? raw.status ?? 'draft').toUpperCase();
    const validStatuses: Campaign['status'][] = ['DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED'];
    const status = validStatuses.includes(rawStatus as Campaign['status']) ? rawStatus as Campaign['status'] : 'DRAFT';
    return {
      id:             String(raw.ID ?? raw.id ?? ''),
      title:          String(raw.Title ?? raw.title ?? ''),
      audienceLabel:  String(raw.TargetType ?? raw.targetType ?? raw.audienceLabel ?? 'All'),
      channels:       [],
      status,
      priority:       'NORMAL',
      approvalStatus: 'NONE',
      ownerName:      '',
    };
  }

  function metaFromItem(a: AnnouncementItem): AnnouncementMetaRecord {
    return { audience: a.audience, priority: a.priority, publishDate: a.publishDate, isPinned: a.isPinned };
  }

  function createDefaultAnnForm(): AnnouncementFormValues {
    return {
      title: '', message: '', audience: 'All', priority: 'Normal',
      status: 'Draft', publishDate: new Date().toISOString().slice(0, 10), isPinned: false,
    };
  }

  function defaultCampaignForm(): CampaignFormState {
    return {
      title: '', internalNote: '', publicCaption: '', messageBody: '',
      channels: [...ALL_CHANNEL_KEYS], audience: 'All', priority: 'NORMAL',
      scheduleEnabled: false, scheduledAt: '', approvalRequired: false,
    };
  }

  function defaultTemplateForm(): TemplateFormState {
    return { name: '', subject: '', body: '', category: 'General' };
  }

  function getMessagePreview(message: string) {
    return message.length > 170 ? `${message.slice(0, 167)}...` : message;
  }

  // ─── Tab state ──────────────────────────────────────────────────────────────

  let activeTab = $state<ActiveTab>('announcements');

  // ─── Communication stats + campaigns state ──────────────────────────────────

  let stats = $state<CommunicationStats | null>(null);
  let campaigns = $state<Campaign[]>([]);
  let commLoading = $state(true);
  let commError = $state('');

  // ─── Campaign form state ────────────────────────────────────────────────────

  let form = $state<CampaignFormState>(defaultCampaignForm());
  let campaignSaving = $state(false);
  let campaignError = $state('');

  // ─── Announcements state ────────────────────────────────────────────────────

  let announcements = $state<AnnouncementItem[]>([]);
  let annForm = $state<AnnouncementFormValues>(createDefaultAnnForm());
  let annLoading = $state(true);
  let annSaving = $state(false);
  let annError = $state('');
  let searchQuery = $state('');
  let activeFilter = $state<AnnouncementFilter>('All');

  // ─── Announcement form AI state ─────────────────────────────────────────────

  let aiLoading = $state(false);
  let aiError = $state('');

  // ─── Templates state ────────────────────────────────────────────────────────

  let templates = $state<MessageTemplate[]>([]);
  let templatesLoading = $state(false);
  let templateForm = $state<TemplateFormState>(defaultTemplateForm());
  let templateSaving = $state(false);
  let templateError = $state('');

  // ─── Calendar state ─────────────────────────────────────────────────────────

  const todayDate = new Date();
  let calViewYear = $state(todayDate.getFullYear());
  let calViewMonth = $state(todayDate.getMonth());
  let calSelected = $state<string | null>(null);

  // ─── Derived ────────────────────────────────────────────────────────────────

  const filteredAnnouncements = $derived.by(() => {
    const q = searchQuery.trim().toLowerCase();
    return sortItems(announcements).filter((a) => {
      const matchSearch = !q || a.title.toLowerCase().includes(q) || a.message.toLowerCase().includes(q);
      const matchFilter =
        activeFilter === 'All' ||
        (activeFilter === 'Pinned' && a.isPinned) ||
        (activeFilter === 'Draft' && a.status === 'Draft') ||
        (activeFilter === 'Published' && a.status === 'Published');
      return matchSearch && matchFilter;
    });
  });

  const publishedCount = $derived(announcements.filter((a) => a.status === 'Published').length);
  const draftCount = $derived(announcements.filter((a) => a.status === 'Draft').length);
  const pinnedCount = $derived(announcements.filter((a) => a.isPinned).length);
  const canSubmitAnn = $derived(!annSaving && annForm.title.trim().length > 0 && annForm.message.trim().length > 0);

  const calCampaignsByDate = $derived.by(() => {
    const scheduled = campaigns.filter((c) => c.scheduledAt);
    return scheduled.reduce<Record<string, Campaign[]>>((acc, c) => {
      const d = new Date(c.scheduledAt!);
      if (d.getFullYear() === calViewYear && d.getMonth() === calViewMonth) {
        const key = d.getDate().toString();
        if (!acc[key]) acc[key] = [];
        acc[key].push(c);
      }
      return acc;
    }, {});
  });

  const calCells = $derived.by((): (number | null)[] => {
    const firstDay = new Date(calViewYear, calViewMonth, 1).getDay();
    const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
    return [
      ...Array<null>(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
  });

  const calSelectedCampaigns = $derived(calSelected ? (calCampaignsByDate[calSelected] ?? []) : []);
  const calHasScheduled = $derived(campaigns.some((c) => c.scheduledAt));

  // ─── Data fetchers ───────────────────────────────────────────────────────────

  async function fetchComm() {
    commLoading = true;
    commError = '';
    try {
      const campaignsRes = await authedFetch(`/api/campaigns?schoolId=${schoolId}`);
      if (!campaignsRes.ok) throw new Error('Failed to load campaigns');
      const campaignsData = await campaignsRes.json();
      const rawCampaigns: Record<string, unknown>[] = Array.isArray(campaignsData?.data) ? campaignsData.data : [];
      campaigns = rawCampaigns.map(normalizeCampaign);
      stats = {
        activeCampaigns:  rawCampaigns.filter((c) => String(c.Status ?? c.status).toLowerCase() === 'sent').length,
        scheduledCount:   rawCampaigns.filter((c) => String(c.Status ?? c.status).toLowerCase() === 'scheduled').length,
        whatsappSends24h: 0,
        emailSmsSentWeek: 0,
      };
    } catch (err) {
      commError = err instanceof Error ? err.message : 'Failed to load data';
    } finally {
      commLoading = false;
    }
  }

  async function fetchAnnouncements() {
    if (!schoolId) { annLoading = false; return; }
    annLoading = true;
    annError = '';
    try {
      const res = await authedFetch(`/api/announcements?schoolId=${schoolId}`);
      if (!res.ok) throw new Error(`Failed to load announcements (${res.status})`);
      const data = await res.json().catch(() => null);
      const meta = loadMeta(schoolId);
      // Go wraps in { success, data: [...] }; fall back to plain array for legacy
      const rawList: BackendAnnouncement[] = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      const published = rawList.map((a) => mapBackend(a, meta));
      announcements = sortItems([...published, ...loadDrafts(schoolId)]);
    } catch {
      announcements = sortItems(loadDrafts(schoolId));
    } finally {
      annLoading = false;
    }
  }

  async function fetchTemplates() {
    // No backend endpoint for templates — use local state only
    templatesLoading = false;
  }

  onMount(() => {
    fetchComm();
    fetchAnnouncements();
    fetchTemplates();

    const handler = () => fetchAnnouncements();
    window.addEventListener('announcements-updated', handler);
    return () => window.removeEventListener('announcements-updated', handler);
  });

  // ─── Campaign handlers ───────────────────────────────────────────────────────

  function toggleChannel(ch: ChannelKey) {
    if (form.channels.includes(ch)) {
      form.channels = form.channels.filter((c) => c !== ch);
    } else {
      form.channels = [...form.channels, ch];
    }
  }

  function toggleAllChannels() {
    if (form.channels.length === ALL_CHANNEL_KEYS.length) {
      form.channels = [];
    } else {
      form.channels = [...ALL_CHANNEL_KEYS];
    }
  }

  async function submitCampaign(intent: 'DRAFT' | 'SEND') {
    if (!form.title.trim() || !form.messageBody.trim()) {
      campaignError = 'Campaign title and message body are required.';
      return;
    }
    campaignSaving = true;
    campaignError = '';
    try {
      const status =
        intent === 'SEND' && form.scheduleEnabled ? 'SCHEDULED'
        : intent === 'SEND' ? 'SENT'
        : 'DRAFT';

      const res = await authedFetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          message: form.messageBody,
          targetType: form.audience !== 'All' ? form.audience.toLowerCase() : 'all',
          status: status.toLowerCase(),
          schoolId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message ?? 'Failed to save campaign');
      campaigns = [normalizeCampaign(data.data as Record<string, unknown>), ...campaigns];
      if (stats) {
        stats = {
          ...stats,
          activeCampaigns: stats.activeCampaigns + 1,
          scheduledCount: status === 'SCHEDULED' ? stats.scheduledCount + 1 : stats.scheduledCount,
        };
      }
      form = defaultCampaignForm();
    } catch (err) {
      campaignError = err instanceof Error ? err.message : 'Failed to save campaign';
    } finally {
      campaignSaving = false;
    }
  }

  async function handleDeleteCampaign(id: string) {
    campaigns = campaigns.filter((c) => c.id !== id);
  }

  // ─── Announcement handlers ───────────────────────────────────────────────────

  async function handleAiDraft() {
    aiLoading = true;
    aiError = 'AI draft is not available yet.';
    aiLoading = false;
  }

  async function handleCreateAnnouncement() {
    if (!annForm.title.trim() || !annForm.message.trim() || !schoolId) return;
    const base: AnnouncementItem = {
      id: newId(), title: annForm.title.trim(), message: annForm.message.trim(),
      audience: annForm.audience, priority: annForm.priority, status: annForm.status,
      publishDate: annForm.publishDate, isPinned: annForm.isPinned,
      createdAt: new Date().toISOString(),
    };
    annSaving = true;
    annError = '';
    try {
      if (annForm.status === 'Draft') {
        const draft = { ...base, id: newDraftId(), status: 'Draft' as const };
        saveDrafts(schoolId, sortItems([...loadDrafts(schoolId), draft]));
        announcements = sortItems([...announcements, draft]);
      } else {
        const res = await authedFetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: base.title, message: base.message, author: authorName, schoolId }),
        });
        const data = await res.json().catch(() => null);
        const annData = data?.data as BackendAnnouncement | undefined;
        const annId = annData?.ID ?? annData?._id;
        if (!res.ok || !data?.success || !annId)
          throw new Error(data?.message ?? 'Failed to create announcement');
        const meta = loadMeta(schoolId);
        meta[String(annId)] = metaFromItem({ ...base, id: String(annId), status: 'Published' });
        saveMeta(schoolId, meta);
        announcements = sortItems([mapBackend(annData!, meta), ...announcements]);
        window.dispatchEvent(new Event('announcements-updated'));
      }
      annForm = createDefaultAnnForm();
    } catch (err) {
      annError = err instanceof Error ? err.message : 'Failed to save';
    } finally {
      annSaving = false;
    }
  }

  function handleTogglePin(id: string) {
    if (!schoolId) return;
    const next = sortItems(announcements.map((a) => a.id === id ? { ...a, isPinned: !a.isPinned } : a));
    if (isDraft(id)) saveDrafts(schoolId, next.filter((a) => isDraft(a.id)));
    else {
      const u = next.find((a) => a.id === id);
      if (u) { const m = loadMeta(schoolId); m[id] = metaFromItem(u); saveMeta(schoolId, m); }
    }
    announcements = next;
  }

  async function handleToggleStatus(id: string) {
    if (!schoolId) return;
    const item = announcements.find((a) => a.id === id);
    if (!item) return;
    annSaving = true;
    annError = '';
    try {
      if (isDraft(id)) {
        const res = await authedFetch('/api/announcements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: item.title, message: item.message, author: authorName, schoolId }),
        });
        const data = await res.json().catch(() => null);
        const annData = data?.data as BackendAnnouncement | undefined;
        const annId = annData?.ID ?? annData?._id;
        if (!res.ok || !data?.success || !annId) throw new Error(data?.message ?? 'Failed to publish');
        saveDrafts(schoolId, loadDrafts(schoolId).filter((a) => a.id !== id));
        const meta = loadMeta(schoolId);
        meta[String(annId)] = metaFromItem({ ...item, id: String(annId), status: 'Published' });
        saveMeta(schoolId, meta);
        announcements = sortItems([mapBackend(annData!, meta), ...announcements.filter((a) => a.id !== id)]);
        window.dispatchEvent(new Event('announcements-updated'));
      } else {
        const res = await authedFetch(`/api/announcements/${id}`, { method: 'DELETE' });
        const data = await res.json().catch(() => null);
        if (!res.ok || data?.success === false) throw new Error(data?.message ?? 'Failed to move to draft');
        const meta = loadMeta(schoolId); delete meta[id]; saveMeta(schoolId, meta);
        const draft: AnnouncementItem = { ...item, id: newDraftId(), status: 'Draft' };
        saveDrafts(schoolId, sortItems([...loadDrafts(schoolId), draft]));
        announcements = sortItems([draft, ...announcements.filter((a) => a.id !== id)]);
        window.dispatchEvent(new Event('announcements-updated'));
      }
    } catch (err) {
      annError = err instanceof Error ? err.message : 'Failed to update';
    } finally {
      annSaving = false;
    }
  }

  async function handleDeleteAnnouncement(id: string) {
    if (!schoolId) return;
    annSaving = true;
    annError = '';
    try {
      if (isDraft(id)) {
        saveDrafts(schoolId, loadDrafts(schoolId).filter((a) => a.id !== id));
        announcements = announcements.filter((a) => a.id !== id);
      } else {
        const res = await authedFetch(`/api/announcements/${id}`, { method: 'DELETE' });
        const data = await res.json().catch(() => null);
        if (!res.ok || data?.success === false) throw new Error(data?.message ?? 'Failed to delete');
        const meta = loadMeta(schoolId); delete meta[id]; saveMeta(schoolId, meta);
        announcements = announcements.filter((a) => a.id !== id);
        window.dispatchEvent(new Event('announcements-updated'));
      }
    } catch (err) {
      annError = err instanceof Error ? err.message : 'Failed to delete';
    } finally {
      annSaving = false;
    }
  }

  // ─── Template handlers ───────────────────────────────────────────────────────

  async function handleCreateTemplate() {
    if (!templateForm.name.trim() || !templateForm.body.trim()) return;
    templateSaving = true;
    templateError = '';
    try {
      const newTemplate: MessageTemplate = {
        _id: `local-${Date.now()}`,
        name: templateForm.name,
        subject: templateForm.subject,
        body: templateForm.body,
        category: templateForm.category,
      };
      templates = [...templates, newTemplate];
      templateForm = defaultTemplateForm();
    } catch (err) {
      templateError = err instanceof Error ? err.message : 'Failed to save template';
    } finally {
      templateSaving = false;
    }
  }

  async function handleDeleteTemplate(id: string) {
    templates = templates.filter((t) => t._id !== id);
  }

  function handleUseTemplate(subject: string, body: string) {
    annForm = { ...annForm, title: subject, message: body };
    activeTab = 'announcements';
  }

  // ─── Calendar helpers ────────────────────────────────────────────────────────

  function calPrevMonth() {
    if (calViewMonth === 0) { calViewYear -= 1; calViewMonth = 11; }
    else calViewMonth -= 1;
    calSelected = null;
  }

  function calNextMonth() {
    if (calViewMonth === 11) { calViewYear += 1; calViewMonth = 0; }
    else calViewMonth += 1;
    calSelected = null;
  }
</script>

<!-- ─── Main layout ─────────────────────────────────────────────────────────── -->
<div class="flex flex-col min-h-screen bg-slate-50">

  <!-- ── Top navigation (brand + channels + tabs) ── -->
  <nav class="border-b border-slate-200 bg-white">
    <!-- Row 1: brand + connected channels -->
    <div class="flex items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
      <!-- Brand -->
      <div class="flex items-center gap-2.5 shrink-0">
        <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
          <!-- GraduationCap icon -->
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        </div>
        <div class="hidden sm:block">
          <p class="text-sm font-bold text-slate-900 leading-tight">ERP Portal</p>
          <p class="text-[10px] text-slate-400 leading-tight">{schoolName}</p>
        </div>
      </div>

      <!-- Connected channels pill row -->
      <div class="flex items-center gap-2 overflow-x-auto">
        <!-- Wifi icon -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>
        </svg>
        {#each CONNECTED_CHANNELS as ch (ch.key)}
          <span
            title={ch.label}
            class={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${
              ch.connected ? `${CHANNEL_COLOR[ch.key]} border-transparent` : 'border-slate-200 bg-slate-50 text-slate-400'
            }`}
          >
            <span class="hidden md:inline">{CHANNEL_LABEL[ch.key]}</span>
            {#if ch.connected}<span class="text-[8px]">●</span>{/if}
          </span>
        {/each}
        <button class="ml-1 shrink-0 rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[10px] text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-colors whitespace-nowrap">
          + Connect
        </button>
      </div>
    </div>

    <!-- Row 2: horizontal tab nav -->
    <div class="flex overflow-x-auto border-t border-slate-100 px-4 sm:px-6">
      {#each ([
        { label: 'Announcements', tab: 'announcements' as ActiveTab },
        { label: 'Campaigns',     tab: 'campaigns'     as ActiveTab },
        { label: 'Calendar',      tab: 'calendar'      as ActiveTab },
        { label: 'Templates',     tab: 'templates'     as ActiveTab },
      ]) as navItem (navItem.tab)}
        <button
          onclick={() => { activeTab = navItem.tab; }}
          class={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === navItem.tab
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          {navItem.label}
        </button>
      {/each}
    </div>
  </nav>

  <!-- ── Page header ── -->
  <header class="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
    <div class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h1 class="truncate text-lg font-bold text-slate-900">Communication Center</h1>
          <span class="shrink-0 inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 hidden sm:inline-flex">
            {schoolName}
          </span>
        </div>
        <p class="hidden text-xs text-slate-500 sm:block">
          Write once, send everywhere — in-app · email · SMS · WhatsApp · social
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <button
          onclick={() => submitCampaign('DRAFT')}
          disabled={campaignSaving}
          class="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <!-- FileEdit icon -->
          <svg xmlns="http://www.w3.org/2000/svg" class="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          Save draft
        </button>
        <button
          onclick={() => submitCampaign('SEND')}
          disabled={campaignSaving}
          class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <!-- Send icon -->
          <svg xmlns="http://www.w3.org/2000/svg" class="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          <span class="hidden sm:inline">Send campaign</span>
          <span class="sm:hidden">Send</span>
        </button>
      </div>
    </div>
  </header>

  <!-- ── Scrollable content ── -->
  <main class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

    <!-- Global comm error banner -->
    {#if commError}
      <div class="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <span>{commError}</span>
        <div class="flex items-center gap-2">
          <button onclick={fetchComm} class="flex items-center gap-1 font-medium underline underline-offset-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Retry
          </button>
          <button aria-label="Dismiss error" onclick={() => { commError = ''; }}>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    {/if}

    <!-- ── Tab content card ── -->
    <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="p-4 sm:p-5">

        <!-- ════════════ ANNOUNCEMENTS TAB ════════════ -->
        {#if activeTab === 'announcements'}
          <div class="space-y-6">

            <!-- Mini stats row -->
            <div class="grid grid-cols-3 gap-3">
              {#each ([
                { label: 'Published', value: publishedCount },
                { label: 'Drafts',    value: draftCount    },
                { label: 'Pinned',    value: pinnedCount   },
              ]) as stat (stat.label)}
                <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div class="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    {stat.label}
                  </div>
                  <p class="mt-2 text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
              {/each}
            </div>

            <!-- Announcement error -->
            {#if annError}
              <div class="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span>{annError}</span>
                <button aria-label="Dismiss error" onclick={() => { annError = ''; }}>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            {/if}

            <!-- ── AnnouncementForm ── -->
            <div class="rounded-xl border border-slate-200 shadow-sm">
              <!-- Card header -->
              <div class="space-y-3 border-b border-slate-100 pb-4 p-4 sm:p-6">
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                      <!-- Megaphone icon -->
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 11l19-9-9 19-2-8-8-2z"/>
                      </svg>
                    </div>
                    <div>
                      <p class="text-lg font-semibold text-slate-900">Create announcement</p>
                      <p class="text-sm text-slate-500">Draft updates quickly and publish them when the message is ready.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onclick={handleAiDraft}
                    disabled={aiLoading}
                    class="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-violet-200 px-3 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-50 disabled:opacity-50"
                  >
                    <!-- Sparkles icon -->
                    <svg xmlns="http://www.w3.org/2000/svg" class="mr-1.5 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 3l.5 1.5L21 5l-1.5.5L19 7l-.5-1.5L17 5l1.5-.5z"/><path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5z"/>
                    </svg>
                    {aiLoading ? 'Generating…' : 'AI draft'}
                  </button>
                </div>
                {#if aiError}
                  <p class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{aiError}</p>
                {/if}
              </div>

              <!-- Card content -->
              <div class="space-y-4 p-4 sm:p-6">
                <div class="grid gap-4 md:grid-cols-2">
                  <div class="space-y-2 md:col-span-2">
                    <label class="text-sm font-medium text-slate-700" for="announcement-title">Title</label>
                    <input
                      id="announcement-title"
                      class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                      placeholder="Enter a clear announcement title"
                      bind:value={annForm.title}
                    />
                  </div>

                  <div class="space-y-2 md:col-span-2">
                    <label class="text-sm font-medium text-slate-700" for="announcement-message">Message</label>
                    <textarea
                      id="announcement-message"
                      class="w-full min-h-[132px] resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                      placeholder="Write the announcement details for your school community"
                      bind:value={annForm.message}
                    ></textarea>
                  </div>

                  <div class="space-y-2">
                    <label for="ann-audience" class="text-sm font-medium text-slate-700">Audience</label>
                    <select
                      id="ann-audience"
                      class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                      bind:value={annForm.audience}
                    >
                      {#each AUDIENCE_OPTIONS as opt (opt)}
                        <option value={opt}>{opt}</option>
                      {/each}
                    </select>
                  </div>

                  <div class="space-y-2">
                    <label for="ann-priority" class="text-sm font-medium text-slate-700">Priority</label>
                    <select
                      id="ann-priority"
                      class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                      bind:value={annForm.priority}
                    >
                      {#each PRIORITY_OPTIONS as opt (opt)}
                        <option value={opt}>{opt}</option>
                      {/each}
                    </select>
                  </div>

                  <div class="space-y-2">
                    <label for="ann-status" class="text-sm font-medium text-slate-700">Status</label>
                    <select
                      id="ann-status"
                      class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                      bind:value={annForm.status}
                    >
                      {#each STATUS_OPTIONS as opt (opt)}
                        <option value={opt}>{opt}</option>
                      {/each}
                    </select>
                  </div>

                  <div class="space-y-2">
                    <label class="text-sm font-medium text-slate-700" for="announcement-publish-date">Publish date</label>
                    <input
                      id="announcement-publish-date"
                      type="date"
                      class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                      bind:value={annForm.publishDate}
                    />
                  </div>
                </div>

                <div class="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <label class="flex items-start gap-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      class="mt-0.5 rounded border-slate-300"
                      bind:checked={annForm.isPinned}
                    />
                    <span>
                      <span class="block font-medium text-slate-900">Pin announcement</span>
                      <span class="block text-xs text-slate-500">Pinned items stay at the top of the announcement list.</span>
                    </span>
                  </label>
                  <button
                    type="button"
                    onclick={handleCreateAnnouncement}
                    disabled={!canSubmitAnn}
                    class="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:min-w-[180px]"
                  >
                    {annForm.status === 'Published' ? 'Publish announcement' : 'Save draft'}
                  </button>
                </div>
              </div>
            </div>

            <!-- ── AnnouncementFilters ── -->
            <div class="rounded-xl border border-slate-200 bg-white shadow-sm space-y-4 p-4 sm:p-5">
              <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 class="text-sm font-semibold text-slate-900">Search and filter</h3>
                  <p class="text-xs text-slate-500">Narrow the communication feed for faster review.</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {announcements.length} total
                  </span>
                  <span class="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {pinnedCount} pinned
                  </span>
                </div>
              </div>

              <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <div class="relative">
                  <!-- Search icon -->
                  <svg xmlns="http://www.w3.org/2000/svg" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    type="text"
                    class="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                    placeholder="Search by title or message"
                    bind:value={searchQuery}
                  />
                </div>
                <select
                  class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  bind:value={activeFilter}
                >
                  {#each FILTER_OPTIONS as opt (opt)}
                    <option value={opt}>{opt}</option>
                  {/each}
                </select>
              </div>
            </div>

            <!-- ── AnnouncementList ── -->
            {#if annLoading}
              <div class="space-y-3 animate-pulse">
                {#each [0, 1, 2] as i (i)}
                  <div class="h-24 rounded-xl bg-slate-100"></div>
                {/each}
              </div>
            {:else if filteredAnnouncements.length === 0}
              <div class="rounded-xl border border-dashed border-slate-300 bg-slate-50/60">
                <div class="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                  <div class="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    <!-- Inbox icon -->
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
                    </svg>
                  </div>
                  <div class="space-y-1">
                    <h3 class="text-sm font-semibold text-slate-900">No announcements found</h3>
                    <p class="max-w-md text-sm text-slate-500">
                      Try a different search or filter, or create a new announcement to start the communication feed.
                    </p>
                  </div>
                </div>
              </div>
            {:else}
              <div class="space-y-3">
                {#each filteredAnnouncements as ann (ann.id)}
                  <!-- AnnouncementCard -->
                  <div class={`rounded-xl border shadow-sm ${ann.isPinned ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200 bg-white'}`}>
                    <div class="p-4 sm:p-5">
                      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div class="space-y-3">
                          <div class="flex flex-wrap items-center gap-2">
                            {#if ann.isPinned}
                              <span class="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                <!-- Pin icon -->
                                <svg xmlns="http://www.w3.org/2000/svg" class="mr-1 h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                  <line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/>
                                </svg>
                                Pinned
                              </span>
                            {/if}
                            <span class={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${AUDIENCE_BADGE[ann.audience]}`}>
                              {ann.audience}
                            </span>
                            <span class={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE[ann.priority]}`}>
                              {ann.priority}
                            </span>
                            <span class={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[ann.status]}`}>
                              {ann.status}
                            </span>
                          </div>
                          <div class="space-y-1">
                            <h3 class="text-base font-semibold text-slate-900">{ann.title}</h3>
                            <p class="text-sm leading-6 text-slate-600">{ann.message.length > 170 ? ann.message.slice(0, 167) + '...' : ann.message}</p>
                          </div>
                        </div>

                        <div class="flex min-w-fit flex-col items-start gap-3 lg:items-end">
                          <div class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            <!-- CalendarDays icon -->
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            {new Date(ann.publishDate).toLocaleDateString()}
                          </div>
                          <div class="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onclick={() => handleTogglePin(ann.id)}
                              class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              {#if ann.isPinned}
                                <!-- PinOff icon -->
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                  <line x1="2" y1="2" x2="22" y2="22"/><line x1="12" y1="17" x2="12" y2="22"/><path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h12"/><path d="M15 9.34V6h1a2 2 0 0 0 0-4H7.89"/>
                                </svg>
                                Unpin
                              {:else}
                                <!-- Pin icon -->
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                  <line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z"/>
                                </svg>
                                Pin
                              {/if}
                            </button>
                            <button
                              type="button"
                              onclick={() => handleToggleStatus(ann.id)}
                              class={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium ${
                                ann.status === 'Published'
                                  ? 'border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {ann.status === 'Published' ? 'Move to Draft' : 'Publish'}
                            </button>
                            <button
                              type="button"
                              onclick={() => handleDeleteAnnouncement(ann.id)}
                              class="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                            >
                              <!-- Trash2 icon -->
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                              </svg>
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}

          </div>
        {/if}

        <!-- ════════════ CAMPAIGNS TAB ════════════ -->
        {#if activeTab === 'campaigns'}
          <div class="space-y-6">

            <!-- KPI stats row -->
            {#if commLoading || !stats}
              <div class="grid grid-cols-2 gap-4 lg:grid-cols-4 animate-pulse">
                {#each [0, 1, 2, 3] as i (i)}
                  <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div class="h-3 w-24 rounded bg-slate-200"></div>
                    <div class="mt-3 h-8 w-16 rounded bg-slate-200"></div>
                    <div class="mt-1 h-3 w-20 rounded bg-slate-100"></div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div class="flex items-center justify-between">
                    <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Active Campaigns</p>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>
                  </div>
                  <p class="mt-2 text-3xl font-bold text-slate-900">{stats.activeCampaigns}</p>
                  <p class="mt-0.5 text-xs text-slate-400">draft + scheduled</p>
                </div>
                <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div class="flex items-center justify-between">
                    <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Scheduled</p>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <p class="mt-2 text-3xl font-bold text-slate-900">{stats.scheduledCount}</p>
                  <p class="mt-0.5 text-xs text-slate-400">upcoming sends</p>
                </div>
                <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div class="flex items-center justify-between">
                    <p class="text-xs font-medium uppercase tracking-wide text-slate-500">WhatsApp (24h)</p>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <p class="mt-2 text-3xl font-bold text-slate-900">{stats.whatsappSends24h}</p>
                  <p class="mt-0.5 text-xs text-slate-400">delivered</p>
                </div>
                <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div class="flex items-center justify-between">
                    <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Email &amp; SMS (week)</p>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </div>
                  <p class="mt-2 text-3xl font-bold text-slate-900">{stats.emailSmsSentWeek}</p>
                  <p class="mt-0.5 text-xs text-slate-400">sent</p>
                </div>
              </div>
            {/if}

            <!-- Campaign error -->
            {#if campaignError}
              <div class="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span>{campaignError}</span>
                <button aria-label="Dismiss error" onclick={() => { campaignError = ''; }}>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            {/if}

            <!-- Create + Settings grid -->
            <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">

              <!-- Create campaign card -->
              <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div class="flex items-center gap-2">
                  <!-- Plus icon -->
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  <h2 class="font-semibold text-slate-800">Create Campaign</h2>
                </div>
                <input
                  class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  placeholder="Campaign title *"
                  bind:value={form.title}
                />
                <input
                  class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  placeholder="Internal note (not sent)"
                  bind:value={form.internalNote}
                />
                <input
                  class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  placeholder="Public caption | email subject"
                  bind:value={form.publicCaption}
                />
                <textarea
                  rows="4"
                  class="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  placeholder="Message body *"
                  bind:value={form.messageBody}
                ></textarea>
                <div class="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200 py-5 text-sm text-slate-400 cursor-pointer hover:border-blue-300 hover:text-blue-400 transition-colors">
                  <!-- Image icon -->
                  <svg xmlns="http://www.w3.org/2000/svg" class="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                  Attach media (image, video, PDF)
                </div>
                <!-- Summary chips -->
                {#if form.channels.length > 0 || form.audience !== 'All' || form.priority !== 'NORMAL'}
                  <div class="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                    {#each form.channels as ch (ch)}
                      <span class="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-1 text-xs font-medium text-white shadow-[0_3px_10px_rgba(59,130,246,0.35)]">
                        {CHANNEL_LABEL[ch]}
                      </span>
                    {/each}
                    {#if form.audience !== 'All'}
                      <span class="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-600">
                        {form.audience}
                      </span>
                    {/if}
                    {#if form.priority !== 'NORMAL'}
                      <span class={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${PRIORITY_COLOR[form.priority]}`}>
                        {form.priority}
                      </span>
                    {/if}
                  </div>
                {/if}
              </div>

              <!-- Send settings card -->
              <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                <h2 class="font-semibold text-slate-800">Send Settings</h2>

                <!-- Channels -->
                <div>
                  <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Channels</p>
                  <div class="grid grid-cols-4 gap-2 rounded-2xl border border-indigo-100 bg-gradient-to-br from-slate-50 to-indigo-50/40 p-3">
                    <!-- Select All -->
                    <button
                      onclick={toggleAllChannels}
                      class={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 ${
                        form.channels.length === ALL_CHANNEL_KEYS.length
                          ? 'border-blue-500 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_4px_14px_rgba(59,130,246,0.4)]'
                          : 'border-slate-300 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                      </svg>
                      <span>All</span>
                    </button>
                    {#each ALL_CHANNELS as ch (ch.key)}
                      {@const active = form.channels.includes(ch.key)}
                      <button
                        onclick={() => toggleChannel(ch.key)}
                        class={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                          active
                            ? 'border-blue-500 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_4px_14px_rgba(59,130,246,0.4)]'
                            : 'border-slate-300 bg-white text-slate-600 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        <span class="truncate">{ch.label}</span>
                      </button>
                    {/each}
                  </div>
                </div>

                <!-- Audience -->
                <div>
                  <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Audience</p>
                  <select
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                    bind:value={form.audience}
                  >
                    {#each CAMPAIGN_AUDIENCE_OPTIONS as opt (opt)}
                      <option value={opt}>{opt}</option>
                    {/each}
                  </select>
                </div>

                <!-- Priority -->
                <div>
                  <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Priority</p>
                  <div class="flex gap-2">
                    {#each (['LOW', 'NORMAL', 'HIGH'] as const) as p (p)}
                      <button
                        onclick={() => { form.priority = p; }}
                        class={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          form.priority === p
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {p.charAt(0) + p.slice(1).toLowerCase()}
                      </button>
                    {/each}
                  </div>
                </div>

                <!-- Schedule toggle -->
                <label class="flex cursor-pointer items-center justify-between">
                  <span class="text-sm text-slate-700">Schedule for later</span>
                  <button
                    role="switch"
                    aria-label="Schedule for later"
                    aria-checked={form.scheduleEnabled}
                    onclick={() => { form.scheduleEnabled = !form.scheduleEnabled; }}
                    class={`relative h-5 w-9 rounded-full transition-colors ${form.scheduleEnabled ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <span class={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.scheduleEnabled ? 'translate-x-4' : 'translate-x-0.5'}`}></span>
                  </button>
                </label>
                {#if form.scheduleEnabled}
                  <input
                    type="datetime-local"
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                    bind:value={form.scheduledAt}
                  />
                {/if}

                <!-- Approval toggle -->
                <label class="flex cursor-pointer items-center justify-between">
                  <span class="text-sm text-slate-700">Require approval before send</span>
                  <button
                    role="switch"
                    aria-label="Require approval before send"
                    aria-checked={form.approvalRequired}
                    onclick={() => { form.approvalRequired = !form.approvalRequired; }}
                    class={`relative h-5 w-9 rounded-full transition-colors ${form.approvalRequired ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <span class={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.approvalRequired ? 'translate-x-4' : 'translate-x-0.5'}`}></span>
                  </button>
                </label>

                <!-- Quick actions -->
                <div class="flex gap-2 pt-1">
                  <button
                    onclick={() => submitCampaign('DRAFT')}
                    disabled={campaignSaving}
                    class="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <!-- Copy icon -->
                    <svg xmlns="http://www.w3.org/2000/svg" class="mr-1.5 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Save draft
                  </button>
                  <button
                    onclick={() => submitCampaign('SEND')}
                    disabled={campaignSaving}
                    class="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <!-- Sparkles icon -->
                    <svg xmlns="http://www.w3.org/2000/svg" class="mr-1.5 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 3l.5 1.5L21 5l-1.5.5L19 7l-.5-1.5L17 5l1.5-.5z"/><path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5z"/>
                    </svg>
                    {campaignSaving ? 'Saving…' : 'Send now'}
                  </button>
                </div>
              </div>
            </div>

            <!-- Campaigns table -->
            <div>
              <h3 class="mb-3 text-sm font-semibold text-slate-700">All Campaigns</h3>
              {#if commLoading}
                <div class="space-y-2 animate-pulse">
                  {#each [0, 1, 2] as i (i)}
                    <div class="h-12 rounded-lg bg-slate-100"></div>
                  {/each}
                </div>
              {:else if campaigns.length === 0}
                <div class="rounded-xl border border-dashed border-slate-200 py-14 text-center text-sm text-slate-400">
                  No campaigns yet. Fill in the form above and click <strong>Send campaign</strong>.
                </div>
              {:else}
                <div class="overflow-x-auto rounded-xl border border-slate-200">
                  <table class="min-w-full divide-y divide-slate-100 text-sm">
                    <thead class="bg-slate-50">
                      <tr>
                        {#each ['Campaign', 'Channels', 'Audience', 'Priority', 'Status', 'Approval', 'Scheduled', ''] as h, i (i)}
                          <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                        {/each}
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 bg-white">
                      {#each campaigns as c (c.id)}
                        <tr class="hover:bg-slate-50 transition-colors">
                          <td class="px-4 py-3 max-w-[200px]">
                            <p class="font-medium text-slate-800 truncate">{c.title}</p>
                            {#if c.subtitle}<p class="text-xs text-slate-400 truncate">{c.subtitle}</p>{/if}
                          </td>
                          <td class="px-4 py-3">
                            <div class="flex flex-wrap gap-1">
                              {#each c.channels.filter((ch) => ch.isEnabled) as ch (ch.channel)}
                                <span class={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${CHANNEL_COLOR[ch.channel]}`}>
                                  {CHANNEL_LABEL[ch.channel]}
                                </span>
                              {/each}
                              {#if c.channels.filter((ch) => ch.isEnabled).length === 0}
                                <span class="text-xs text-slate-400">—</span>
                              {/if}
                            </div>
                          </td>
                          <td class="px-4 py-3 text-slate-600 whitespace-nowrap">{c.audienceLabel || 'All'}</td>
                          <td class="px-4 py-3">
                            <span class={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLOR[c.priority]}`}>
                              {c.priority}
                            </span>
                          </td>
                          <td class="px-4 py-3">
                            <span class={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[c.status]}`}>
                              {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                            </span>
                          </td>
                          <td class="px-4 py-3">
                            {#if c.approvalStatus !== 'NONE'}
                              <span class={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                c.approvalStatus === 'PENDING_REVIEW' ? 'bg-yellow-100 text-yellow-700'
                                : c.approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                              }`}>
                                {c.approvalStatus.replace('_', ' ')}
                              </span>
                            {/if}
                          </td>
                          <td class="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                            {c.scheduledAt ? new Date(c.scheduledAt).toLocaleString() : '—'}
                          </td>
                          <td class="px-4 py-3">
                            <button
                              aria-label="Delete campaign"
                              onclick={() => handleDeleteCampaign(c.id)}
                              class="flex h-7 w-7 items-center justify-center rounded text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- ════════════ CALENDAR TAB ════════════ -->
        {#if activeTab === 'calendar'}
          <div class="space-y-5">
            <!-- Header -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <!-- Calendar icon -->
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <h2 class="text-lg font-semibold text-slate-800">{MONTHS[calViewMonth]} {calViewYear}</h2>
              </div>
              <div class="flex gap-1">
                <button aria-label="Previous month" onclick={calPrevMonth} class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <button aria-label="Next month" onclick={calNextMonth} class="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>

            <!-- Calendar grid -->
            <div class="rounded-xl border border-slate-200 overflow-hidden">
              <!-- Weekday headers -->
              <div class="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                {#each WEEKDAYS as wd (wd)}
                  <div class="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">{wd}</div>
                {/each}
              </div>
              <!-- Day cells -->
              <div class="grid grid-cols-7 divide-x divide-y divide-slate-100">
                {#each calCells as day, idx (idx)}
                  {#if day === null}
                    <div class="h-16 bg-slate-50/50"></div>
                  {:else}
                    {@const isToday = day === todayDate.getDate() && calViewMonth === todayDate.getMonth() && calViewYear === todayDate.getFullYear()}
                    {@const dayCampaigns = calCampaignsByDate[day.toString()] ?? []}
                    {@const isSelected = calSelected === day.toString()}
                    <button
                      onclick={() => { calSelected = isSelected ? null : day.toString(); }}
                      class={`relative h-16 p-1.5 text-left transition-colors hover:bg-blue-50/60 ${isSelected ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : ''}`}
                    >
                      <span class={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700'}`}>
                        {day}
                      </span>
                      {#if dayCampaigns.length > 0}
                        <div class="mt-1 flex flex-wrap gap-0.5">
                          {#each dayCampaigns.slice(0, 2) as c (c.id)}
                            <span class="block truncate rounded bg-blue-100 px-1 text-[10px] text-blue-700 max-w-full">
                              {c.title}
                            </span>
                          {/each}
                          {#if dayCampaigns.length > 2}
                            <span class="text-[10px] text-slate-400">+{dayCampaigns.length - 2} more</span>
                          {/if}
                        </div>
                      {/if}
                    </button>
                  {/if}
                {/each}
              </div>
            </div>

            <!-- Selected day detail -->
            {#if calSelected && calSelectedCampaigns.length > 0}
              <div class="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-2">
                <p class="text-sm font-semibold text-slate-700">
                  {MONTHS[calViewMonth]} {calSelected}, {calViewYear} — {calSelectedCampaigns.length} campaign{calSelectedCampaigns.length !== 1 ? 's' : ''}
                </p>
                {#each calSelectedCampaigns as c (c.id)}
                  <div class="rounded-lg border border-blue-200 bg-white p-3 text-sm">
                    <p class="font-medium text-slate-800">{c.title}</p>
                    <p class="text-xs text-slate-500 mt-0.5">
                      {c.audienceLabel} · {c.channels.map((ch) => ch.channel).join(', ') || 'No channels'}
                    </p>
                  </div>
                {/each}
              </div>
            {/if}

            {#if calSelected && calSelectedCampaigns.length === 0}
              <p class="text-sm text-slate-400 text-center">No campaigns scheduled on this day.</p>
            {/if}

            {#if !calHasScheduled}
              <p class="text-center text-sm text-slate-400">
                No scheduled campaigns. Create a campaign and set a schedule date to see it here.
              </p>
            {/if}
          </div>
        {/if}

        <!-- ════════════ TEMPLATES TAB ════════════ -->
        {#if activeTab === 'templates'}
          <div class="space-y-6">

            <!-- New template card -->
            <div class="rounded-xl border border-slate-200 shadow-sm">
              <div class="border-b border-slate-100 p-4 sm:p-5">
                <div class="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  <h3 class="text-base font-semibold text-slate-800">New Template</h3>
                </div>
              </div>
              <div class="space-y-3 p-4 sm:p-5">
                {#if templateError}
                  <p class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{templateError}</p>
                {/if}
                <div class="grid gap-3 sm:grid-cols-2">
                  <input
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                    placeholder="Template name *"
                    bind:value={templateForm.name}
                  />
                  <input
                    class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                    placeholder="Category (e.g. Fees, Events)"
                    bind:value={templateForm.category}
                  />
                </div>
                <input
                  class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  placeholder="Subject / Email title"
                  bind:value={templateForm.subject}
                />
                <textarea
                  rows="4"
                  class="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                  placeholder="Message body *"
                  bind:value={templateForm.body}
                ></textarea>
                <div class="flex justify-end">
                  <button
                    onclick={handleCreateTemplate}
                    disabled={templateSaving || !templateForm.name.trim() || !templateForm.body.trim()}
                    class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    {templateSaving ? 'Saving…' : 'Save template'}
                  </button>
                </div>
              </div>
            </div>

            <!-- Templates list -->
            {#if templatesLoading}
              <div class="space-y-2 animate-pulse">
                {#each [0, 1, 2] as i (i)}
                  <div class="h-20 rounded-xl bg-slate-100"></div>
                {/each}
              </div>
            {:else if templates.length === 0}
              <div class="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
                No templates yet. Create one above to reuse messages across campaigns and announcements.
              </div>
            {:else}
              <div class="space-y-3">
                {#each templates as t (t._id)}
                  <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div class="flex items-start justify-between gap-4 p-4">
                      <div class="min-w-0 space-y-1">
                        <div class="flex items-center gap-2">
                          <!-- FileText icon -->
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                          </svg>
                          <p class="font-medium text-slate-800 truncate">{t.name}</p>
                          <span class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{t.category}</span>
                        </div>
                        {#if t.subject}
                          <p class="text-xs text-slate-500 truncate">Subject: {t.subject}</p>
                        {/if}
                        <p class="text-sm text-slate-600 line-clamp-2">{t.body}</p>
                      </div>
                      <div class="flex shrink-0 gap-2">
                        <button
                          onclick={() => handleUseTemplate(t.subject ?? t.name, t.body)}
                          class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <!-- Copy icon -->
                          <svg xmlns="http://www.w3.org/2000/svg" class="mr-1 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                          Use
                        </button>
                        <button
                          onclick={() => handleDeleteTemplate(t._id)}
                          class="inline-flex items-center justify-center rounded-lg bg-red-600 p-1.5 text-white hover:bg-red-700"
                        >
                          <!-- Trash2 icon -->
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}

          </div>
        {/if}

      </div>
    </div>
  </main>
</div>
