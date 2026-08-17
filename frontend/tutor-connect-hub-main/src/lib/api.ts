const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/$/,
  "",
);

export interface AuthUser {
  id: number;
  role: string;
  full_name: string;
  email: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface BookingRecord {
  id: number;
  family_id: number;
  tutor_id: number;
  job_post_id?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  session_type?: "ONLINE" | "IN_PERSON";
  location_note?: string | null;
  status: string;
  student_name?: string | null;
  grade?: string | null;
  curriculum?: string | null;
  days_per_week?: number | null;
  hours_per_day?: number | null;
  created_at?: string;
  amount?: number | string | null;
  payment_status?: string | null;
  receipt_url?: string | null;
  transaction_ref?: string | null;
  tutor_fayda_id_url?: string | null;
  tutor_name?: string | null;
  family_name?: string | null;
}

export interface PendingPayment {
  id: number;
  booking_id: number;
  amount: number | string;
  status: string;
  receipt_url?: string | null;
  transaction_ref?: string | null;
  created_at?: string;
  family_id?: number;
  tutor_id?: number;
  family_name?: string;
  tutor_name?: string;
}

export interface PendingTutor {
  id: number;
  tutor_id: number;
  full_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  contact?: string;
  location?: string;
  location_city?: string;
  location_area?: string;
  education?: string;
  experience_years?: number;
  hourly_rate?: number | string;
  status: string;
  is_available?: boolean | number;
  created_at?: string;
  gender?: string | null;
  employment_status?: string | null;
  organization?: string | null;
  grade_levels?: string | string[] | null;
  hourly_rates_by_grade?: string | Record<string, unknown> | null;
  subjects?: string | string[] | null;
  languages?: string | string[] | null;
  curriculum_options?: string | string[] | null;
  has_tempo?: boolean | number;
  cgpa?: number | string | null;
  profile_photo_url?: string | null;
  certification_urls?: string | string[] | null;
  fayda_id_url?: string | null;
  highschool_transcript_url?: string | null;
  tempo_url?: string | null;
}

export interface AdminFeedback {
  id: number;
  booking_id?: number | null;
  author_id?: number | null;
  role: "FAMILY" | "TUTOR" | "VISITOR";
  rating: number;
  comments?: string | null;
  created_at?: string;
  author_name?: string;
}

export interface AdminTutor {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  is_active: boolean | number;
  created_at?: string;
  status?: string | null;
  location_city?: string | null;
  location_area?: string | null;
  education?: string | null;
  experience_years?: number | null;
  hourly_rate?: number | string | null;
  is_available?: boolean | number | null;
  registration_paid?: boolean | number | null;
  billing_status?: string | null;
}

export interface AdminFamily {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  is_active: boolean | number;
  created_at?: string;
  requests_count?: number;
  bookings_count?: number;
}

export interface JobPost {
  id: number;
  family_id?: number;
  selected_tutor_id?: number | null;
  title: string;
  description?: string | null;
  student_name: string;
  grade: string;
  curriculum: string;
  subject?: string | null;
  location_note?: string | null;
  session_type: "ONLINE" | "IN_PERSON";
  days_per_week: number;
  hours_per_day: number;
  budget?: number | string | null;
  request_payment_amount?: number | string | null;
  request_payment_receipt_url?: string | null;
  request_payment_transaction_ref?: string | null;
  approved_at?: string | null;
  family_name?: string;
  family_email?: string;
  family_phone?: string;
  my_application_id?: number | null;
  my_application_status?: string | null;
  status: string;
  created_at?: string;
}

export interface JobApplication {
  id: number;
  job_post_id: number;
  tutor_id: number;
  message?: string | null;
  proposed_rate?: number | string | null;
  status: string;
  created_at?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  bio?: string | null;
  location_city?: string | null;
  location_area?: string | null;
  education?: string | null;
  experience_years?: number | null;
  hourly_rate?: number | string | null;
  is_available?: boolean | number;
  gender?: string | null;
  employment_status?: string | null;
  organization?: string | null;
  grade_levels?: string | string[] | null;
  hourly_rates_by_grade?: string | Record<string, unknown> | null;
  subjects?: string | string[] | null;
  languages?: string | string[] | null;
  curriculum_options?: string | string[] | null;
  has_tempo?: boolean | number;
  cgpa?: number | string | null;
  profile_photo_url?: string | null;
  certification_urls?: string | string[] | null;
  fayda_id_url?: string | null;
  highschool_transcript_url?: string | null;
  tempo_url?: string | null;
}

export interface TutorProfile {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  role: "TUTOR";
  is_active: boolean | number;
  bio?: string | null;
  location_city?: string | null;
  location_area?: string | null;
  education?: string | null;
  experience_years?: number | null;
  hourly_rate?: number | string | null;
  status: string;
  is_available: boolean | number;
  registration_paid?: boolean | number;
  next_renewal_date?: string | null;
  billing_status?: string;
  gender?: string | null;
  employment_status?: string | null;
  organization?: string | null;
  grade_levels?: string | string[] | null;
  hourly_rates_by_grade?: string | Record<string, unknown> | null;
  subjects?: string | string[] | null;
  languages?: string | string[] | null;
  curriculum_options?: string | string[] | null;
  has_tempo?: boolean | number;
  cgpa?: number | string | null;
  profile_photo_url?: string | null;
  certification_urls?: string | string[] | null;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

function buildUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL || ""}${normalizedPath}`;
}

function getStoredAuth() {
  if (typeof window === "undefined") return null;

  const token = window.localStorage.getItem("tutor_auth_token");
  const rawUser = window.localStorage.getItem("tutor_auth_user");

  if (!token) return null;

  try {
    return {
      token,
      user: rawUser ? JSON.parse(rawUser) : null,
    };
  } catch {
    return { token, user: null };
  }
}

export function setAuthSession(token: string, user: AuthUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("tutor_auth_token", token);
  window.localStorage.setItem("tutor_auth_user", JSON.stringify(user));
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("tutor_auth_token");
  window.localStorage.removeItem("tutor_auth_user");
}

export function getCurrentUser() {
  return getStoredAuth()?.user ?? null;
}

export function isAuthenticated() {
  return Boolean(getStoredAuth()?.token);
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const auth = getStoredAuth();
  const headers = new Headers(options.headers as HeadersInit | undefined);

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (auth?.token) {
    headers.set("Authorization", `Bearer ${auth.token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
    body:
      options.body instanceof FormData
        ? options.body
        : options.body
          ? JSON.stringify(options.body)
          : undefined,
  });

  const text = await response.text();
  let payload: any = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = {
      message: text.trim().startsWith("<")
        ? "Server returned an unexpected error page"
        : text,
    };
  }

  if (!response.ok) {
    const detailMessage = Array.isArray(payload?.details)
      ? payload.details
          .map((detail: any) => {
            const path = Array.isArray(detail?.path)
              ? detail.path.join(".")
              : "";
            return [path, detail?.message].filter(Boolean).join(": ");
          })
          .filter(Boolean)
          .join("; ")
      : "";
    const message =
      detailMessage || payload?.message || payload?.error || "Request failed";
    const error = new Error(message) as Error & {
      status?: number;
      payload?: unknown;
    };
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return (payload?.data ?? payload) as T;
}

export const api = {
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body,
    }),

  googleAuth: (body: { credential: string; role?: "FAMILY" | "TUTOR" }) =>
    request<
      | { token: string; user: AuthUser }
      | {
          profile: {
            full_name: string;
            email: string;
            google_id_token: string;
          };
        }
    >("/auth/google", {
      method: "POST",
      body,
    }),

  registerFamily: (body: {
    full_name: string;
    email: string;
    phone: string;
    password: string;
  }) =>
    request<{ userId: number }>("/auth/register-family", {
      method: "POST",
      body,
    }),

  registerTutor: (body: {
    full_name: string;
    email: string;
    phone?: string;
    password: string;
    bio?: string;
    location_city: string;
    capable_location_area?: string;
    education?: string;
    experience_years?: number;
    hourly_rate?: number;
    google_id_token?: string;
  } | FormData) =>
    request<{ tutorId: number; status: string; token?: string; user?: AuthUser }>(
      "/auth/register-tutor",
      {
        method: "POST",
        body,
      },
    ),

  listTutors: (params?: Record<string, string | number | undefined>) => {
    const searchParams = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== "")
        searchParams.set(key, String(value));
    });
    const query = searchParams.toString();
    return request<{ tutors: Array<Record<string, unknown>>; count: number }>(
      `/tutor${query ? `?${query}` : ""}`,
    );
  },

  getTutorById: (id: string | number) =>
    request<{ tutor: Record<string, unknown> }>(`/tutor/${id}`),

  createBooking: (body: {
    tutor_id: number;
    student_name: string;
    grade: string;
    curriculum: string;
    days_per_week: number;
    hours_per_day: number;
    start_time: string;
    end_time: string;
    session_type?: "ONLINE" | "IN_PERSON";
    location_note?: string;
    amount: number;
  }) =>
    request<{ bookingId: number; status: string }>("/bookings", {
      method: "POST",
      body,
    }),

  uploadBookingPaymentProof: (
    bookingId: number | string,
    body: { transaction_ref?: string; receipt?: File | null },
  ) => {
    const formData = new FormData();
    if (body.transaction_ref) {
      formData.append("transaction_ref", body.transaction_ref);
    }
    if (body.receipt) {
      formData.append("receipt", body.receipt);
    }

    return request<{
      bookingId: number;
      receipt_url?: string | null;
      transaction_ref?: string | null;
    }>(`/bookings/${bookingId}/receipt`, {
      method: "POST",
      body: formData,
    });
  },

  listMyBookings: () =>
    request<{ bookings: BookingRecord[]; count: number }>("/bookings"),

  listTutorBookings: () =>
    request<{ bookings: BookingRecord[]; count: number }>("/tutor/bookings"),

  getBookingById: (bookingId: number | string) =>
    request<BookingRecord>(`/bookings/${bookingId}`),

  createJobPost: (body: {
    title: string;
    description?: string;
    student_name: string;
    grade: string;
    curriculum: string;
    subject?: string;
    location_note?: string;
    session_type?: "ONLINE" | "IN_PERSON";
    days_per_week: number;
    hours_per_day: number;
    budget?: number;
    request_payment_amount?: number;
    request_payment_transaction_ref?: string;
    request_payment_receipt?: File | null;
  } | FormData) =>
    request<{ jobPostId: number; status: string }>("/jobPost/family/job-posts", {
      method: "POST",
      body,
    }),

  listFamilyJobPosts: () =>
    request<{ job_posts: JobPost[]; count: number }>(
      "/jobPost/family/job-posts",
    ),

  listOpenJobPosts: () =>
    request<{ job_posts: JobPost[]; count: number }>(
      "/jobPost/tutor/job-posts",
    ),

  applyToJobPost: (
    jobPostId: number | string,
    body: { message?: string; proposed_rate?: number },
  ) =>
    request<{ applicationId: number; status: string }>(
      `/jobPost/tutor/job-posts/${jobPostId}/apply`,
      {
        method: "POST",
        body,
      },
    ),

  listJobApplications: (jobPostId: number | string) =>
    request<{ applications: JobApplication[]; count: number }>(
      `/jobPost/family/job-posts/${jobPostId}/applications`,
    ),

  selectJobApplication: (
    jobPostId: number | string,
    applicationId: number | string,
  ) =>
    request<{
      bookingId: number;
      selectedTutorId: number;
      jobStatus: string;
      bookingStatus: string;
    }>(`/jobPost/family/job-posts/${jobPostId}/applications/${applicationId}/select`, {
      method: "PATCH",
    }),

  closeJobPost: (jobPostId: number | string) =>
    request<{ jobPostId: number; status: string }>(
      `/jobPost/family/job-posts/${jobPostId}/close`,
      {
        method: "PATCH",
      },
    ),

  getTutorProfile: () => request<TutorProfile>("/tutor/profile"),

  updateTutorProfile: (body: {
    bio?: string;
    location_city?: string;
    location_area?: string;
    education?: string;
    experience_years?: number;
    hourly_rate?: number;
    gender?: string;
    employment_status?: string;
    organization?: string;
    grade_levels?: string[];
    hourly_rates_by_grade?: Record<string, unknown>;
    subjects?: string[];
    languages?: string[];
    curriculum_options?: string[];
    cgpa?: number;
  } | FormData) =>
    request<null>("/tutor/profile", {
      method: "PATCH",
      body,
    }),

  updateTutorAvailability: (is_available: boolean) =>
    request<{ is_available: boolean }>("/tutor/profile/availability", {
      method: "PATCH",
      body: { is_available },
    }),

  adminListBookings: () =>
    request<{ bookings: BookingRecord[]; count: number }>("/admin/bookings"),

  adminListPendingPayments: () =>
    request<PendingPayment[]>("/admin/payments/pending"),

  adminApprovePayment: (paymentId: number | string) =>
    request<null>(`/admin/payments/${paymentId}/approve`, {
      method: "PATCH",
    }),

  adminRejectPayment: (paymentId: number | string, remarks?: string) =>
    request<null>(`/admin/payments/${paymentId}/reject`, {
      method: "PATCH",
      body: { remarks },
    }),

  adminListPendingTutors: () =>
    request<PendingTutor[]>("/admin/tutors/pending"),

  adminApproveTutor: (tutorId: number | string) =>
    request<null>(`/admin/tutors/${tutorId}/approve`, {
      method: "PATCH",
    }),

  adminRejectTutor: (tutorId: number | string) =>
    request<null>(`/admin/tutors/${tutorId}/reject`, {
      method: "PATCH",
    }),

  createFeedback: (body: {
    booking_id?: number;
    rating: number;
    comments?: string;
  }) =>
    request<{ feedbackId: number }>("/feedback", {
      method: "POST",
      body,
    }),

  adminListFeedback: () => request<AdminFeedback[]>("/feedback"),

  adminDeleteFeedback: (feedbackId: number | string) =>
    request<{ feedbackId: number }>(`/feedback/${feedbackId}`, {
      method: "DELETE",
    }),

  adminListTutors: () => request<AdminTutor[]>("/admin/tutors"),

  adminListFamilies: () => request<AdminFamily[]>("/admin/families"),

  adminSetUserActive: (userId: number | string, is_active: boolean) =>
    request<{ userId: number; is_active: boolean }>(`/admin/users/${userId}/active`, {
      method: "PATCH",
      body: { is_active },
    }),

  adminListPendingRequests: () =>
    request<JobPost[]>("/admin/requests/pending"),

  adminApproveRequest: (requestId: number | string) =>
    request<{ jobPostId: number; status: string }>(
      `/admin/requests/${requestId}/approve`,
      {
        method: "PATCH",
      },
    ),

  adminRejectRequest: (requestId: number | string, reason?: string) =>
    request<{ jobPostId: number; status: string }>(
      `/admin/requests/${requestId}/reject`,
      {
        method: "PATCH",
        body: { reason },
      },
    ),
};
