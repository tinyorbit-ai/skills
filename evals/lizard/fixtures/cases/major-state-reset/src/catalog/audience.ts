export interface AudienceFilter {
  key: "eventId" | "active";
  value: string;
}

export interface CampaignAudience {
  mode: "legacy" | "builder";
  filters: AudienceFilter[];
}

export function createEventAudience(eventId: string): CampaignAudience {
  return {
    mode: "legacy",
    filters: [
      { key: "eventId", value: eventId },
      { key: "active", value: "true" },
    ],
  };
}

export function switchToAudienceBuilder(
  audience: CampaignAudience,
): CampaignAudience {
  return {
    ...audience,
    mode: "builder",
    filters: [],
  };
}
