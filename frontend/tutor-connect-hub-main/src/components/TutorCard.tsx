import React from "react";
import { Link } from "react-router-dom";
import { Award, BookOpen, GraduationCap, Languages, MapPin, UserRound } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { Tutor } from "@/lib/tutors";
import { summarizeGradePricing } from "@/lib/pricing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TutorCardProps {
  tutor: Tutor;
}

const TutorCard: React.FC<TutorCardProps> = ({ tutor }) => {
  const { t, lang } = useI18n();
  const f = lang === "am" ? "font-ethiopic" : "";

  const name = lang === "am" ? tutor.nameAm : tutor.name;
  const subjects = lang === "am" ? tutor.subjectsAm : tutor.subjects;
  const location = lang === "am" ? tutor.locationAm : tutor.location;
  const bio = lang === "am" ? tutor.bioAm : tutor.bio;
  const modeLabel =
    tutor.mode === "online"
      ? t.tutorCard.online
      : tutor.mode === "in-person"
        ? t.tutorCard.inPerson
        : t.tutorCard.both;
  const visibleSubjects = subjects.slice(0, 3);
  const visibleGrades = tutor.gradeLevels.slice(0, 4);
  const visibleLanguages = tutor.languages.slice(0, 3);

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
      {tutor.isFeatured && (
        <div className="absolute right-3 top-3 z-10">
          <Badge className={`border-0 bg-gradient-primary text-primary-foreground ${f}`}>
            {t.featured.featured}
          </Badge>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start gap-4">
          {tutor.photo ? (
            <img
              src={tutor.photo}
              alt={name}
              className="h-20 w-20 rounded-xl object-cover ring-2 ring-primary/20"
            />
          ) : (
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-xl ring-2 ring-primary/20 ${
                tutor.gender?.toLowerCase() === "female"
                  ? "bg-secondary/15 text-secondary"
                  : "bg-primary/10 text-primary"
              }`}
            >
              <UserRound className="h-10 w-10" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className={`truncate text-lg font-bold text-card-foreground ${f}`}>{name}</h3>
            <p className="truncate text-sm font-medium text-primary">{tutor.profession}</p>
            {tutor.organization && (
              <p className="truncate text-sm text-muted-foreground">{tutor.organization}</p>
            )}
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className={`truncate ${f}`}>{location}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {tutor.experience} {t.tutorCard.years} experience
            </p>
          </div>
        </div>

        <p className={`mt-4 line-clamp-2 text-sm text-muted-foreground ${f}`}>
          {bio || "Committed tutor ready to support students with focused lessons."}
        </p>

        <div className="mt-4 space-y-3">
          <InfoRow icon={BookOpen} label="Subjects" items={visibleSubjects} empty="General" />
          <InfoRow icon={GraduationCap} label="Grades" items={visibleGrades} empty="All levels" />
          <InfoRow icon={Languages} label="Languages" items={visibleLanguages} empty="Not specified" />
          <InfoRow icon={Award} label="Certificates" items={tutor.certifications.length ? [`${tutor.certifications.length} uploaded`] : []} empty="None uploaded" />
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {visibleSubjects.map((subject) => (
            <span
              key={subject}
              className={`rounded-md bg-secondary/50 px-2 py-0.5 text-xs font-medium text-secondary-foreground ${f}`}
            >
              {subject}
            </span>
          ))}
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {modeLabel}
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Salary range</p>
            <span className="text-lg font-bold text-primary">
              {summarizeGradePricing(tutor.hourlyRatesByGrade, tutor.price)}
            </span>
          </div>
          <Link to={`/tutors/${tutor.id}`}>
            <Button
              size="sm"
              className={`whitespace-nowrap bg-gradient-primary text-primary-foreground shadow-gold hover:opacity-90 ${f}`}
            >
              {t.featured.bookNow}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

function InfoRow({
  icon: Icon,
  label,
  items,
  empty,
}: {
  icon: React.ElementType;
  label: string;
  items: string[];
  empty: string;
}) {
  return (
    <div className="flex gap-2 text-sm">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
      <div className="min-w-0">
        <span className="font-medium text-foreground">{label}: </span>
        <span className="text-muted-foreground">{items.length ? items.join(", ") : empty}</span>
      </div>
    </div>
  );
}

export default TutorCard;
