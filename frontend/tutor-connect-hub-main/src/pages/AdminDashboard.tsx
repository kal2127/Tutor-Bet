import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle,
  CreditCard,
  ExternalLink,
  LogOut,
  MessageSquare,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import {
  AdminFeedback,
  AdminFamily,
  AdminTutor,
  api,
  BookingRecord,
  clearAuthSession,
  getCurrentUser,
  JobPost,
  PendingPayment,
  PendingTutor,
} from "@/lib/api";
import { formatGradePricing, summarizeGradePricing } from "@/lib/pricing";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Navbar from "@/components/Navbar";

const statusBadge = (status: string) => {
  const normalized = status.toLowerCase();
  const map: Record<string, string> = {
    confirmed: "bg-secondary/15 text-secondary",
    paid: "bg-secondary/15 text-secondary",
    approved: "bg-secondary/15 text-secondary",
    active: "bg-secondary/15 text-secondary",
    pending: "bg-primary/15 text-primary",
    pending_payment: "bg-primary/15 text-primary",
    pending_verification: "bg-primary/15 text-primary",
    pending_approval: "bg-primary/15 text-primary",
    rejected: "bg-destructive/15 text-destructive",
    failed: "bg-destructive/15 text-destructive",
    payment_rejected: "bg-destructive/15 text-destructive",
    cancelled: "bg-destructive/15 text-destructive",
    disabled: "bg-destructive/15 text-destructive",
  };

  return (
    <Badge className={`${map[normalized] || ""} border-0 capitalize`}>
      {status.replace(/_/g, " ").toLowerCase()}
    </Badge>
  );
};

function parseList(value: unknown) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [value];
  }
}

function formatPricing(value: unknown) {
  const items = formatGradePricing(value);
  return items.length ? items.join(", ") : "-";
}

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/, "").replace(/\/$/, "");

function assetUrl(href?: string | null) {
  if (!href) return "";
  if (/^https?:\/\//i.test(href)) return href;
  return `${API_ORIGIN}${href.startsWith("/") ? href : `/${href}`}`;
}

function DocumentLink({ href, label }: { href?: string | null; label: string }) {
  if (!href) return <span className="text-xs text-muted-foreground">{label}: missing</span>;
  return (
    <a href={assetUrl(href)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

const AdminDashboard: React.FC = () => {
  const { lang } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailActionHandled = useRef(false);
  const am = lang === "am";
  const cls = am ? "font-ethiopic" : "";

  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [tutors, setTutors] = useState<AdminTutor[]>([]);
  const [families, setFamilies] = useState<AdminFamily[]>([]);
  const [pendingTutors, setPendingTutors] = useState<PendingTutor[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [pendingRequests, setPendingRequests] = useState<JobPost[]>([]);
  const [feedback, setFeedback] = useState<AdminFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const results = await Promise.allSettled([
        api.adminListBookings(),
        api.adminListTutors(),
        api.adminListFamilies(),
        api.adminListPendingTutors(),
        api.adminListPendingPayments(),
        api.adminListPendingRequests(),
        api.adminListFeedback(),
      ]);

      const failures = results
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map((result) => result.reason instanceof Error ? result.reason.message : "Unknown admin data error");

      if (results[0].status === "fulfilled") setBookings(results[0].value.bookings || []);
      if (results[1].status === "fulfilled") setTutors(results[1].value || []);
      if (results[2].status === "fulfilled") setFamilies(results[2].value || []);
      if (results[3].status === "fulfilled") setPendingTutors(results[3].value || []);
      if (results[4].status === "fulfilled") setPendingPayments(results[4].value || []);
      if (results[5].status === "fulfilled") setPendingRequests(results[5].value || []);
      if (results[6].status === "fulfilled") setFeedback(results[6].value || []);

      if (failures.length) {
        setError(`Some admin sections could not load: ${[...new Set(failures)].join("; ")}`);
      }
    } catch (err) {
      const status = err instanceof Error && "status" in err ? (err as Error & { status?: number }).status : undefined;
      if (status === 401 || status === 403) {
        clearAuthSession();
        navigate("/admin/login", { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      navigate("/admin/login");
      return;
    }

    loadDashboard();
  }, [loadDashboard, navigate]);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/admin/login");
  };

  const approveTutor = async (id: number | string) => {
    await api.adminApproveTutor(id);
    await loadDashboard();
  };

  const rejectTutor = async (id: number | string) => {
    await api.adminRejectTutor(id);
    await loadDashboard();
  };

  const approvePayment = async (id: number | string) => {
    await api.adminApprovePayment(id);
    await loadDashboard();
  };

  const rejectPayment = async (id: number | string) => {
    await api.adminRejectPayment(id, "Rejected by admin");
    await loadDashboard();
  };

  const approveRequest = async (id: number | string) => {
    await api.adminApproveRequest(id);
    await loadDashboard();
  };

  const rejectRequest = async (id: number | string) => {
    const reason = window.prompt("Reason for rejecting this request?") || "Rejected by admin";
    await api.adminRejectRequest(id, reason);
    await loadDashboard();
  };

  useEffect(() => {
    const approveType = searchParams.get("approve");
    const id = searchParams.get("id");

    if (emailActionHandled.current || !approveType || !id) return;
    emailActionHandled.current = true;

    const tab =
      searchParams.get("tab") ||
      (approveType === "request"
        ? "posting-approval"
        : approveType === "tutor"
          ? "tutor-approval"
          : "booking-approval");

    const cleanUrl = `/admin?tab=${encodeURIComponent(tab)}`;

    const approveFromEmail = async () => {
      try {
        if (approveType === "request") {
          await api.adminApproveRequest(id);
        } else if (approveType === "tutor") {
          await api.adminApproveTutor(id);
        } else if (approveType === "booking") {
          await api.adminApprovePayment(id);
        } else {
          throw new Error("Unknown approval action");
        }

        toast({
          title: "Approved",
          description: "The email approval action was completed.",
        });
      } catch (err) {
        toast({
          title: "Approval failed",
          description: err instanceof Error ? err.message : "Could not complete the email approval action.",
          variant: "destructive",
        });
      } finally {
        navigate(cleanUrl, { replace: true });
        await loadDashboard();
      }
    };

    approveFromEmail();
  }, [loadDashboard, navigate, searchParams, toast]);

  const setUserActive = async (id: number | string, isActive: boolean) => {
    await api.adminSetUserActive(id, isActive);
    await loadDashboard();
  };

  const deleteFeedback = async (id: number | string) => {
    await api.adminDeleteFeedback(id);
    await loadDashboard();
  };

  const approvedBookings = bookings.filter(
    (booking) =>
      ["CONFIRMED", "COMPLETED"].includes(booking.status) ||
      booking.payment_status === "PAID",
  );
  const approvedTutors = tutors.filter(
    (tutor) => (tutor.status || "").toLowerCase() === "approved",
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 px-4 py-8">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold text-foreground ${cls}`}>
                Admin Dashboard
              </h1>
              <p className={`text-muted-foreground ${cls}`}>
                Review approvals first, then manage approved tutors, families, bookings, and feedback.
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-5">
            <Card className="border-border">
              <CardContent className="flex items-center gap-4 p-5">
                <CalendarDays className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Bookings</p>
                  <p className="text-2xl font-bold">{approvedBookings.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="flex items-center gap-4 p-5">
                <Users className="h-8 w-8 text-secondary" />
                <div>
                  <p className="text-sm text-muted-foreground">Approved Tutors</p>
                  <p className="text-2xl font-bold">{approvedTutors.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="flex items-center gap-4 p-5">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Families</p>
                  <p className="text-2xl font-bold">{families.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="flex items-center gap-4 p-5">
                <CreditCard className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Posting Approval</p>
                  <p className="text-2xl font-bold">{pendingRequests.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="flex items-center gap-4 p-5">
                <MessageSquare className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Feedback</p>
                  <p className="text-2xl font-bold">{feedback.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="py-20 text-center text-muted-foreground">
              Loading dashboard...
            </div>
          ) : (
            <Tabs defaultValue={searchParams.get("tab") || "booking-approval"}>
              <TabsList className="mb-4 flex h-auto flex-wrap justify-start gap-2 p-2">
                <TabsTrigger value="booking-approval">
                  Booking Approval
                  {pendingPayments.length > 0 && (
                    <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {pendingPayments.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="tutor-approval">
                  Tutor Approval
                  {pendingTutors.length > 0 && (
                    <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {pendingTutors.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="posting-approval">
                  Posting Approval
                  {pendingRequests.length > 0 && (
                    <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {pendingRequests.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved-bookings">Approved Bookings</TabsTrigger>
                <TabsTrigger value="approved-tutors">Approved Tutors</TabsTrigger>
                <TabsTrigger value="families">Families</TabsTrigger>
                <TabsTrigger value="feedback">Feedback</TabsTrigger>
              </TabsList>

              <TabsContent value="approved-bookings">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>Approved Bookings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Family</TableHead>
                          <TableHead>Tutor</TableHead>
                          <TableHead>Schedule</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Approval</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvedBookings.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell>{booking.student_name || "-"}</TableCell>
                            <TableCell>{booking.family_name || booking.family_id}</TableCell>
                            <TableCell>{booking.tutor_name || booking.tutor_id}</TableCell>
                            <TableCell>
                              {booking.start_time || "-"}
                              {booking.end_time ? ` to ${booking.end_time}` : ""}
                            </TableCell>
                            <TableCell>{booking.amount ?? "-"} ETB</TableCell>
                            <TableCell>
                              <div className="space-y-1 text-sm">
                                <div>{statusBadge(booking.payment_status || "pending")}</div>
                              </div>
                            </TableCell>
                            <TableCell>{statusBadge(booking.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {approvedBookings.length === 0 && (
                      <p className="py-8 text-center text-muted-foreground">No approved bookings yet.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="approved-tutors">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>Approved Tutors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Profile</TableHead>
                          <TableHead>Billing</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvedTutors.map((tutor) => {
                          const active = Boolean(tutor.is_active);
                          return (
                            <TableRow key={tutor.id}>
                              <TableCell>{tutor.full_name}</TableCell>
                              <TableCell>{tutor.email}</TableCell>
                              <TableCell>{[tutor.location_city, tutor.location_area].filter(Boolean).join(", ") || "-"}</TableCell>
                              <TableCell>{statusBadge(tutor.status || "pending")}</TableCell>
                              <TableCell>{tutor.billing_status || "-"}</TableCell>
                              <TableCell>{statusBadge(active ? "active" : "disabled")}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant={active ? "destructive" : "outline"}
                                  onClick={() => setUserActive(tutor.id, !active)}
                                >
                                  {active ? "Disable" : "Enable"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {approvedTutors.length === 0 && (
                      <p className="py-8 text-center text-muted-foreground">No approved tutors found.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="families">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>Families</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Requests</TableHead>
                          <TableHead>Bookings</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {families.map((family) => {
                          const active = Boolean(family.is_active);
                          return (
                            <TableRow key={family.id}>
                              <TableCell>{family.full_name}</TableCell>
                              <TableCell>{family.email}</TableCell>
                              <TableCell>{family.phone || "-"}</TableCell>
                              <TableCell>{family.requests_count || 0}</TableCell>
                              <TableCell>{family.bookings_count || 0}</TableCell>
                              <TableCell>{statusBadge(active ? "active" : "disabled")}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant={active ? "destructive" : "outline"}
                                  onClick={() => setUserActive(family.id, !active)}
                                >
                                  {active ? "Disable" : "Enable"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {families.length === 0 && (
                      <p className="py-8 text-center text-muted-foreground">No families found.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tutor-approval">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>Tutor Approval</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Experience</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingTutors.map((tutor) => (
                          <React.Fragment key={tutor.tutor_id || tutor.id}>
                          <TableRow>
                            <TableCell>{tutor.full_name || tutor.name}</TableCell>
                            <TableCell>{tutor.email || "-"}</TableCell>
                            <TableCell>
                              {[tutor.location_city, tutor.location_area || tutor.location]
                                .filter(Boolean)
                                .join(", ") || "-"}
                            </TableCell>
                            <TableCell>{tutor.experience_years ?? 0} yrs</TableCell>
                          <TableCell>{summarizeGradePricing(tutor.hourly_rates_by_grade, tutor.hourly_rate)}</TableCell>
                          <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => approveTutor(tutor.tutor_id || tutor.id)}
                                  className="gap-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => rejectTutor(tutor.tutor_id || tutor.id)}
                                  className="gap-1"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Reject
                                </Button>
                              </div>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={6}>
                            <div className="grid gap-3 rounded-lg bg-muted/50 p-3 text-sm md:grid-cols-3">
                              <div>
                                <p className="font-medium">Application details</p>
                                <p className="text-muted-foreground">Gender: {tutor.gender || "-"}</p>
                                <p className="text-muted-foreground">Status: {tutor.employment_status || "-"}</p>
                                <p className="text-muted-foreground">Organization: {tutor.organization || "-"}</p>
                                <p className="text-muted-foreground">CGPA: {tutor.cgpa || "-"}</p>
                              </div>
                              <div>
                                <p className="font-medium">Teaching scope</p>
                                <p className="text-muted-foreground">Grades: {parseList(tutor.grade_levels).join(", ") || "-"}</p>
                                <p className="text-muted-foreground">Pricing: {formatPricing(tutor.hourly_rates_by_grade)}</p>
                                <p className="text-muted-foreground">Subjects: {parseList(tutor.subjects).join(", ") || "-"}</p>
                                <p className="text-muted-foreground">Languages: {parseList(tutor.languages).join(", ") || "-"}</p>
                                <p className="text-muted-foreground">Curriculum: {parseList(tutor.curriculum_options).join(", ") || "-"}</p>
                              </div>
                              <div>
                                <p className="font-medium">Private documents</p>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  <DocumentLink href={tutor.profile_photo_url} label="Photo" />
                                  <DocumentLink href={tutor.fayda_id_url} label="Fayda ID" />
                                  <DocumentLink href={tutor.highschool_transcript_url} label="Transcript" />
                                  <DocumentLink href={tutor.tempo_url} label="Tempo" />
                                  {parseList(tutor.certification_urls).map((url, index) => (
                                    <DocumentLink key={url} href={url} label={`Certificate ${index + 1}`} />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                          </React.Fragment>
                      ))}
                      </TableBody>
                    </Table>
                    {pendingTutors.length === 0 && (
                      <p className="py-8 text-center text-muted-foreground">No tutor applications waiting for approval.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="posting-approval">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>Posting Approval</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {pendingRequests.map((request) => (
                        <div key={request.id} className="rounded-lg border border-border p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-semibold">{request.title}</h3>
                                {statusBadge(request.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {request.family_name || "Family"} - {request.family_email || "-"}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button onClick={() => approveRequest(request.id)} className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90">
                                <CheckCircle className="h-4 w-4" />
                                Approve
                              </Button>
                              <Button variant="destructive" onClick={() => rejectRequest(request.id)} className="gap-2">
                                <XCircle className="h-4 w-4" />
                                Reject
                              </Button>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-3 rounded-lg bg-muted/40 p-3 text-sm md:grid-cols-3">
                            <div>
                              <p className="font-medium">Learning details</p>
                              <p className="text-muted-foreground">Subject: {request.subject || "-"}</p>
                              <p className="text-muted-foreground">Grade: {request.grade}</p>
                              <p className="text-muted-foreground">Curriculum: {request.curriculum}</p>
                              <p className="text-muted-foreground">Schedule: {request.days_per_week} days/week, {request.hours_per_day} hours/day</p>
                            </div>
                            <div>
                              <p className="font-medium">Budget</p>
                              <p className="text-muted-foreground">Amount: {request.budget || "-"} ETB</p>
                            </div>
                            <div>
                              <p className="font-medium">Description</p>
                              <p className="whitespace-pre-line text-muted-foreground">{request.description || "-"}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {pendingRequests.length === 0 && (
                        <p className="py-8 text-center text-muted-foreground">No pending requests.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="booking-approval">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>Booking Approval</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Booking</TableHead>
                          <TableHead>Family</TableHead>
                          <TableHead>Tutor</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>{payment.booking_id}</TableCell>
                            <TableCell>{payment.family_name || payment.family_id}</TableCell>
                            <TableCell>{payment.tutor_name || payment.tutor_id}</TableCell>
                            <TableCell>{payment.amount} ETB</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => approvePayment(payment.id)}
                                  className="gap-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => rejectPayment(payment.id)}
                                  className="gap-1"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Reject
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {pendingPayments.length === 0 && (
                      <p className="py-8 text-center text-muted-foreground">No bookings waiting for approval.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="feedback">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>User Feedback</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {feedback.length === 0 ? (
                        <p className="py-8 text-center text-muted-foreground">
                          No feedback received yet.
                        </p>
                      ) : (
                        feedback.map((item) => (
                          <div key={item.id} className="rounded-lg border border-border p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-medium">
                                  {item.author_name || item.author_id || "Visitor"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {item.role} - {item.rating}/5 - {item.created_at || ""}
                                </p>
                                <p className="mt-2 text-sm">{item.comments || "-"}</p>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteFeedback(item.id)}
                                className="gap-1"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
