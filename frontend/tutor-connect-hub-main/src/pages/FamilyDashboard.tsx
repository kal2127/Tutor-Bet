import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Briefcase, CalendarDays, CheckCircle, CreditCard, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api, BookingRecord, getCurrentUser, JobApplication, JobPost } from "@/lib/api";
import { formatStatus, money, statusClass } from "@/lib/dashboard";
import { formatGradePricing } from "@/lib/pricing";
import { useToast } from "@/hooks/use-toast";

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/, "").replace(/\/$/, "");

function assetUrl(href?: string | null) {
  if (!href) return "";
  if (/^https?:\/\//i.test(href)) return href;
  return `${API_ORIGIN}${href.startsWith("/") ? href : `/${href}`}`;
}

const emptyPost = {
  description: "",
  grade: "",
  curriculum: "",
  subject: "",
  location_note: "",
  session_type: "ONLINE" as "ONLINE" | "IN_PERSON",
  days_per_week: 3,
  hours_per_day: 1,
  budget_mode: "NEGOTIABLE" as "FIXED" | "AS_TUTOR_WANTS" | "NEGOTIABLE",
  budget: "",
  request_payment_transaction_ref: "",
  request_payment_receipt: null as File | null,
};

const FamilyDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "bookings");
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [applicationsByJob, setApplicationsByJob] = useState<Record<number, JobApplication[]>>({});
  const [form, setForm] = useState(emptyPost);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [bookingResult, jobResult] = await Promise.all([
        api.listMyBookings(),
        api.listFamilyJobPosts(),
      ]);
      setBookings(bookingResult.bookings || []);
      setJobPosts(jobResult.job_posts || []);

      const applicationPairs = await Promise.all(
        (jobResult.job_posts || []).map(async (job) => {
          const result = await api.listJobApplications(job.id);
          return [job.id, result.applications || []] as const;
        }),
      );
      setApplicationsByJob(Object.fromEntries(applicationPairs));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load family dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || user.role !== "FAMILY") {
      navigate(`/login?next=${encodeURIComponent("/family/dashboard?tab=new")}`);
      return;
    }
    load();
  }, [load, navigate]);

  const createPost = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const budgetPreference =
        form.budget_mode === "FIXED"
          ? `Budget per hour: ${form.budget || 0} ETB`
          : form.budget_mode === "AS_TUTOR_WANTS"
            ? "Budget per hour: as requested by the tutor"
            : "Budget per hour: negotiable";
      const description = [form.description, budgetPreference]
        .filter(Boolean)
        .join("\n\n");

      if (!form.request_payment_receipt) {
        toast({ title: "Receipt required", description: "Upload the payment receipt before posting your request.", variant: "destructive" });
        return;
      }

      const payload = new FormData();
      payload.append("title", `${form.subject || "Tutor"} request for ${form.grade}`);
      payload.append("description", description);
      payload.append("student_name", "Student");
      payload.append("grade", form.grade);
      payload.append("curriculum", form.curriculum);
      payload.append("subject", form.subject);
      payload.append("location_note", form.location_note);
      payload.append("session_type", form.session_type);
      payload.append("days_per_week", String(form.days_per_week));
      payload.append("hours_per_day", String(form.hours_per_day));
      if (form.budget_mode === "FIXED" && form.budget) {
        payload.append("budget", form.budget);
      }
      if (form.request_payment_transaction_ref) {
        payload.append("request_payment_transaction_ref", form.request_payment_transaction_ref);
      }
      payload.append("request_payment_receipt", form.request_payment_receipt);

      await api.createJobPost(payload);
      setForm(emptyPost);
      toast({ title: "Request submitted", description: "Admin will approve it after reviewing your payment receipt." });
      await load();
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Could not create request", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const selectApplication = async (jobId: number, applicationId: number) => {
    await api.selectJobApplication(jobId, applicationId);
    toast({ title: "Tutor selected", description: "A booking has been created for this request." });
    await load();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Family Dashboard</h1>
            <p className="text-muted-foreground">Manage bookings, tutor requests, applications, and payment approvals.</p>
          </div>
        </div>

        {error && <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          <Metric icon={CalendarDays} label="Bookings" value={bookings.length} />
          <Metric icon={Briefcase} label="Requests" value={jobPosts.length} />
          <Metric icon={Users} label="Applications" value={Object.values(applicationsByJob).flat().length} />
          <Metric icon={CreditCard} label="Pending approvals" value={bookings.filter((b) => b.status.includes("PAYMENT") || b.payment_status === "PENDING").length} />
        </div>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground">Loading dashboard...</div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="jobs">Requests</TabsTrigger>
              <TabsTrigger value="new">Post Request</TabsTrigger>
            </TabsList>

            <TabsContent value="bookings">
              <Card>
                <CardHeader><CardTitle>Bookings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="rounded-lg border border-border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="border-0 bg-secondary/15 text-secondary">Booked</Badge>
                            <p className="font-medium">{booking.student_name || "Student"} with {booking.tutor_name || `Tutor #${booking.tutor_id}`}</p>
                            <Badge className={statusClass(booking.status)}>{formatStatus(booking.status)}</Badge>
                            <Badge className={statusClass(booking.payment_status || "PENDING")}>
                              Payment {formatStatus(booking.payment_status || "PENDING")}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {booking.grade || "General"} / {booking.curriculum || "General"}
                          </p>
                        </div>
                        <div className="rounded-md bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
                          {money(booking.amount)}
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <Info label="Grade" value={booking.grade || "General"} />
                        <Info label="Curriculum" value={booking.curriculum || "General"} />
                        <Info label="Schedule" value={`${booking.days_per_week || "-"} days/week, ${booking.hours_per_day || "-"} hours/day`} />
                        <Info label="Session" value={(booking.session_type || "ONLINE").replace("_", " ").toLowerCase()} />
                        <Info
                          label="Admin review"
                          value={
                            booking.status === "PENDING_VERIFICATION"
                              ? "Receipt submitted. Waiting for admin approval."
                              : formatStatus(booking.status)
                          }
                        />
                        <Info label="Transaction ref" value={booking.transaction_ref || "Not provided"} />
                        <Info label="Receipt" value={booking.receipt_url ? "Uploaded" : "Missing"} />
                        <Info label="Tutor Fayda ID" value={<DocumentLink href={booking.tutor_fayda_id_url} label={booking.tutor_fayda_id_url ? "View Fayda ID" : "Not available"} />} />
                        <Info label="Location / requirement" value={booking.location_note || "Not provided"} />
                      </div>
                    </div>
                  ))}
                  {bookings.length === 0 && <p className="py-8 text-center text-muted-foreground">No bookings yet.</p>}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="jobs">
              <div className="space-y-4">
                {jobPosts.map((job) => (
                  <Card key={job.id}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <CardTitle className="text-2xl">{job.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Submitted {job.created_at ? new Date(job.created_at).toLocaleDateString() : "recently"}
                          </p>
                        </div>
                        <Badge className={statusClass(job.status)}>{formatStatus(job.status)}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Info label="Subject" value={job.subject || "General"} />
                        <Info label="Grade" value={job.grade} />
                        <Info label="Curriculum" value={job.curriculum} />
                        <Info label="Budget" value={money(job.budget)} />
                        <Info label="Schedule" value={`${job.days_per_week} days/week, ${job.hours_per_day} hours/day`} />
                        <Info label="Session" value={job.session_type.replace("_", " ").toLowerCase()} />
                        <Info label="Location" value={job.location_note || "Not specified"} />
                        <Info label="Request payment status" value={money(job.request_payment_amount)} />
                        <Info label="Transaction ref" value={job.request_payment_transaction_ref || "Not provided"} />
                        <Info label="Receipt" value={job.request_payment_receipt_url ? "Uploaded" : "Missing"} />
                      </div>
                      <div>
                        <p className="mb-1 text-sm font-medium">Description</p>
                        <p className="whitespace-pre-line text-sm text-muted-foreground">{job.description || "No description provided."}</p>
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Tutor Applications</p>
                        {(applicationsByJob[job.id] || []).map((application) => (
                          <div key={application.id} className="rounded-lg border border-border bg-background p-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="flex gap-4">
                                {application.profile_photo_url ? (
                                  <img src={application.profile_photo_url} alt={application.full_name || "Tutor"} className="h-16 w-16 rounded-lg object-cover" />
                                ) : (
                                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                                    {(application.full_name || "T").charAt(0)}
                                  </div>
                                )}
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-lg font-semibold">{application.full_name}</p>
                                    <Badge className={statusClass(application.status)}>{formatStatus(application.status)}</Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{application.email || "-"} / {application.phone || "-"}</p>
                                  <p className="text-sm text-muted-foreground">{[application.location_city, application.location_area].filter(Boolean).join(", ") || "Location not specified"}</p>
                                </div>
                              </div>
                              {job.status === "OPEN" && application.status === "APPLIED" && (
                                <Button size="sm" onClick={() => selectApplication(job.id, application.id)} className="gap-1">
                                  <CheckCircle className="h-4 w-4" />
                                  Select
                                </Button>
                              )}
                            </div>
                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                              <Info label="Education" value={application.education || "-"} />
                              <Info label="Experience" value={`${application.experience_years ?? 0} years`} />
                              <Info label="Rate" value={money(application.proposed_rate || application.hourly_rate)} />
                              <Info label="Grade pricing" value={formatPricing(application.hourly_rates_by_grade)} />
                              <Info label="Gender" value={application.gender || "-"} />
                              <Info label="Organization" value={application.organization || "-"} />
                              <Info label="CGPA" value={application.cgpa || "-"} />
                              <Info label="Grades" value={formatList(application.grade_levels)} />
                              <Info label="Subjects" value={formatList(application.subjects)} />
                              <Info label="Languages" value={formatList(application.languages)} />
                              <Info label="Curriculum" value={formatList(application.curriculum_options)} />
                            </div>
                            {application.bio && (
                              <p className="mt-3 text-sm text-muted-foreground"><span className="font-medium text-foreground">Bio:</span> {application.bio}</p>
                            )}
                            {application.message && (
                              <p className="mt-2 text-sm text-muted-foreground"><span className="font-medium text-foreground">Application message:</span> {application.message}</p>
                            )}
                            <div className="mt-3 flex flex-wrap gap-2">
                              <DocumentLink href={application.profile_photo_url} label="Photo" />
                              {formatLinks(application.certification_urls).map((url, index) => (
                                <DocumentLink key={url} href={url} label={`Certificate ${index + 1}`} />
                              ))}
                              <DocumentLink href={application.highschool_transcript_url} label="Transcript" />
                              <DocumentLink href={application.tempo_url} label="Tempo" />
                            </div>
                          </div>
                        ))}
                        {(applicationsByJob[job.id] || []).length === 0 && (
                          <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">No tutors have applied yet.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {jobPosts.length === 0 && <Card><CardContent className="py-10 text-center text-muted-foreground">No requests yet.</CardContent></Card>}
              </div>
            </TabsContent>

            <TabsContent value="new">
              <Card>
                <CardHeader><CardTitle>Post a Tutor Request</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={createPost} className="grid gap-4 md:grid-cols-2">
                    <Field label="Subject"><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
                    <Field label="Grade"><Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} required /></Field>
                    <Field label="Curriculum">
                      <Select value={form.curriculum} onValueChange={(value) => setForm({ ...form, curriculum: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose curriculum" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ethiopian">Ethiopian</SelectItem>
                          <SelectItem value="Cambridge">Cambridge</SelectItem>
                          <SelectItem value="American">American</SelectItem>
                          <SelectItem value="International">International</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Budget per hour">
                      <Select
                        value={form.budget_mode}
                        onValueChange={(value: "FIXED" | "AS_TUTOR_WANTS" | "NEGOTIABLE") =>
                          setForm({ ...form, budget_mode: value, budget: value === "FIXED" ? form.budget : "" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NEGOTIABLE">By negotiation</SelectItem>
                          <SelectItem value="AS_TUTOR_WANTS">As requested by the tutor</SelectItem>
                          <SelectItem value="FIXED">Enter amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    {form.budget_mode === "FIXED" && (
                      <Field label="Amount per hour">
                        <Input type="number" min="0" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
                      </Field>
                    )}
                    <Field label="Payment transaction ref">
                      <Input value={form.request_payment_transaction_ref} onChange={(e) => setForm({ ...form, request_payment_transaction_ref: e.target.value })} placeholder="Bank transfer or receipt reference" />
                    </Field>
                    <Field label="Payment receipt">
                      <Input type="file" accept="image/*,.pdf" onChange={(e) => setForm({ ...form, request_payment_receipt: e.target.files?.[0] || null })} required />
                    </Field>
                    <Field label="Days per week"><Input type="number" min="1" value={form.days_per_week} onChange={(e) => setForm({ ...form, days_per_week: Number(e.target.value) })} required /></Field>
                    <Field label="Hours per day"><Input type="number" min="1" value={form.hours_per_day} onChange={(e) => setForm({ ...form, hours_per_day: Number(e.target.value) })} required /></Field>
                    <Field label="Location or online preference"><Input value={form.location_note} onChange={(e) => setForm({ ...form, location_note: e.target.value })} /></Field>
                    <div className="md:col-span-2"><Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
                    <div className="md:col-span-2"><Button disabled={saving} className="bg-gradient-primary text-primary-foreground">{saving ? "Creating..." : "Post request"}</Button></div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
  );
};

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return <Card><CardContent className="flex items-center gap-4 p-5"><Icon className="h-7 w-7 text-primary" /><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div></CardContent></Card>;
}

function Info({ label, value }: { label: string; value?: React.ReactNode }) {
  return <div className="rounded-md bg-background p-3"><p className="text-xs font-medium uppercase text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold text-foreground">{value || "Not specified"}</p></div>;
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

function formatList(value: unknown) {
  const list = formatLinks(value);
  return list.length ? list.join(", ") : "-";
}

function formatPricing(value: unknown) {
  const items = formatGradePricing(value);
  return items.length ? items.join(", ") : "-";
}

function DocumentLink({ href, label }: { href?: string | null; label: string }) {
  if (!href) return <span className="text-xs text-muted-foreground">{label}</span>;
  return (
    <a href={assetUrl(href)} target="_blank" rel="noreferrer" className="rounded-md border border-border px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10">
      {label}
    </a>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

export default FamilyDashboard;
