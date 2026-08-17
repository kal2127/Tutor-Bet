import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, CalendarDays, CheckCircle, CreditCard, Edit3, Power, Save, Upload, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, BookingRecord, clearAuthSession, getCurrentUser, JobPost, TutorProfile } from "@/lib/api";
import { formatStatus, money, statusClass } from "@/lib/dashboard";
import { formatGradePricing, gradeBands, parseGradePricing, summarizeGradePricing } from "@/lib/pricing";
import { useToast } from "@/hooks/use-toast";

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/, "").replace(/\/$/, "");

function assetUrl(href?: string | null) {
  if (!href) return "";
  if (/^https?:\/\//i.test(href)) return href;
  return `${API_ORIGIN}${href.startsWith("/") ? href : `/${href}`}`;
}

const TutorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<TutorProfile | null>(null);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [applicationDrafts, setApplicationDrafts] = useState<Record<number, { message: string; proposed_rate: string }>>({});
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileFiles, setProfileFiles] = useState({
    profilePhoto: null as File | null,
    certifications: [] as File[],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [profileResult, bookingResult, jobResult] = await Promise.all([
        api.getTutorProfile(),
        api.listTutorBookings(),
        api.listOpenJobPosts(),
      ]);

      if (profileResult.status === "REJECTED" || !profileResult.is_active) {
        clearAuthSession();
        toast({
          title: "Account signed out",
          description: "Your tutor application was not approved, so your session has ended.",
          variant: "destructive",
        });
        navigate("/login", { replace: true });
        return;
      }

      setProfile(profileResult);
      setBookings(bookingResult.bookings || []);
      setJobs(
        (jobResult.job_posts || []).slice().sort((a, b) => {
          const aOpen = a.status === "OPEN" && !a.my_application_status ? 0 : 1;
          const bOpen = b.status === "OPEN" && !b.my_application_status ? 0 : 1;
          if (aOpen !== bOpen) return aOpen - bOpen;
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        }),
      );
    } catch (err) {
      const status = err instanceof Error && "status" in err ? (err as Error & { status?: number }).status : undefined;
      if (status === 401 || status === 403) {
        clearAuthSession();
        toast({
          title: "Account signed out",
          description: "Your tutor account is no longer active.",
          variant: "destructive",
        });
        navigate("/login", { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to load tutor dashboard");
    } finally {
      setLoading(false);
    }
  }, [navigate, toast]);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || user.role !== "TUTOR") {
      navigate("/login");
      return;
    }
    load();
  }, [load, navigate]);

  const updateProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    const grades = formatLinks(profile.grade_levels);
    const pricing = normalizePricingForGrades(profile.hourly_rates_by_grade, grades, profile.hourly_rate);
    const data = new FormData();
    data.append("bio", profile.bio || "");
    data.append("location_city", profile.location_city || "");
    data.append("location_area", profile.location_area || "");
    data.append("education", profile.education || "");
    data.append("experience_years", String(Number(profile.experience_years || 0)));
    data.append("hourly_rate", String(summaryHourlyRateNumber(pricing, profile.hourly_rate)));
    data.append("gender", profile.gender || "");
    data.append("employment_status", profile.employment_status || "");
    data.append("organization", profile.organization || "");
    if (profile.cgpa !== null && profile.cgpa !== undefined && profile.cgpa !== "") {
      data.append("cgpa", String(profile.cgpa));
    }
    data.append("grade_levels", JSON.stringify(grades));
    data.append("hourly_rates_by_grade", JSON.stringify(pricing));
    data.append("subjects", JSON.stringify(formatLinks(profile.subjects)));
    data.append("languages", JSON.stringify(formatLinks(profile.languages)));
    data.append("curriculum_options", JSON.stringify(formatLinks(profile.curriculum_options)));
    if (profileFiles.profilePhoto) {
      data.append("profile_photo", profileFiles.profilePhoto);
    }
    profileFiles.certifications.forEach((file) => data.append("certifications", file));

    try {
      await api.updateTutorProfile(data);
      setEditingProfile(false);
      setProfileFiles({ profilePhoto: null, certifications: [] });
      toast({ title: "Profile updated" });
      await load();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Could not update profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateAvailability = async (available: boolean) => {
    await api.updateTutorAvailability(available);
    setProfile((prev) => prev ? { ...prev, is_available: available } : prev);
    toast({ title: available ? "Availability enabled" : "Availability disabled" });
  };

  const apply = async (jobId: number) => {
    if (profile?.status !== "APPROVED") {
      toast({
        title: "You are not eligible yet",
        description: "You cannot apply to requests until the admin approves your tutor profile. Please wait for approval.",
        variant: "destructive",
      });
      return;
    }

    try {
      const draft = applicationDrafts[jobId] || { message: "", proposed_rate: "" };
      await api.applyToJobPost(jobId, {
        message: draft.message || undefined,
        proposed_rate: draft.proposed_rate ? Number(draft.proposed_rate) : undefined,
      });
      toast({
        title: "You successfully applied for this request",
        description: "The family will reach you if they choose you.",
      });
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId
            ? { ...job, my_application_status: "APPLIED" }
            : job,
        ),
      );
      setApplicationDrafts((prev) => ({ ...prev, [jobId]: { message: "", proposed_rate: "" } }));
    } catch (err) {
      toast({
        title: "Could not apply",
        description: err instanceof Error ? err.message : "Application failed",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tutor Dashboard</h1>
            <p className="text-muted-foreground">Manage profile, availability, bookings, and request applications.</p>
          </div>
          {profile && <Badge className={statusClass(profile.status)}>{formatStatus(profile.status)}</Badge>}
        </div>

        {error && <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

        {profile?.status === "PENDING" && (
          <div className="mb-6 rounded-xl border border-primary/20 bg-primary/10 p-5">
            <h2 className="text-lg font-semibold text-primary">Waiting for admin approval</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Thank you for submitting your tutor application. Your public tutor profile and request application access will be available after the admin approves your profile.
            </p>
          </div>
        )}

        {profile?.status === "REJECTED" && (
          <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 p-5">
            <h2 className="text-lg font-semibold text-destructive">Tutor application not approved</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your tutor profile is not eligible to apply to requests. Please contact support or update your application details.
            </p>
          </div>
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <Metric icon={CalendarDays} label="Bookings" value={bookings.length} />
          <Metric icon={Briefcase} label="Open requests" value={jobs.length} />
          <Metric icon={Power} label="Available" value={profile?.is_available ? "Yes" : "No"} />
          <Metric icon={CreditCard} label="Billing" value={profile?.billing_status || "-"} />
        </div>

        {loading || !profile ? (
          <div className="py-20 text-center text-muted-foreground">Loading dashboard...</div>
        ) : (
          <Tabs defaultValue={profile.status === "APPROVED" ? "jobs" : "profile"}>
            <TabsList className="mb-4">
              <TabsTrigger value="jobs">New Requests</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle>{profile.status === "APPROVED" ? "Public Tutor Profile" : "Tutor Application Status"}</CardTitle>
                    {profile.status === "APPROVED" && (
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <Button
                          type="button"
                          variant={editingProfile ? "outline" : "default"}
                          size="sm"
                          onClick={() => setEditingProfile((current) => !current)}
                          className="gap-2"
                        >
                          {editingProfile ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                          {editingProfile ? "Cancel edit" : "Edit profile"}
                        </Button>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Available</span>
                          <Switch checked={Boolean(profile.is_available)} onCheckedChange={updateAvailability} />
                        </div>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {profile.status !== "APPROVED" ? (
                    <div className="space-y-5">
                      <div className="rounded-xl border border-primary/20 bg-primary/10 p-5">
                        <h2 className="text-xl font-semibold text-primary">Your profile is being reviewed by admin</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Thank you for submitting your tutor application. Your public profile will appear on Tutor ቤት after the admin approves your documents and profile details.
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Until then, you can view your submitted information, but you cannot edit your public profile, appear in tutor search, or apply to family requests.
                        </p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Full name"><Input value={profile.full_name} disabled /></Field>
                        <Field label="Email"><Input value={profile.email} disabled /></Field>
                        <Field label="City"><Input value={profile.location_city || "-"} disabled /></Field>
                        <Field label="Area"><Input value={profile.location_area || "-"} disabled /></Field>
                        <Field label="Education"><Input value={profile.education || "-"} disabled /></Field>
                        <Field label="Pricing"><Input value={summarizeGradePricing(profile.hourly_rates_by_grade, profile.hourly_rate)} disabled /></Field>
                        <Field label="Experience years"><Input value={profile.experience_years ?? 0} disabled /></Field>
                        <Field label="Application status"><Input value={formatStatus(profile.status)} disabled /></Field>
                        <div className="md:col-span-2"><Field label="Bio"><Textarea value={profile.bio || "-"} disabled rows={4} /></Field></div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="rounded-xl border border-border bg-muted/20 p-5">
                        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-4">
                            {profile.profile_photo_url ? (
                              <img src={assetUrl(profile.profile_photo_url)} alt={profile.full_name} className="h-24 w-24 rounded-xl object-cover ring-2 ring-primary/20" />
                            ) : (
                              <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-primary/10 text-3xl font-bold text-primary">
                                {profile.full_name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-2xl font-bold">{profile.full_name}</h2>
                                <Badge className={statusClass(profile.status)}>{formatStatus(profile.status)}</Badge>
                              </div>
                              <p className="mt-1 text-muted-foreground">{profile.email} · {profile.phone || "No phone"}</p>
                              <p className="text-muted-foreground">{[profile.location_city, profile.location_area].filter(Boolean).join(", ") || "Location not specified"}</p>
                            </div>
                          </div>
                          <div className="rounded-lg bg-background p-4 text-center">
                            <p className="text-sm text-muted-foreground">Public visibility</p>
                            <p className="text-xl font-bold text-secondary">{profile.is_available ? "Available" : "Paused"}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-4">
                        <ProfileStat label="Pricing" value={summarizeGradePricing(profile.hourly_rates_by_grade, profile.hourly_rate)} />
                        <ProfileStat label="Experience" value={`${profile.experience_years ?? 0} years`} />
                        <ProfileStat label="Education" value={profile.education || "-"} />
                        <ProfileStat label="Billing" value={profile.billing_status || "-"} />
                      </div>

                      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                        <Card>
                          <CardHeader><CardTitle>About</CardTitle></CardHeader>
                          <CardContent className="space-y-4">
                            <p className="whitespace-pre-line text-sm text-muted-foreground">{profile.bio || "No bio provided."}</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <ProfileInfo label="Gender" value={profile.gender || "-"} />
                              <ProfileInfo label="Current status" value={profile.employment_status || "-"} />
                              <ProfileInfo label="Organization" value={profile.organization || "-"} />
                              <ProfileInfo label="CGPA" value={profile.cgpa || "-"} />
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader><CardTitle>Account</CardTitle></CardHeader>
                          <CardContent className="space-y-3">
                            <ProfileInfo label="Renewal date" value={profile.next_renewal_date || "-"} />
                            <ProfileInfo label="Registration paid" value={profile.registration_paid ? "Yes" : "No"} />
                            <ProfileInfo label="Availability" value={profile.is_available ? "Available for requests" : "Paused"} />
                            <div className="flex items-center justify-between rounded-lg border border-border p-3">
                              <span className="text-sm text-muted-foreground">Accepting requests</span>
                              <Switch checked={Boolean(profile.is_available)} onCheckedChange={updateAvailability} />
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {editingProfile && (
                        <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
                          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">Edit Public Profile</h3>
                              <p className="text-sm text-muted-foreground">
                                Update your profile like a professional portfolio: add grade levels, subjects, certifications, awards, and profile details whenever they change.
                              </p>
                            </div>
                          </div>
                          <form onSubmit={updateProfile} className="grid gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                              <Field label="Profile photo">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                  {profileFiles.profilePhoto ? (
                                    <img src={URL.createObjectURL(profileFiles.profilePhoto)} alt="New profile preview" className="h-20 w-20 rounded-xl object-cover ring-2 ring-primary/30" />
                                  ) : profile.profile_photo_url ? (
                                    <img src={assetUrl(profile.profile_photo_url)} alt={profile.full_name} className="h-20 w-20 rounded-xl object-cover ring-2 ring-primary/20" />
                                  ) : (
                                    <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold text-primary">
                                      {profile.full_name.charAt(0)}
                                    </div>
                                  )}
                                  <Input type="file" accept="image/*" onChange={(e) => setProfileFiles((prev) => ({ ...prev, profilePhoto: e.target.files?.[0] || null }))} />
                                </div>
                              </Field>
                            </div>
                            <Field label="City">
                              <Input value={profile.location_city || ""} onChange={(e) => setProfile({ ...profile, location_city: e.target.value })} />
                            </Field>
                            <Field label="Area">
                              <Input value={profile.location_area || ""} onChange={(e) => setProfile({ ...profile, location_area: e.target.value })} />
                            </Field>
                            <Field label="Education">
                              <Input value={profile.education || ""} onChange={(e) => setProfile({ ...profile, education: e.target.value })} />
                            </Field>
                            <Field label="Experience years">
                              <Input type="number" min="0" value={profile.experience_years ?? 0} onChange={(e) => setProfile({ ...profile, experience_years: Number(e.target.value) })} />
                            </Field>
                            <Field label="Gender">
                              <Input value={profile.gender || ""} onChange={(e) => setProfile({ ...profile, gender: e.target.value })} />
                            </Field>
                            <Field label="Current status">
                              <Input value={profile.employment_status || ""} onChange={(e) => setProfile({ ...profile, employment_status: e.target.value })} placeholder="Student, employed, self-employed..." />
                            </Field>
                            <Field label="Organization">
                              <Input value={profile.organization || ""} onChange={(e) => setProfile({ ...profile, organization: e.target.value })} />
                            </Field>
                            <Field label="CGPA">
                              <Input type="number" min="0" step="0.01" value={profile.cgpa ?? ""} onChange={(e) => setProfile({ ...profile, cgpa: e.target.value })} />
                            </Field>
                            <div className="md:col-span-2">
                              <GradeLevelEditor profile={profile} setProfile={setProfile} />
                            </div>
                            <div className="md:col-span-2">
                              <EditGradePricing profile={profile} setProfile={setProfile} />
                            </div>
                            <ListEditor label="Subjects" value={profile.subjects} onChange={(items) => setProfile({ ...profile, subjects: items })} placeholder="Math, Physics, English" />
                            <ListEditor label="Languages" value={profile.languages} onChange={(items) => setProfile({ ...profile, languages: items })} placeholder="Amharic, English, Afaan Oromo" />
                            <div className="md:col-span-2">
                              <ListEditor label="Curriculum options" value={profile.curriculum_options} onChange={(items) => setProfile({ ...profile, curriculum_options: items })} placeholder="Ethiopian, Cambridge, American, International" />
                            </div>
                            <div className="md:col-span-2">
                              <Field label="Add certifications or awards">
                                <Input
                                  type="file"
                                  accept="image/*,.pdf"
                                  multiple
                                  onChange={(e) => setProfileFiles((prev) => ({
                                    ...prev,
                                    certifications: Array.from(e.target.files || []),
                                  }))}
                                />
                                {profileFiles.certifications.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {profileFiles.certifications.map((file) => (
                                      <span key={`${file.name}-${file.size}`} className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                                        <Upload className="mr-1 inline h-3 w-3" />
                                        {file.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </Field>
                            </div>
                            <div className="md:col-span-2">
                              <Field label="Bio">
                                <Textarea rows={4} value={profile.bio || ""} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
                              </Field>
                            </div>
                            <div className="md:col-span-2">
                              <Button type="submit" disabled={saving} className="gap-2">
                                <Save className="h-4 w-4" />
                                {saving ? "Saving..." : "Save profile"}
                              </Button>
                            </div>
                          </form>
                        </div>
                      )}

                      <Card>
                        <CardHeader><CardTitle>Teaching Scope</CardTitle></CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                          <TagList label="Grade levels" value={profile.grade_levels} />
                          <PricingList value={profile.hourly_rates_by_grade} fallback={profile.hourly_rate} />
                          <TagList label="Subjects" value={profile.subjects} />
                          <TagList label="Languages" value={profile.languages} />
                          <TagList label="Curriculum" value={profile.curriculum_options} />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader><CardTitle>Certifications</CardTitle></CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {formatLinks(profile.certification_urls).map((url, index) => (
                              <a key={url} href={assetUrl(url)} target="_blank" rel="noreferrer" className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10">
                                Certificate {index + 1}
                              </a>
                            ))}
                            {formatLinks(profile.certification_urls).length === 0 && (
                              <p className="text-sm text-muted-foreground">No certifications uploaded.</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bookings">
              <Card>
                <CardHeader><CardTitle>Tutor Bookings</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Family</TableHead><TableHead>Schedule</TableHead><TableHead>Payment</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {bookings.map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>{booking.student_name || "-"}</TableCell>
                          <TableCell>{booking.family_name || booking.family_id}</TableCell>
                          <TableCell>{booking.start_time || "-"}</TableCell>
                          <TableCell>{money(booking.amount)} · {booking.payment_status || "-"}</TableCell>
                          <TableCell><Badge className={statusClass(booking.status)}>{formatStatus(booking.status)}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {bookings.length === 0 && <p className="py-8 text-center text-muted-foreground">No bookings yet.</p>}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="jobs">
              <div className="space-y-4">
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">New tutoring jobs</h2>
                      <p className="text-sm text-muted-foreground">
                        New open requests are shown first so you can apply quickly.
                      </p>
                    </div>
                    <Badge className="w-fit border-0 bg-primary text-primary-foreground">
                      {jobs.filter((job) => job.status === "OPEN" && !job.my_application_status).length} new
                    </Badge>
                  </CardContent>
                </Card>
                {jobs.map((job) => {
                  const draft = applicationDrafts[job.id] || { message: "", proposed_rate: "" };
                  const alreadyApplied = Boolean(job.my_application_status);
                  const canApply = profile.status === "APPROVED" && job.status === "OPEN" && !alreadyApplied;
                  return (
                    <Card key={job.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <CardTitle>{job.title}</CardTitle>
                            <p className="text-sm text-muted-foreground">{job.subject || "General"} · {job.grade} · {money(job.budget)}</p>
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            {job.status === "OPEN" && !alreadyApplied && (
                              <Badge className="border-0 bg-primary text-primary-foreground">New</Badge>
                            )}
                            {alreadyApplied && (
                              <Badge className={statusClass(job.my_application_status || "APPLIED")}>
                                {formatStatus(job.my_application_status || "APPLIED")}
                              </Badge>
                            )}
                            <Badge className={statusClass(job.status)}>{formatStatus(job.status)}</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="grid gap-4 lg:grid-cols-[1fr_360px]">
                        <div>
                          <p className="text-sm text-muted-foreground">{job.description || "No description provided."}</p>
                          <p className="mt-3 text-sm">{job.days_per_week} days/week · {job.hours_per_day} hours/day · {job.session_type.replace("_", " ").toLowerCase()}</p>
                        </div>
                        <div className="space-y-2">
                          <Input disabled={!canApply} placeholder="Proposed rate" type="number" value={draft.proposed_rate} onChange={(e) => setApplicationDrafts((prev) => ({ ...prev, [job.id]: { ...draft, proposed_rate: e.target.value } }))} />
                          <Textarea disabled={!canApply} placeholder="Short message to family" value={draft.message} onChange={(e) => setApplicationDrafts((prev) => ({ ...prev, [job.id]: { ...draft, message: e.target.value } }))} />
                          {profile.status !== "APPROVED" && (
                            <p className="rounded-lg bg-primary/10 p-3 text-sm text-primary">
                              You are not eligible to apply until admin approves your tutor profile.
                            </p>
                          )}
                          {alreadyApplied && (
                            <p className="rounded-lg bg-secondary/10 p-3 text-sm text-secondary">
                              You successfully applied for this request. The family will reach you if they choose you.
                            </p>
                          )}
                          {job.status !== "OPEN" && (
                            <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                              This request is {formatStatus(job.status).toLowerCase()}, so it is no longer accepting new applications.
                            </p>
                          )}
                          <Button disabled={!canApply} onClick={() => apply(job.id)} className="w-full gap-2">
                            <CheckCircle className="h-4 w-4" />
                            {alreadyApplied ? "Applied" : job.status === "OPEN" ? "Apply" : "Closed"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {jobs.length === 0 && <Card><CardContent className="py-10 text-center text-muted-foreground">No open requests right now.</CardContent></Card>}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
  );
};

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number | string }) {
  return <Card><CardContent className="flex items-center gap-4 p-5"><Icon className="h-7 w-7 text-primary" /><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div></CardContent></Card>;
}

function ProfileStat({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-bold">{value || "-"}</p>
      </CardContent>
    </Card>
  );
}

function ProfileInfo({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value || "-"}</p>
    </div>
  );
}

function formatLinks(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [value];
  } catch {
    return [value];
  }
}

function TagList({ label, value }: { label: string; value: unknown }) {
  const items = formatLinks(value);
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.length ? (
          items.map((item) => (
            <span key={item} className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">Not specified</span>
        )}
      </div>
    </div>
  );
}

function PricingList({ value, fallback }: { value: unknown; fallback?: number | string | null }) {
  const items = formatGradePricing(value);
  return (
    <div>
      <p className="mb-2 text-sm font-medium">Grade pricing</p>
      <div className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <div key={item} className="rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
              {item}
            </div>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">{summarizeGradePricing(value, fallback)}</span>
        )}
      </div>
    </div>
  );
}

function GradeLevelEditor({
  profile,
  setProfile,
}: {
  profile: TutorProfile;
  setProfile: React.Dispatch<React.SetStateAction<TutorProfile | null>>;
}) {
  const selected = formatLinks(profile.grade_levels);
  const selectedSet = new Set(selected);

  const toggleGrade = (grade: string, checked: boolean) => {
    const nextGrades = checked
      ? [...selected, grade]
      : selected.filter((item) => item !== grade);
    const pricing = parseGradePricing(profile.hourly_rates_by_grade);

    if (checked && !pricing[grade]) {
      pricing[grade] = { mode: "NEGOTIATION" };
    }
    if (!checked) {
      delete pricing[grade];
    }

    setProfile({
      ...profile,
      grade_levels: nextGrades,
      hourly_rates_by_grade: pricing,
      hourly_rate: summaryHourlyRateNumber(pricing, profile.hourly_rate),
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <p className="text-sm font-medium">Grade levels</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {gradeBands.map((grade) => (
          <label key={grade} className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={selectedSet.has(grade)}
              onChange={(e) => toggleGrade(grade, e.target.checked)}
            />
            {grade}
          </label>
        ))}
      </div>
    </div>
  );
}

function ListEditor({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: unknown;
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <Input
        value={formatLinks(value).join(", ")}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          )
        }
        placeholder={placeholder}
      />
      <p className="text-xs text-muted-foreground">Separate multiple items with commas.</p>
    </Field>
  );
}

function EditGradePricing({
  profile,
  setProfile,
}: {
  profile: TutorProfile;
  setProfile: React.Dispatch<React.SetStateAction<TutorProfile | null>>;
}) {
  const grades = formatLinks(profile.grade_levels);
  const pricing = parseGradePricing(profile.hourly_rates_by_grade);

  if (grades.length === 0) {
    return (
      <Field label="Hourly rate">
        <Input
          type="number"
          min="0"
          value={profile.hourly_rate ?? 0}
          onChange={(e) => setProfile({ ...profile, hourly_rate: Number(e.target.value) })}
        />
      </Field>
    );
  }

  const updatePricing = (grade: string, patch: { mode?: "FIXED" | "NEGOTIATION"; amount?: string }) => {
    const nextPricing = {
      ...pricing,
      [grade]: {
        mode: pricing[grade]?.mode || "FIXED",
        amount: pricing[grade]?.amount || "",
        ...patch,
      },
    };
    const nextHourlyRate = summaryHourlyRateNumber(nextPricing, profile.hourly_rate);
    setProfile({
      ...profile,
      hourly_rates_by_grade: nextPricing,
      hourly_rate: nextHourlyRate,
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <p className="text-sm font-medium">Hourly rate by grade</p>
      {grades.map((grade) => {
        const entry = pricing[grade] || { mode: "FIXED", amount: "" };
        return (
          <div key={grade} className="grid gap-3 rounded-lg border border-border bg-background p-3 md:grid-cols-[150px_180px_1fr] md:items-center">
            <p className="font-medium">{grade}</p>
            <select
              value={entry.mode}
              onChange={(e) => updatePricing(grade, { mode: e.target.value as "FIXED" | "NEGOTIATION" })}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="FIXED">Fixed rate</option>
              <option value="NEGOTIATION">By negotiation</option>
            </select>
            {entry.mode === "NEGOTIATION" ? (
              <p className="text-sm text-muted-foreground">Family will negotiate this band.</p>
            ) : (
              <Input
                type="number"
                min="1"
                value={entry.amount ?? ""}
                onChange={(e) => updatePricing(grade, { amount: e.target.value })}
                placeholder="ETB per hour"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function normalizePricingForGrades(value: unknown, grades: string[], fallback?: number | string | null) {
  const pricing = parseGradePricing(value);
  return grades.reduce<Record<string, { mode: "FIXED" | "NEGOTIATION"; amount?: number }>>(
    (acc, grade) => {
      const entry = pricing[grade];
      if (entry?.mode === "FIXED") {
        const amount = Number(entry.amount);
        acc[grade] = {
          mode: "FIXED",
          amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
        };
      } else {
        acc[grade] = { mode: "NEGOTIATION" };
      }
      return acc;
    },
    {},
  );
}

function summaryHourlyRateNumber(value: unknown, fallback?: number | string | null) {
  const pricing = parseGradePricing(value);
  const amounts = Object.values(pricing)
    .filter((entry) => entry?.mode === "FIXED")
    .map((entry) => Number(entry.amount))
    .filter((amount) => Number.isFinite(amount) && amount > 0);
  if (amounts.length) return Math.min(...amounts);
  const fallbackAmount = Number(fallback);
  return Number.isFinite(fallbackAmount) && fallbackAmount > 0 ? fallbackAmount : 0;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

export default TutorDashboard;
