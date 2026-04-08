export const AUDIENCE_OPTIONS = ["All", "Students", "Teachers", "Parents", "Staff"] as const;
export const PRIORITY_OPTIONS = ["Normal", "Important", "Urgent"] as const;
export const STATUS_OPTIONS = ["Draft", "Published"] as const;
export const FILTER_OPTIONS = ["All", "Draft", "Published", "Pinned"] as const;

export type AnnouncementAudience = (typeof AUDIENCE_OPTIONS)[number];
export type AnnouncementPriority = (typeof PRIORITY_OPTIONS)[number];
export type AnnouncementStatus = (typeof STATUS_OPTIONS)[number];
export type AnnouncementFilter = (typeof FILTER_OPTIONS)[number];

export type AnnouncementItem = {
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

export type AnnouncementFormValues = {
  title: string;
  message: string;
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  publishDate: string;
  isPinned: boolean;
};

export const createDefaultAnnouncementForm = (): AnnouncementFormValues => ({
  title: "",
  message: "",
  audience: "All",
  priority: "Normal",
  status: "Draft",
  publishDate: new Date().toISOString().slice(0, 10),
  isPinned: false,
});
