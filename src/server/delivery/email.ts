import nodemailer from "nodemailer";

export async function sendReportEmail(input: {
  to: string[];
  subject: string;
  body: string;
  pdfBuffer: Buffer;
  filename: string;
}): Promise<{ providerId: string | null }> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const result = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: input.to.join(","),
    subject: input.subject,
    text: input.body,
    attachments: [
      {
        filename: input.filename,
        content: input.pdfBuffer,
        contentType: "application/pdf"
      }
    ]
  });

  return { providerId: result.messageId ?? null };
}
