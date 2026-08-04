"use client";

import { useState } from "react";
import { EmailSendingSettingsForm } from "./email-sending-settings-form";
import {
  EmailTemplatesManager,
  type TemplateItem,
} from "./email-templates-manager";

interface Props {
  initialTemplates: TemplateItem[];
  initialTicketEmailNotificationsEnabled: boolean;
}

export function EmailTemplatesSection({
  initialTemplates,
  initialTicketEmailNotificationsEnabled,
}: Props) {
  const [ticketEmailNotificationsEnabled, setTicketEmailNotificationsEnabled] =
    useState(initialTicketEmailNotificationsEnabled);

  return (
    <>
      <EmailSendingSettingsForm
        enabled={ticketEmailNotificationsEnabled}
        onChange={setTicketEmailNotificationsEnabled}
      />
      <EmailTemplatesManager
        initialTemplates={initialTemplates}
        ticketEmailNotificationsEnabled={ticketEmailNotificationsEnabled}
      />
    </>
  );
}
