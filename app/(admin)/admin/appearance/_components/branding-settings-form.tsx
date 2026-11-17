"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { BrandMark } from "@/components/common/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRODUCT_NAME } from "@/config/platform";
import { getInitials } from "@/lib/utils";

interface Props {
  initialBrandName: string | null;
  initialFaviconUrl: string | null;
  initialLogoDarkUrl: string | null;
  initialLogoUrl: string | null;
}

type BrandImageKind = "favicon" | "logo" | "logoDark";

const BRAND_IMAGE_CONFIG: Record<
  BrandImageKind,
  { label: string; path: string }
> = {
  logo: { path: "logo", label: "Logo" },
  logoDark: { path: "logo-dark", label: "Dark-background logo" },
  favicon: { path: "favicon", label: "Favicon" },
};

/** Shared upload/remove logic for the logo, dark-background logo, and favicon
 * fields — endpoint `/api/admin/settings/{path}` (see BRAND_IMAGE_CONFIG), form
 * field `kind`, and JSON response key `{kind}Url` for all of them. Refreshes the
 * route on success so server-rendered consumers (sidebar logo, favicon) pick up
 * the change without a reload. */
function useBrandImageUpload(kind: BrandImageKind, initialUrl: string | null) {
  const [url, setUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { label, path } = BRAND_IMAGE_CONFIG[kind];

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) {
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append(kind, file);
      const res = await fetch(`/api/admin/settings/${path}`, {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        string | undefined
      >;
      if (!res.ok) {
        toast.error(data.error ?? `Failed to upload ${label.toLowerCase()}.`);
        return;
      }
      setUrl(data[`${kind}Url`] ?? null);
      router.refresh();
      toast.success(`${label} uploaded.`);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function remove() {
    setUploading(true);
    try {
      const res = await fetch(`/api/admin/settings/${path}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error(`Failed to remove ${label.toLowerCase()}.`);
        return;
      }
      setUrl(null);
      router.refresh();
      toast.success(`${label} removed.`);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return { fileInputRef, handleFileSelect, label, remove, uploading, url };
}

export function BrandingSettingsForm({
  initialBrandName,
  initialFaviconUrl,
  initialLogoDarkUrl,
  initialLogoUrl,
}: Props) {
  const [brandName, setBrandName] = useState(initialBrandName ?? "");
  const [savedBrandName, setSavedBrandName] = useState(initialBrandName ?? "");
  const [savingName, setSavingName] = useState(false);
  const logo = useBrandImageUpload("logo", initialLogoUrl);
  const logoDark = useBrandImageUpload("logoDark", initialLogoDarkUrl);
  const favicon = useBrandImageUpload("favicon", initialFaviconUrl);

  const displayName = brandName.trim() || PRODUCT_NAME;

  async function saveBrandName() {
    if (brandName === savedBrandName) {
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName: brandName.trim() || null }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save.");
        return;
      }
      setSavedBrandName(brandName);
      toast.success("Brand name saved.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSavingName(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-medium text-base-content">Branding</h3>
        <p className="text-xs text-base-content-muted mt-0.5">
          Shown in the sidebar, login page, customer portal, emails, and browser
          tab instead of "{PRODUCT_NAME}".
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="brand-name">Brand name</Label>
        <Input
          disabled={savingName}
          id="brand-name"
          onBlur={saveBrandName}
          onChange={(e) => setBrandName(e.target.value)}
          placeholder={PRODUCT_NAME}
          value={brandName}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Logo</Label>
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-base-300 bg-base-300/40 overflow-hidden">
            <BrandMark
              fallbackIcon={
                <span className="text-sm font-semibold text-base-content-muted">
                  {getInitials(displayName)}
                </span>
              }
              imgClassName="max-h-12 max-w-12 object-contain"
              logoUrl={logo.url}
              name={displayName}
              textClassName="sr-only"
            />
          </div>
          <div className="flex gap-2">
            <Button
              disabled={logo.uploading}
              onClick={() => logo.fileInputRef.current?.click()}
              size="sm"
              type="button"
              variant="outline"
            >
              {logo.url ? "Replace" : "Upload"}
            </Button>
            {logo.url && (
              <Button
                className="border-red-200 text-red-600 hover:bg-red-50"
                disabled={logo.uploading}
                onClick={logo.remove}
                size="sm"
                type="button"
                variant="outline"
              >
                Remove
              </Button>
            )}
          </div>
          <input
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={logo.handleFileSelect}
            ref={logo.fileInputRef}
            type="file"
          />
        </div>
        <p className="text-xs text-base-content-muted">
          PNG, JPEG, SVG, or WebP — up to 2 MB. Used on the login page, customer
          portal, and emails, and as the browser tab icon unless you set a
          dedicated favicon below.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Logo for dark backgrounds</Label>
        <div className="flex items-center gap-4">
          {/* Previewed on the real sidebar color so the contrast is what the
              admin will actually get. */}
          <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar overflow-hidden">
            <BrandMark
              fallbackIcon={
                <span className="text-sm font-semibold text-sidebar-content">
                  {getInitials(displayName)}
                </span>
              }
              imgClassName="max-h-12 max-w-12 object-contain"
              logoUrl={logoDark.url ?? logo.url}
              name={displayName}
              textClassName="sr-only"
            />
          </div>
          <div className="flex gap-2">
            <Button
              disabled={logoDark.uploading}
              onClick={() => logoDark.fileInputRef.current?.click()}
              size="sm"
              type="button"
              variant="outline"
            >
              {logoDark.url ? "Replace" : "Upload"}
            </Button>
            {logoDark.url && (
              <Button
                className="border-red-200 text-red-600 hover:bg-red-50"
                disabled={logoDark.uploading}
                onClick={logoDark.remove}
                size="sm"
                type="button"
                variant="outline"
              >
                Remove
              </Button>
            )}
          </div>
          <input
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={logoDark.handleFileSelect}
            ref={logoDark.fileInputRef}
            type="file"
          />
        </div>
        <p className="text-xs text-base-content-muted">
          Optional — shown in the sidebar, which has a dark background. Upload a
          white or light version of your logo. Falls back to the logo above when
          not set.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label>Favicon</Label>
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-base-300 bg-base-300/40 overflow-hidden">
            <BrandMark
              fallbackIcon={
                <span className="text-sm font-semibold text-base-content-muted">
                  {getInitials(displayName)}
                </span>
              }
              imgClassName="max-h-10 max-w-10 object-contain"
              logoUrl={favicon.url}
              name={displayName}
              textClassName="sr-only"
            />
          </div>
          <div className="flex gap-2">
            <Button
              disabled={favicon.uploading}
              onClick={() => favicon.fileInputRef.current?.click()}
              size="sm"
              type="button"
              variant="outline"
            >
              {favicon.url ? "Replace" : "Upload"}
            </Button>
            {favicon.url && (
              <Button
                className="border-red-200 text-red-600 hover:bg-red-50"
                disabled={favicon.uploading}
                onClick={favicon.remove}
                size="sm"
                type="button"
                variant="outline"
              >
                Remove
              </Button>
            )}
          </div>
          <input
            accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon,image/vnd.microsoft.icon,.ico"
            className="hidden"
            onChange={favicon.handleFileSelect}
            ref={favicon.fileInputRef}
            type="file"
          />
        </div>
        <p className="text-xs text-base-content-muted">
          Optional — a square, icon-only mark for the browser tab (PNG, JPEG,
          SVG, WebP, or ICO). Useful when your logo above combines an icon with
          a wordmark. Falls back to the logo when not set.
        </p>
      </div>
    </div>
  );
}
