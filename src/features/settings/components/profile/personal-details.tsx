import { CheckIcon, PencilIcon } from "@heroicons/react/24/outline";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { type SyntheticEvent, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { apiClient } from "@/lib/api-client";

import { fadeInUp, staggerContainer } from "../../utils";
import {
  type UserProfilePreferenceField,
  useUserProfile,
} from "./use-user-profile";
import SettingsSectionCard from "@/features/settings/components/settings-section-card";
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Switch } from "@/shared/components/ui/switch";
import { useTimezones } from "@/shared/hooks/client/use-timezones";

interface ProfileDetailsFormState {
  email: string;
  firstName: string;
  lastName: string;
  timezone: string;
  zkIntegration: boolean;
  preferences: UserProfilePreferenceField[];
}

const PersonalDetails = () => {
  const { items: timezones, loading: tzLoading } = useTimezones();
  const queryClient = useQueryClient();
  const profileQuery = useUserProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<ProfileDetailsFormState>({
    email: "",
    firstName: "",
    lastName: "",
    timezone: "",
    zkIntegration: false,
    preferences: [],
  });
  const [formData, setFormData] = useState<ProfileDetailsFormState>({
    email: "",
    firstName: "",
    lastName: "",
    timezone: "",
    zkIntegration: false,
    preferences: [],
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    const nextState: ProfileDetailsFormState = {
      email: profileQuery.data.email,
      firstName: profileQuery.data.firstName,
      lastName: profileQuery.data.lastName,
      timezone: profileQuery.data.timezone,
      zkIntegration:
        profileQuery.data.preferences.find(
          (item) => item.id === "zkIntegration"
        )?.value ?? false,
      preferences: profileQuery.data.preferences.filter(
        (item) => item.id !== "zkIntegration"
      ),
    };
    setProfileData(nextState);
    setFormData(nextState);
  }, [profileQuery.data]);

  const saveProfileMutation = useMutation({
    mutationFn: async (values: ProfileDetailsFormState) => {
      const name = `${values.firstName} ${values.lastName}`.trim();
      const payload: Record<string, unknown> = {
        name,
        timezone: values.timezone,
        zkIntegration: values.zkIntegration,
        zk_integration: values.zkIntegration,
      };

      for (const preference of values.preferences) {
        if (preference.payloadKey) {
          payload[preference.payloadKey] = preference.value;
        }
      }

      await apiClient.put("/user/profile", payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["settings", "profile"],
      });
      setIsEditing(false);
      toast.success("Profile updated successfully");
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });

  const summaryBadge = profileQuery.isError
    ? "Live data unavailable"
    : profileQuery.data?.updatedAt
      ? `Updated ${new Date(profileQuery.data.updatedAt).toLocaleDateString()}`
      : "Live profile data";
  const fullNameLabel =
    typeof profileQuery.data?.fullName === "string" &&
    profileQuery.data.fullName.trim().length > 0
      ? profileQuery.data.fullName
      : "-";
  const timezoneLabel =
    typeof profileData.timezone === "string" && profileData.timezone.length > 0
      ? profileData.timezone
      : "UTC";

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveProfileMutation.mutate(formData);
  };

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <SettingsSectionCard
        title="Profile details"
        description="Manage your personal information and privacy preferences."
        badge={summaryBadge}
        collapsedPreview={
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Full name
              </p>
              {profileQuery.isPending ? (
                <Skeleton className="mt-1 h-5 w-36" />
              ) : (
                <p className="mt-1 text-sm font-medium text-foreground">
                  {fullNameLabel}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Email
              </p>
              {profileQuery.isPending ? (
                <Skeleton className="mt-1 h-5 w-44" />
              ) : (
                <p className="mt-1 text-sm text-foreground">
                  {profileData.email || "-"}
                </p>
              )}
            </div>
          </div>
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
                <Skeleton className="h-5 w-40" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-5 w-52" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
              <Skeleton className="mb-3 h-4 w-32" />
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            </div>
          </motion.div>
        ) : profileQuery.isError ? (
          <motion.div variants={fadeInUp} className="space-y-3">
            <div className="rounded-2xl border border-dashed border-border/60 bg-card p-6 text-sm text-muted-foreground">
              We couldn&apos;t load your live profile data right now. Please
              wait a moment and try again.
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
          <form onSubmit={handleSubmit}>
            <motion.div variants={fadeInUp} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground">
                    First name
                  </Label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="h-12 border-border/80 bg-background text-foreground transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground">
                    Last name
                  </Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="h-12 border-border/80 bg-background text-foreground transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">
                  Email address
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  disabled
                  className="h-12 border-border/80 bg-muted/50 text-muted-foreground"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">
                  Timezone
                </Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) =>
                    setFormData({ ...formData, timezone: value })
                  }
                  disabled={tzLoading}
                >
                  <SelectTrigger className="h-12 border-border/80 bg-background text-foreground">
                    <SelectValue
                      placeholder={
                        tzLoading ? "Loading timezones..." : "Select timezone"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz.id} value={tz.id}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <div className="space-y-4">
                  {formData.preferences.map((preference) => (
                    <div
                      key={preference.id}
                      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {preference.label}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Stored in your profile settings.
                        </p>
                      </div>
                      <Switch
                        checked={preference.value}
                        onCheckedChange={(value) =>
                          setFormData({
                            ...formData,
                            preferences: formData.preferences.map((item) =>
                              item.id === preference.id
                                ? { ...item, value }
                                : item
                            ),
                          })
                        }
                      />
                    </div>
                  ))}

                  <div className="flex flex-col gap-4 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        ZK integration
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Enable zero-knowledge powered profile integrations for
                        your account.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={formData.zkIntegration ? "default" : "outline"}
                        className="rounded-full"
                      >
                        {formData.zkIntegration ? "Enabled" : "Disabled"}
                      </Badge>
                      <Switch
                        checked={formData.zkIntegration}
                        onCheckedChange={(value) =>
                          setFormData({ ...formData, zkIntegration: value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-border/40 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(profileData);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saveProfileMutation.isPending}
                  className="gap-2"
                >
                  <CheckIcon className="h-4 w-4" aria-hidden="true" />
                  {saveProfileMutation.isPending ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </motion.div>
          </form>
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
                  Full name
                </p>
                <p className="text-base font-medium text-foreground">
                  {fullNameLabel}
                </p>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-muted-foreground">
                  Email
                </p>
                <p className="text-base text-foreground">
                  {profileData.email || "-"}
                </p>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-muted-foreground">
                  Timezone
                </p>
                <p className="text-base text-foreground">{timezoneLabel}</p>
              </div>
            </div>

            {profileData.preferences.length > 0 ? (
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <p className="mb-3 text-sm font-medium text-muted-foreground">
                  Email preferences
                </p>
                <div className="space-y-2">
                  {profileData.preferences.map((preference) => (
                    <div
                      key={preference.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-sm text-foreground">
                        {preference.label}
                      </span>
                      <Badge
                        variant={preference.value ? "default" : "outline"}
                        className="rounded-full"
                      >
                        {preference.value ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </SettingsSectionCard>
    </motion.div>
  );
};

export default PersonalDetails;
