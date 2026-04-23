import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { X, BookOpen, Image } from "lucide-react";

import addPatientBtn from "@assets/image_1774728851785.png";
import inviteForm from "@assets/image_1774729021092.png";
import patientList from "@assets/image_1774729045576.png";
import editDialog from "@assets/image_1774729074678.png";
import dailyLogsDialog from "@assets/image_1774729097521.png";
import generateInsightsBtn from "@assets/image_1774729246562.png";
import varianceChart from "@assets/image_1774729293063.png";
import aiResult from "@assets/image_1774729317103.png";

import patientDailyLog from "@assets/image_1774729721737.png";
import patientTrends from "@assets/image_1774729750118.png";
import patientMsInsights from "@assets/image_1774729808585.png";

interface HelpGuideProps {
  role: "clinician" | "patient";
  onClose: () => void;
}

function Step({ num, text }: { num: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
        {num}
      </span>
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}

function Screenshot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="rounded-lg overflow-hidden border border-border bg-muted/20 shadow-sm">
      <img src={src} alt={alt} className="w-full h-auto" />
    </div>
  );
}

function ScreenshotSlot({ filename, description }: { filename: string; description: string }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 flex flex-col items-center justify-center gap-2 py-6 px-4 text-center">
      <Image className="w-6 h-6 text-muted-foreground/40" />
      <p className="text-xs text-muted-foreground/60 font-medium">{description}</p>
      <p className="text-xs text-muted-foreground/40 font-mono">{filename}</p>
    </div>
  );
}

function Note({ text }: { text: string }) {
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-md px-3 py-2">
      <p className="text-xs text-muted-foreground leading-relaxed">
        <span className="font-semibold text-foreground">Note: </span>{text}
      </p>
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{text}</p>
  );
}

const clinicianContent: Record<string, React.ReactNode> = {
  invite: (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Inviting a Patient</h3>
        <p className="text-xs text-muted-foreground">Send a secure invitation email to a new patient so they can create their account.</p>
      </div>

      <SectionLabel text="Step 1 — Find the Add Patient button" />
      <Step num={1} text='Click the "Add Patient" button in the top-right corner of your dashboard.' />
      <Screenshot src={addPatientBtn} alt="Add Patient button in the top-right corner of the dashboard" />

      <SectionLabel text="Steps 2–4 — Fill in the invitation form" />
      <Step num={2} text="Fill in the patient's full name and email address. An invitation will be sent to this email." />
      <Step num={3} text="Enter the patient's clinical details: Age, MS Duration (years), Total Relapses, Relapses in the last 12 months, EDSS Score, and any clinical notes." />
      <Step num={4} text='Click "Add Patient" to send the invitation. The patient will receive an email with a unique link to set up their account.' />
      <Screenshot src={inviteForm} alt="Invite New Patient form filled out with patient details" />

      <Note text="Once the patient accepts the invite and sets their password, they will automatically appear in your patient list." />
    </div>
  ),

  manage: (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Managing Patients</h3>
        <p className="text-xs text-muted-foreground">View, select, and update your patients' clinical records.</p>
      </div>

      <SectionLabel text="Your patient list" />
      <Step num={1} text="All your patients are listed in the main table, showing their name, age, MS duration, relapses, EDSS score, and action buttons." />
      <Step num={2} text='Use the "View" button to open a read-only summary, "Edit" to update clinical data, or "Logs" to manage daily log entries.' />
      <Screenshot src={patientList} alt="Patient list table showing a patient row with View, Edit, and Logs buttons" />

      <SectionLabel text="Editing clinical data" />
      <Step num={3} text='Click "Edit" on a patient row to open the Edit Patient dialog.' />
      <Step num={4} text="Update any fields — Age, MS Duration, Total Relapses, Relapses (12mo), EDSS Score, or Notes." />
      <Step num={5} text='Click "Save Changes" to apply the updates.' />
      <Screenshot src={editDialog} alt="Edit Patient dialog showing clinical data fields for Vibhav Aluru" />

      <Note text="Only patients you have invited are visible to you. Patient data is strictly isolated between clinicians." />
    </div>
  ),

  logs: (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Editing Daily Logs</h3>
        <p className="text-xs text-muted-foreground">Create or edit daily symptom log entries on behalf of a patient.</p>
      </div>

      <Step num={1} text='Click the "Logs" button on a patient row in the patient list to open the Daily Logs panel for that patient.' />
      <Step num={2} text="The panel shows all existing log entries. Click any entry to edit it, or use the Add New Log option to create a log for any date." />
      <Step num={3} text="Use the sliders to set Sleep Hours, Physical Comfort, Wellbeing, and Activity Level." />
      <Step num={4} text="Set the Mood dropdown, and toggle Mental Fog and Medication checkboxes as appropriate." />
      <Step num={5} text="Tick any Pain, Fatigue, or Visual symptoms that apply, and add any clinical notes in the Notes field." />
      <Step num={6} text='Click "Update Log" to save the changes.' />
      <Screenshot src={dailyLogsDialog} alt="Daily Logs dialog for Vibhav Aluru showing the Edit Daily Log form with sliders and symptom toggles" />

      <Note text="Patients can submit one log per day themselves but cannot edit it afterwards. As a clinician, you can create or edit logs on any date for your patients." />
    </div>
  ),

  ai: (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">AI Clinical Insights</h3>
        <p className="text-xs text-muted-foreground">Generate an AI-powered clinical analysis based on a patient's recent logs and health profile.</p>
      </div>

      <Step num={1} text='Click the "View" button on a patient row to open their insights panel.' />
      <Step num={2} text='Click "Generate AI Analysis" in the top-right of the Insights panel.' />
      <Step num={3} text="Wait approximately 10 seconds while the AI analyses the patient's last 30 days of logs and clinical profile." />
      <Step num={4} text="The analysis returns a Risk Level badge, a clinical Summary, Alarming Findings, Positive Findings, Symptom Patterns, and specific Recommendations." />

      <SectionLabel text="Example AI analysis result" />
      <Screenshot src={aiResult} alt="AI Clinical Insights result showing risk level MODERATE, summary, alarming findings, positive findings, symptom patterns, and recommendations" />

      <Note text="Switching to a different patient automatically clears the previous analysis so you always see fresh results for the selected patient." />
    </div>
  ),

  variance: (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Symptom Variance Analysis</h3>
        <p className="text-xs text-muted-foreground">Identify which tracked metric is fluctuating the most in a patient's daily logs.</p>
      </div>

      <SectionLabel text="Step 1 — Generate Insights" />
      <Step num={1} text='Click the "View" button on a patient row to open their insights panel, then scroll to Symptom Variance Analysis.' />
      <Step num={2} text='Click "Generate Insights" on the right side of the patient row under the Insights column.' />
      <Screenshot src={generateInsightsBtn} alt="Patient table showing MS stage classifications and the Generate Insights button highlighted on the right" />

      <SectionLabel text="Reading the variance chart" />
      <Step num={3} text="A line chart appears showing the most variable metric (e.g. Pain Symptoms) plotted over time." />
      <Step num={4} text="The Variability Ranking below the chart lists all tracked metrics sorted by their Coefficient of Variation (CV) — a higher percentage means more day-to-day fluctuation." />
      <Screenshot src={varianceChart} alt="Symptom Variance Analysis showing Pain Symptoms as the most varying metric with a line chart and variability ranking bar list" />

      <Note text="At least 2 daily logs are required to generate variance data. The more logs the patient has, the more accurate and useful the analysis will be." />
    </div>
  ),
};

const patientContent: Record<string, React.ReactNode> = {
  log: (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Submitting Your Daily Log</h3>
        <p className="text-xs text-muted-foreground">Record how you are feeling each day so your clinician can track your progress.</p>
      </div>
      <SectionLabel text="Step 1 — Open the Daily Log tab" />
      <Step num={1} text='Click the "Daily Log" tab at the top of your dashboard.' />
      <SectionLabel text="Steps 2–6 — Fill in your log" />
      <Step num={2} text="In the Sleep & Comfort section: adjust Sleep Hours and Physical Comfort sliders, and toggle Mental Fog on or off." />
      <Step num={3} text="In the Mood & Wellbeing section: select your Mood, adjust the Wellbeing and Activity Level sliders, and toggle Medication Taken." />
      <Step num={4} text="In the Symptoms section: tap any Pain, Fatigue, or Visual symptoms you experienced today." />
      <Step num={5} text="Add any extra notes in the Notes field at the bottom." />
      <Step num={6} text={`Click "Submit Today's Log" at the bottom to save your entry.`} />
      <Screenshot src={patientDailyLog} alt="Daily Log tab showing Sleep & Comfort, Mood & Wellbeing, and Symptoms sections" />
      <Note text="You can only submit one log per day. Once submitted, the log is locked — only your clinician can make changes." />
    </div>
  ),

  trends: (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Viewing Weekly Trends</h3>
        <p className="text-xs text-muted-foreground">See charts and summary stats of your wellbeing, sleep, and symptoms over the past week.</p>
      </div>
      <SectionLabel text="Step 1 — Open the Weekly Trends tab" />
      <Step num={1} text='Click the "Weekly Trends" tab at the top of your dashboard.' />
      <SectionLabel text="Reading your stats and charts" />
      <Step num={2} text="The summary cards at the top show your Avg Wellbeing, Avg Sleep, Avg Comfort, overall Trend, Medication Adherence, Mental Fog Days, and Mood Distribution at a glance." />
      <Step num={3} text="The Wellbeing Trend line chart shows your overall wellbeing score for each logged day — higher is better." />
      <Step num={4} text="The Sleep Pattern bar chart shows how many hours you slept on each logged day." />
      <Step num={5} text="The Symptom Counts chart (below) shows pain, fatigue, and visual symptom counts by day." />
      <Screenshot src={patientTrends} alt="Weekly Trends tab showing summary stat cards, Wellbeing Trend line chart, and Sleep Pattern bar chart" />
      <Note text="Only days where you submitted a log appear on the charts. Log every day for the most complete picture." />
    </div>
  ),

  insights: (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">MS Insights</h3>
        <p className="text-xs text-muted-foreground">View your MS stage classifications, symptom history, and AI-powered health analysis all in one place.</p>
      </div>
      <SectionLabel text="Step 1 — Open the MS Insights tab" />
      <Step num={1} text='Click the "MS Insights" tab at the top of your dashboard.' />
      <Step num={2} text="Scroll down past the AI Health Analysis card to see your MS stage classifications (by age, relapses, and disease duration) and your most common symptoms." />
      <Step num={3} text="The stage classifications show CIS, RRMS, SPMS, or PPMS based on your clinical data — these are for reference only." />
      <Step num={4} text="The Symptom Variance section lets you generate a chart of which tracked metric fluctuates the most across your logs." />
      <Screenshot src={patientMsInsights} alt="MS Insights tab showing AI Health Analysis card with risk level, findings, and recommendations" />
      <Note text="Stage classifications are based on general clinical guidelines and are informational only — not a medical diagnosis. Always consult your neurologist." />
    </div>
  ),

  ai: (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">AI Health Analysis</h3>
        <p className="text-xs text-muted-foreground">Get a personalised AI-generated analysis of your health based on your own log data.</p>
      </div>
      <SectionLabel text="How to generate your analysis" />
      <Step num={1} text='Click the "MS Insights" tab, then find the "AI Health Analysis" card at the top of the page.' />
      <Step num={2} text='Click "Generate" (or "Regenerate" if you have a previous result). It takes about 10 seconds.' />
      <Step num={3} text="Overall Summary shows a personalised summary and your Risk Level (Low, Moderate, or High)." />
      <Step num={4} text={`"What You're Doing Well" highlights positive patterns from your logs — habits to keep up.`} />
      <Step num={5} text='"Things to Watch" lists patterns that may need attention — worth discussing with your clinician.' />
      <Step num={6} text='"Recommendations for You" gives numbered, practical actions based on your actual data.' />
      <Step num={7} text='"Symptom Patterns" explains any correlations found across your logged entries.' />
      <Screenshot src={patientMsInsights} alt="AI Health Analysis showing Moderate Risk, What You're Doing Well, Things to Watch, Recommendations, and Symptom Patterns" />
      <Note text="The more daily logs you have, the more accurate and personalised the analysis will be. Try to log every day." />
    </div>
  ),
};

export function HelpGuide({ role, onClose }: HelpGuideProps) {
  const tabs = role === "clinician"
    ? [
        { id: "invite", label: "Add Patient" },
        { id: "manage", label: "Manage Patients" },
        { id: "logs", label: "Daily Logs" },
        { id: "ai", label: "AI Insights" },
        { id: "variance", label: "Variance" },
      ]
    : [
        { id: "log", label: "Daily Log" },
        { id: "trends", label: "Trends" },
        { id: "insights", label: "MS Insights" },
        { id: "ai", label: "AI Analysis" },
      ];

  const content = role === "clinician" ? clinicianContent : patientContent;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-card border-l shadow-2xl z-50 flex flex-col"
        data-testid="help-guide-panel"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground text-sm">Help Guide</span>
            <span className="text-xs text-muted-foreground capitalize">— {role} view</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-help">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <Tabs defaultValue={tabs[0].id} className="flex flex-col flex-1 min-h-0">
          <div className="px-3 pt-3 shrink-0">
            <TabsList className={`w-full grid ${role === "clinician" ? "grid-cols-5" : "grid-cols-4"}`}>
              {tabs.map((t) => (
                <TabsTrigger key={t.id} value={t.id} className="text-xs px-1" data-testid={`help-tab-${t.id}`}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            {tabs.map((t) => (
              <TabsContent key={t.id} value={t.id} className="px-4 py-4 mt-0 space-y-4">
                {content[t.id]}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </>
  );
}
