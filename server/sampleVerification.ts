import { MailMessageSummary, MailMessageDetails } from "./mailService";

// Helper for dev/local verification when outbound external SMTP is blocked in the sandbox environment
export function getSampleVerificationMessage(emailAddress: string): { summary: MailMessageSummary; details: MailMessageDetails } {
  const [login, domain] = emailAddress.split("@");
  const msgId = "sample-verification-code";
  const now = new Date().toISOString();

  const summary: MailMessageSummary = {
    id: msgId,
    from: "Verification Service <noreply@verification-system.org>",
    subject: "Your confirmation code is 849201",
    date: now,
    intro: "Welcome! Your 6-digit verification code is 849201. This code expires in 10 minutes.",
  };

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; padding: 8px 16px; background: #ecfdf5; color: #059669; font-weight: 700; font-size: 13px; border-radius: 20px;">Safe Verification Inbox</span>
      </div>
      <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin-bottom: 8px; text-align: center;">Confirm Your Trial Registration</h2>
      <p style="color: #64748b; font-size: 14px; text-align: center; margin-bottom: 24px;">You requested a verification code for your temporary address <strong>${emailAddress}</strong>.</p>
      <div style="text-align: center; margin: 32px 0;">
        <span style="display: inline-block; letter-spacing: 6px; font-size: 32px; font-weight: 800; color: #00b074; background: #f0fdf4; border: 2px dashed #86efac; border-radius: 12px; padding: 12px 28px; font-family: monospace;">849201</span>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.6; text-align: center;">This disposable inbox automatically deletes incoming mail after your timer finishes. No personal information or signup was required.</p>
      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 11px; text-align: center;">Temp-Mail-Generator.site • Legitimate Temporary Inbound Mail Relay</p>
    </div>
  `;

  const details: MailMessageDetails = {
    id: msgId,
    from: "Verification Service <noreply@verification-system.org>",
    subject: "Your confirmation code is 849201",
    date: now,
    attachments: [
      {
        id: "att-1",
        filename: "terms-confirmation.txt",
        contentType: "text/plain",
        size: 248,
        downloadUrl: `/api/sample-attachment?id=${msgId}`,
      },
    ],
    body: "Your confirmation code is 849201. Use it to complete your trial activation.",
    textBody: "Your confirmation code is 849201. Use it to complete your trial activation.",
    htmlBody,
  };

  return { summary, details };
}
