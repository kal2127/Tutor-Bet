import React, { useState } from "react";
import { Send, Star } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const Feedback: React.FC = () => {
  const { lang } = useI18n();
  const { toast } = useToast();
  const am = lang === "am";
  const cls = am ? "font-ethiopic" : "";

  const [comments, setComments] = useState("");
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast({
        title: "Rating is required",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await api.createFeedback({
        rating,
        comments: comments.trim() || undefined,
      });
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback.",
      });
      setComments("");
      setRating(0);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Could not submit feedback",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 px-4 py-12">
        <div className="container mx-auto max-w-xl">
          <Card className="border-border shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className={`text-2xl font-bold text-foreground ${cls}`}>
                {am ? "Feedback" : "Give Us Your Feedback"}
              </CardTitle>
              <p className={`text-muted-foreground ${cls}`}>
                Share your experience with Tutor ቤት.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className={cls}>{am ? "Rating" : "Rating"}</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        className="p-0.5 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-7 w-7 ${
                            (hoveredStar || rating) >= star
                              ? "fill-primary text-primary"
                              : "text-muted-foreground/40"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className={cls}>{am ? "Message" : "Message"}</Label>
                  <Textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Write your feedback..."
                    rows={4}
                    maxLength={1000}
                  />
                </div>
                <Button type="submit" className="w-full gap-2" disabled={submitting}>
                  <Send className="h-4 w-4" />
                  {submitting ? "Sending..." : "Submit Feedback"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Feedback;
