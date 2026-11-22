import "server-only";

export async function sendGuestCode(email: string, code: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) {
    if (process.env.NODE_ENV === "development") {
      console.info(`Guest code for ${email}: ${code}`);
      return;
    }
    throw new Error("Email is not configured.");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your code for Reveal",
      text: `Your code is ${code}. It expires in 10 minutes.\n\nIf you did not try to open a trip, you can ignore this email.`,
    }),
  });
  if (!response.ok) {
    throw new Error("The code could not be sent.");
  }
}
