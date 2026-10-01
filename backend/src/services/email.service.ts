import nodemailer from "nodemailer";

interface SendEmailParams {
  fromName: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  etherealUser?: string | null;
  etherealPass?: string | null;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string;
  error?: string;
}

// In-memory transporter cache per sender email
const transporterCache = new Map<string, nodemailer.Transporter>();

export async function getOrCreateTransporter(params: {
  email: string;
  etherealUser?: string | null;
  etherealPass?: string | null;
}): Promise<nodemailer.Transporter> {
  const cacheKey = params.email;
  if (transporterCache.has(cacheKey)) {
    return transporterCache.get(cacheKey)!;
  }

  let user = params.etherealUser;
  let pass = params.etherealPass;

  if (!user || !pass) {
    // Generate an Ethereal test account on the fly
    console.log(`Creating ephemeral Ethereal account for sender: ${params.email}`);
    const testAccount = await nodemailer.createTestAccount();
    user = testAccount.user;
    pass = testAccount.pass;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: user,
      pass: pass,
    },
  });

  transporterCache.set(cacheKey, transporter);
  return transporter;
}

export async function sendEmailViaEthereal(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const transporter = await getOrCreateTransporter({
      email: params.fromEmail,
      etherealUser: params.etherealUser,
      etherealPass: params.etherealPass,
    });

    const info = await transporter.sendMail({
      from: `"${params.fromName}" <${params.fromEmail}>`,
      to: params.toEmail,
      subject: params.subject,
      text: params.bodyText || params.bodyHtml.replace(/<[^>]*>?/gm, ""),
      html: params.bodyHtml,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || undefined,
    };
  } catch (error: any) {
    console.error(`Failed to send email to ${params.toEmail}:`, error);
    return {
      success: false,
      error: error.message || "Unknown SMTP error",
    };
  }
}
