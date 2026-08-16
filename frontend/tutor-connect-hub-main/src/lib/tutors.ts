export interface Tutor {
  id: string;
  name: string;
  nameAm: string;
  photo: string;
  subjects: string[];
  subjectsAm: string[];
  location: string;
  locationAm: string;
  experience: number;
  rating: number;
  price: number;
  bio: string;
  bioAm: string;
  mode: "online" | "in-person" | "both";
  isFeatured: boolean;
  certifications: string[];
  gender?: string;
  profession: string;
  organization: string;
  gradeLevels: string[];
  hourlyRatesByGrade: Record<string, unknown>;
  languages: string[];
}

export const subjects = [
  { en: "Mathematics", am: "Mathematics" },
  { en: "Physics", am: "Physics" },
  { en: "Chemistry", am: "Chemistry" },
  { en: "Biology", am: "Biology" },
  { en: "English", am: "English" },
  { en: "Amharic", am: "Amharic" },
  { en: "History", am: "History" },
  { en: "Computer Science", am: "Computer Science" },
  { en: "Music", am: "Music" },
  { en: "Literature", am: "Literature" },
  { en: "Piano", am: "Piano" },
];

export const locations = [
  { en: "Addis Ababa", am: "Addis Ababa" },
  { en: "Bahir Dar", am: "Bahir Dar" },
  { en: "Hawassa", am: "Hawassa" },
  { en: "Dire Dawa", am: "Dire Dawa" },
  { en: "Mekelle", am: "Mekelle" },
];

function parseList(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [value];
  } catch {
    return [value];
  }
}

function parseObject(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string" || !value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export function toUiTutor(item: Record<string, unknown>): Tutor {
  const locationPieces = [item.location_city, item.location_area]
    .filter(Boolean)
    .join(", ");
  const subjects = parseList(item.subjects);
  const grades = parseList(item.grade_levels);
  const languages = parseList(item.languages);
  const subjectList = subjects.length ? subjects : ["General"];

  return {
    id: String(item.id ?? item.tutor_id ?? ""),
    name: String(item.full_name ?? item.name ?? "Tutor"),
    nameAm: String(item.full_name ?? item.name ?? "Tutor"),
    photo: String(item.profile_photo_url ?? ""),
    subjects: subjectList,
    subjectsAm: subjectList,
    location: locationPieces || "Remote",
    locationAm: locationPieces || "Remote",
    experience: Number(item.experience_years ?? 0),
    rating: Number(item.rating ?? 4.5),
    price: Number(item.hourly_rate ?? 0),
    bio: String(item.bio ?? "Dedicated tutor"),
    bioAm: String(item.bio ?? "Dedicated tutor"),
    mode: "both",
    isFeatured: Boolean(item.is_featured),
    certifications: [],
    gender: String(item.gender ?? ""),
    profession: String(item.employment_status ?? "Tutor"),
    organization: String(item.organization ?? ""),
    gradeLevels: grades,
    hourlyRatesByGrade: parseObject(item.hourly_rates_by_grade),
    languages,
  };
}
