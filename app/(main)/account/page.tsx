import { AccountScreen } from "@/components/account-screen";
import { requireUser } from "@/lib/current";
import { userAvatar } from "@/lib/data";

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <AccountScreen
      email={user.email}
      name={user.name}
      hasPhoto={Boolean(await userAvatar(user.id))}
    />
  );
}
