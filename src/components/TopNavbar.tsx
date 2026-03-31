import {
  Bell,
  Building2,
  ChevronDown,
  Globe,
  ImagePlus,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  PencilLine,
  Phone,
  Save,
  Shield,
  UserRound,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Illustration } from "@/components/shared-assets/illustrations";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useRole } from "@/contexts/RoleContext";
import type { User } from "@/contexts/RoleContext";
import { persistSchoolAdminSession } from "@/lib/auth";
import { API_URL } from "@/lib/api";

type SchoolSessionData = {
  _id?: string;
  modules?: string[];
  adminInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    image?: string;
    password?: string;
    status?: string;
  };
  schoolInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    logo?: string;
  };
  systemInfo?: {
    schoolType?: string;
    maxStudents?: number;
    subscriptionPlan?: string;
    subscriptionEndDate?: string;
  };
};

type TeacherSessionData = {
  name?: string;
  email?: string;
};

type ProfileFormData = {
  schoolName: string;
  schoolEmail: string;
  schoolPhone: string;
  schoolAddress: string;
  schoolWebsite: string;
  logo: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  adminImage: string;
};

const EMPTY_PROFILE_FORM: ProfileFormData = {
  schoolName: "",
  schoolEmail: "",
  schoolPhone: "",
  schoolAddress: "",
  schoolWebsite: "",
  logo: "",
  adminName: "",
  adminEmail: "",
  adminPhone: "",
  adminImage: "",
};

const superAdminTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/schools": "Schools Management",
  "/school-admins": "School Admins",
  "/subscriptions": "Subscriptions",
  "/settings": "Settings",
  "/logs": "Activity Logs",
  "/security": "Security",
  "/user-change": "User Change",
};

function readJsonStorage<T>(key: string): T | null {
  const rawValue = localStorage.getItem(key);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

function getPageTitle(pathname: string, role: string) {
  if (role === "super-admin") {
    return superAdminTitles[pathname] || "Dashboard";
  }

  if (role === "school-admin" && pathname === "/school") {
    return "School Dashboard";
  }

  if (role === "teacher" && pathname === "/teacher") {
    return "Teacher Dashboard";
  }

  const segment = pathname.split("/").filter(Boolean).pop() || "dashboard";
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}

function buildProfileFormData(school: SchoolSessionData | null): ProfileFormData {
  if (!school) {
    return EMPTY_PROFILE_FORM;
  }

  return {
    schoolName: school.schoolInfo?.name || "",
    schoolEmail: school.schoolInfo?.email || "",
    schoolPhone: school.schoolInfo?.phone || "",
    schoolAddress: school.schoolInfo?.address || "",
    schoolWebsite: school.schoolInfo?.website || "",
    logo: school.schoolInfo?.logo || "",
    adminName: school.adminInfo?.name || "",
    adminEmail: school.adminInfo?.email || "",
    adminPhone: school.adminInfo?.phone || "",
    adminImage: school.adminInfo?.image || "",
  };
}

function ProfileField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </span>
      {children}
    </label>
  );
}

export function TopNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout, user } = useRole();

  const [schoolData, setSchoolData] = useState<SchoolSessionData | null>(null);
  const [teacherData, setTeacherData] = useState<TeacherSessionData | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormData>(EMPTY_PROFILE_FORM);
  const logoUploadRef = useRef<HTMLInputElement | null>(null);
  const adminImageUploadRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loadSessionData = () => {
      setSchoolData(readJsonStorage<SchoolSessionData>("school"));
      setTeacherData(readJsonStorage<TeacherSessionData>("teacher"));
    };

    loadSessionData();

    window.addEventListener("storage", loadSessionData);
    window.addEventListener("school-session-updated", loadSessionData);

    return () => {
      window.removeEventListener("storage", loadSessionData);
      window.removeEventListener("school-session-updated", loadSessionData);
    };
  }, []);

  useEffect(() => {
    if (!isProfileOpen) {
      return;
    }

    setProfileForm(buildProfileFormData(schoolData));
  }, [isProfileOpen, schoolData]);

  const schoolId = schoolData?._id;
  const title = getPageTitle(location.pathname, role);

  const displayName =
    role === "school-admin"
      ? schoolData?.adminInfo?.name || "School Admin"
      : role === "teacher"
        ? teacherData?.name || "Teacher"
        : "Super Admin";

  const displayEmail =
    role === "school-admin"
      ? schoolData?.adminInfo?.email || "school-admin@mail.com"
      : role === "teacher"
        ? teacherData?.email || "teacher@mail.com"
        : "admin@eduadmin.com";

  const adminImage = schoolData?.adminInfo?.image;
  const schoolLogo = schoolData?.schoolInfo?.logo;
  const avatarImage = adminImage || schoolLogo;
  const hasValidLogo = Boolean(
    avatarImage && (avatarImage.startsWith("data:image") || avatarImage.startsWith("http")),
  );

  const profileLogoPreview = profileForm.logo.trim();
  const hasProfileLogo = Boolean(
    profileLogoPreview &&
      (profileLogoPreview.startsWith("data:image") || profileLogoPreview.startsWith("http")),
  );
  const adminImagePreview = profileForm.adminImage.trim();
  const hasAdminImage = Boolean(
    adminImagePreview &&
      (adminImagePreview.startsWith("data:image") || adminImagePreview.startsWith("http")),
  );
  const websiteDisplay =
    profileForm.schoolWebsite.startsWith("http://") || profileForm.schoolWebsite.startsWith("https://")
      ? profileForm.schoolWebsite
      : "";
  const logoUrlInputValue = profileForm.logo.startsWith("data:image") ? "" : profileForm.logo;
  const adminImageInputValue = profileForm.adminImage.startsWith("data:image")
    ? ""
    : profileForm.adminImage;

  const initials = useMemo(
    () =>
      (displayName
        .split(" ")
        .filter(Boolean)
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "AD"),
    [displayName],
  );

  const handleLogout = () => {
    const activeRole = role;
    logout();

    if (activeRole === "super-admin") {
      navigate("/super-admin-login", { replace: true });
      return;
    }

    if (activeRole === "school-admin") {
      navigate("/school-admin-login", { replace: true });
      return;
    }

    navigate("/teacher-login", { replace: true });
  };

  const handleProfileInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  };

  const readImageFile = (
    event: ChangeEvent<HTMLInputElement>,
    onSuccess: (result: string) => void,
    successMessage: string,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file for the school logo.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";

      if (!result) {
        toast.error("Unable to read the selected logo file.");
        return;
      }

      onSuccess(result);
      toast.success(successMessage);
      event.target.value = "";
    };
    reader.onerror = () => {
      toast.error("Unable to read the selected image file.");
      event.target.value = "";
    };

    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    readImageFile(
      event,
      (result) => {
        setProfileForm((current) => ({ ...current, logo: result }));
      },
      "School logo selected. Save changes to apply it.",
    );
  };

  const handleAdminImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    readImageFile(
      event,
      (result) => {
        setProfileForm((current) => ({ ...current, adminImage: result }));
      },
      "Admin photo selected. Save changes to apply it.",
    );
  };

  const fetchSchoolProfile = async () => {
    if (!schoolId) {
      toast.error("School profile is not available in the current session.");
      return;
    }

    setIsProfileLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/schools/${schoolId}`);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || data?.error || "Unable to load school profile");
      }

      setSchoolData(data);
      setProfileForm(buildProfileFormData(data));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load school profile");
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleProfileOpenChange = (open: boolean) => {
    setIsProfileOpen(open);

    if (open && role === "school-admin") {
      void fetchSchoolProfile();
    }
  };

  const handleProfileSave = async () => {
    if (!schoolId) {
      toast.error("School profile is not available in the current session.");
      return;
    }

    setIsProfileSaving(true);

    try {
      const payload = {
        schoolName: profileForm.schoolName.trim(),
        schoolEmail: profileForm.schoolEmail.trim(),
        schoolPhone: profileForm.schoolPhone.trim(),
        schoolAddress: profileForm.schoolAddress.trim(),
        schoolWebsite: profileForm.schoolWebsite.trim(),
        logo: profileForm.logo.trim(),
        adminName: profileForm.adminName.trim(),
        adminEmail: profileForm.adminEmail.trim(),
        adminPhone: profileForm.adminPhone.trim(),
        adminImage: profileForm.adminImage.trim(),
        schoolType: schoolData?.systemInfo?.schoolType || "",
        maxStudents: schoolData?.systemInfo?.maxStudents || 0,
        subscriptionPlan: schoolData?.systemInfo?.subscriptionPlan || "Basic",
      };

      const response = await fetch(`${API_URL}/api/schools/${schoolId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.data) {
        throw new Error(data?.message || "Unable to update school profile");
      }

      const updatedSchool = data.data as SchoolSessionData;
      setSchoolData(updatedSchool);
      setProfileForm(buildProfileFormData(updatedSchool));

      if (user && role === "school-admin") {
        persistSchoolAdminSession(updatedSchool, user as User);
      }

      toast.success("School profile updated successfully.");
      setIsProfileOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update school profile");
    } finally {
      setIsProfileSaving(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">Manage your workspace from one place.</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.button
                type="button"
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                className="flex items-center gap-3 rounded-full border border-border bg-background/80 px-2 py-1.5 shadow-sm backdrop-blur transition-colors hover:bg-muted"
              >
                {hasValidLogo ? (
                  <img
                    src={avatarImage}
                    alt={displayName}
                    className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/15"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm">
                    {initials}
                  </div>
                )}

                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium text-foreground">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{displayEmail}</p>
                </div>

                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </motion.button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-semibold">{displayName}</p>
                <p className="text-xs text-muted-foreground">{displayEmail}</p>
              </div>
              {role === "school-admin" ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => handleProfileOpenChange(true)}
                  >
                    <PencilLine className="mr-2 h-4 w-4" />
                    View Profile
                  </DropdownMenuItem>
                </>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Sheet open={isProfileOpen} onOpenChange={handleProfileOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto border-l border-border bg-gradient-to-b from-background via-background to-muted/20 px-0 sm:max-w-[980px]">
          <div className="flex min-h-full flex-col">
            <SheetHeader className="border-b border-border px-6 pb-6">
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="overflow-hidden rounded-[28px] border border-primary/15 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_42%),linear-gradient(135deg,hsl(var(--background)),hsl(var(--muted)/0.35))] p-6"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-primary">
                      <Shield className="h-3.5 w-3.5" />
                      School profile
                    </div>
                    <div>
                      <SheetTitle className="text-[28px] leading-tight tracking-[-0.02em]">
                        {profileForm.schoolName || "Manage your school profile"}
                      </SheetTitle>
                      <SheetDescription className="mt-2 max-w-2xl text-sm leading-6">
                        Review and update your school details from one place. Everything saved here goes straight to the backend and refreshes your live admin profile.
                      </SheetDescription>
                    </div>
                  </div>

                  <Illustration className="h-24 w-32 shrink-0 opacity-90" />
                </div>
              </motion.div>
            </SheetHeader>

            <div className="flex-1 space-y-6 px-6 py-6">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.08, ease: "easeOut" }}
                className="grid gap-6 xl:grid-cols-[280px,1fr]"
              >
                <div className="space-y-4 rounded-[28px] border border-border bg-card/95 p-5 shadow-sm">
                  <div className="rounded-[24px] border border-border bg-background/70 p-4 text-center">
                    <div className="mb-4 flex justify-center">
                      {hasProfileLogo ? (
                        <img
                          src={profileLogoPreview}
                          alt={profileForm.schoolName || "School logo"}
                          className="h-24 w-24 rounded-3xl border border-border object-cover shadow-sm"
                        />
                      ) : (
                        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary text-2xl font-semibold text-primary-foreground shadow-sm">
                          {initials}
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">School logo</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Used across the school portal and brand areas.
                    </p>
                  </div>

                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-foreground">
                      {profileForm.schoolName || "Your School"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {profileForm.adminName || "School Administrator"}
                    </p>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-border bg-background/70 p-4">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 text-primary" />
                      <span className="truncate">{profileForm.schoolEmail || "No school email added"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Globe className="h-4 w-4 text-primary" />
                      <span className="truncate">{websiteDisplay || "No website added"}</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                      <span>{profileForm.schoolAddress || "No address added"}</span>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">School logo</p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Upload a logo image or paste an image link if you already have one.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => logoUploadRef.current?.click()}
                      >
                        <ImagePlus className="h-4 w-4" />
                        Upload logo
                      </Button>
                      {profileForm.logo ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-2xl text-muted-foreground"
                          onClick={() => setProfileForm((current) => ({ ...current, logo: "" }))}
                        >
                          Remove logo
                        </Button>
                      ) : null}
                    </div>

                    <input
                      ref={logoUploadRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />

                    <Input
                      name="logo"
                      value={logoUrlInputValue}
                      onChange={handleProfileInputChange}
                      placeholder="Or paste a logo image URL"
                      className="rounded-2xl"
                    />
                    {profileForm.logo.startsWith("data:image") ? (
                      <p className="text-xs text-primary">Uploaded logo ready to save.</p>
                    ) : null}
                  </div>

                </div>

                <div className="space-y-6">
                  <section className="rounded-[28px] border border-border bg-card/95 p-5 shadow-sm">
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-foreground">School Information</h3>
                      <p className="text-sm text-muted-foreground">
                        Keep the main school details clear and up to date for your ERP.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <ProfileField label="School Name" icon={<Building2 className="h-3.5 w-3.5" />}>
                        <Input
                          name="schoolName"
                          value={profileForm.schoolName}
                          onChange={handleProfileInputChange}
                          placeholder="Enter school name"
                          className="rounded-2xl"
                        />
                      </ProfileField>
                      <ProfileField label="School Email" icon={<Mail className="h-3.5 w-3.5" />}>
                        <Input
                          name="schoolEmail"
                          type="email"
                          value={profileForm.schoolEmail}
                          onChange={handleProfileInputChange}
                          placeholder="school@example.com"
                          className="rounded-2xl"
                        />
                      </ProfileField>
                      <ProfileField label="School Phone" icon={<Phone className="h-3.5 w-3.5" />}>
                        <Input
                          name="schoolPhone"
                          value={profileForm.schoolPhone}
                          onChange={handleProfileInputChange}
                          placeholder="School contact number"
                          className="rounded-2xl"
                        />
                      </ProfileField>
                      <ProfileField label="School Website" icon={<Globe className="h-3.5 w-3.5" />}>
                        <Input
                          name="schoolWebsite"
                          value={profileForm.schoolWebsite}
                          onChange={handleProfileInputChange}
                          placeholder="https://school-website.com"
                          className="rounded-2xl"
                        />
                      </ProfileField>
                      <div className="md:col-span-2">
                        <ProfileField label="School Address" icon={<MapPin className="h-3.5 w-3.5" />}>
                          <Textarea
                            name="schoolAddress"
                            value={profileForm.schoolAddress}
                            onChange={handleProfileInputChange}
                            placeholder="Enter school address"
                            className="min-h-[110px] rounded-2xl"
                          />
                        </ProfileField>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-border bg-card/95 p-5 shadow-sm">
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-foreground">Admin Contact</h3>
                      <p className="text-sm text-muted-foreground">
                        Update the contact details used for the school admin account.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2 rounded-2xl border border-dashed border-primary/20 bg-background/80 p-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-4">
                            {hasAdminImage ? (
                              <img
                                src={adminImagePreview}
                                alt={profileForm.adminName || "Admin photo"}
                                className="h-20 w-20 rounded-full border border-border object-cover shadow-sm"
                              />
                            ) : (
                              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/12 text-xl font-semibold text-primary shadow-sm">
                                {initials}
                              </div>
                            )}

                            <div>
                              <h4 className="text-sm font-semibold text-foreground">Admin photo</h4>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                Upload the admin image here so it appears in the account profile.
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-2xl"
                              onClick={() => adminImageUploadRef.current?.click()}
                            >
                              <ImagePlus className="h-4 w-4" />
                              Upload admin photo
                            </Button>
                            {profileForm.adminImage ? (
                              <Button
                                type="button"
                                variant="ghost"
                                className="rounded-2xl text-muted-foreground"
                                onClick={() => setProfileForm((current) => ({ ...current, adminImage: "" }))}
                              >
                                Remove photo
                              </Button>
                            ) : null}
                          </div>
                        </div>

                        <input
                          ref={adminImageUploadRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAdminImageUpload}
                        />

                        <div className="mt-4">
                          <Input
                            name="adminImage"
                            value={adminImageInputValue}
                            onChange={handleProfileInputChange}
                            placeholder="Or paste an admin image URL"
                            className="rounded-2xl"
                          />
                          {profileForm.adminImage.startsWith("data:image") ? (
                            <p className="mt-2 text-xs text-primary">Uploaded admin photo ready to save.</p>
                          ) : null}
                        </div>
                      </div>

                      <ProfileField label="Admin Name" icon={<UserRound className="h-3.5 w-3.5" />}>
                        <Input
                          name="adminName"
                          value={profileForm.adminName}
                          onChange={handleProfileInputChange}
                          placeholder="Admin full name"
                          className="rounded-2xl"
                        />
                      </ProfileField>
                      <ProfileField label="Admin Email" icon={<Mail className="h-3.5 w-3.5" />}>
                        <Input
                          name="adminEmail"
                          type="email"
                          value={profileForm.adminEmail}
                          onChange={handleProfileInputChange}
                          placeholder="admin@example.com"
                          className="rounded-2xl"
                        />
                      </ProfileField>
                      <ProfileField label="Admin Phone" icon={<Phone className="h-3.5 w-3.5" />}>
                        <Input
                          name="adminPhone"
                          value={profileForm.adminPhone}
                          onChange={handleProfileInputChange}
                          placeholder="Admin phone number"
                          className="rounded-2xl"
                        />
                      </ProfileField>
                    </div>
                  </section>
                </div>
              </motion.div>

              {isProfileLoading ? (
                <div className="flex items-center justify-center gap-3 rounded-3xl border border-dashed border-primary/30 bg-primary/5 px-4 py-6 text-sm text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading the latest school profile...
                </div>
              ) : null}
            </div>

            <SheetFooter className="border-t border-border px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsProfileOpen(false)}
                className="rounded-2xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleProfileSave}
                disabled={isProfileSaving || isProfileLoading}
                className="rounded-2xl"
              >
                {isProfileSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
