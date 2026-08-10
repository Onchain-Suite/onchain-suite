import { ArrowPathIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { getSelectedOrganizationId } from "@/lib/utils";

import { fadeInUp } from "../utils";
import {
  type AssignableRole,
  organizationMembersService,
} from "@/features/settings/organization-members.service";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

interface InviteUserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const InviteUser = ({ open, onOpenChange, onSuccess }: InviteUserProps) => {
  const { data: session } = authClient.useSession();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AssignableRole>("EDITOR");
  const [saving, setSaving] = useState(false);

  const handleSendInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    const orgId =
      getSelectedOrganizationId() ?? session?.session?.activeOrganizationId;
    if (!orgId) {
      toast.error("No active organization");
      return;
    }

    setSaving(true);
    try {
      // Rate-limited at 5 invites/minute - a 429 surfaces the service's
      // friendly wait-a-moment message below.
      await organizationMembersService.createInvite(orgId, {
        email,
        role: inviteRole,
      });

      toast.success("Invitation sent successfully");
      onOpenChange(false);
      setInviteEmail("");
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send invitation";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-light tracking-tight text-foreground">
            Invite team member
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Send an invitation to join your workspace.
          </DialogDescription>
        </DialogHeader>
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.2 }}
          className="grid gap-4 py-4"
        >
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Email address
            </Label>
            <Input
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="h-12 border-border/80"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Role</Label>
            <Select
              value={inviteRole}
              onValueChange={(value) => setInviteRole(value as AssignableRole)}
            >
              <SelectTrigger className="h-12 border-border/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="EDITOR">Editor</SelectItem>
                <SelectItem value="VIEWER">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border/80"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendInvite}
            disabled={saving || !inviteEmail}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? (
              <ArrowPathIcon
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <EnvelopeIcon className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            Send invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InviteUser;
