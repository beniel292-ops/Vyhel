import { AdminPageHeader, Panel } from "@/components/admin/kit";
import { requireUser } from "@/lib/auth/session";
import { PasswordForm } from "./PasswordForm";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <AdminPageHeader title="Your account" description={`${user.email} · ${user.role}`} />
      <Panel title="Change password">
        <PasswordForm />
      </Panel>
    </>
  );
}
