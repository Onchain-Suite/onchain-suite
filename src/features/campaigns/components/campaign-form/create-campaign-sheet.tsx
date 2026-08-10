"use client";

import {
  ArrowPathIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { RadioGroup, RadioGroupItem } from "@/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/ui/sheet";

import { cn } from "@/lib/utils";

import { campaignsService } from "../../campaigns.service";
import type { CampaignChannel, CampaignFormData } from "../../validations";

type CampaignTypeId = Extract<
  CampaignFormData["campaignType"],
  "email-blast" | "smart-sending"
>;

const CAMPAIGN_TYPE_OPTIONS: Array<{
  id: CampaignTypeId;
  title: string;
  description: string;
  icon: typeof EnvelopeIcon;
}> = [
  {
    id: "email-blast",
    title: "Email Blast",
    description: "Send one-off campaigns or manage a batch of emails",
    icon: EnvelopeIcon,
  },
  {
    id: "smart-sending",
    title: "Smart campaign",
    description: "Reach users where they are with in-app push notifications",
    icon: UserGroupIcon,
  },
];

const suggestedCampaignName = () =>
  `Campaign ${new Date().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;

/**
 * Sidebar entry point for the campaign wizard. Collects the campaign name and
 * type up front (replacing the old details step), creates the draft, and
 * drops the user straight into the audience step - two fewer steps in the
 * send flow.
 */
export function CreateCampaignSheet({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<CampaignTypeId>("email-blast");
  const [isCreating, setIsCreating] = useState(false);

  // Smart campaigns are in-app push only for now; other types send email.
  const channel: CampaignChannel =
    type === "smart-sending" ? "in-app-push" : "email";

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) setName(suggestedCampaignName());
  };

  const handleContinue = async () => {
    const cleanName = name.trim();
    if (cleanName.length === 0) {
      toast.error("Campaign name is required.");
      return;
    }
    setIsCreating(true);
    try {
      const created = await campaignsService.createCampaign({
        name: cleanName,
        type,
        status: "draft",
      });
      if (!created?.id) throw new Error("Failed to create campaign draft");
      setOpen(false);
      const params = new URLSearchParams({
        campaign: created.id,
        step: "1",
        channel,
        name: cleanName,
      });
      router.push(`/campaigns/new?${params.toString()}`);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to create campaign";
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto sm:max-w-md"
      >
        <SheetHeader className="border-b border-border p-6">
          <SheetTitle className="text-xl">Create campaign</SheetTitle>
          <SheetDescription>
            Name your campaign and choose how it will be delivered.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 p-6">
          <div className="space-y-2">
            <Label
              htmlFor="create-campaign-name"
              className="text-sm font-medium"
            >
              Campaign name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="create-campaign-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={suggestedCampaignName()}
              className="h-11 rounded-xl border-border bg-background"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Campaign type</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as CampaignTypeId)}
              className="space-y-3"
            >
              {CAMPAIGN_TYPE_OPTIONS.map((item) => {
                const Icon = item.icon;
                const isSelected = type === item.id;
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setType(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setType(item.id);
                      }
                    }}
                    className={cn(
                      "relative flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:border-muted-foreground/30 hover:bg-muted/40"
                    )}
                  >
                    <RadioGroupItem
                      value={item.id}
                      id={`create-type-${item.id}`}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <Icon
                          aria-hidden="true"
                          className="h-4 w-4 text-muted-foreground"
                        />
                        <Label
                          htmlFor={`create-type-${item.id}`}
                          className="cursor-pointer font-medium text-foreground"
                        >
                          {item.title}
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {type === "smart-sending" ? (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Channel</Label>
              <div className="flex items-center gap-3 rounded-xl border-2 border-primary bg-primary/5 p-4">
                <DevicePhoneMobileIcon
                  aria-hidden="true"
                  className="h-5 w-5 text-primary"
                />
                <div>
                  <div className="text-sm font-medium text-foreground">
                    In-app Push
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Deliver this campaign as a push notification in your app
                  </p>
                </div>
              </div>
              {/*
                Social channels are intentionally disabled for now - smart
                campaigns support in-app push only. Restore these options once
                the social send pipeline lands:

                <button type="button">Telegram</button>
                <button type="button">Discord</button>
                <button type="button">X</button>
              */}
              <p className="text-xs text-muted-foreground">
                Telegram, Discord, and X channels are coming soon.
              </p>
            </div>
          ) : null}
        </div>

        <SheetFooter className="border-t border-border p-6">
          <Button
            type="button"
            onClick={handleContinue}
            disabled={isCreating || name.trim().length === 0}
            className="w-fit rounded-xl px-8"
          >
            {isCreating ? (
              <>
                <ArrowPathIcon
                  aria-hidden="true"
                  className="mr-2 h-4 w-4 animate-spin"
                />
                Creating…
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
