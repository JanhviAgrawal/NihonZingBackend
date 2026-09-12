const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderEmailShell({ accentColor, headerLabel, bodyHtml }) {
    return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background-color:#f8fafc;font-family:Helvetica,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" style="max-width:480px;background-color:#ffffff;border-radius:20px;overflow:hidden;border:2px solid #000000;">
              <tr>
                <td style="background-color:${accentColor};padding:28px 32px;">
                  <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#111111;">Nihon Zing</p>
                  <h1 style="margin:8px 0 0;font-size:26px;font-weight:800;color:#111111;">${headerLabel}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">
                  ${bodyHtml}
                </td>
              </tr>
              <tr>
                <td style="padding:20px 32px;border-top:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:11px;color:#94a3b8;font-family:monospace;">© ${new Date().getFullYear()} Nihon Zing. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;
}

function otpCard(OTP) {
    return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr>
          <td align="center" style="background-color:#f8fafc;border:2px solid #000000;border-radius:14px;padding:20px;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#64748b;">Your Code</p>
            <p style="margin:0;font-size:34px;font-weight:800;letter-spacing:8px;color:#111111;">${escapeHtml(OTP)}</p>
          </td>
        </tr>
      </table>
    `;
}

module.exports.sendRegisterAdminMail = async (email, password) => {
    const { data, error } = await resend.emails.send({
        from: `NihonZing <${process.env.MAIL_FROM}>`,
        to: email,
        subject: "Admin Access",
        html: `<h2>Admin Panel Access</h2><p><b>Email :</b> ${escapeHtml(email)}</p><p><b>Password :</b> ${escapeHtml(password)}</p>`,
    });

    if (error) {
        console.error("sendRegisterAdminMail Error: ", error);
        throw new Error(error.message || "Failed to send admin mail");
    }

    console.log("Admin Mail Sent Successfully:", data?.id);
}

module.exports.sendSignupOTPMail = async (to, OTP) => {
    const bodyHtml = `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
        Thanks for signing up! Use the code below to verify your email address and activate your account.
      </p>
      ${otpCard(OTP)}
      <p style="margin:20px 0 0;font-size:13px;color:#64748b;line-height:1.6;">
        This code will expire in <b>5 minutes</b>. If you didn't create an account, you can safely ignore this email — don't share this code with anyone.
      </p>
    `;

    const html = renderEmailShell({
        accentColor: '#7f73e3',
        headerLabel: 'Verify Your Email',
        bodyHtml
    });

    const { data, error } = await resend.emails.send({
        from: `NihonZing <${process.env.MAIL_FROM}>`,
        to,
        subject: "Verify Your Email — Nihon Zing",
        html
    });

    if (error) {
        console.error("sendSignupOTPMail Error: ", error);
        throw new Error(error.message || "Failed to send signup OTP mail");
    }

    console.log("Signup OTP Sent Successfully:", data?.id);
}

// Forgot-password OTP — distinct coral/red design
module.exports.sendOTPMail = async (to, OTP) => {
    const bodyHtml = `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
        We received a request to reset your password. Use the code below to continue.
      </p>
      ${otpCard(OTP)}
      <p style="margin:20px 0 0;font-size:13px;color:#64748b;line-height:1.6;">
        This code will expire in <b>5 minutes</b>. If you didn't request a password reset, you can safely ignore this email — don't share this code with anyone.
      </p>
    `;

    const html = renderEmailShell({
        accentColor: '#ff6b6b',
        headerLabel: 'Reset Your Password',
        bodyHtml
    });

    const { data, error } = await resend.emails.send({
        from: `NihonZing <${process.env.MAIL_FROM}>`,
        to,
        subject: "Reset Your Password — Nihon Zing",
        html
    });

    if (error) {
        console.error("sendOTPMail Error: ", error);
        throw new Error(error.message || "Failed to send OTP mail");
    }

    console.log("OTP Sent Successfully:", data?.id);
}

module.exports.sendWelcomeMail = async (to, name) => {
    const frontendUrl = process.env.FRONTEND_URL;
    const safeName = escapeHtml(name || 'there');

    const ctaHtml = frontendUrl
      ? `
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 4px;">
          <tr>
            <td align="center" style="background-color:#7f73e3;border:2px solid #000000;border-radius:12px;">
              <a href="${frontendUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:800;color:#111111;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">
                Get Started
              </a>
            </td>
          </tr>
        </table>
      `
      : '';

    const bodyHtml = `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
        Hey ${safeName}, welcome aboard! 🎉
      </p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
        Your account is verified and ready to go. We're excited to help you on your Japanese learning journey — flashcards, quizzes, and more are waiting for you.
      </p>
      ${ctaHtml}
    `;

    const html = renderEmailShell({
        accentColor: '#7f73e3',
        headerLabel: 'Welcome to Nihon Zing',
        bodyHtml
    });

    const { data, error } = await resend.emails.send({
        from: `NihonZing <${process.env.MAIL_FROM}>`,
        to,
        subject: "Welcome to Nihon Zing! 🎉",
        html
    });

    if (error) {
        console.error("sendWelcomeMail Error: ", error);
        throw new Error(error.message || "Failed to send welcome mail");
    }

    console.log("Welcome Mail Sent Successfully:", data?.id);
}