import llmPromptBuilder from '../../utils/llm-prompt-builder';

export const extractOpportunityMetadataPrompt = (md: string) => {
  const prompt = llmPromptBuilder
    .addInstruction(
      'You are a smart extraction agent. Given an OpportunityDesk listing page\'s content (converted from HTML to Markdown), extract only valid metadata for opportunities explicitly present in the content. Do not guess or hallucinate missing information.'
    )
    .addPlainText('Here is the provided markdown:')
    .addCustomBlock('opportunity_markdown_content', md)
    .addRule(
      `- opportunity_id: Extract from the URL slug or ID in the opportunity link.
- Do not guess. If a field like deadline is not explicitly in the text, simply set it to null.
- total_opportunities: If the total number of opportunities is clearly stated, extract it as a number.
- Parse accurately. Be strict and do not fabricate values.
- opportunity_type: Can be scholarship, fellowship, internship, job, grant, etc.
- eligibility: Extract any eligibility criteria mentioned.`
    )
    .addCustomBlock(
      'response_format',
      `
Return the following JSON structure:
{
  "total_opportunities": number,
  "opportunity_listings": [
    {
      "opportunity_id": "string",  // Extract from URL or unique identifier
      "link": "string",    // Full opportunity link or relative path
      "title": "string",
      "opportunity_type": "string",  // scholarship, fellowship, internship, job, etc.
      "organization": "string",
      "locations": ["string"],  // Array of locations
      "date_posted": "string",
      "short_description": "string",
      "deadline": "string | null",  // Application deadline if mentioned
      "eligibility": ["string"] | null  // Eligibility criteria if mentioned
    }
  ]
}
`
    )
    .compose();

  return prompt;
};

export const extractOpportunityDetailsPrompt = (md: string) => {
  const prompt = llmPromptBuilder
    .addInstruction(
      'You are a smart extraction agent. Given an OpportunityDesk opportunity\'s full content (converted from HTML to Markdown), extract structured metadata in JSON format. Only extract information that is explicitly stated in the content. Do not guess or hallucinate missing details.'
    )
    .addPlainText('Here is the provided markdown:')
    .addCustomBlock('opportunity_markdown_content', md)
    .addRule(
      `- All values must be pulled directly from the text. If something is not clearly mentioned, return null (for nullable fields) or an empty array (for list-type fields).
- "opportunityType" can be scholarship, fellowship, internship, job, grant, etc.
- All extracted text must be clean, free of grammatical errors or broken phrasing.
- Do not format output as markdown. Return clean, plain JSON only.
- Do not infer values. Only extract what is actually present in the opportunity listing.
- Extract eligibility criteria from sections that describe who can apply.
- Extract requirements from sections that describe what applicants need.
- "isRemote" should be true if the opportunity mentions remote work or virtual participation.
- "experienceLevel" should identify the target experience level: entry-level, mid-level, senior, etc.`
    )
    .addCustomBlock(
      'response_format',
      `
Return the following JSON structure:

{
  "title": "string",  // The opportunity title
  "organization": "string",  // Organization or institution name
  "description": "string",  // Full description of the opportunity
  "requirements": ["string"],  // Required qualifications or criteria
  "benefits": ["string"],  // Benefits or what the opportunity offers
  "compensation": "string | null",  // Financial compensation if mentioned
  "compensationType": "string | null",  // Type of compensation: stipend, salary, etc.
  "locations": ["string"],  // Locations where opportunity is available
  "deadline": "string",  // Application deadline
  "eligibility": ["string"],  // Who is eligible to apply
  "applicationUrl": "string",  // URL to apply or more information
  "opportunityType": "string | null",  // scholarship, fellowship, internship, etc.
  "experienceLevel": "string | null",  // Target experience level
  "isRemote": boolean | null  // Whether it's remote/virtual opportunity
}
`
    )
    .compose();

  return prompt;
};
