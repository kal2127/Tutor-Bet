import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Award, CheckCircle, FileText, GraduationCap, Image, ShieldCheck, UserRound } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, setAuthSession } from "@/lib/api";
import { gradeBands, GradePricingMap } from "@/lib/pricing";
import { useToast } from "@/hooks/use-toast";

const educationLevels = ["High school graduate", "TVET diploma", "Bachelor degree", "Master degree", "PhD", "Other"];
const employmentStatuses = ["Student", "Educator", "Self-employed", "Employed", "Unemployed"];
const subjectOptions = [
  "All subjects",
  "All natural science subjects",
  "All social science subjects",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Geography",
  "Economics",
  "Civics",
  "Amharic",
  "English",
  "Arabic",
  "Geez",
  "Afaan Oromo",
];
const languageOptions = ["Amharic", "English", "Arabic", "Geez", "Afaan Oromo"];
const curriculumOptions = ["Ethiopian", "Cambridge", "American", "International"];
const tutorApplicationDraftKey = "tutorbet:tutor-application-draft";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  gender: "",
  education: "",
  employmentStatus: "",
  organization: "",
  experience: "",
  city: "",
  hourlyRate: "",
  curriculum: [] as string[],
  grades: [] as string[],
  gradePricing: {} as Record<string, { mode: "FIXED" | "NEGOTIATION"; amount: string }>,
  subjects: [] as string[],
  languages: [] as string[],
  bio: "",
  hasTempo: false,
  cgpa: "",
  googleIdToken: "",
};
async function uploadToCloudinary(file: File) {
  const CLOUD_NAME = "ghahbozo";       
  const UPLOAD_PRESET = "TutorBet_Uploads"; 

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to upload ${file.name} to Cloudinary`);
  }

  const data = await response.json();
  return data.secure_url as string; // Returns the public HTTPS link
}
const BecomeTutor: React.FC = () => {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const isFreshStart = new URLSearchParams(location.search).get("fresh") === "1";
  const signupState = (location.state || {}) as {
    fullName?: string;
    email?: string;
    phone?: string;
    password?: string;
    googleIdToken?: string;
  };
  const restoredDraft = useMemo(
    () => isFreshStart ? { form: {} as Partial<typeof initialForm>, step: 0 } : loadTutorApplicationDraft(),
    [isFreshStart],
  );
  const [step, setStep] = useState(restoredDraft.step);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    ...initialForm,
    ...restoredDraft.form,
    fullName: signupState.fullName || restoredDraft.form.fullName || "",
    email: signupState.email || restoredDraft.form.email || "",
    phone: signupState.phone || restoredDraft.form.phone || "",
    password: signupState.password || "",
    googleIdToken: signupState.googleIdToken || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState({
    profilePhoto: null as File | null,
    certifications: [] as File[],
    faydaId: null as File | null,
    transcript: null as File | null,
    tempo: null as File | null,
  });

  const steps = useMemo(
    () => [
      { title: "Identity", icon: UserRound },
      { title: "Education", icon: GraduationCap },
      { title: "Teaching", icon: Award },
      { title: "Verification", icon: ShieldCheck },
    ],
    [],
  );

  useEffect(() => {
    saveTutorApplicationDraft(form, step);
  }, [form, step]);

  useEffect(() => {
    if (isFreshStart) clearTutorApplicationDraft();
  }, [isFreshStart]);

  const update = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  };

  const clearError = (field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const toggle = (field: "curriculum" | "grades" | "subjects" | "languages", value: string) => {
    setForm((prev) => {
      const removing = prev[field].includes(value);
      const next = {
        ...prev,
        [field]: removing
          ? prev[field].filter((item) => item !== value)
          : [...prev[field], value],
      };

      if (field === "grades") {
        const gradePricing = { ...prev.gradePricing };
        if (removing) {
          delete gradePricing[value];
        } else {
          gradePricing[value] = gradePricing[value] || { mode: "FIXED", amount: "" };
        }
        next.gradePricing = gradePricing;
      }

      return next;
    });
    clearError(field);
    clearError("gradePricing");
  };

  const updateGradePricing = (
    grade: string,
    patch: Partial<{ mode: "FIXED" | "NEGOTIATION"; amount: string }>,
  ) => {
    setForm((prev) => ({
      ...prev,
      gradePricing: {
        ...prev.gradePricing,
        [grade]: {
          ...(prev.gradePricing[grade] || { mode: "FIXED", amount: "" }),
          ...patch,
        },
      },
    }));
    clearError("gradePricing");
  };

  const goToStep = (targetStep: number) => {
    if (targetStep <= step) {
      setStep(targetStep);
      return;
    }

    for (let currentStep = step; currentStep < targetStep; currentStep += 1) {
      const stepErrors = validateStep(form, files, currentStep);
      if (Object.keys(stepErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...stepErrors }));
        setStep(currentStep);
        return;
      }
    }

    setErrors((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((field) => {
        if (stepForError(field) < targetStep) delete next[field];
      });
      return next;
    });
    setStep(targetStep);
  };

const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const nextErrors = validateForm(form, files);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstStep = stepForError(Object.keys(nextErrors)[0]);
      setStep(firstStep);
      return;
    }

    setLoading(true);

    try {
      // 1. Upload files to Cloudinary 
      const profilePhotoUrl = files.profilePhoto
        ? await uploadToCloudinary(files.profilePhoto)
        : null;

      const faydaIdUrl = files.faydaId
        ? await uploadToCloudinary(files.faydaId)
        : null;

      const transcriptUrl = files.transcript
        ? await uploadToCloudinary(files.transcript)
        : null;

      const tempoUrl = files.tempo
        ? await uploadToCloudinary(files.tempo)
        : null;

      // Upload all certification files in parallel
      const certificationUrls = await Promise.all(
        files.certifications.map((file) => uploadToCloudinary(file))
      );

      // 2. Build pricing calculations
      const gradePricing = buildGradePricingPayload(form);
      const fixedRates = Object.values(gradePricing)
        .filter((entry) => entry.mode === "FIXED")
        .map((entry) => Number(entry.amount))
        .filter((amount) => Number.isFinite(amount) && amount > 0);

      // 3. Construct lightweight JSON payload with Cloudinary URLs
      const payload = {
        full_name: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password || undefined,
        google_id_token: form.googleIdToken || undefined,
        gender: form.gender,
        education: form.education,
        employment_status: form.employmentStatus,
        organization: form.organization,
        experience_years: Number(form.experience) || 0,
        location_city: form.city || "Addis Ababa",
        capable_location_area: form.city || "Addis Ababa",
        hourly_rate: String(fixedRates.length ? Math.min(...fixedRates) : 0),
        bio: form.bio,
        grade_levels: form.grades,
        hourly_rates_by_grade: gradePricing,
        subjects: form.subjects,
        languages: form.languages,
        curriculum_options: form.curriculum,
        has_tempo: form.hasTempo,
        cgpa: form.cgpa,
        // File URLs from Cloudinary
        profile_photo_url: profilePhotoUrl,
        fayda_id_url: faydaIdUrl,
        highschool_transcript_url: transcriptUrl,
        tempo_url: tempoUrl,
        certifications_urls: certificationUrls,
      };

      // 4. Send JSON data to your backend
      const result = await api.registerTutor(payload);

      if (result.token && result.user) {
        setAuthSession(result.token, result.user);
      }

      clearTutorApplicationDraft();
      toast({
        title: "Application submitted",
        description: "Admin will review your details and documents.",
      });
      setSubmitted(true);
    } catch (err) {
      const serverErrors = parseServerErrors(err);

      if (Object.keys(serverErrors).length > 0) {
        setErrors(serverErrors);
        setStep(stepForError(Object.keys(serverErrors)[0]));
      } else {
        toast({
          title: "Error",
          description:
            err instanceof Error
              ? err.message
              : "Something went wrong while uploading or submitting.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
          <div className="max-w-md text-center">
            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-secondary" />
            <h1 className="text-2xl font-bold">Application submitted successfully</h1>
            <p className="mt-2 text-muted-foreground">
              You successfully submitted your application. The admin will review your application and documents before your public tutor profile becomes visible.
            </p>
            <Button className="mt-6 bg-gradient-primary text-primary-foreground" onClick={() => navigate("/tutor/dashboard")}>
              Go to Tutor Dashboard
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Tutor Application</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Complete your public teaching profile and private verification details for admin approval.
            </p>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-4">
            {steps.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => goToStep(index)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                  step === index ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.title}</span>
              </button>
            ))}
          </div>

          <form onSubmit={submit} autoComplete="off">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>{steps[step].title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {step === 0 && (
                  <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
                    <div>
                      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted">
                        {files.profilePhoto ? (
                          <img src={URL.createObjectURL(files.profilePhoto)} alt="Profile preview" className="h-full w-full object-cover" />
                        ) : (
                          <Image className="h-10 w-10 text-muted-foreground" />
                        )}
                      </div>
                      <Label className="mt-3 block">Profile photo</Label>
                      <p className="mb-2 text-xs text-muted-foreground">This photo appears on your tutor profile after approval.</p>
                      <Input type="file" accept="image/*" onChange={(e) => setFiles({ ...files, profilePhoto: e.target.files?.[0] || null })} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Full name" error={errors.fullName}><Input required autoComplete="off" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} /></Field>
                      <Field label="Email" error={errors.email}><Input required type="email" autoComplete="off" value={form.email} onChange={(e) => update("email", e.target.value)} /></Field>
                      <Field label="Phone" error={errors.phone}><Input required value={form.phone} onChange={(e) => update("phone", e.target.value)} /></Field>
                      {!form.googleIdToken && (
                        <Field label="Password" error={errors.password}><Input required type="password" autoComplete="new-password" value={form.password} onChange={(e) => update("password", e.target.value)} /></Field>
                      )}
                      {form.googleIdToken && (
                        <div className="rounded-lg border border-secondary/20 bg-secondary/10 p-4 text-sm text-secondary">
                          Google account connected. No password is required.
                        </div>
                      )}
                      <Field label="Gender">
                        <Select value={form.gender} onValueChange={(value) => update("gender", value)}>
                          <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                          <SelectContent><SelectItem value="Female">Female</SelectItem><SelectItem value="Male">Male</SelectItem></SelectContent>
                        </Select>
                        {errors.gender && <p className="text-sm text-destructive">{errors.gender}</p>}
                      </Field>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Highest education level" error={errors.education}>
                      <Select value={form.education} onValueChange={(value) => update("education", value)}>
                        <SelectTrigger><SelectValue placeholder="Choose level" /></SelectTrigger>
                        <SelectContent>{educationLevels.map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                    <Field label="Current status" error={errors.employmentStatus}>
                      <Select value={form.employmentStatus} onValueChange={(value) => update("employmentStatus", value)}>
                        <SelectTrigger><SelectValue placeholder="Choose status" /></SelectTrigger>
                        <SelectContent>{employmentStatuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                    <Field label="School / university / organization" error={errors.organization}><Input value={form.organization} onChange={(e) => update("organization", e.target.value)} /></Field>
                    <Field label="Experience years" error={errors.experience}><Input type="number" min={0} value={form.experience} onChange={(e) => update("experience", e.target.value)} /></Field>
                    <Field label="City" error={errors.city}><Input value={form.city} onChange={(e) => update("city", e.target.value)} /></Field>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <OptionGroup title="Grade levels" options={[...gradeBands]} values={form.grades} onToggle={(value) => toggle("grades", value)} />
                    {errors.grades && <p className="-mt-4 text-sm text-destructive">{errors.grades}</p>}
                    <GradePricingFields
                      grades={form.grades}
                      value={form.gradePricing}
                      error={errors.gradePricing}
                      onChange={updateGradePricing}
                    />
                    <OptionGroup title="Subjects and language options" options={subjectOptions} values={form.subjects} onToggle={(value) => toggle("subjects", value)} />
                    {errors.subjects && <p className="-mt-4 text-sm text-destructive">{errors.subjects}</p>}
                    <OptionGroup title="Teaching languages" options={languageOptions} values={form.languages} onToggle={(value) => toggle("languages", value)} />
                    {errors.languages && <p className="-mt-4 text-sm text-destructive">{errors.languages}</p>}
                    <OptionGroup title="Curriculum" options={curriculumOptions} values={form.curriculum} onToggle={(value) => toggle("curriculum", value)} />
                    {errors.curriculum && <p className="-mt-4 text-sm text-destructive">{errors.curriculum}</p>}
                    <Field label="Short teaching bio" error={errors.bio}><Textarea rows={4} value={form.bio} onChange={(e) => update("bio", e.target.value)} /></Field>
                  </div>
                )}

                {step === 3 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <UploadField label="Fayda ID" required file={files.faydaId} error={errors.faydaId} onChange={(file) => { setFiles({ ...files, faydaId: file }); clearError("faydaId"); }} />
                    <UploadField label="High school transcript" required file={files.transcript} error={errors.transcript} onChange={(file) => { setFiles({ ...files, transcript: file }); clearError("transcript"); }} />
                    <UploadField label="Tempo document, if available" file={files.tempo} onChange={(file) => setFiles({ ...files, tempo: file })} />
                    <Field label="CGPA if no tempo" error={errors.cgpa}><Input type="number" step="0.01" min={0} max={4} value={form.cgpa} onChange={(e) => update("cgpa", e.target.value)} /></Field>
                    <div className="sm:col-span-2">
                      <UploadField
                        label="Certifications or awards"
                        multiple
                        files={files.certifications}
                        onMultipleChange={(selected) => {
                          setFiles((prev) => ({
                            ...prev,
                            certifications: mergeFiles(prev.certifications, selected),
                          }));
                        }}
                        onRemoveMultiple={(index) => {
                          setFiles((prev) => ({
                            ...prev,
                            certifications: prev.certifications.filter((_, fileIndex) => fileIndex !== index),
                          }));
                        }}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={form.hasTempo} onCheckedChange={(checked) => update("hasTempo", Boolean(checked))} />
                      I have a tempo document
                    </label>
                    <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground sm:col-span-2">
                      <FileText className="mb-2 h-5 w-5" />
                      Fayda ID, transcripts, tempo, CGPA, and certificates are private review materials for admin approval. Fayda ID becomes visible to a family only after they book you.
                    </div>
                  </div>
                )}

                <div className="flex justify-between border-t border-border pt-5">
                  <Button type="button" variant="outline" disabled={step === 0} onClick={() => goToStep(step - 1)}>Back</Button>
                  {step < steps.length - 1 ? (
                    <Button type="button" onClick={() => goToStep(step + 1)}>Continue</Button>
                  ) : (
                    <Button type="submit" disabled={loading} className="bg-gradient-primary text-primary-foreground">
                      {loading ? "Submitting..." : "Submit application"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

function validateForm(form: typeof initialForm, files: {
  profilePhoto: File | null;
  certifications: File[];
  faydaId: File | null;
  transcript: File | null;
  tempo: File | null;
}) {
  const next: Record<string, string> = {};
  if (form.fullName.trim().length < 2) next.fullName = "Full name is required.";
  if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address.";
  if (form.phone.trim().length < 7) next.phone = "Phone number must be at least 7 characters.";
  if (!form.googleIdToken && form.password.length < 6) next.password = "Password must be at least 6 characters.";
  if (!form.gender) next.gender = "Select male or female.";
  if (!form.education) next.education = "Choose highest education level.";
  if (!form.employmentStatus) next.employmentStatus = "Choose your current status.";
  if (!form.organization.trim()) next.organization = "Enter your school, university, or organization.";
  if (Number(form.experience) < 0 || form.experience === "") next.experience = "Enter years of experience.";
  if (!form.city.trim()) next.city = "Enter your city.";
  if (form.grades.length === 0) next.grades = "Choose at least one grade level.";
  const missingPrice = form.grades.find((grade) => {
    const pricing = form.gradePricing[grade];
    if (!pricing) return true;
    if (pricing.mode === "NEGOTIATION") return false;
    return Number(pricing.amount) <= 0 || pricing.amount === "";
  });
  if (missingPrice) next.gradePricing = `Add a rate for ${missingPrice} or choose by negotiation.`;
  if (form.subjects.length === 0) next.subjects = "Choose at least one subject option.";
  if (form.languages.length === 0) next.languages = "Choose at least one teaching language.";
  if (form.curriculum.length === 0) next.curriculum = "Choose at least one curriculum.";
  if (!form.bio.trim()) next.bio = "Write a short teaching bio.";
  if (!files.faydaId) next.faydaId = "Upload Fayda ID.";
  if (!files.transcript) next.transcript = "Upload high school transcript.";
  if (!form.hasTempo && form.cgpa && (Number(form.cgpa) < 0 || Number(form.cgpa) > 4)) {
    next.cgpa = "CGPA must be between 0 and 4.";
  }
  return next;
}

function validateStep(form: typeof initialForm, files: {
  profilePhoto: File | null;
  certifications: File[];
  faydaId: File | null;
  transcript: File | null;
  tempo: File | null;
}, step: number) {
  const allErrors = validateForm(form, files);
  const next: Record<string, string> = {};

  Object.entries(allErrors).forEach(([field, message]) => {
    if (stepForError(field) === step) next[field] = message;
  });

  return next;
}

function stepForError(field: string) {
  if (["fullName", "email", "phone", "password", "gender"].includes(field)) return 0;
  if (["education", "employmentStatus", "organization", "experience", "city"].includes(field)) return 1;
  if (["grades", "gradePricing", "subjects", "languages", "curriculum", "bio"].includes(field)) return 2;
  return 3;
}

function parseServerErrors(err: unknown) {
  const payload = (err as { payload?: any })?.payload;
  if (!Array.isArray(payload?.details)) return {};
  const fieldMap: Record<string, string> = {
    full_name: "fullName",
    employment_status: "employmentStatus",
    experience_years: "experience",
    location_city: "city",
    capable_location_area: "city",
    hourly_rate: "hourlyRate",
    grade_levels: "grades",
    hourly_rates_by_grade: "gradePricing",
    curriculum_options: "curriculum",
  };

  return payload.details.reduce((acc: Record<string, string>, detail: any) => {
    const raw = Array.isArray(detail.path) ? detail.path[0] : "";
    const key = fieldMap[String(raw)] || String(raw);
    if (key) acc[key] = detail.message || "Invalid value.";
    return acc;
  }, {});
}

function buildGradePricingPayload(form: typeof initialForm): GradePricingMap {
  return form.grades.reduce<GradePricingMap>((acc, grade) => {
    const pricing = form.gradePricing[grade] || { mode: "FIXED", amount: "" };
    if (pricing.mode === "NEGOTIATION") {
      acc[grade] = { mode: "NEGOTIATION" };
    } else {
      acc[grade] = { mode: "FIXED", amount: Number(pricing.amount) };
    }
    return acc;
  }, {});
}

function loadTutorApplicationDraft() {
  const fallback = { form: {} as Partial<typeof initialForm>, step: 0 };
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(tutorApplicationDraftKey);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as {
      form?: Partial<typeof initialForm>;
      step?: number;
    };

    return {
      form: sanitizeDraftForm(parsed.form),
      step: Number.isInteger(parsed.step) && parsed.step! >= 0 && parsed.step! <= 3 ? parsed.step! : 0,
    };
  } catch {
    return fallback;
  }
}

function sanitizeDraftForm(value?: Partial<typeof initialForm>) {
  if (!value || typeof value !== "object") return {};
  return {
    fullName: typeof value.fullName === "string" ? value.fullName : "",
    email: typeof value.email === "string" ? value.email : "",
    phone: typeof value.phone === "string" ? value.phone : "",
    gender: typeof value.gender === "string" ? value.gender : "",
    education: typeof value.education === "string" ? value.education : "",
    employmentStatus: typeof value.employmentStatus === "string" ? value.employmentStatus : "",
    organization: typeof value.organization === "string" ? value.organization : "",
    experience: typeof value.experience === "string" ? value.experience : "",
    city: typeof value.city === "string" ? value.city : "",
    hourlyRate: typeof value.hourlyRate === "string" ? value.hourlyRate : "",
    curriculum: Array.isArray(value.curriculum) ? value.curriculum.map(String) : [],
    grades: Array.isArray(value.grades) ? value.grades.map(String) : [],
    gradePricing: value.gradePricing && typeof value.gradePricing === "object" ? value.gradePricing : {},
    subjects: Array.isArray(value.subjects) ? value.subjects.map(String) : [],
    languages: Array.isArray(value.languages) ? value.languages.map(String) : [],
    bio: typeof value.bio === "string" ? value.bio : "",
    hasTempo: Boolean(value.hasTempo),
    cgpa: typeof value.cgpa === "string" ? value.cgpa : "",
  } satisfies Partial<typeof initialForm>;
}

function saveTutorApplicationDraft(form: typeof initialForm, step: number) {
  if (typeof window === "undefined") return;
  const { password, googleIdToken, ...safeForm } = form;
  window.localStorage.setItem(tutorApplicationDraftKey, JSON.stringify({ form: safeForm, step }));
}

function clearTutorApplicationDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(tutorApplicationDraftKey);
}

function mergeFiles(existing: File[], selected: File[]) {
  const seen = new Set(existing.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
  const next = [...existing];

  selected.forEach((file) => {
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (!seen.has(key)) {
      seen.add(key);
      next.push(file);
    }
  });

  return next;
}

function GradePricingFields({
  grades,
  value,
  error,
  onChange,
}: {
  grades: string[];
  value: Record<string, { mode: "FIXED" | "NEGOTIATION"; amount: string }>;
  error?: string;
  onChange: (grade: string, patch: Partial<{ mode: "FIXED" | "NEGOTIATION"; amount: string }>) => void;
}) {
  if (grades.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <Label className="mb-3 block">Hourly rate by selected grade</Label>
      <div className="grid gap-3">
        {grades.map((grade) => {
          const pricing = value[grade] || { mode: "FIXED", amount: "" };
          return (
            <div key={grade} className="grid gap-3 rounded-lg border border-border bg-background p-3 md:grid-cols-[150px_180px_1fr] md:items-center">
              <p className="font-medium">{grade}</p>
              <Select
                value={pricing.mode}
                onValueChange={(mode) => onChange(grade, { mode: mode as "FIXED" | "NEGOTIATION" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">Fixed rate</SelectItem>
                  <SelectItem value="NEGOTIATION">By negotiation</SelectItem>
                </SelectContent>
              </Select>
              {pricing.mode === "FIXED" ? (
                <Input
                  type="number"
                  min={1}
                  placeholder="ETB per hour"
                  value={pricing.amount}
                  onChange={(event) => onChange(grade, { amount: event.target.value })}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Family will contact you to agree on the rate.</p>
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function OptionGroup({ title, options, values, onToggle }: { title: string; options: string[]; values: string[]; onToggle: (value: string) => void }) {
  return (
    <div>
      <Label className="mb-3 block">{title}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option} type="button" onClick={() => onToggle(option)} className={`rounded-lg border px-3 py-2 text-sm transition ${values.includes(option) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function UploadField({ label, required, file, files, multiple, error, onChange, onMultipleChange, onRemoveMultiple }: { label: string; required?: boolean; file?: File | null; files?: File[]; multiple?: boolean; error?: string; onChange?: (file: File | null) => void; onMultipleChange?: (files: File[]) => void; onRemoveMultiple?: (index: number) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}{required ? " *" : ""}</Label>
      <Input type="file" multiple={multiple} accept="image/*,.pdf" required={required} onChange={(e) => multiple ? onMultipleChange?.(Array.from(e.target.files || [])) : onChange?.(e.target.files?.[0] || null)} />
      {multiple ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {files?.length || 0} file(s) selected. You can choose more files to add them.
          </p>
          {!!files?.length && (
            <div className="flex flex-wrap gap-2">
              {files.map((selectedFile, index) => (
                <span key={`${selectedFile.name}-${selectedFile.lastModified}`} className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  {selectedFile.name}
                  <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => onRemoveMultiple?.(index)}>
                    Remove
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{file?.name || "Image or PDF accepted"}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export default BecomeTutor;
