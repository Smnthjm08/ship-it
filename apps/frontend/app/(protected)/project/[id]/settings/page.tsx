import { TransferCard } from "@/components/settings/transfer-card";
import { DeleteProjectCard } from "@/components/settings/delete-project-card";

export default function SettingsPage() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your project configuration and preferences
          </p>
        </div>

        <TransferCard />
        <DeleteProjectCard />
      </div>
    </div>
  );
}
