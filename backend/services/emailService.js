const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const user = process.env.SMTP_USER || 'mohitpoewal12@gmail.com';
    const pass = process.env.SMTP_PASS || 'buvlouttomlhhvwk';
    const port = parseInt(process.env.SMTP_PORT, 10) || 465;
    const secure = process.env.SMTP_SECURE !== 'false';

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 8000
    });
  }
  return transporter;
}

/**
 * Send 6-digit OTP Email for Verification & Security
 */
async function sendOtpEmail({
  to,
  name = 'Super Administrator',
  otp,
  expiresInMinutes = 15,
  title = 'Email Verification & Security',
  subject,
  description
}) {
  try {
    const mailTransporter = getTransporter();
    const fromAddress = process.env.SMTP_FROM || `"OrderFlow OMS" <${process.env.SMTP_USER || 'mohitpoewal12@gmail.com'}>`;
    const mailSubject = subject || `[OrderFlow OMS] Security Verification Code: ${otp}`;
    const descText = description || `A verification code was requested for your account email (${to}) on OrderFlow OMS SaaS Platform. Use the 6-digit code below to proceed:`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" max-width="520px" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden;">
                
                <!-- Header -->
                <tr>
                  <td style="background-color: #0c1427; padding: 32px 36px; text-align: center;">
                    <div style="display: inline-block; width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #2563eb, #6366f1); line-height: 44px; color: #ffffff; font-size: 20px; font-weight: bold; margin-bottom: 12px;">
                      🛡️
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">Super Admin Portal</h1>
                    <p style="margin: 4px 0 0; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">${title}</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 36px 36px 24px;">
                    <p style="margin: 0 0 16px; color: #1e293b; font-size: 15px; font-weight: 600;">
                      Hello ${name},
                    </p>
                    <p style="margin: 0 0 24px; color: #475569; font-size: 14px; line-height: 1.6;">
                      ${descText}
                    </p>

                    <!-- OTP Code Box -->
                    <div style="background-color: #f1f5f9; border: 2px dashed #93c5fd; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 24px;">
                      <span style="display: block; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">Your 6-Digit Verification Code</span>
                      <span style="display: inline-block; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #1d4ed8; font-family: monospace; padding-left: 8px;">${otp}</span>
                      <span style="display: block; font-size: 12px; font-weight: 700; color: #dc2626; margin-top: 8px;">⏱️ Valid for ${expiresInMinutes} minutes</span>
                    </div>

                    <p style="margin: 0 0 16px; color: #64748b; font-size: 13px; line-height: 1.5;">
                      If you did not initiate this request, please ignore this email or review your security audit log.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 20px 36px; text-align: center;">
                    <p style="margin: 0; color: #94a3b8; font-size: 12px; font-weight: 600;">
                      OrderFlow OMS • Multi-Tenant SaaS Platform Console
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const info = await mailTransporter.sendMail({
      from: fromAddress,
      to,
      replyTo: process.env.SMTP_USER || 'mohitpoewal12@gmail.com',
      subject: mailSubject,
      text: `Hello ${name},\n\nYour verification code is: ${otp}\nValid for ${expiresInMinutes} minutes.\n\n${descText}\n\nNote: If you do not see this email in your primary inbox, please check your Spam/Junk or Updates tab.`,
      html: htmlContent,
      priority: 'high',
      headers: {
        'X-Priority': '1 (Highest)',
        'X-MSMail-Priority': 'High',
        'Importance': 'High'
      }
    });

    console.log(`✅ Verification OTP sent via Gmail SMTP to ${to} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send OTP email via SMTP to ${to}:`, err);
    throw err;
  }
}

/**
 * Send Subscription Renewal Reminder Email (Non-crashing)
 */
async function sendRenewalReminderEmail({
  to,
  organizationName,
  planName,
  amount,
  billingCycle,
  daysRemaining,
  renewalDate
}) {
  try {
    const mailTransporter = getTransporter();
    const fromAddress = process.env.SMTP_FROM || `"OrderFlow Billing" <${process.env.SMTP_USER || 'mohitpoewal12@gmail.com'}>`;
    const formattedDate = renewalDate ? new Date(renewalDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Upcoming';
    const subject = `[OrderFlow Billing] Your ${planName} Subscription Renews in ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 30px 20px;">
        <table align="center" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden;">
          <tr>
            <td style="background-color: #0f172a; padding: 28px; text-align: center;">
              <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Subscription Renewal Reminder</h2>
              <p style="color: #94a3b8; margin: 6px 0 0; font-size: 13px;">OrderFlow SaaS Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <p style="font-size: 15px; color: #1e293b; margin: 0 0 16px;">Hello <strong>${organizationName}</strong> Team,</p>
              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px;">
                This is a friendly reminder that your <strong>${planName}</strong> plan subscription is scheduled to renew in <strong>${daysRemaining} day${daysRemaining === 1 ? '' : 's'}</strong> on <strong>${formattedDate}</strong>.
              </p>
              <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 18px; border-radius: 6px; margin-bottom: 22px;">
                <p style="margin: 4px 0; font-size: 13px; color: #334155;"><strong>Plan:</strong> ${planName} (${billingCycle || 'Monthly'})</p>
                <p style="margin: 4px 0; font-size: 13px; color: #334155;"><strong>Renewal Amount:</strong> ₹${parseFloat(amount || 0).toLocaleString('en-IN')}</p>
                <p style="margin: 4px 0; font-size: 13px; color: #334155;"><strong>Renewal Date:</strong> ${formattedDate}</p>
              </div>
              <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                If your account has automated renewal enabled, no action is required. If you wish to change plans or adjust your subscription preferences, please contact your Super Administrator.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
              OrderFlow OMS Platform • Automated Lifecycle Notification
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const info = await mailTransporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html: htmlContent
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL_SERVICE_WARNING] Failed to send renewal email to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send Trial Ending Alert Email (Non-crashing)
 */
async function sendTrialEndingEmail({
  to,
  organizationName,
  planName,
  daysRemaining,
  expiryDate
}) {
  try {
    const mailTransporter = getTransporter();
    const fromAddress = process.env.SMTP_FROM || `"OrderFlow Billing" <${process.env.SMTP_USER || 'mohitpoewal12@gmail.com'}>`;
    const formattedDate = expiryDate ? new Date(expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Soon';
    const subject = `[OrderFlow Notice] Your Free Trial Expires in ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 30px 20px;">
        <table align="center" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden;">
          <tr>
            <td style="background-color: #0f172a; padding: 28px; text-align: center;">
              <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Trial Expiration Warning</h2>
              <p style="color: #94a3b8; margin: 6px 0 0; font-size: 13px;">OrderFlow SaaS Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <p style="font-size: 15px; color: #1e293b; margin: 0 0 16px;">Hello <strong>${organizationName}</strong> Team,</p>
              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px;">
                Your complimentary evaluation period for the <strong>${planName}</strong> plan will expire in <strong>${daysRemaining} day${daysRemaining === 1 ? '' : 's'}</strong> on <strong>${formattedDate}</strong>.
              </p>
              <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 14px 18px; border-radius: 6px; margin-bottom: 22px;">
                <p style="margin: 4px 0; font-size: 13px; color: #9a3412;"><strong>Account:</strong> ${organizationName}</p>
                <p style="margin: 4px 0; font-size: 13px; color: #9a3412;"><strong>Current Tier:</strong> ${planName}</p>
                <p style="margin: 4px 0; font-size: 13px; color: #9a3412;"><strong>Expiration Date:</strong> ${formattedDate}</p>
              </div>
              <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                To avoid any interruption in order management, CRM sync, or inventory features, please convert your trial into an active subscription or contact support.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
              OrderFlow OMS Platform • Automated Lifecycle Notification
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const info = await mailTransporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html: htmlContent
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL_SERVICE_WARNING] Failed to send trial alert to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send Payment Grace Period & Overdue Notice (Non-crashing)
 */
async function sendPaymentGraceEmail({
  to,
  organizationName,
  planName,
  amount,
  invoiceNumber,
  gracePeriodDays,
  gracePeriodEnd
}) {
  try {
    const mailTransporter = getTransporter();
    const fromAddress = process.env.SMTP_FROM || `"OrderFlow Billing" <${process.env.SMTP_USER || 'mohitpoewal12@gmail.com'}>`;
    const formattedEnd = gracePeriodEnd ? new Date(gracePeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Immediately';
    const subject = `[OrderFlow Billing Alert] Payment Overdue - Grace Period Active for ${organizationName}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 30px 20px;">
        <table align="center" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden;">
          <tr>
            <td style="background-color: #b91c1c; padding: 28px; text-align: center;">
              <h2 style="color: #ffffff; margin: 0; font-size: 20px;">Payment Overdue • Grace Period Active</h2>
              <p style="color: #fecaca; margin: 6px 0 0; font-size: 13px;">OrderFlow SaaS Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <p style="font-size: 15px; color: #1e293b; margin: 0 0 16px;">Hello <strong>${organizationName}</strong> Billing Team,</p>
              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px;">
                We were unable to process or verify payment for invoice <strong>${invoiceNumber || 'Pending'}</strong> amounting to <strong>₹${parseFloat(amount || 0).toLocaleString('en-IN')}</strong> for the <strong>${planName}</strong> plan.
              </p>
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 18px; border-radius: 6px; margin-bottom: 22px;">
                <p style="margin: 4px 0; font-size: 13px; color: #991b1b;"><strong>Status:</strong> Grace Period Active (${gracePeriodDays} Days)</p>
                <p style="margin: 4px 0; font-size: 13px; color: #991b1b;"><strong>Grace Period Deadline:</strong> ${formattedEnd}</p>
                <p style="margin: 4px 0; font-size: 13px; color: #991b1b;"><strong>Invoice:</strong> ${invoiceNumber || 'Pending'}</p>
              </div>
              <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
                Your service remains active during this grace period. Please clear the pending dues or reach out to administration before <strong>${formattedEnd}</strong> to avoid account suspension.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
              OrderFlow OMS Platform • Automated Lifecycle Notification
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const info = await mailTransporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html: htmlContent
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EMAIL_SERVICE_WARNING] Failed to send grace email to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendOtpEmail,
  sendRenewalReminderEmail,
  sendTrialEndingEmail,
  sendPaymentGraceEmail
};

