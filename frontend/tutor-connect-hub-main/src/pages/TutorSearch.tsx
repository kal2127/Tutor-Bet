import React, { useEffect, useMemo, useState } from "react";
import { ClipboardPlus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n-context";
import { subjects, locations, Tutor, toUiTutor } from "@/lib/tutors";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TutorCard from "@/components/TutorCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, getCurrentUser } from "@/lib/api";

const TutorSearch: React.FC = () => {
  const { t, lang } = useI18n();
  const f = lang === "am" ? "font-ethiopic" : "";

  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const currentUser = getCurrentUser();
  const postRequestPath =
    currentUser?.role === "FAMILY"
      ? "/family/dashboard?tab=new"
      : `/signup?role=family&next=${encodeURIComponent("/family/dashboard?tab=new")}`;

  useEffect(() => {
    let mounted = true;

    const loadTutors = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await api.listTutors();
        if (mounted) {
          setTutors(
            (result.tutors || []).map((item) =>
              toUiTutor(item as Record<string, unknown>),
            ),
          );
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unable to load tutors");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadTutors();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    let data = [...tutors];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (tutor) =>
          tutor.name.toLowerCase().includes(q) ||
          tutor.subjects.some((subject) => subject.toLowerCase().includes(q)) ||
          tutor.location.toLowerCase().includes(q),
      );
    }

    if (subjectFilter !== "all") {
      data = data.filter((tutor) => tutor.subjects.includes(subjectFilter));
    }

    if (locationFilter !== "all") {
      data = data.filter((tutor) => tutor.location.includes(locationFilter));
    }

    if (modeFilter !== "all") {
      data = data.filter(
        (tutor) => tutor.mode === modeFilter || tutor.mode === "both",
      );
    }

    return data;
  }, [searchQuery, subjectFilter, locationFilter, modeFilter, tutors]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-10">
        <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className={`text-4xl font-bold md:text-5xl ${f}`}>
              {t.search.title}
            </h1>
            <p className="mt-2 max-w-2xl text-lg text-muted-foreground">
              Browse approved tutors or post your learning request so tutors can apply.
            </p>
          </div>
          <Link to={postRequestPath}>
            <Button size="lg" className="gap-2 bg-gradient-primary text-primary-foreground shadow-gold">
              <ClipboardPlus className="h-5 w-5" />
              Post a Request
            </Button>
          </Link>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t.hero.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-10 ${f}`}
            />
          </div>

          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className={f}>
              <SelectValue placeholder={t.search.filterSubject} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className={f}>
                {t.search.allSubjects}
              </SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject.en} value={subject.en}>
                  {lang === "am" ? subject.am : subject.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className={f}>
              <SelectValue placeholder={t.search.filterLocation} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className={f}>
                {t.search.allLocations}
              </SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.en} value={location.en}>
                  {lang === "am" ? location.am : location.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={modeFilter} onValueChange={setModeFilter}>
            <SelectTrigger className={f}>
              <SelectValue placeholder={t.search.filterMode} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className={f}>
                {t.search.allModes}
              </SelectItem>
              <SelectItem value="online">{t.tutorCard.online}</SelectItem>
              <SelectItem value="in-person">{t.tutorCard.inPerson}</SelectItem>
              <SelectItem value="both">{t.tutorCard.both}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className={`mb-6 text-sm text-muted-foreground ${f}`}>
          {filtered.length} {t.search.results}
        </p>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground">
            Loading tutors...
          </div>
        ) : error ? (
          <div className="py-20 text-center text-destructive">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className={`text-muted-foreground ${f}`}>{t.search.noResults}</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((tutor) => (
              <TutorCard key={tutor.id} tutor={tutor} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default TutorSearch;
