import { AccountScreen } from "@/components/account-screen";
import { requireUser } from "@/lib/current";
import { userHasSharePin } from "@/lib/data";

export default async function AccountPage() {
  const user = await requireUser();
  return <AccountScreen email={user.email} name={user.name} pinSet={await userHasSharePin(user.id)} />;
}
