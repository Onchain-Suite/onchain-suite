"use client";

import {
  FingerPrintIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";

import { fadeInUp } from "../../utils";
import { useUserProfile } from "../profile/use-user-profile";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Switch } from "@/shared/components/ui/switch";

const PROTECTED = [
  {
    icon: LockClosedIcon,
    title: "Channel handles are encrypted",
    body: "Email, Farcaster/FID, X, Telegram and Discord are blind-indexed and encrypted at rest — they're only ever decrypted at the API boundary.",
  },
  {
    icon: ShieldCheckIcon,
    title: "ZK-protected PII",
    body: "Contacts can keep their email private while staying reachable — you message the wallet, we resolve the channel without exposing the address.",
  },
  {
    icon: FingerPrintIcon,
    title: "Wallet is the identity",
    body: "Every contact is keyed on its wallet address. Channels attach to the wallet, so a contact with zero channels is still a first-class identity.",
  },
];

export default function PrivacyIdentitySettings() {
  const queryClient = useQueryClient();
  const profileQuery = useUserProfile();

  const zkEnabled =
    profileQuery.data?.preferences.find((p) => p.id === "zkIntegration")
      ?.value ?? false;

  const toggleZkMutation = useMutation({
    mutationFn: async (value: boolean) => {
      await apiClient.put("/user/profile", {
        zkIntegration: value,
        zk_integration: value,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["settings", "profile"],
      });
    },
    onError: () => toast.error("Failed to update privacy setting"),
  });

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">
          Privacy &amp; Identity
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          How OnchainSuite protects the people in your audience.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROTECTED.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border bg-background/40 p-4"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="size-5" aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-medium text-foreground">
                {item.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Zero-knowledge integration
            </h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Enable zero-knowledge–powered profile integrations so protected
              PII never leaves the boundary in plaintext.
            </p>
          </div>
          {profileQuery.isPending ? (
            <Skeleton className="h-6 w-11 rounded-full" />
          ) : (
            <Switch
              checked={zkEnabled}
              disabled={toggleZkMutation.isPending}
              onCheckedChange={(value) => toggleZkMutation.mutate(value)}
              aria-label="Toggle zero-knowledge integration"
            />
          )}
        </div>
      </section>
    </motion.div>
  );
}
