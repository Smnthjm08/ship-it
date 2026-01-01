import { Button } from "@/components/ui/button";
import { SettingsCard } from "@/components/settings/settings-card";

export function DeleteProjectCard() {
  return (
    <SettingsCard className="border-destructive/50">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">Delete Project</h2>
          <p className="text-muted-foreground">
            Permanently delete this project and all deployments, domains,
            environment variables, serverless functions, and settings.
          </p>
        </div>

        {/* Project Preview */}
        <div className="border-t border-border pt-4 flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-24 h-16 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold text-center p-2">
              ShipIt Project
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">vault3</h3>
            <p className="text-sm text-muted-foreground">Last updated Jun 5</p>
          </div>
        </div>

        <div className="border-t border-border pt-4 flex justify-end">
          <Button
            variant="destructive"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Project
          </Button>
        </div>
      </div>
    </SettingsCard>
  );
}
