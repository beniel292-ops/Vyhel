import { RowAction } from "@/components/admin/form";
import { AdminPageHeader, Panel, StatusPill, Table, Td, Th, When } from "@/components/admin/kit";
import { requireAdmin } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { updateUser } from "@/server/actions/settings";
import { listAudit, listUsers } from "@/server/queries/admin";
import { SettingsForm } from "./SettingsForm";
import { CreateUserForm, RemoveDemoForm } from "./UserForms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const me = await requireAdmin();
  const [settings, users, audit] = await Promise.all([getSettings(), listUsers(), listAudit(40)]);
  return (
    <>
      <AdminPageHeader title="Settings" description="Site-wide configuration. Admins only." />
      <SettingsForm s={settings} />

      <h2 id="users" className="mb-4 mt-12 text-lg font-semibold text-ink">Admin users</h2>
      <div className="grid gap-6">
        <Table>
          <thead>
            <tr>
              <Th>User</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Last sign-in</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <Td>
                  <span className="font-medium text-ink">{u.name || u.email}</span>
                  <span className="block text-xs text-muted">{u.email}</span>
                </Td>
                <Td><StatusPill status={u.role} /></Td>
                <Td>{u.disabled ? <StatusPill status="disabled" /> : <span className="text-xs text-muted">Active</span>}</Td>
                <Td className="text-xs"><When date={u.lastLoginAt} /></Td>
                <Td className="whitespace-nowrap text-right">
                  {u.id === me.id ? (
                    <span className="text-xs text-muted">You</span>
                  ) : (
                    <>
                      <RowAction action={updateUser} fields={{ id: u.id, role: u.role === "admin" ? "editor" : "admin" }}>
                        Make {u.role === "admin" ? "editor" : "admin"}
                      </RowAction>
                      <RowAction action={updateUser} fields={{ id: u.id, disabled: u.disabled ? "false" : "true" }} className={u.disabled ? "" : "text-danger"}>
                        {u.disabled ? "Enable" : "Disable"}
                      </RowAction>
                    </>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Panel title="Add a user">
          <CreateUserForm />
        </Panel>
      </div>

      <h2 className="mb-4 mt-12 text-lg font-semibold text-ink">Audit log</h2>
      <Table>
        <thead>
          <tr>
            <Th>When</Th>
            <Th>Who</Th>
            <Th>Action</Th>
            <Th>Entity</Th>
            <Th>Summary</Th>
          </tr>
        </thead>
        <tbody>
          {audit.map((a) => (
            <tr key={a.id}>
              <Td className="whitespace-nowrap text-xs">
                <When date={a.createdAt} /> {a.createdAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}
              </Td>
              <Td className="text-xs">{a.userEmail ?? "—"}</Td>
              <Td className="font-mono text-[12px]">{a.action}</Td>
              <Td className="text-xs">{a.entityType}</Td>
              <Td className="max-w-[18rem] truncate text-xs">{a.summary ?? ""}</Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <h2 className="mb-4 mt-12 text-lg font-semibold text-danger">Danger zone</h2>
      <Panel title="Development data">
        <p className="mb-4 text-sm text-muted">
          Removes every product, guide and collection created by the development seed (marked &ldquo;Development example&rdquo;). Your own content is untouched. Categories are kept.
        </p>
        <RemoveDemoForm />
      </Panel>
    </>
  );
}
