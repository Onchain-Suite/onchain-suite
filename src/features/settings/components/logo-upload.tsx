import {
  ArrowPathIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import axios from "axios";
import { motion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";

import { authClient } from "@/lib/auth-client";
import { getSelectedOrganizationId, isJsonObject } from "@/lib/utils";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Progress } from "@/shared/components/ui/progress";

interface LogoUploadProps {
  showLogoUploadModal: boolean;
  setShowLogoUploadModal: (show: boolean) => void;
  logoUploadType: "primary" | "dark" | "favicon";
  onUploaded?: (payload?: unknown) => void | Promise<void>;
}

const LogoUpload = ({
  showLogoUploadModal,
  setShowLogoUploadModal,
  logoUploadType,
  onUploaded,
}: LogoUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: session } = authClient.useSession();
  const { mutate } = useSWRConfig();

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

  // Reset for a fresh upload every time the dialog opens - a stale `success`
  // from a previous upload used to lock the dialog on "Upload Complete!" and
  // made it impossible to upload the other logo types.
  useEffect(() => {
    if (!showLogoUploadModal) return;
    setFile(null);
    setSuccess(false);
    setSaving(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [showLogoUploadModal, logoUploadType]);

  // Object-URL preview of the selected file; revoked on replacement/unmount.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  /**
   * Per-type allowed uploads. ICO is only valid for the favicon slot -
   * primary/dark logos must be SVG/PNG/JPG.
   */
  const validateFileType = (candidate: File): string | null => {
    const name = candidate.name.toLowerCase();
    const extension = name.includes(".") ? name.split(".").pop() : "";
    if (logoUploadType === "favicon") {
      return extension === "ico" || extension === "png"
        ? null
        : "Favicons must be an ICO or PNG file.";
    }
    if (extension === "ico") {
      return "ICO files can only be used for the favicon - upload an SVG, PNG, or JPG logo here.";
    }
    return ["svg", "png", "jpg", "jpeg"].includes(extension ?? "")
      ? null
      : "Logos must be an SVG, PNG, or JPG file.";
  };

  const mergeBrandingPreview = (payload: unknown) => {
    const root = isJsonObject(payload) ? payload : undefined;
    const preview = isJsonObject(root?.logoPreview)
      ? root.logoPreview
      : undefined;
    const variants = isJsonObject(root?.logoVariants)
      ? root.logoVariants
      : undefined;
    const url =
      (typeof root?.url === "string" && root.url) ||
      (typeof preview?.primaryUrl === "string" && preview.primaryUrl) ||
      (typeof preview?.darkUrl === "string" && preview.darkUrl) ||
      (typeof preview?.faviconUrl === "string" && preview.faviconUrl) ||
      undefined;
    const next = {
      ...(preview ? { logoPreview: preview } : {}),
      ...(variants ? { logoVariants: variants } : {}),
    };
    if (url) {
      if (logoUploadType === "primary") {
        Object.assign(next, { primaryLogoUrl: url });
      } else if (logoUploadType === "dark") {
        Object.assign(next, { darkLogoUrl: url });
      } else {
        Object.assign(next, { faviconUrl: url });
      }
    }
    if (Object.keys(next).length === 0) return;

    // The SWR cache for this key holds the `{ success, data }` envelope -
    // merge into `data` (a root-level merge is invisible to readBrandingData).
    mutate(
      "/api/v1/organization/branding",
      (current: unknown) => {
        const currentRoot = isJsonObject(current) ? current : {};
        const currentData = isJsonObject(currentRoot.data)
          ? currentRoot.data
          : {};
        return {
          ...currentRoot,
          success: true,
          data: {
            ...currentData,
            ...next,
          },
        };
      },
      false
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [selectedFile] = e.target.files ?? [];
    if (!selectedFile) return;

    const typeError = validateFileType(selectedFile);
    if (typeError) {
      toast.error(typeError);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds 100MB limit");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFile(selectedFile);
    setUploadProgress(0);
    setSuccess(false);
  };

  const handleUpload = async () => {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds 100MB limit");
      return;
    }

    setSaving(true);
    setUploadProgress(0);
    setSuccess(false);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // axios automatically sets the correct Content-Type with boundary for FormData
      // Do NOT set it manually, otherwise the boundary will be missing
      const headers: Record<string, string> = {};

      const activeOrgId =
        getSelectedOrganizationId() ?? session?.session?.activeOrganizationId;
      if (!activeOrgId) {
        toast.error(
          "No active organization found. Please select an organization."
        );
        setSaving(false);
        return;
      }

      headers["x-org-id"] = activeOrgId;

      // Use the custom proxy route to avoid rewrite issues
      const response = await axios.post(
        `/api/upload/logo/${logoUploadType}`,
        formData,
        {
          headers,
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total ?? file.size;
            const current = progressEvent.loaded;
            const percentCompleted = Math.round((current * 100) / total);
            setUploadProgress(percentCompleted);
          },
        }
      );

      toast.success("Logo uploaded successfully");

      // Update the logo across the app without reload
      mergeBrandingPreview(response.data);
      mutate("/api/v1/organization/branding");
      await onUploaded?.(response.data);

      // Close modal and reset state
      setTimeout(() => {
        setShowLogoUploadModal(false);
        setFile(null);
        setUploadProgress(0);
        setSaving(false);
      }, 1500);

      setSuccess(true);
    } catch (error) {
      console.error("Upload error object:", error);
      const axiosErr = axios.isAxiosError(error) ? error : undefined;
      if (axiosErr?.response) {
        console.error(
          "Upload error response status:",
          axiosErr.response.status
        );
        console.error("Upload error response data:", axiosErr.response.data);
      }

      let errorMessage = "Failed to upload logo";

      const responseData = axiosErr?.response?.data;
      const errorData = isJsonObject(responseData) ? responseData : undefined;
      const nestedError = errorData?.error;
      if (typeof nestedError === "string") {
        errorMessage = nestedError;
      } else if (typeof errorData?.details === "string") {
        errorMessage = errorData.details;
      } else if (isJsonObject(nestedError)) {
        if (typeof nestedError.message === "string") {
          errorMessage = nestedError.message;
        } else {
          errorMessage = JSON.stringify(nestedError);
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
      setSaving(false);
      setSuccess(false);
    }
  };

  return (
    <Dialog open={showLogoUploadModal} onOpenChange={setShowLogoUploadModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-light tracking-tight text-(--brand-oxford-blue) dark:text-(--brand-alice-blue)">
            Upload{" "}
            {logoUploadType === "primary"
              ? "primary"
              : logoUploadType === "dark"
                ? "dark mode"
                : "favicon"}{" "}
            logo
          </DialogTitle>
          <DialogDescription className="text-(--brand-oxford-blue)/70 dark:text-(--brand-alice-blue)/70">
            {logoUploadType === "favicon"
              ? "Upload a 32×32px icon"
              : "Upload a 400×100px image"}
          </DialogDescription>
        </DialogHeader>
        {success ? (
          <div className="mt-6 flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
            <CheckCircleIcon
              className="h-12 w-12 text-primary"
              aria-hidden="true"
            />
            <h3 className="mt-4 text-lg font-medium text-foreground">
              Upload Complete!
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your logo has been updated successfully.
            </p>
          </div>
        ) : (
          <div className="mt-6">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept={
                logoUploadType === "favicon"
                  ? ".ico,.png"
                  : ".svg,.png,.jpg,.jpeg"
              }
              onChange={handleFileChange}
            />
            <motion.div
              whileHover={{
                borderColor: "var(--brand-blue)",
                backgroundColor: "rgba(23, 39, 224, 0.05)",
              }}
              onClick={() => !saving && fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-(--brand-oxford-blue)/20 bg-(--brand-alice-blue)/50 p-10 transition-all ${!saving ? "cursor-pointer" : "cursor-default"} dark:border-(--brand-alice-blue)/20 dark:bg-(--brand-alice-blue)/5 lg:p-12`}
            >
              {file ? (
                <div className="text-center w-full">
                  {previewUrl ? (
                    <div
                      className={`mx-auto mb-4 flex items-center justify-center overflow-hidden rounded-xl border border-border bg-[repeating-conic-gradient(theme(colors.muted.DEFAULT)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px] p-3 ${
                        logoUploadType === "favicon"
                          ? "h-20 w-20"
                          : "h-24 w-full max-w-xs"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- object URL preview of a local file */}
                      <img
                        src={previewUrl}
                        alt="Logo preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : null}
                  <p className="font-medium text-(--brand-oxford-blue) dark:text-(--brand-alice-blue)">
                    {file.name}
                  </p>
                  <p className="text-sm text-(--brand-oxford-blue)/70 dark:text-(--brand-alice-blue)/70 mb-4">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                  {saving && (
                    <div className="w-full max-w-xs mx-auto space-y-2">
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {uploadProgress}% uploaded
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <ArrowUpTrayIcon
                    className="h-10 w-10 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <p className="mt-4 text-sm font-medium text-(--brand-oxford-blue) dark:text-(--brand-alice-blue)">
                    Drop your file here, or browse
                  </p>
                  <p className="mt-1 text-xs text-(--brand-oxford-blue)/70 dark:text-(--brand-alice-blue)/70">
                    {logoUploadType === "favicon"
                      ? "ICO or PNG up to 100MB"
                      : "SVG, PNG, or JPG up to 100MB"}
                  </p>
                </>
              )}
              {!file && (
                <Button
                  variant="outline"
                  className="mt-6 border-(--brand-oxford-blue)/20 bg-transparent text-(--brand-oxford-blue) dark:border-(--brand-alice-blue)/20 dark:text-(--brand-alice-blue)"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Choose file
                </Button>
              )}
              {file && !saving && (
                <Button
                  variant="outline"
                  className="mt-6 border-(--brand-oxford-blue)/20 bg-transparent text-(--brand-oxford-blue) dark:border-(--brand-alice-blue)/20 dark:text-(--brand-alice-blue)"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Change file
                </Button>
              )}
            </motion.div>
          </div>
        )}
        <DialogFooter className="mt-6 sm:justify-between">
          <Button
            variant="outline"
            onClick={() => setShowLogoUploadModal(false)}
            disabled={saving}
            className="border-(--brand-oxford-blue)/20 text-(--brand-oxford-blue) dark:border-(--brand-alice-blue)/20 dark:text-(--brand-alice-blue)"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={saving || !file}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? (
              <ArrowPathIcon
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              "Upload logo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LogoUpload;
