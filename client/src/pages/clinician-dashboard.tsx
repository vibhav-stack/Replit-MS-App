import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Cloud,
  LogOut,
  Plus,
  Pencil,
  Eye,
  Users,
  Activity,
  Stethoscope,
  Loader2,
  UserPlus,
  X,
  Brain,
  TrendingUp,
  FileText,
} from "lucide-react";
import { format } from "date-fns";

interface DailyLog {
  id: string;
  logDate: string;
  sleepHours: number;
  physicalComfort: number;
  mentalFog: boolean;
  mood: string;
  overallWellbeing: number;
  activityLevel: number;
  medicationAdherence: boolean;
  painSymptoms: string[];
  fatigueSymptoms: string[];
  visualSymptoms: string[];
  notes: string | null;
}

interface PatientRecord {
  id: string;
  clinicianId: string;
  patientUserId: string;
  age: number | null;
  msDurationYears: string | null;
  totalRelapses: number | null;
  relapsesLast12Months: number | null;
  edssScore: string | null;
  notes: string | null;
  patientName: string;
  patientEmail: string;
}

export default function ClinicianDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null);
  const [viewingPatient, setViewingPatient] = useState<PatientRecord | null>(null);
  const [dailyLogPatient, setDailyLogPatient] = useState<PatientRecord | null>(null);

  const { data: patients, isLoading } = useQuery<PatientRecord[]>({
    queryKey: ["/api/clinician/patients"],
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10">
                <Cloud className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground leading-tight">Clear Skies</h1>
                <p className="text-xs text-muted-foreground leading-tight">Clinician Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground" data-testid="text-user-name">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Badge variant="secondary" data-testid="badge-role">
                <Stethoscope className="w-3 h-3 mr-1" />
                Clinician
              </Badge>
              <Button variant="outline" size="sm" onClick={logout} data-testid="button-logout">
                <LogOut className="w-4 h-4 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-patients">{patients?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Patients</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-chart-2/10">
                  <Activity className="w-5 h-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {patients?.filter((p) => p.relapsesLast12Months && p.relapsesLast12Months > 0).length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Active Relapses (12mo)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-chart-3/10">
                  <Brain className="w-5 h-5 text-chart-3" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {patients?.length
                      ? (
                          patients.reduce((sum, p) => sum + (p.edssScore ? parseFloat(p.edssScore) : 0), 0) /
                          patients.filter((p) => p.edssScore).length || 0
                        ).toFixed(1)
                      : "0.0"}
                  </p>
                  <p className="text-xs text-muted-foreground">Avg EDSS Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
            <div>
              <CardTitle>My Patients</CardTitle>
              <CardDescription>Manage and monitor your patient records</CardDescription>
            </div>
            <Button onClick={() => setShowCreate(true)} data-testid="button-add-patient">
              <Plus className="w-4 h-4 mr-2" />
              Add Patient
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !patients || patients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">No patients yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first patient to start managing their MS care
                </p>
                <Button onClick={() => setShowCreate(true)} data-testid="button-add-first-patient">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add First Patient
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Age</TableHead>
                      <TableHead className="hidden md:table-cell">MS Duration</TableHead>
                      <TableHead className="hidden md:table-cell">Relapses</TableHead>
                      <TableHead className="hidden sm:table-cell">EDSS</TableHead>
                      <TableHead className="text-right w-[280px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patients.map((patient) => (
                      <TableRow key={patient.id} data-testid={`row-patient-${patient.id}`}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{patient.patientName}</p>
                            <p className="text-xs text-muted-foreground">{patient.patientEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {patient.age || "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {patient.msDurationYears ? `${patient.msDurationYears} yrs` : "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="text-sm">
                            <span>{patient.totalRelapses ?? "-"} total</span>
                            {patient.relapsesLast12Months !== null && (
                              <span className="text-muted-foreground ml-1">
                                ({patient.relapsesLast12Months} in 12mo)
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {patient.edssScore !== null ? (
                            <Badge variant={parseFloat(patient.edssScore || "0") >= 6 ? "destructive" : "secondary"}>
                              {patient.edssScore}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewingPatient(patient)}
                              data-testid={`button-view-${patient.id}`}
                            >
                              <Eye className="w-4 h-4 mr-1.5" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingPatient(patient)}
                              data-testid={`button-edit-${patient.id}`}
                            >
                              <Pencil className="w-4 h-4 mr-1.5" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDailyLogPatient(patient)}
                              data-testid={`button-daily-logs-${patient.id}`}
                            >
                              <FileText className="w-4 h-4 mr-1.5" />
                              Logs
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <CreatePatientDialog open={showCreate} onClose={() => setShowCreate(false)} />
      <EditPatientDialog patient={editingPatient} onClose={() => setEditingPatient(null)} />
      <ViewPatientDialog patient={viewingPatient} onClose={() => setViewingPatient(null)} />
      <DailyLogDialog patient={dailyLogPatient} onClose={() => setDailyLogPatient(null)} />
    </div>
  );
}

function CreatePatientDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [patientEmail, setPatientEmail] = useState("");
  const [age, setAge] = useState("");
  const [msDuration, setMsDuration] = useState("");
  const [totalRelapses, setTotalRelapses] = useState("");
  const [relapsesLast12, setRelapsesLast12] = useState("");
  const [edss, setEdss] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/clinician/patient/create", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinician/patients"] });
      toast({ title: "Patient added", description: "Patient record created successfully" });
      resetForm();
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message?.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const resetForm = () => {
    setPatientEmail("");
    setAge("");
    setMsDuration("");
    setTotalRelapses("");
    setRelapsesLast12("");
    setEdss("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      patientEmail,
      age: age ? parseInt(age) : null,
      msDurationYears: msDuration || null,
      totalRelapses: totalRelapses ? parseInt(totalRelapses) : null,
      relapsesLast12Months: relapsesLast12 ? parseInt(relapsesLast12) : null,
      edssScore: edss || null,
      notes: notes || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={() => { resetForm(); onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Patient</DialogTitle>
          <DialogDescription>Link an existing patient account and fill in their MS data.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-email">Patient's Email</Label>
            <Input
              id="create-email"
              type="email"
              placeholder="patient@example.com"
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              required
              data-testid="input-create-patient-email"
            />
            <p className="text-xs text-muted-foreground">The patient must already have an account</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="create-age">Age</Label>
              <Input
                id="create-age"
                type="number"
                placeholder="Age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                data-testid="input-create-age"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-ms">MS Duration (years)</Label>
              <Input
                id="create-ms"
                type="number"
                step="0.1"
                placeholder="Years"
                value={msDuration}
                onChange={(e) => setMsDuration(e.target.value)}
                data-testid="input-create-ms-duration"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="create-relapses">Total Relapses</Label>
              <Input
                id="create-relapses"
                type="number"
                placeholder="Count"
                value={totalRelapses}
                onChange={(e) => setTotalRelapses(e.target.value)}
                data-testid="input-create-total-relapses"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-relapses12">Relapses (12mo)</Label>
              <Input
                id="create-relapses12"
                type="number"
                placeholder="Count"
                value={relapsesLast12}
                onChange={(e) => setRelapsesLast12(e.target.value)}
                data-testid="input-create-relapses-12"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-edss">EDSS Score</Label>
            <Input
              id="create-edss"
              type="number"
              step="0.5"
              min="0"
              max="10"
              placeholder="0.0 - 10.0"
              value={edss}
              onChange={(e) => setEdss(e.target.value)}
              data-testid="input-create-edss"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-notes">Notes</Label>
            <Textarea
              id="create-notes"
              placeholder="Clinical notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="input-create-notes"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { resetForm(); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-create">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Add Patient
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditPatientDialog({
  patient,
  onClose,
}: {
  patient: PatientRecord | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [age, setAge] = useState("");
  const [msDuration, setMsDuration] = useState("");
  const [totalRelapses, setTotalRelapses] = useState("");
  const [relapsesLast12, setRelapsesLast12] = useState("");
  const [edss, setEdss] = useState("");
  const [notes, setNotes] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (patient && !initialized) {
    setAge(patient.age?.toString() || "");
    setMsDuration(patient.msDurationYears || "");
    setTotalRelapses(patient.totalRelapses?.toString() || "");
    setRelapsesLast12(patient.relapsesLast12Months?.toString() || "");
    setEdss(patient.edssScore || "");
    setNotes(patient.notes || "");
    setInitialized(true);
  }

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/clinician/patient/${patient!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinician/patients"] });
      toast({ title: "Updated", description: "Patient record updated successfully" });
      handleClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message?.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const handleClose = () => {
    setInitialized(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      age: age ? parseInt(age) : undefined,
      msDurationYears: msDuration || undefined,
      totalRelapses: totalRelapses ? parseInt(totalRelapses) : undefined,
      relapsesLast12Months: relapsesLast12 ? parseInt(relapsesLast12) : undefined,
      edssScore: edss || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={!!patient} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Patient: {patient?.patientName}</DialogTitle>
          <DialogDescription>Update the patient's MS clinical data.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-age">Age</Label>
              <Input
                id="edit-age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                data-testid="input-edit-age"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ms">MS Duration (years)</Label>
              <Input
                id="edit-ms"
                type="number"
                step="0.1"
                value={msDuration}
                onChange={(e) => setMsDuration(e.target.value)}
                data-testid="input-edit-ms-duration"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-relapses">Total Relapses</Label>
              <Input
                id="edit-relapses"
                type="number"
                value={totalRelapses}
                onChange={(e) => setTotalRelapses(e.target.value)}
                data-testid="input-edit-total-relapses"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-relapses12">Relapses (12mo)</Label>
              <Input
                id="edit-relapses12"
                type="number"
                value={relapsesLast12}
                onChange={(e) => setRelapsesLast12(e.target.value)}
                data-testid="input-edit-relapses-12"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-edss">EDSS Score</Label>
            <Input
              id="edit-edss"
              type="number"
              step="0.5"
              min="0"
              max="10"
              value={edss}
              onChange={(e) => setEdss(e.target.value)}
              data-testid="input-edit-edss"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="input-edit-notes"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-edit">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DailyLogDialog({
  patient,
  onClose,
}: {
  patient: PatientRecord | null;
  onClose: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);

  if (!patient) return null;

  return (
    <Dialog open={!!patient} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Daily Logs - {patient.patientName}</DialogTitle>
          <DialogDescription>Create, view, and edit daily symptom logs for this patient</DialogDescription>
        </DialogHeader>

        {showForm || editingLog ? (
          <ClinicianDailyLogForm
            patientId={patient.id}
            existingLog={editingLog}
            onClose={() => { setShowForm(false); setEditingLog(null); }}
          />
        ) : (
          <DailyLogDialogContent
            patientId={patient.id}
            onAddLog={() => setShowForm(true)}
            onEditLog={(log) => setEditingLog(log)}
          />
        )}

        {!showForm && !editingLog && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DailyLogDialogContent({
  patientId,
  onAddLog,
  onEditLog,
}: {
  patientId: string;
  onAddLog: () => void;
  onEditLog: (log: DailyLog) => void;
}) {
  const { data: logs, isLoading } = useQuery<DailyLog[]>({
    queryKey: ["/api/clinician/patient", patientId, "daily-logs"],
    queryFn: async () => {
      const res = await fetch(`/api/clinician/patient/${patientId}/daily-logs`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="space-y-2"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{logs?.length || 0} log entries</p>
        <Button size="sm" onClick={onAddLog} data-testid="button-clinician-create-log">
          <Plus className="w-4 h-4 mr-1" /> Create New Log
        </Button>
      </div>

      {(!logs || logs.length === 0) ? (
        <div className="text-center py-8">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">No daily logs recorded yet for this patient.</p>
          <Button onClick={onAddLog} data-testid="button-clinician-create-first-log">
            <Plus className="w-4 h-4 mr-1" /> Create First Log
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Avg Wellbeing</p>
              <p className="text-lg font-bold" data-testid="text-dialog-avg-wellbeing">
                {(logs.reduce((s, l) => s + l.overallWellbeing, 0) / logs.length).toFixed(1)}/10
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Avg Sleep</p>
              <p className="text-lg font-bold" data-testid="text-dialog-avg-sleep">
                {(logs.reduce((s, l) => s + l.sleepHours, 0) / logs.length).toFixed(1)}h
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Med Adherence</p>
              <p className="text-lg font-bold" data-testid="text-dialog-med-adherence">
                {((logs.filter((l) => l.medicationAdherence).length / logs.length) * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          {logs.length > 1 && (
            <div>
              <p className="text-sm font-medium mb-2">Wellbeing Trend</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={[...logs].reverse().map((l) => ({
                  date: format(new Date(l.logDate + "T00:00:00"), "MMM d"),
                  wellbeing: l.overallWellbeing,
                  comfort: l.physicalComfort,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis domain={[0, 10]} fontSize={10} />
                  <Tooltip />
                  <Line type="monotone" dataKey="wellbeing" stroke="hsl(var(--primary))" strokeWidth={2} name="Wellbeing" />
                  <Line type="monotone" dataKey="comfort" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Comfort" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div>
            <p className="text-sm font-medium mb-2">All Entries</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {logs.map((l) => (
                <div key={l.id} className="p-3 border rounded-lg text-sm" data-testid={`dialog-log-entry-${l.logDate}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{format(new Date(l.logDate + "T00:00:00"), "EEEE, MMM d, yyyy")}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs capitalize">{l.mood.toLowerCase()}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => onEditLog(l)}
                        data-testid={`button-dialog-edit-log-${l.logDate}`}
                      >
                        <Pencil className="w-3 h-3 mr-1" /> Edit
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                    <span>Sleep: {l.sleepHours}h</span>
                    <span>Wellbeing: {l.overallWellbeing}/10</span>
                    <span>Comfort: {l.physicalComfort}/10</span>
                    <span>Med: {l.medicationAdherence ? "Yes" : "No"}</span>
                  </div>
                  {(l.painSymptoms?.length > 0 || l.fatigueSymptoms?.length > 0 || l.visualSymptoms?.length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {[...(l.painSymptoms || []), ...(l.fatigueSymptoms || []), ...(l.visualSymptoms || [])].map((s) => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  )}
                  {l.notes && <p className="text-xs mt-1 text-muted-foreground">{l.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function classifyMsStageByAge(age: number) {
  if (age >= 20 && age <= 40) return { stage: "CIS", description: "Clinically Isolated Syndrome - Single episode, mild symptoms" };
  if (age > 20 && age <= 45) return { stage: "RRMS", description: "Relapsing-Remitting MS - Episodes of relapse and remission" };
  if (age > 30 && age <= 60) return { stage: "SPMS", description: "Secondary Progressive MS - Gradual worsening" };
  if (age > 40) return { stage: "PPMS", description: "Primary Progressive MS - Steady progression" };
  return { stage: "Unclassified", description: "Age outside guideline range" };
}

function classifyMsStageByRelapses(relapses: number) {
  if (relapses === 0) return { stage: "CIS", description: "No relapses, first episode" };
  if (relapses <= 3) return { stage: "RRMS", description: "1-3 relapses, mostly good recovery" };
  if (relapses <= 10) return { stage: "SPMS", description: "4-10 relapses, increasing disability" };
  return { stage: "PPMS", description: ">10 relapses, progressive worsening" };
}

function classifyMsStageByDuration(duration: number) {
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

const PAIN_OPTIONS = ["Headache", "Joint pain", "Muscle spasm", "Nerve pain", "Back pain", "Neck pain"];
const FATIGUE_OPTIONS = ["Physical fatigue", "Mental fatigue", "Lassitude", "Motor fatigue", "Cognitive fatigue"];
const VISUAL_OPTIONS = ["Blurred vision", "Double vision", "Eye pain", "Color desaturation", "Optic neuritis"];

function ViewPatientDialog({
  patient,
  onClose,
}: {
  patient: PatientRecord | null;
  onClose: () => void;
}) {
  if (!patient) return null;

  const details = [
    { label: "Age", value: patient.age ?? "Not recorded" },
    { label: "MS Duration", value: patient.msDurationYears ? `${patient.msDurationYears} years` : "Not recorded" },
    { label: "Total Relapses", value: patient.totalRelapses ?? "Not recorded" },
    { label: "Relapses (Last 12 Months)", value: patient.relapsesLast12Months ?? "Not recorded" },
    { label: "EDSS Score", value: patient.edssScore ?? "Not recorded" },
  ];

  return (
    <Dialog open={!!patient} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{patient.patientName}</DialogTitle>
          <DialogDescription>{patient.patientEmail}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="details">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" data-testid="tab-patient-details">Clinical Data</TabsTrigger>
            <TabsTrigger value="logs" data-testid="tab-patient-logs">Daily Logs</TabsTrigger>
            <TabsTrigger value="insights" data-testid="tab-patient-insights">MS Insights</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {details.map((d) => (
                <div key={d.label} className="space-y-1">
                  <p className="text-xs text-muted-foreground">{d.label}</p>
                  <p className="text-sm font-medium text-foreground">{d.value}</p>
                </div>
              ))}
            </div>
            {patient.notes && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{patient.notes}</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="logs">
            <PatientDailyLogsView patientId={patient.id} />
          </TabsContent>
          <TabsContent value="insights">
            <ClinicianMsInsights patient={patient} />
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PatientDailyLogsView({ patientId }: { patientId: string }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);

  const { data: logs, isLoading } = useQuery<DailyLog[]>({
    queryKey: ["/api/clinician/patient", patientId, "daily-logs"],
    queryFn: async () => {
      const res = await fetch(`/api/clinician/patient/${patientId}/daily-logs`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    },
  });

  const todayDate = format(new Date(), "yyyy-MM-dd");
  const todayLog = logs?.find((l) => l.logDate === todayDate);

  if (showForm || editingLog) {
    return (
      <ClinicianDailyLogForm
        patientId={patientId}
        existingLog={editingLog}
        onClose={() => { setShowForm(false); setEditingLog(null); }}
      />
    );
  }

  if (isLoading) {
    return <div className="space-y-2"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{logs?.length || 0} log entries</p>
        {!todayLog && (
          <Button size="sm" onClick={() => setShowForm(true)} data-testid="button-clinician-add-log">
            <Plus className="w-4 h-4 mr-1" /> Add Today's Log
          </Button>
        )}
      </div>

      {(!logs || logs.length === 0) ? (
        <div className="text-center py-6">
          <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No daily logs recorded yet</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Avg Wellbeing</p>
              <p className="text-lg font-bold" data-testid="text-clinician-avg-wellbeing">
                {(logs.reduce((s, l) => s + l.overallWellbeing, 0) / logs.length).toFixed(1)}/10
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Avg Sleep</p>
              <p className="text-lg font-bold" data-testid="text-clinician-avg-sleep">
                {(logs.reduce((s, l) => s + l.sleepHours, 0) / logs.length).toFixed(1)}h
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Med Adherence</p>
              <p className="text-lg font-bold" data-testid="text-clinician-med-adherence">
                {((logs.filter((l) => l.medicationAdherence).length / logs.length) * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          {logs.length > 1 && (
            <div>
              <p className="text-sm font-medium mb-2">Wellbeing Trend</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={[...logs].reverse().map((l) => ({
                  date: format(new Date(l.logDate + "T00:00:00"), "MMM d"),
                  wellbeing: l.overallWellbeing,
                  comfort: l.physicalComfort,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis domain={[0, 10]} fontSize={10} />
                  <Tooltip />
                  <Line type="monotone" dataKey="wellbeing" stroke="hsl(var(--primary))" strokeWidth={2} name="Wellbeing" />
                  <Line type="monotone" dataKey="comfort" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Comfort" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div>
            <p className="text-sm font-medium mb-2">Recent Entries</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {logs.slice(0, 10).map((l) => (
                <div key={l.id} className="p-3 border rounded-lg text-sm" data-testid={`log-entry-${l.logDate}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{format(new Date(l.logDate + "T00:00:00"), "EEEE, MMM d")}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs capitalize">{l.mood.toLowerCase()}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setEditingLog(l)}
                        data-testid={`button-edit-log-${l.logDate}`}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                    <span>Sleep: {l.sleepHours}h</span>
                    <span>Wellbeing: {l.overallWellbeing}/10</span>
                    <span>Comfort: {l.physicalComfort}/10</span>
                    <span>Med: {l.medicationAdherence ? "Yes" : "No"}</span>
                  </div>
                  {(l.painSymptoms?.length > 0 || l.fatigueSymptoms?.length > 0 || l.visualSymptoms?.length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {[...(l.painSymptoms || []), ...(l.fatigueSymptoms || []), ...(l.visualSymptoms || [])].map((s) => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  )}
                  {l.notes && <p className="text-xs mt-1 text-muted-foreground">{l.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ClinicianDailyLogForm({
  patientId,
  existingLog,
  onClose,
}: {
  patientId: string;
  existingLog: DailyLog | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");

  const [logDate, setLogDate] = useState(existingLog?.logDate ?? today);
  const [sleepHours, setSleepHours] = useState(existingLog?.sleepHours ?? 7);
  const [physicalComfort, setPhysicalComfort] = useState(existingLog?.physicalComfort ?? 5);
  const [mentalFog, setMentalFog] = useState(existingLog?.mentalFog ?? false);
  const [mood, setMood] = useState(existingLog?.mood ?? "NEUTRAL");
  const [overallWellbeing, setOverallWellbeing] = useState(existingLog?.overallWellbeing ?? 5);
  const [activityLevel, setActivityLevel] = useState(existingLog?.activityLevel ?? 3);
  const [medicationAdherence, setMedicationAdherence] = useState(existingLog?.medicationAdherence ?? true);
  const [painSymptoms, setPainSymptoms] = useState<string[]>(existingLog?.painSymptoms ?? []);
  const [fatigueSymptoms, setFatigueSymptoms] = useState<string[]>(existingLog?.fatigueSymptoms ?? []);
  const [visualSymptoms, setVisualSymptoms] = useState<string[]>(existingLog?.visualSymptoms ?? []);
  const [notes, setNotes] = useState(existingLog?.notes ?? "");

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/clinician/patient/${patientId}/daily-log`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clinician/patient", patientId, "daily-logs"] });
      toast({ title: existingLog ? "Log Updated" : "Log Saved", description: `Daily log has been ${existingLog ? "updated" : "saved"}.` });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message?.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const toggleSymptom = (list: string[], setList: (v: string[]) => void, symptom: string) => {
    setList(list.includes(symptom) ? list.filter((s) => s !== symptom) : [...list, symptom]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      logDate,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{existingLog ? "Edit Daily Log" : "Add Daily Log"}</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!existingLog && (
          <div>
            <Label htmlFor="log-date" className="text-xs">Date</Label>
            <Input
              id="log-date"
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              max={today}
              data-testid="input-clinician-log-date"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Sleep Hours: {sleepHours}h</Label>
            <input
              type="range"
              min="0" max="24" step="0.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(parseFloat(e.target.value))}
              className="w-full mt-1"
              data-testid="range-clinician-sleep"
            />
          </div>
          <div>
            <Label className="text-xs">Physical Comfort: {physicalComfort}/10</Label>
            <input
              type="range"
              min="1" max="10" step="1"
              value={physicalComfort}
              onChange={(e) => setPhysicalComfort(parseInt(e.target.value))}
              className="w-full mt-1"
              data-testid="range-clinician-comfort"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Wellbeing: {overallWellbeing}/10</Label>
            <input
              type="range"
              min="0" max="10" step="1"
              value={overallWellbeing}
              onChange={(e) => setOverallWellbeing(parseInt(e.target.value))}
              className="w-full mt-1"
              data-testid="range-clinician-wellbeing"
            />
          </div>
          <div>
            <Label className="text-xs">Activity Level: {activityLevel}/5</Label>
            <input
              type="range"
              min="1" max="5" step="1"
              value={activityLevel}
              onChange={(e) => setActivityLevel(parseInt(e.target.value))}
              className="w-full mt-1"
              data-testid="range-clinician-activity"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs mb-1 block">Mood</Label>
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
              data-testid="select-clinician-mood"
            >
              <option value="HAPPY">Happy</option>
              <option value="NEUTRAL">Neutral</option>
              <option value="ANXIOUS">Anxious</option>
              <option value="SAD">Sad</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input type="checkbox" checked={mentalFog} onChange={(e) => setMentalFog(e.target.checked)} data-testid="checkbox-clinician-fog" />
              Mental Fog
            </label>
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input type="checkbox" checked={medicationAdherence} onChange={(e) => setMedicationAdherence(e.target.checked)} data-testid="checkbox-clinician-medication" />
              Medication
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Pain Symptoms</Label>
          <div className="flex flex-wrap gap-1">
            {PAIN_OPTIONS.map((s) => (
              <Badge key={s} variant={painSymptoms.includes(s) ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => toggleSymptom(painSymptoms, setPainSymptoms, s)} data-testid={`badge-clinician-pain-${s.toLowerCase().replace(/\s+/g, "-")}`}>
                {s}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Fatigue Symptoms</Label>
          <div className="flex flex-wrap gap-1">
            {FATIGUE_OPTIONS.map((s) => (
              <Badge key={s} variant={fatigueSymptoms.includes(s) ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => toggleSymptom(fatigueSymptoms, setFatigueSymptoms, s)} data-testid={`badge-clinician-fatigue-${s.toLowerCase().replace(/\s+/g, "-")}`}>
                {s}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Visual Symptoms</Label>
          <div className="flex flex-wrap gap-1">
            {VISUAL_OPTIONS.map((s) => (
              <Badge key={s} variant={visualSymptoms.includes(s) ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => toggleSymptom(visualSymptoms, setVisualSymptoms, s)} data-testid={`badge-clinician-visual-${s.toLowerCase().replace(/\s+/g, "-")}`}>
                {s}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs">Notes</Label>
          <Input
            placeholder="Optional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            data-testid="input-clinician-log-notes"
          />
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" disabled={mutation.isPending} className="flex-1" data-testid="button-clinician-save-log">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {existingLog ? "Update Log" : "Save Log"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ClinicianMsInsights({ patient }: { patient: PatientRecord }) {
  const { data: logs } = useQuery<DailyLog[]>({
    queryKey: ["/api/clinician/patient", patient.id, "daily-logs"],
    queryFn: async () => {
      const res = await fetch(`/api/clinician/patient/${patient.id}/daily-logs`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    },
  });

  const hasAge = patient.age !== null;
  const hasRelapses = patient.totalRelapses !== null;
  const hasDuration = patient.msDurationYears !== null;

  const ageStage = hasAge ? classifyMsStageByAge(patient.age!) : null;
  const relapseStage = hasRelapses ? classifyMsStageByRelapses(patient.totalRelapses!) : null;
  const durationStage = hasDuration ? classifyMsStageByDuration(parseFloat(patient.msDurationYears!)) : null;

  const allSymptoms: Record<string, number> = {};
  (logs || []).forEach((l) => {
    [...(l.painSymptoms || []), ...(l.fatigueSymptoms || []), ...(l.visualSymptoms || [])].forEach((s) => {
      allSymptoms[s] = (allSymptoms[s] || 0) + 1;
    });
  });
  const topSymptoms = Object.entries(allSymptoms).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">MS Stage Classification</p>

      {!hasAge && !hasRelapses && !hasDuration ? (
        <div className="text-center py-4">
          <Brain className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Record age, relapses, and MS duration in clinical data for stage classification.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ageStage && (
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">By Age ({patient.age} yrs)</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STAGE_COLORS[ageStage.stage]}`} data-testid="text-clinician-stage-age">{ageStage.stage}</span>
              </div>
              <p className="text-xs text-foreground">{ageStage.description}</p>
            </div>
          )}
          {relapseStage && (
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">By Relapses ({patient.totalRelapses})</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STAGE_COLORS[relapseStage.stage]}`} data-testid="text-clinician-stage-relapses">{relapseStage.stage}</span>
              </div>
              <p className="text-xs text-foreground">{relapseStage.description}</p>
            </div>
          )}
          {durationStage && (
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">By Duration ({patient.msDurationYears} yrs)</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STAGE_COLORS[durationStage.stage]}`} data-testid="text-clinician-stage-duration">{durationStage.stage}</span>
              </div>
              <p className="text-xs text-foreground">{durationStage.description}</p>
            </div>
          )}
        </div>
      )}

      {topSymptoms.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Most Common Symptoms (30 Days)</p>
          <div className="space-y-2">
            {topSymptoms.map(([symptom, count]) => (
              <div key={symptom} className="flex items-center justify-between text-sm">
                <span>{symptom}</span>
                <span className="text-xs text-muted-foreground">{count}/{(logs || []).length} days</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
