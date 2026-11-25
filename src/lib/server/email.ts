export async function sendSignInCode(email: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Email delivery is not configured");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your Vivaah verification code",
      text: `Your Vivaah verification code is ${code}. It expires in 5 minutes. If you did not request this, you can ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif"><h2>Your Vivaah verification code</h2><p style="font-size:28px;letter-spacing:8px"><strong>${code}</strong></p><p>This code expires in 5 minutes. Vivaah support will never ask you to share it.</p></div>`,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
}
