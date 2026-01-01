import { Button } from "@/components/ui/button";
import { SettingsCard } from "@/components/settings/settings-card";
import { ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

export function TransferCard() {
  return (
    <SettingsCard>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">Transfer</h2>
          <p className="text-muted-foreground">
            Transfer your project to another team without downtime or workflow
            interruptions.
          </p>
        </div>
        <div className="border-t border-border pt-4 flex items-center justify-between">
          <a
            href="#"
            className="text-primary hover:underline flex items-center gap-1"
          >
            Learn more about <span>Transferring Projects</span>{" "}
            <ExternalLink className="w-4 h-4" />
          </a>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                // disabled
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Transfer
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Coming Soon.</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </SettingsCard>
  );
}
