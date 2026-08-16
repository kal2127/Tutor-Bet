import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, getCurrentUser, JobPost } from "@/lib/api";
import { formatStatus, money, statusClass } from "@/lib/dashboard";

const JobBoard: React.FC = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const user = getCurrentUser();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (user.role !== "TUTOR") {
      navigate("/family/dashboard");
      return;
    }
    api.listOpenJobPosts()
      .then((result) => setJobs(result.job_posts || []))
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load jobs"))
      .finally(() => setLoading(false));
  }, [navigate, user]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Open Tutor Requests</h1>
          <p className="text-muted-foreground">Browse family requests and apply from your tutor dashboard.</p>
        </div>

        {!user ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <Lock className="h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">Sign in as an approved tutor to view open requests.</p>
              <Link to="/login"><Button>Sign in</Button></Link>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="py-20 text-center text-muted-foreground">Loading requests...</div>
        ) : error ? (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {jobs.map((job) => (
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" />{job.title}</CardTitle>
                    <Badge className={statusClass(job.status)}>{formatStatus(job.status)}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{job.description || "No description provided."}</p>
                  <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                    <span>{job.subject || "General"} · {job.grade}</span>
                    <span>{money(job.budget)}</span>
                    <span>{job.days_per_week} days/week</span>
                    <span>{job.session_type.replace("_", " ").toLowerCase()}</span>
                  </div>
                  <Button className="mt-4" onClick={() => navigate("/tutor/dashboard")}>Apply in dashboard</Button>
                </CardContent>
              </Card>
            ))}
            {jobs.length === 0 && <Card><CardContent className="py-10 text-center text-muted-foreground">No open requests right now.</CardContent></Card>}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default JobBoard;
