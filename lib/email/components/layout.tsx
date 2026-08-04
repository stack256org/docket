import type { ReactNode } from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "react-email";
import { PRODUCT_NAME } from "@/config/platform";

// Brand palette (mirrors the app theme — bark/stone/sand/cream). Email clients
// don't support runtime CSS vars, so brand colors are inlined here on purpose.
const brand = {
  bark: "#384959",
  stone: "#6A89A7",
  sand: "#88BDF2",
  cream: "#BDDDFC",
  surface: "#F7F9FB",
  white: "#ffffff",
};

export const emailStyles = {
  body: {
    backgroundColor: brand.surface,
    color: brand.bark,
    fontFamily:
      'Geist, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  button: {
    backgroundColor: brand.bark,
    borderRadius: "6px",
    color: brand.white,
    display: "inline-block",
    fontSize: "14px",
    fontWeight: 700,
    padding: "12px 18px",
    textDecoration: "none",
  },
  container: {
    backgroundColor: brand.white,
    border: `1px solid ${brand.cream}`,
    borderRadius: "10px",
    margin: "40px auto",
    maxWidth: "560px",
    padding: "32px",
  },
  fallbackLink: {
    color: brand.stone,
    fontSize: "12px",
    lineHeight: "20px",
  },
  heading: {
    color: brand.bark,
    fontSize: "24px",
    fontWeight: 800,
    letterSpacing: "0",
    lineHeight: "32px",
    margin: "0 0 16px",
  },
  link: { color: brand.bark },
  muted: {
    color: brand.stone,
    fontSize: "13px",
    lineHeight: "22px",
  },
  paragraph: {
    color: brand.bark,
    fontSize: "15px",
    lineHeight: "24px",
  },
};

export const emailBrand = brand;

export function EmailLayout({
  children,
  logoUrl,
  preview,
  productName = PRODUCT_NAME,
}: {
  children: ReactNode;
  logoUrl?: string | null;
  preview: string;
  productName?: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={emailStyles.body}>
        <Container style={emailStyles.container}>
          <Section style={{ marginBottom: "24px" }}>
            {logoUrl ? (
              <Img alt={productName} height="32" src={logoUrl} />
            ) : (
              <Text style={{ fontWeight: 900, letterSpacing: "0" }}>
                {productName}
              </Text>
            )}
          </Section>
          {children}
        </Container>
      </Body>
    </Html>
  );
}
