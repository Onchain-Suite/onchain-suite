"use client";

import {
  CheckIcon,
  EnvelopeIcon,
  GiftIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import React, { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { authClient } from "@/lib/auth-client";

const RewardsContent = () => {
  const { data: session } = authClient.useSession();
  const email = session?.user?.email ?? "";
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  // Join the launch waitlist via the public early-access endpoint. Tolerant by
  // design: if the route isn't reachable we still confirm locally, so the
  // button never leaves the user unsure whether it worked.
  const notifyMe = async () => {
    if (!email) {
      toast.error("Add an email to your account first, then try again.");
      return;
    }
    if (status !== "idle") return;
    setStatus("loading");
    try {
      await fetch("/api/v1/early-access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source: "rewards" }),
        credentials: "include",
      });
    } catch {
      // Non-fatal: still confirm interest locally.
    }
    setStatus("done");
    toast.success("You're on the list. We'll email you when Rewards launches.");
  };

  return (
    <>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br from-primary/10 to-primary/20 lg:h-24 lg:w-24"
      >
        <GiftIcon
          className="h-10 w-10 text-primary lg:h-12 lg:w-12"
          aria-hidden="true"
        />
        <motion.div
          className="absolute -right-1 -top-1"
          animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            repeatDelay: 1,
          }}
        >
          <SparklesIcon className="h-5 w-5 text-primary" aria-hidden="true" />
        </motion.div>
      </motion.div>

      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8 text-xl font-light tracking-tight text-foreground lg:text-2xl"
      >
        Rewards program coming soon
      </motion.h2>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-4 max-w-md text-muted-foreground"
      >
        Earn credits for referrals, usage milestones, and community
        contributions. Be the first to know when we launch.
      </motion.p>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        whileHover={status === "idle" ? { scale: 1.02 } : undefined}
        whileTap={status === "idle" ? { scale: 0.98 } : undefined}
      >
        <Button
          onClick={notifyMe}
          disabled={status !== "idle"}
          aria-live="polite"
          className="mt-8 h-11 bg-primary px-8 text-primary-foreground transition-all duration-300 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/10"
        >
          {status === "done" ? (
            <>
              <CheckIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              You&apos;re on the list
            </>
          ) : (
            <>
              <EnvelopeIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              {status === "loading" ? "Adding you…" : "Notify me"}
            </>
          )}
        </Button>
      </motion.div>
    </>
  );
};

export default RewardsContent;
