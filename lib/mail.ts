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

export async function sendShareLink(email: string, url: string, tripName: string, ownerName: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  const text = `${ownerName} shared ${tripName} with you on Reveal.\n\nOpen the trip:\n${url}\n\nEnter your email address on that page. If it is approved, a code is sent here. After the code is verified, you save a passkey on that device.\n\nIf you were not expecting this, you can ignore this email.`;
  if (!key || !from) {
    if (process.env.NODE_ENV === "development") {
      console.info(`Share link for ${email}: ${url}`);
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
      subject: `${tripName} on Reveal`,
      text,
    }),
  });
  if (!response.ok) {
    throw new Error("The share email could not be sent.");
  }
}
