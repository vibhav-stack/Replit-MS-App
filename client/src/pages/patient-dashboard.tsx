import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Cloud, LogOut, User, Activity, Brain, Clock, FileText, Heart,
  Stethoscope, Moon, Smile, Zap, Pill, BookOpen, TrendingUp, Plus, CheckCircle, AlertTriangle, Loader2, MessageCircle,
} from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";
import { HelpGuide } from "@/components/help-guide";
import { Chatbot } from "@/components/chatbot";

interface PatientData {
  id: string;
  clinicianId: string;
  patientUserId: string;
  age: number | null;
  msDurationYears: string | null;
  totalRelapses: number | null;
  relapsesLast12Months: number | null;
  edssScore: string | null;
  notes: string | null;
  clinicianName: string;
}

interface DailyLog {
  id: string;
  patientUserId: string;
  logDate: string;
  sleepHours: number;
  physicalComfort: number;
  mentalFog: boolean;
  mood: "HAPPY" | "SAD" | "ANXIOUS" | "NEUTRAL";
  overallWellbeing: number;
  activityLevel: number;
  medicationAdherence: boolean;
  painSymptoms: string[];
  fatigueSymptoms: string[];
  visualSymptoms: string[];
  notes: string | null;
}

function classifyMsStageByAge(age: number): { stage: string; description: string } {
  if (age >= 20 && age <= 40) return { stage: "CIS", description: "Clinically Isolated Syndrome - Single episode, mild symptoms" };
  if (age > 20 && age <= 45) return { stage: "RRMS", description: "Relapsing-Remitting MS - Episodes of relapse and remission" };
  if (age > 30 && age <= 60) return { stage: "SPMS", description: "Secondary Progressive MS - Gradual worsening" };
  if (age > 40) return { stage: "PPMS", description: "Primary Progressive MS - Steady progression" };
  return { stage: "Unclassified", description: "Age outside guideline range" };
}

function classifyMsStageByRelapses(relapses: number): { stage: string; description: string } {
  if (relapses === 0) return { stage: "CIS", description: "No relapses, first episode" };
  if (relapses <= 3) return { stage: "RRMS", description: "1-3 relapses, mostly good recovery" };
  if (relapses <= 10) return { stage: "SPMS", description: "4-10 relapses, increasing disability" };
  return { stage: "PPMS", description: ">10 relapses, progressive worsening" };
}

function classifyMsStageByDuration(duration: number): { stage: string; description: string } {
  if (duration === 0) return { stage: "PPMS", description: "Progressive from onset" };
  if (duration <= 1) return { stage: "CIS", description: "0-1 year duration" };
  if (duration <= 15) return { stage: "RRMS", description: "1-15 years duration" };
  return { stage: "SPMS", description: "Usually >15 years" };
}

const STAGE_COLORS: Record<string, string> = {
  CIS: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  RRMS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  SPMS: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  PPMS: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  Unclassified: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

interface AiInsights {
  summary: string;
  alarmingFindings: string[];
  positiveFindings: string[];
  recommendations: string[];
  symptomPatterns: string;
  riskLevel: "low" | "moderate" | "high";
}

const PAIN_OPTIONS = ["Headache", "Joint pain", "Muscle spasm", "Nerve pain", "Back pain", "Neck pain"];
const FATIGUE_OPTIONS = ["Physical fatigue", "Mental fatigue", "Lassitude", "Motor fatigue", "Cognitive fatigue"];
const VISUAL_OPTIONS = ["Blurred vision", "Double vision", "Eye pain", "Color desaturation", "Optic neuritis"];

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [showHelp, setShowHelp] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const { data: patient, isLoading, error } = useQuery<PatientData>({
    queryKey: ["/api/patient/dashboard"],
  });

  const today = format(new Date(), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: todayLog } = useQuery<DailyLog>({
    queryKey: ["/api/patient/daily-log", today],
    retry: false,
  });

  const { data: weeklyLogs } = useQuery<DailyLog[]>({
    queryKey: ["/api/patient/daily-logs", "weekly", weekStart, weekEnd],
    queryFn: async () => {
      const res = await fetch(`/api/patient/daily-logs?start=${weekStart}&end=${weekEnd}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch weekly logs");
      return res.json();
    },
  });

  const { data: recentLogs } = useQuery<DailyLog[]>({
    queryKey: ["/api/patient/daily-logs"],
  });

  return (
    <div className="min-h-screen bg-background">
      {showHelp && <HelpGuide role="patient" onClose={() => setShowHelp(false)} />}
      <Chatbot role="patient" isOpen={showChat} onClose={() => setShowChat(false)} />
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10">
                <Cloud className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground leading-tight">Clear Skies</h1>
                <p className="text-xs text-muted-foreground leading-tight">Patient Portal</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHelp(true)}
                data-testid="button-help-guide"
                className="ml-2"
              >
                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                Help Guide
              </Button>
              <Button
                variant={showChat ? "default" : "outline"}
                size="sm"
                onClick={() => setShowChat((v) => !v)}
                data-testid="button-ms-assistant"
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                MS Assistant
              </Button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground" data-testid="text-patient-name">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Badge variant="secondary" data-testid="badge-role">
                <User className="w-3 h-3 mr-1" />
                Patient
              </Badge>
              <Button variant="outline" size="sm" onClick={logout} data-testid="button-logout">
                <LogOut className="w-4 h-4 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">No Record Found</h3>
                <p className="text-sm text-muted-foreground">
                  Your clinician hasn't created your patient record yet. Please contact them to set up your profile.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : patient ? (
          <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                <TabsTrigger value="daily-log" data-testid="tab-daily-log">Daily Log</TabsTrigger>
                <TabsTrigger value="trends" data-testid="tab-trends">Weekly Trends</TabsTrigger>
                <TabsTrigger value="insights" data-testid="tab-insights">MS Insights</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <OverviewTab patient={patient} todayLog={todayLog ?? null} />
              </TabsContent>

              <TabsContent value="daily-log" className="space-y-6">
                <DailyLogTab existingLog={todayLog ?? null} />
              </TabsContent>

              <TabsContent value="trends" className="space-y-6">
                <WeeklyTrendsTab logs={weeklyLogs || []} recentLogs={recentLogs || []} />
              </TabsContent>

              <TabsContent value="insights" className="space-y-6">
                <MsInsightsTab patient={patient} recentLogs={recentLogs || []} />
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function OverviewTab({ patient, todayLog }: { patient: PatientData; todayLog: DailyLog | null }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Your Health Summary</h2>
        <p className="text-muted-foreground">Managed by Dr. {patient.clinicianName}</p>
      </div>

      {todayLog && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Today's Log Recorded</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Sleep</p>
                <p className="text-lg font-bold" data-testid="text-today-sleep">{todayLog.sleepHours}h</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mood</p>
                <p className="text-lg font-bold capitalize" data-testid="text-today-mood">{todayLog.mood.toLowerCase()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Wellbeing</p>
                <p className="text-lg font-bold" data-testid="text-today-wellbeing">{todayLog.overallWellbeing}/10</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Comfort</p>
                <p className="text-lg font-bold" data-testid="text-today-comfort">{todayLog.physicalComfort}/10</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!todayLog && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-foreground">You haven't logged your symptoms today. Switch to the Daily Log tab to add an entry.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Age</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-patient-age">
                  {patient.age ?? "Not recorded"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-chart-2/10 shrink-0">
                <Clock className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">MS Duration</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-ms-duration">
                  {patient.msDurationYears ? `${patient.msDurationYears} yrs` : "Not recorded"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-chart-3/10 shrink-0">
                <Activity className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Relapses</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-relapses">
                  {patient.totalRelapses ?? "Not recorded"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-destructive/10 shrink-0">
                <Activity className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Relapses (Last 12 Mo)</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-relapses-12">
                  {patient.relapsesLast12Months ?? "Not recorded"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-chart-4/10 shrink-0">
              <Brain className="w-5 h-5 text-chart-4" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">EDSS Score</p>
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-3xl font-bold text-foreground" data-testid="text-edss-score">
                  {patient.edssScore ?? "Not recorded"}
                </p>
                {patient.edssScore && (
                  <Badge variant={parseFloat(patient.edssScore) <= 3 ? "secondary" : parseFloat(patient.edssScore) <= 6 ? "default" : "destructive"}>
                    {parseFloat(patient.edssScore) <= 3 ? "Mild" : parseFloat(patient.edssScore) <= 6 ? "Moderate" : "Severe"}
                  </Badge>
                )}
              </div>
              {patient.edssScore && (
                <div className="mt-3">
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${parseFloat(patient.edssScore) <= 3 ? "bg-chart-3" : parseFloat(patient.edssScore) <= 6 ? "bg-chart-2" : "bg-destructive"}`}
                      style={{ width: `${(parseFloat(patient.edssScore) / 10) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between gap-1 mt-1">
                    <span className="text-xs text-muted-foreground">0</span>
                    <span className="text-xs text-muted-foreground">10</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {patient.notes && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted shrink-0">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Clinical Notes</p>
                <p className="text-sm text-foreground whitespace-pre-wrap" data-testid="text-notes">{patient.notes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 shrink-0">
              <Stethoscope className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Your Clinician</p>
              <p className="text-sm font-medium text-foreground" data-testid="text-clinician-name">Dr. {patient.clinicianName}</p>
              <p className="text-xs text-muted-foreground mt-1">For any changes to your medical data, please contact your clinician</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DailyLogTab({ existingLog }: { existingLog: DailyLog | null }) {
  if (existingLog) {
    return <ReadOnlyDailyLog log={existingLog} />;
  }
  return <DailyLogForm />;
}

function ReadOnlyDailyLog({ log }: { log: DailyLog }) {
  const moodColors: Record<string, string> = {
    HAPPY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    SAD: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    ANXIOUS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    NEUTRAL: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Today's Log</h2>
        <p className="text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-primary" />
            <p className="text-sm font-medium text-foreground">Log submitted. Only your clinician can make edits.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Moon className="w-4 h-4" /> Sleep & Comfort
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Sleep Hours</p>
              <p className="text-xl font-bold" data-testid="text-readonly-sleep">{log.sleepHours}h</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Physical Comfort</p>
              <p className="text-xl font-bold" data-testid="text-readonly-comfort">{log.physicalComfort}/10</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mental Fog</p>
              <p className="text-xl font-bold" data-testid="text-readonly-fog">{log.mentalFog ? "Yes" : "No"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smile className="w-4 h-4" /> Mood & Wellbeing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Mood</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mt-1 ${moodColors[log.mood]}`} data-testid="text-readonly-mood">
                {log.mood.charAt(0) + log.mood.slice(1).toLowerCase()}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Overall Wellbeing</p>
              <p className="text-xl font-bold" data-testid="text-readonly-wellbeing">{log.overallWellbeing}/10</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Activity Level</p>
              <p className="text-xl font-bold" data-testid="text-readonly-activity">{log.activityLevel}/5</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-muted-foreground">Medication Taken</p>
            <p className="text-sm font-medium mt-1" data-testid="text-readonly-medication">
              {log.medicationAdherence ? "Yes" : "No"}
            </p>
          </div>
        </CardContent>
      </Card>

      {((log.painSymptoms && log.painSymptoms.length > 0) || (log.fatigueSymptoms && log.fatigueSymptoms.length > 0) || (log.visualSymptoms && log.visualSymptoms.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-4 h-4" /> Symptoms Reported
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {log.painSymptoms && log.painSymptoms.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Pain</p>
                <div className="flex flex-wrap gap-1">
                  {log.painSymptoms.map((s) => <Badge key={s} variant="destructive" className="text-xs">{s}</Badge>)}
                </div>
              </div>
            )}
            {log.fatigueSymptoms && log.fatigueSymptoms.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Fatigue</p>
                <div className="flex flex-wrap gap-1">
                  {log.fatigueSymptoms.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                </div>
              </div>
            )}
            {log.visualSymptoms && log.visualSymptoms.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Visual</p>
                <div className="flex flex-wrap gap-1">
                  {log.visualSymptoms.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {log.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="w-4 h-4" /> Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground whitespace-pre-wrap" data-testid="text-readonly-notes">{log.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DailyLogForm() {
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");

  const [sleepHours, setSleepHours] = useState(7);
  const [physicalComfort, setPhysicalComfort] = useState(5);
  const [mentalFog, setMentalFog] = useState(false);
  const [mood, setMood] = useState<string>("NEUTRAL");
  const [overallWellbeing, setOverallWellbeing] = useState(5);
  const [activityLevel, setActivityLevel] = useState(3);
  const [medicationAdherence, setMedicationAdherence] = useState(true);
  const [painSymptoms, setPainSymptoms] = useState<string[]>([]);
  const [fatigueSymptoms, setFatigueSymptoms] = useState<string[]>([]);
  const [visualSymptoms, setVisualSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/patient/daily-log", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patient/daily-log"] });
      queryClient.invalidateQueries({ queryKey: ["/api/patient/daily-logs"] });
      toast({ title: "Log Saved", description: `Your daily log for ${today} has been saved.` });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message?.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      logDate: today,
      sleepHours,
      physicalComfort,
      mentalFog,
      mood,
      overallWellbeing,
      activityLevel,
      medicationAdherence,
      painSymptoms,
      fatigueSymptoms,
      visualSymptoms,
      notes: notes || undefined,
    });
  };

  const toggleSymptom = (list: string[], setList: (v: string[]) => void, symptom: string) => {
    setList(list.includes(symptom) ? list.filter((s) => s !== symptom) : [...list, symptom]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Log Today's Symptoms</h2>
        <p className="text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Moon className="w-4 h-4" /> Sleep & Comfort
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Sleep Hours</Label>
                <span className="text-sm font-medium" data-testid="text-sleep-value">{sleepHours}h</span>
              </div>
              <Slider
                value={[sleepHours]}
                onValueChange={([v]) => setSleepHours(v)}
                min={0} max={24} step={0.5}
                data-testid="slider-sleep"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">0h</span>
                <span className="text-xs text-muted-foreground">24h</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Physical Comfort</Label>
                <span className="text-sm font-medium" data-testid="text-comfort-value">{physicalComfort}/10</span>
              </div>
              <Slider
                value={[physicalComfort]}
                onValueChange={([v]) => setPhysicalComfort(v)}
                min={1} max={10} step={1}
                data-testid="slider-comfort"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">Poor</span>
                <span className="text-xs text-muted-foreground">Excellent</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="mental-fog">Mental Fog</Label>
              </div>
              <Switch
                id="mental-fog"
                checked={mentalFog}
                onCheckedChange={setMentalFog}
                data-testid="switch-mental-fog"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smile className="w-4 h-4" /> Mood & Wellbeing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="mb-2 block">Mood</Label>
              <Select value={mood} onValueChange={setMood}>
                <SelectTrigger data-testid="select-mood">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HAPPY">Happy</SelectItem>
                  <SelectItem value="NEUTRAL">Neutral</SelectItem>
                  <SelectItem value="ANXIOUS">Anxious</SelectItem>
                  <SelectItem value="SAD">Sad</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Overall Wellbeing</Label>
                <span className="text-sm font-medium" data-testid="text-wellbeing-value">{overallWellbeing}/10</span>
              </div>
              <Slider
                value={[overallWellbeing]}
                onValueChange={([v]) => setOverallWellbeing(v)}
                min={0} max={10} step={1}
                data-testid="slider-wellbeing"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Activity Level</Label>
                <span className="text-sm font-medium" data-testid="text-activity-value">{activityLevel}/5</span>
              </div>
              <Slider
                value={[activityLevel]}
                onValueChange={([v]) => setActivityLevel(v)}
                min={1} max={5} step={1}
                data-testid="slider-activity"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">Sedentary</span>
                <span className="text-xs text-muted-foreground">Very Active</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="medication">Medication Taken</Label>
              </div>
              <Switch
                id="medication"
                checked={medicationAdherence}
                onCheckedChange={setMedicationAdherence}
                data-testid="switch-medication"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-4 h-4" /> Symptoms
            </CardTitle>
            <CardDescription>Select any symptoms you're experiencing today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block text-sm font-medium">Pain Symptoms</Label>
              <div className="flex flex-wrap gap-2">
                {PAIN_OPTIONS.map((s) => (
                  <Badge
                    key={s}
                    variant={painSymptoms.includes(s) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSymptom(painSymptoms, setPainSymptoms, s)}
                    data-testid={`badge-pain-${s.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block text-sm font-medium">Fatigue Symptoms</Label>
              <div className="flex flex-wrap gap-2">
                {FATIGUE_OPTIONS.map((s) => (
                  <Badge
                    key={s}
                    variant={fatigueSymptoms.includes(s) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSymptom(fatigueSymptoms, setFatigueSymptoms, s)}
                    data-testid={`badge-fatigue-${s.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block text-sm font-medium">Visual Symptoms</Label>
              <div className="flex flex-wrap gap-2">
                {VISUAL_OPTIONS.map((s) => (
                  <Badge
                    key={s}
                    variant={visualSymptoms.includes(s) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSymptom(visualSymptoms, setVisualSymptoms, s)}
                    data-testid={`badge-visual-${s.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="w-4 h-4" /> Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Any additional notes about how you're feeling today..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              data-testid="input-daily-notes"
            />
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={mutation.isPending} size="lg" data-testid="button-save-log">
          {mutation.isPending ? "Saving..." : "Save Today's Log"}
        </Button>
      </form>
    </div>
  );
}

function WeeklyTrendsTab({ logs, recentLogs }: { logs: DailyLog[]; recentLogs: DailyLog[] }) {
  const chartData = (recentLogs.length > 0 ? [...recentLogs].reverse() : logs).map((l) => ({
    date: format(new Date(l.logDate + "T00:00:00"), "MMM d"),
    wellbeing: l.overallWellbeing,
    comfort: l.physicalComfort,
    sleep: l.sleepHours,
    activity: l.activityLevel,
    painCount: l.painSymptoms?.length || 0,
    fatigueCount: l.fatigueSymptoms?.length || 0,
  }));

  const logsToAnalyze = recentLogs.length > 0 ? recentLogs : logs;

  if (logsToAnalyze.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No Data Yet</h3>
            <p className="text-sm text-muted-foreground">Start logging your daily symptoms to see trends here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const avgWellbeing = logsToAnalyze.reduce((s, l) => s + l.overallWellbeing, 0) / logsToAnalyze.length;
  const avgSleep = logsToAnalyze.reduce((s, l) => s + l.sleepHours, 0) / logsToAnalyze.length;
  const avgComfort = logsToAnalyze.reduce((s, l) => s + l.physicalComfort, 0) / logsToAnalyze.length;
  const medAdherence = (logsToAnalyze.filter((l) => l.medicationAdherence).length / logsToAnalyze.length) * 100;
  const fogDays = logsToAnalyze.filter((l) => l.mentalFog).length;

  const moodCounts: Record<string, number> = {};
  logsToAnalyze.forEach((l) => {
    moodCounts[l.mood] = (moodCounts[l.mood] || 0) + 1;
  });

  const trend = logsToAnalyze.length >= 2
    ? logsToAnalyze[0].overallWellbeing > logsToAnalyze[logsToAnalyze.length - 1].overallWellbeing
      ? "Improving"
      : logsToAnalyze[0].overallWellbeing < logsToAnalyze[logsToAnalyze.length - 1].overallWellbeing
      ? "Declining"
      : "Stable"
    : "Insufficient data";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Weekly Trends</h2>
        <p className="text-muted-foreground">{logsToAnalyze.length} day(s) with entries</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Avg Wellbeing</p>
            <p className="text-2xl font-bold" data-testid="text-avg-wellbeing">{avgWellbeing.toFixed(1)}/10</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Avg Sleep</p>
            <p className="text-2xl font-bold" data-testid="text-avg-sleep">{avgSleep.toFixed(1)}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Avg Comfort</p>
            <p className="text-2xl font-bold" data-testid="text-avg-comfort">{avgComfort.toFixed(1)}/10</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Trend</p>
            <p className="text-xl font-bold" data-testid="text-trend">{trend}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Medication Adherence</p>
            <p className="text-2xl font-bold" data-testid="text-med-adherence">{medAdherence.toFixed(0)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Mental Fog Days</p>
            <p className="text-2xl font-bold" data-testid="text-fog-days">{fogDays}/{logsToAnalyze.length}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-1">Mood Distribution</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(moodCounts).map(([m, count]) => (
                <Badge key={m} variant="secondary" data-testid={`badge-mood-dist-${m.toLowerCase()}`}>
                  {m.charAt(0) + m.slice(1).toLowerCase()}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 1 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Wellbeing Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis domain={[0, 10]} fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="wellbeing" stroke="hsl(var(--primary))" strokeWidth={2} name="Wellbeing" />
                  <Line type="monotone" dataKey="comfort" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Comfort" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sleep Pattern</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis domain={[0, 12]} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="sleep" fill="hsl(var(--chart-3))" name="Sleep Hours" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Symptom Counts</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="painCount" stroke="hsl(var(--destructive))" strokeWidth={2} name="Pain" />
                  <Line type="monotone" dataKey="fatigueCount" stroke="hsl(var(--chart-4))" strokeWidth={2} name="Fatigue" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

interface VarianceMetric {
  key: string;
  label: string;
  mean: number;
  stdDev: number;
  variance: number;
  cv: number;
  min: number;
  max: number;
  range: number;
  color: string;
}

interface SymptomVarianceData {
  metrics: VarianceMetric[];
  mostVarying: VarianceMetric | null;
  dailyData: any[];
  message?: string;
}

const VARIANCE_KEY_MAP: Record<string, string> = {
  sleepHours: "sleepHours",
  physicalComfort: "physicalComfort",
  overallWellbeing: "overallWellbeing",
  activityLevel: "activityLevel",
  painSymptoms: "painCount",
  fatigueSymptoms: "fatigueCount",
  visualSymptoms: "visualCount",
};

function PatientSymptomVarianceChart({ data }: { data: SymptomVarianceData }) {
  if (!data.mostVarying || data.dailyData.length < 2) {
    return (
      <div className="text-center py-6">
        <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{data.message || "Need at least 2 daily logs to analyze symptom variance."}</p>
      </div>
    );
  }

  const chartKey = VARIANCE_KEY_MAP[data.mostVarying.key] || data.mostVarying.key;
  const chartData = [...data.dailyData].reverse().map((d) => ({
    ...d,
    date: format(new Date(d.date + "T00:00:00"), "MMM d"),
  }));

  const sorted = [...data.metrics].sort((a, b) => b.cv - a.cv);

  return (
    <div className="space-y-6">
      <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold text-foreground" data-testid="text-patient-most-varying">Most Varying: {data.mostVarying.label}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Coefficient of Variation: {data.mostVarying.cv}% | Range: {data.mostVarying.min} – {data.mostVarying.max} | Avg: {data.mostVarying.mean}
        </p>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">{data.mostVarying.label} Over Time</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={10} />
            <YAxis fontSize={10} />
            <Tooltip />
            <Line type="monotone" dataKey={chartKey} stroke="hsl(var(--primary))" strokeWidth={2} name={data.mostVarying.label} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Variability Ranking</p>
        <div className="space-y-2">
          {sorted.map((m, i) => {
            const maxCv = sorted[0].cv || 1;
            const barWidth = maxCv > 0 ? (m.cv / maxCv) * 100 : 0;
            return (
              <div key={m.key} className="flex items-center gap-3" data-testid={`patient-variance-row-${m.key}`}>
                <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                <span className="text-xs w-32 truncate">{m.label}</span>
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${m.key === data.mostVarying?.key ? "bg-primary" : "bg-muted-foreground/40"}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className="text-xs font-mono w-14 text-right">{m.cv}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MsInsightsTab({ patient, recentLogs }: { patient: PatientData; recentLogs: DailyLog[] }) {
  const { toast } = useToast();
  const hasAge = patient.age !== null;
  const hasRelapses = patient.totalRelapses !== null;
  const hasDuration = patient.msDurationYears !== null;

  const ageStage = hasAge ? classifyMsStageByAge(patient.age!) : null;
  const relapseStage = hasRelapses ? classifyMsStageByRelapses(patient.totalRelapses!) : null;
  const durationStage = hasDuration ? classifyMsStageByDuration(parseFloat(patient.msDurationYears!)) : null;

  const allSymptoms: Record<string, number> = {};
  recentLogs.forEach((l) => {
    [...(l.painSymptoms || []), ...(l.fatigueSymptoms || []), ...(l.visualSymptoms || [])].forEach((s) => {
      allSymptoms[s] = (allSymptoms[s] || 0) + 1;
    });
  });
  const topSymptoms = Object.entries(allSymptoms)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const [showVariance, setShowVariance] = useState(false);
  const { data: varianceData, isLoading: varianceLoading } = useQuery<SymptomVarianceData>({
    queryKey: ["/api/patient/insights/symptom-variance"],
    enabled: showVariance,
  });

  const [aiInsights, setAiInsights] = useState<AiInsights | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function handleGenerateAi() {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await apiRequest("POST", "/api/patient/insights/ai");
      const data = await res.json();
      setAiInsights(data);
    } catch (err: any) {
      setAiError("Failed to generate AI insights. Please try again.");
      toast({ title: "Error", description: "Could not generate AI insights.", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  }

  const riskColors: Record<string, string> = {
    low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    moderate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">My Health Insights</h2>
        <p className="text-muted-foreground">Your personal MS data and AI-powered health analysis</p>
      </div>

      {/* AI Analysis Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-4 h-4" /> AI Health Analysis
            </CardTitle>
            <Button
              size="sm"
              onClick={handleGenerateAi}
              disabled={aiLoading}
              variant={aiInsights ? "outline" : "default"}
              data-testid="button-patient-generate-ai"
            >
              {aiLoading ? (
                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Analysing...</>
              ) : aiInsights ? (
                <><Brain className="w-3 h-3 mr-1" /> Regenerate</>
              ) : (
                <><Brain className="w-3 h-3 mr-1" /> Generate AI Analysis</>
              )}
            </Button>
          </div>
          <CardDescription>Personalised insights based on your symptom logs and health data</CardDescription>
        </CardHeader>
        {aiError && (
          <CardContent>
            <p className="text-sm text-destructive">{aiError}</p>
          </CardContent>
        )}
        {aiInsights && (
          <CardContent className="space-y-5">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">Overall Summary</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${riskColors[aiInsights.riskLevel]}`} data-testid="text-patient-ai-risk">
                    {aiInsights.riskLevel.charAt(0).toUpperCase() + aiInsights.riskLevel.slice(1)} Risk
                  </span>
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-patient-ai-summary">{aiInsights.summary}</p>
              </div>
            </div>

            {aiInsights.positiveFindings?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600" /> What You're Doing Well
                </p>
                <ul className="space-y-1.5">
                  {aiInsights.positiveFindings.map((f, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2" data-testid={`text-patient-positive-${i}`}>
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiInsights.alarmingFindings?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" /> Things to Watch
                </p>
                <ul className="space-y-1.5">
                  {aiInsights.alarmingFindings.map((f, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2" data-testid={`text-patient-alarming-${i}`}>
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiInsights.recommendations?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">Recommendations for You</p>
                <ul className="space-y-2">
                  {aiInsights.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2" data-testid={`text-patient-recommendation-${i}`}>
                      <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiInsights.symptomPatterns && (
              <div className="p-3 rounded-lg border bg-card">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Symptom Patterns</p>
                <p className="text-sm text-foreground" data-testid="text-patient-ai-patterns">{aiInsights.symptomPatterns}</p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* MS Stage Classification */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">MS Stage Classification</h3>
        {!hasAge && !hasRelapses && !hasDuration ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">Insufficient Data</h3>
                <p className="text-sm text-muted-foreground">Your clinician needs to record your age, relapses, and MS duration for stage classification.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {ageStage && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">By Age ({patient.age} years)</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STAGE_COLORS[ageStage.stage]}`} data-testid="text-stage-age">
                      {ageStage.stage}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{ageStage.description}</p>
                </CardContent>
              </Card>
            )}

            {relapseStage && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">By Relapses ({patient.totalRelapses} total)</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STAGE_COLORS[relapseStage.stage]}`} data-testid="text-stage-relapses">
                      {relapseStage.stage}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{relapseStage.description}</p>
                </CardContent>
              </Card>
            )}

            {durationStage && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">By Duration ({patient.msDurationYears} years)</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STAGE_COLORS[durationStage.stage]}`} data-testid="text-stage-duration">
                      {durationStage.stage}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{durationStage.description}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {topSymptoms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most Common Symptoms (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSymptoms.map(([symptom, count]) => (
                <div key={symptom} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{symptom}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${(count / recentLogs.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-16 text-right" data-testid={`text-symptom-count-${symptom.toLowerCase().replace(/\s+/g, "-")}`}>
                      {count}/{recentLogs.length} days
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Symptom Variance Analysis
            </CardTitle>
            <Button
              variant={showVariance ? "default" : "outline"}
              size="sm"
              onClick={() => setShowVariance(!showVariance)}
              data-testid="button-generate-patient-variance"
            >
              <Activity className="w-3 h-3 mr-1" />
              {showVariance ? "Hide Insights" : "Generate Insights"}
            </Button>
          </div>
          <CardDescription>Analyse which of your tracked metrics varies the most over time</CardDescription>
        </CardHeader>
        {showVariance && (
          <CardContent>
            {varianceLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : varianceData ? (
              <PatientSymptomVarianceChart data={varianceData} />
            ) : null}
          </CardContent>
        )}
      </Card>

      <Card className="border-yellow-500/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Medical Disclaimer</p>
              <p className="text-xs text-muted-foreground mt-1">
                MS stage classification and AI insights shown here are for informational purposes only and are based on general clinical guidelines. 
                They do not constitute a medical diagnosis. Please consult your neurologist for an accurate assessment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
