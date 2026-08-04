import type { ReactNode } from "react";

interface BrandMarkProps {
  /** Icon/initials badge shown when no logo is configured — layout (size,
   * color, rounding) is the caller's own markup, this component just decides
   * whether to render it. */
  fallbackIcon?: ReactNode;
  /** Classes for the <img> when a logo is configured. */
  imgClassName?: string;
  logoUrl: string | null;
  name: string;
  /** Classes for the name text, only rendered alongside `fallbackIcon`. */
  textClassName?: string;
}

/**
 * A logo image when one's configured, replacing the icon-badge + name text
 * entirely (mirrors lib/email/components/layout.tsx's EmailLayout, which
 * makes the same swap for emails) — an uploaded logo usually already
 * contains a wordmark, so showing the text name alongside it would double up.
 */
export function BrandMark({
  name,
  logoUrl,
  fallbackIcon,
  textClassName,
  imgClassName,
}: BrandMarkProps) {
  if (logoUrl) {
    // next/image is the wrong tool here. logoUrl is admin-uploaded and served
    // through our own /api/files/[...key] route (or a user-set S3/R2 CDN
    // domain), so it would need remotePatterns reconfigured per deployment to
    // pass the optimizer — and next/image additionally requires intrinsic
    // width/height or `fill`, neither of which is knowable for an arbitrary
    // uploaded logo. A plain <img> sized by the caller's classes is correct for
    // a single small chrome asset.
    // biome-ignore lint/performance/noImgElement: admin-uploaded logo of unknown intrinsic size, served via our own route
    return <img alt={name} className={imgClassName} src={logoUrl} />;
  }
  return (
    <>
      {fallbackIcon}
      <span className={textClassName}>{name}</span>
    </>
  );
}
