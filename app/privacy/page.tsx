import Typography from "@mui/material/Typography";
import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy">
      <Typography>
        Where are we? stores the email and display name you use to sign in, plus the trip details you enter: places, dates, notes, flights, cars, stays, insurance, congregations, and files you upload.
      </Typography>
      <Typography>
        Accounts, trip records, and files are stored in Supabase. Uploaded documents stay in a private bucket. People you share a trip with can open it with the link and do not need an account. Share links are stored as a hash, not as the link itself.
      </Typography>
      <Typography>
        Trip list photos are fetched from Wikimedia Commons. The app keeps the image address and photographer credit so it does not ask again for the same place.
      </Typography>
      <Typography>
        Data stays until you delete the trip or your account. Deleting the account removes your profile, the trips you own, their files, and their share links. From the account page you can also download a copy of your profile and trips.
      </Typography>
      <Typography>
        Sign-in and registration attempts are counted for a short time, by a hash of the email and network address, so the app can slow repeated tries. Those counts are deleted after 15 minutes.
      </Typography>
    </LegalPage>
  );
}
