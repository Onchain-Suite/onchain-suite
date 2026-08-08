import {
  CheckIcon,
  PencilIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { authClient } from "@/lib/auth-client";

import { fadeInUp, staggerContainer } from "../../utils";
import TwoFactorAuthModal from "../two-factor-auth-modal";
import PasskeysSection from "./passkeys-section";
import { useUserProfile } from "./use-user-profile";
import SettingsSectionCard from "@/features/settings/components/settings-section-card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";

// 2FA is disabled for now (product decision) - flip to true to restore the
// enable/manage UI. The backend flows (/auth/two-factor/*) stay untouched.
const TWO_FACTOR_ENABLED = false;

const formatSecurityDate = (value?: string) => {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const Security = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTwoFAModal, setShowTwoFAModal] = useState(false);
  const profileQuery = useUserProfile();
  const twoFactorEnabled = profileQuery.data?.twoFactorEnabled ?? false;
  const passwordChangedLabel = formatSecurityDate(
    profileQuery.data?.passwordChangedAt
  );

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) {
      toast.error("Please fill in both password fields");
      return;
    }
    setLoading(true);
    try {
      await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      toast.success("Password changed successfully");
      setIsEditing(false);
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      toast.error("Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const toggleTwoFA = () => {
    setShowTwoFAModal(true);
  };

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      {TWO_FACTOR_ENABLED ? (
        <TwoFactorAuthModal
          open={showTwoFAModal}
          onOpenChange={setShowTwoFAModal}
        />
      ) : null}
      <SettingsSectionCard
        title="Security"
        description="Update your password and manage your sign-in protection."
        icon={<ShieldCheckIcon className="h-5 w-5" aria-hidden="true" />}
        badge={
          TWO_FACTOR_ENABLED
            ? twoFactorEnabled
              ? "2FA enabled"
              : "2FA not enabled"
            : "Password & passkeys"
        }
        collapsedPreview={
          TWO_FACTOR_ENABLED ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Two-factor authentication
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {twoFactorEnabled ? "Enabled" : "Disabled"}
                </p>
              </div>
              <Badge
                variant={twoFactorEnabled ? "default" : "outline"}
                className="w-fit rounded-full"
              >
                {twoFactorEnabled ? "Protected" : "Needs setup"}
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Manage your password and passkeys.
            </p>
          )
        }
      >
        {profileQuery.isPending ? (
          <motion.div variants={fadeInUp} className="space-y-6">
            <div className="flex items-center justify-end">
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
            <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-48" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-44" />
              </div>
            </div>
          </motion.div>
        ) : profileQuery.isError ? (
          <motion.div variants={fadeInUp} className="space-y-3">
            <div className="rounded-2xl border border-dashed border-border/60 bg-card p-6 text-sm text-muted-foreground">
              Live security details are temporarily unavailable. Please retry in
              a moment.
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  profileQuery.refetch();
                }}
              >
                Retry
              </Button>
            </div>
          </motion.div>
        ) : isEditing ? (
          <motion.div variants={fadeInUp} className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">
                Current password
              </Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-12 border-border/80 bg-background text-foreground transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">
                New password
              </Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-12 border-border/80 bg-background text-foreground transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
            </div>

            {TWO_FACTOR_ENABLED ? (
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      Two-factor authentication
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add another layer of protection to your account.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={toggleTwoFA}
                    className="rounded-xl border-border/80 text-foreground hover:bg-muted hover:text-foreground"
                  >
                    {twoFactorEnabled ? "Manage 2FA" : "Enable 2FA"}
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-3 border-t border-border/40 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  setCurrentPassword("");
                  setNewPassword("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePasswordChange}
                disabled={loading}
                className="gap-2"
              >
                <CheckIcon className="h-4 w-4" aria-hidden="true" />
                {loading ? "Updating..." : "Update password"}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div variants={fadeInUp} className="space-y-6">
            <div className="flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="gap-2"
              >
                <PencilIcon className="h-3.5 w-3.5" aria-hidden="true" />
                Edit
              </Button>
            </div>

            <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
              <div>
                <p className="mb-1 text-sm font-medium text-muted-foreground">
                  Password
                </p>
                <p className="text-base text-foreground">
                  {passwordChangedLabel
                    ? `Last changed ${passwordChangedLabel}`
                    : "Password managed securely"}
                </p>
              </div>
              {TWO_FACTOR_ENABLED ? (
                <div>
                  <p className="mb-1 text-sm font-medium text-muted-foreground">
                    Two-factor authentication
                  </p>
                  <div className="space-y-2">
                    <Badge
                      variant={twoFactorEnabled ? "default" : "outline"}
                      className="rounded-full"
                    >
                      {twoFactorEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      {twoFactorEnabled
                        ? "Using authenticator app"
                        : "Authenticator app not configured"}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <PasskeysSection />
          </motion.div>
        )}
      </SettingsSectionCard>
    </motion.div>
  );
};

export default Security;
