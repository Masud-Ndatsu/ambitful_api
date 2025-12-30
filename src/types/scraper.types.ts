export type OpportunityListingResp = {
  source: 'opportunity_desk';
  total_opportunities: number;
  opportunity_listings: Array<{
    opportunity_id: string;
    link: string;
    title: string;
    opportunity_type: string;
    organization: string;
    locations: string[];
    date_posted: string;
    short_description: string;
    deadline?: string;
    eligibility?: string[];
  }>;
};

export type OpportunityDetailsResp = {
  contactEmail: string;
  duration: string;
  title: string;
  organization: string;
  description: string;
  requirements: string[];
  benefits: string[];
  compensation?: string;
  compensationType?: string;
  locations: string[];
  deadline: string;
  eligibility: string[];
  applicationUrl: string;
  opportunityType?: string;
  experienceLevel?: string;
  isRemote?: boolean;
};
