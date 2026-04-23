import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

if (!SENDGRID_API_KEY) {
  console.warn("[Email] SENDGRID_API_KEY not set — emails will not be sent");
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export async function sendPasswordResetEmail(options: {
  to: string;
  resetUrl: string;
  fromEmail?: string;
}): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.error("[Email] Cannot send email — SENDGRID_API_KEY not configured");
    return false;
  }

  const { to, resetUrl, fromEmail } = options;

  const msg = {
    to,
    from: fromEmail || "vibhav.aluru2@gmail.com",
    subject: "Reset your Clear Skies password",
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a2e; font-size: 28px; margin-bottom: 8px;">Clear Skies</h1>
          <p style="color: #666; font-size: 14px;">MS Patient Management Portal</p>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
          <h2 style="color: #1a1a2e; font-size: 20px; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #444; line-height: 1.6;">
            We received a request to reset your password. Click the button below to choose a new password.
            This link will expire in 1 hour.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #4f46e5; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #888; font-size: 12px; text-align: center;">
            If you didn't request a password reset, you can safely ignore this email. Your password won't change.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error: any) {
    const body = error?.response?.body;
    if (body) {
      console.error("[Email Error]", JSON.stringify(body));
    } else {
      console.error("[Email Error]", error.message);
    }
    return false;
  }
}

export async function sendInvitationEmail(options: {
  to: string;
  patientName: string;
  clinicianName: string;
  inviteUrl: string;
  fromEmail?: string;
}): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.error("[Email] Cannot send email — SENDGRID_API_KEY not configured");
    return false;
  }

  const { to, patientName, clinicianName, inviteUrl, fromEmail } = options;

  const msg = {
    to,
    from: fromEmail || "vibhav.aluru2@gmail.com",
    subject: `${clinicianName} has invited you to Clear Skies`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a2e; font-size: 28px; margin-bottom: 8px;">Clear Skies</h1>
          <p style="color: #666; font-size: 14px;">MS Patient Management Portal</p>
        </div>
        <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
          <h2 style="color: #1a1a2e; font-size: 20px; margin-top: 0;">Hello ${patientName},</h2>
          <p style="color: #444; line-height: 1.6;">
            <strong>${clinicianName}</strong> has invited you to join Clear Skies as their patient.
            Click the button below to create your account and get started with daily symptom tracking.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background: #4f46e5; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
              Create Your Account
            </a>
          </div>
          <p style="color: #888; font-size: 12px; text-align: center;">
            This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error: any) {
    const body = error?.response?.body;
    if (body) {
      console.error("[Email Error]", JSON.stringify(body));
    } else {
      console.error("[Email Error]", error.message);
    }
    return false;
  }
}
