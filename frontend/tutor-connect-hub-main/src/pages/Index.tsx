import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, Mail, Search, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/lib/i18n-context';
import { api } from '@/lib/api';
import { toUiTutor, Tutor } from '@/lib/tutors';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import TutorCard from '@/components/TutorCard';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero-ethiopian-tutor-left-space.png';

const Index: React.FC = () => {
  const { t, lang } = useI18n();
  const f = lang === 'am' ? 'font-ethiopic' : '';
  const [featuredTutors, setFeaturedTutors] = useState<Tutor[]>([]);

  useEffect(() => {
    let mounted = true;
    api
      .listTutors()
      .then((result) => {
        if (!mounted) return;
        setFeaturedTutors(
          (result.tutors || [])
            .slice(0, 3)
            .map((item) => toUiTutor(item as Record<string, unknown>)),
        );
      })
      .catch(() => {
        if (mounted) setFeaturedTutors([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const steps = [
    { icon: Search, title: t.howItWorks.step1Title, desc: t.howItWorks.step1Desc },
    { icon: ClipboardCheck, title: t.howItWorks.step2Title, desc: t.howItWorks.step2Desc },
    { icon: ShieldCheck, title: t.howItWorks.step3Title, desc: t.howItWorks.step3Desc },
    { icon: Mail, title: t.howItWorks.step4Title, desc: t.howItWorks.step4Desc },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[78vh] overflow-hidden bg-background">
        <img
          src={heroImage}
          alt="Ethiopian tutor helping a student study"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/72 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-background/20" />
        <div className="container relative z-10 mx-auto flex min-h-[78vh] items-center py-16 md:py-20">
          <div className="max-w-3xl animate-fade-in-up">
            <h1 className={`text-4xl font-extrabold leading-[1.08] tracking-normal text-foreground drop-shadow-xl md:text-5xl xl:text-6xl ${f}`}>
              {t.hero.title}
            </h1>
            <p className={`mt-6 max-w-2xl text-xl leading-8 text-foreground/86 drop-shadow md:text-2xl md:leading-9 ${f}`}>
              {t.hero.subtitle}
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link to="/tutors">
                <Button size="lg" className={`h-14 bg-gradient-primary px-9 text-lg text-primary-foreground shadow-gold transition hover:-translate-y-0.5 hover:opacity-90 ${f}`}>
                  {t.hero.cta}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/signup?role=tutor">
                <Button size="lg" variant="outline" className={`h-14 border-foreground/45 bg-background/35 px-9 text-lg text-foreground backdrop-blur transition hover:-translate-y-0.5 hover:bg-background/55 ${f}`}>
                  {t.hero.ctaSecondary}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className={`text-4xl font-bold md:text-5xl ${f}`}>{t.howItWorks.title}</h2>
            <p className={`mt-4 text-xl text-muted-foreground ${f}`}>{t.howItWorks.subtitle}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 xl:gap-8">
            {steps.map((step, i) => (
              <div
                key={i}
                className="relative rounded-xl border border-border bg-card p-8 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
              >
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-primary shadow-gold">
                  <step.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </div>
                <h3 className={`text-xl font-semibold mb-3 ${f}`}>{step.title}</h3>
                <p className={`text-base leading-7 text-muted-foreground ${f}`}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Tutors */}
      <section className="bg-muted/50 py-16 md:py-24">
        <div className="container mx-auto">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className={`text-3xl font-bold md:text-4xl ${f}`}>{t.featured.title}</h2>
              <p className={`mt-2 text-muted-foreground ${f}`}>{t.featured.subtitle}</p>
            </div>
            <Link to="/tutors">
              <Button variant="ghost" className={`text-primary ${f}`}>
                {t.featured.viewAll} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          {featuredTutors.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredTutors.map(tutor => (
                <TutorCard key={tutor.id} tutor={tutor} />
              ))}
            </div>
          ) : (
            <p className={`text-sm text-muted-foreground ${f}`}>
              Tutors will appear here after admin approval.
            </p>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
