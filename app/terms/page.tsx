import Typography from "@mui/material/Typography";
import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms">
      <Typography>
        Where are we? is a private trip briefing for you and the people you share a link with. You are responsible for the details you enter and for who you give a share link to.
      </Typography>
      <Typography>
        A person can read a shared trip when the link is active, their email is on your list, and they enter your PIN. The same PIN covers every trip you share. After that, that device opens the trip only with the passkey. You can revoke a link from the trip, remove an email, or change the PIN. Do not put information in a trip that you would not want someone on that list to see.
      </Typography>
      <Typography>
        The service is provided as it is. Trip photos come from Wikimedia Commons under the license shown with the credit. Uploaded files stay private to people who can open the trip.
      </Typography>
      <Typography>
        You can delete a trip or your whole account at any time. Deleting the account removes the trips you own.
      </Typography>
    </LegalPage>
  );
}
