import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle,
  Clock,
  Lock,
  MapPin,
  Star,
  ExternalLink,
} from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { Tutor, toUiTutor } from "@/lib/tutors";
import { formatGradePricing, rateForGrade, summarizeGradePricing } from "@/lib/pricing";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api, getCurrentUser } from "@/lib/api";

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/, "").replace(/\/$/, "");

function assetUrl(href?: string | null) {
  if (!href) return "";
  if (/^https?:\/\//i.test(href)) return href;
  return `${API_ORIGIN}${href.startsWith("/") ? href : `/${href}`}`;
}

const TutorDetail: React.FC = () => {
  const { id } = useParams();
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const f = lang === "am" ? "font-ethiopic" : "";

  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [curriculum, setCurriculum] = useState("Ethiopian");
  const [sessionType, setSessionType] = useState<"ONLINE" | "IN_PERSON">("ONLINE");
  const [locationNote, setLocationNote] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [hoursPerDay, setHoursPerDay] = useState(1);
  const [requirement, setRequirement] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadTutor = async () => {
      if (!id) return;
      setLoading(true);
      setError("");

      try {
        const result = await api.getTutorById(id);
        if (mounted) {
          const uiTutor = toUiTutor(result.tutor as Record<string, unknown>);
          setTutor(uiTutor);
          setGradeLevel((current) => current || uiTutor.gradeLevels[0] || "");
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unable to load tutor");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadTutor();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleBooking = async () => {
    if (!id || !tutor) return;

    if (!studentName.trim() || !gradeLevel.trim()) {
      toast({
        title: "Required fields missing",
        description: "Enter the student name and grade level before booking.",
        variant: "destructive",
      });
      return;
    }

    const now = new Date();
    const startTime = now.toISOString();
    const endTime = new Date(now.getTime() + hoursPerDay * 60 * 60 * 1000).toISOString();
    const bookingRate = rateForGrade(tutor.hourlyRatesByGrade, gradeLevel, tutor.price);

    setBookingLoading(true);
    try {
      await api.createBooking({
        tutor_id: Number(id),
        student_name: studentName,
        grade: gradeLevel,
        curriculum,
        days_per_week: daysPerWeek,
        hours_per_day: hoursPerDay,
        start_time: startTime,
        end_time: endTime,
        session_type: sessionType,
        location_note: [locationNote, requirement ? `Requirement: ${requirement}` : ""].filter(Boolean).join("\n"),
        amount: bookingRate.amount,
      });

      setBookingOpen(false);
      setBookingComplete(true);
      toast({
        title: "Booking submitted",
        description: "Your booking is waiting for admin review.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Could not create booking",
        variant: "destructive",
      });
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
          Loading tutor...
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !tutor) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-muted-foreground">{error || "Tutor not found"}</p>
          <Link to="/tutors">
            <Button variant="ghost" className="mt-4">
              Go back
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const name = lang === "am" ? tutor.nameAm : tutor.name;
  const bio = lang === "am" ? tutor.bioAm : tutor.bio;
  const subjectsList = lang === "am" ? tutor.subjectsAm : tutor.subjects;
  const location = lang === "am" ? tutor.locationAm : tutor.location;
  const gradePricing = formatGradePricing(tutor.hourlyRatesByGrade);
  const selectedBookingRate = rateForGrade(tutor.hourlyRatesByGrade, gradeLevel, tutor.price);
  const modeLabel =
    tutor.mode === "online"
      ? t.tutorCard.online
      : tutor.mode === "in-person"
        ? t.tutorCard.inPerson
        : t.tutorCard.both;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <Link
          to="/tutors"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to tutors
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-border bg-card p-6 md:p-8">
              <div className="flex flex-col items-start gap-6 sm:flex-row">
                <img
                  src={tutor.photo}
                  alt={name}
                  className="h-28 w-28 rounded-xl object-cover ring-2 ring-primary/20"
                />
                <div>
                  <h1 className={`text-2xl font-bold ${f}`}>{name}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span className={f}>{location}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {tutor.experience} {t.tutorCard.years}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-primary text-primary" />
                      {tutor.rating}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span className={f}>{modeLabel}</span>
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {subjectsList.map((subject) => (
                      <Badge key={subject} variant="secondary" className={f}>
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <h2 className={`mb-3 text-lg font-semibold ${f}`}>
                  {t.tutorDetail.about}
                </h2>
                <p className={`leading-relaxed text-muted-foreground ${f}`}>
                  {bio}
                </p>
              </div>

              <div className="mt-6">
                <h2 className={`mb-3 text-lg font-semibold ${f}`}>
                  {t.tutorDetail.qualifications}
                </h2>
                {tutor.certifications.length ? (
                  <div className="flex flex-wrap gap-2">
                    {tutor.certifications.map((certification, index) => (
                      <a
                        key={certification}
                        href={assetUrl(certification)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
                      >
                        <CheckCircle className="h-4 w-4 text-secondary" />
                        Certificate / Award {index + 1}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No certifications or awards uploaded.</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="sticky top-20 rounded-xl border border-border bg-card p-6">
              <div className="mb-6 text-center">
                <span className="text-3xl font-bold text-primary">
                  {summarizeGradePricing(tutor.hourlyRatesByGrade, tutor.price)}
                </span>
                <span className={`block text-sm text-muted-foreground ${f}`}>Grade-based hourly pricing</span>
              </div>
              <div className="mb-4 space-y-2 rounded-lg bg-muted/40 p-4 text-sm">
                <p className="font-medium">Rates by grade</p>
                {gradePricing.length ? (
                  gradePricing.map((item) => (
                    <p key={item} className="text-muted-foreground">{item}</p>
                  ))
                ) : (
                  <p className="text-muted-foreground">{tutor.price} {t.common.etb}/hour</p>
                )}
              </div>

              <div className="mb-4 rounded-lg bg-muted/50 p-4 text-center">
                <Lock className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                <p className={`text-sm text-muted-foreground ${f}`}>
                  {t.tutorDetail.contactHidden}
                </p>
              </div>

              {bookingComplete ? (
                <div className="space-y-4 rounded-lg bg-secondary/10 p-4">
                  <div className="text-center">
                    <CheckCircle className="mx-auto mb-2 h-8 w-8 text-secondary" />
                    <p className="text-sm font-medium text-secondary">
                      Booking submitted. Your booking is waiting for admin review.
                    </p>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Admin will review and confirm the booking.
                  </p>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    const currentUser = getCurrentUser();
                    if (!currentUser) {
                      navigate(`/signup?role=family&next=${encodeURIComponent(`/tutors/${id}`)}`);
                      return;
                    }
                    if (currentUser.role !== "FAMILY") {
                      toast({
                        title: "Family account required",
                        description: "Please login with a family account to book a tutor.",
                        variant: "destructive",
                      });
                      return;
                    }
                    setBookingOpen(true);
                  }}
                  className={`w-full bg-gradient-primary py-6 text-base text-primary-foreground shadow-gold hover:opacity-90 ${f}`}
                  size="lg"
                >
                  {t.tutorDetail.bookSession}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className={f}>{t.tutorDetail.bookSession}</DialogTitle>
            <DialogDescription className={f}>
              Fill the student details. Booking rate: {gradeLevel ? selectedBookingRate.label : summarizeGradePricing(tutor.hourlyRatesByGrade, tutor.price)}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 md:grid-cols-2">
            <div>
              <Label className={f}>Student name</Label>
              <Input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Student full name"
              />
            </div>
            <div>
              <Label className={f}>Grade level</Label>
              {tutor.gradeLevels.length ? (
                <select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {tutor.gradeLevels.map((grade) => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              ) : (
                <Input
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  placeholder="Grade 8"
                />
              )}
            </div>
            <div>
              <Label className={f}>Curriculum</Label>
              <select value={curriculum} onChange={(e) => setCurriculum(e.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="Ethiopian">Ethiopian</option>
                <option value="Cambridge">Cambridge</option>
                <option value="American">American</option>
                <option value="International">International</option>
              </select>
            </div>
            <div>
              <Label className={f}>Session type</Label>
              <select value={sessionType} onChange={(e) => setSessionType(e.target.value as "ONLINE" | "IN_PERSON")} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="ONLINE">Online</option>
                <option value="IN_PERSON">In person</option>
              </select>
            </div>
            <div>
              <Label className={f}>Days per week</Label>
              <Input type="number" min="1" max="7" value={daysPerWeek} onChange={(e) => setDaysPerWeek(Number(e.target.value))} />
            </div>
            <div>
              <Label className={f}>Hours per day</Label>
              <Input type="number" min="1" max="12" value={hoursPerDay} onChange={(e) => setHoursPerDay(Number(e.target.value))} />
            </div>
            <div className="md:col-span-2">
              <Label className={f}>Location or online note</Label>
              <Input value={locationNote} onChange={(e) => setLocationNote(e.target.value)} placeholder="Home address, area, or online preference" />
            </div>
            <div className="md:col-span-2">
              <Label className={f}>Additional requirement</Label>
              <textarea value={requirement} onChange={(e) => setRequirement(e.target.value)} placeholder="Any learning needs, schedule details, or requirements" className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
              Selected grade rate: {selectedBookingRate.label}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleBooking}
              disabled={bookingLoading}
              className={`bg-gradient-primary text-primary-foreground shadow-gold hover:opacity-90 ${f}`}
            >
              {bookingLoading
                ? "Submitting..."
                : `Submit booking - ${selectedBookingRate.label}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default TutorDetail;
