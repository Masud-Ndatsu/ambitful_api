import llmPromptBuilder from '../../utils/llm-prompt-builder';

export const extractOpportunityMetadataPrompt = (md: string) => {
  const prompt = llmPromptBuilder
    .addInstruction(
      'You are a smart extraction agent. Given an OpportunityDesk listing page content (converted from HTML to Markdown), extract only valid metadata for opportunities explicitly present in the content. Do not guess or hallucinate missing information.',
      'critical'
    )
    .addContext('Source: OpportunityDesk.org opportunity listings page')
    .addRule('opportunity_id: Extract from the URL slug or ID in the opportunity link')
    .addRule('Do not guess. If a field like deadline is not explicitly in the text, simply set it to null')
    .addRule('total_opportunities: If the total number of opportunities is clearly stated, extract it as a number')
    .addRule('Parse accurately. Be strict and do not fabricate values')
    .addRule('opportunity_type: Can be scholarship, fellowship, internship, job, grant, etc.')
    .addRule('eligibility: Extract any eligibility criteria mentioned')
    .addExample('opportunity_id: "software-engineer-techcorp-2024"')
    .addExample('title: "Software Engineer Position"')
    .addNote('Return only valid JSON. No markdown formatting.')
    .addSection(
      'Response Format',
      `Return the following JSON structure:
{
  "total_opportunities": number,
  "opportunity_listings": [
    {
      "opportunity_id": "string",
      "link": "string",
      "title": "string", 
      "opportunity_type": "string",
      "organization": "string",
      "locations": ["string"],
      "date_posted": "string",
      "short_description": "string",
      "deadline": "string | null",
      "eligibility": ["string"] | null
    }
  ]
}`
    )
    .setVariables({ markdown_content: md })
    .compose();

  return prompt;
};

export const extractOpportunityDetailsPrompt = (md: string) => {
  const prompt = llmPromptBuilder
    .addInstruction(
      'You are a smart extraction agent. Given an OpportunityDesk opportunity full content (converted from HTML to Markdown), extract structured metadata in JSON format. Only extract information that is explicitly stated in the content. Do not guess or hallucinate missing details.',
      'critical'
    )
    .addContext('Source: Complete OpportunityDesk.org opportunity page')
    .addRule('All values must be pulled directly from the text. If something is not clearly mentioned, return null or empty array')
    .addRule('opportunityType can be scholarship, fellowship, internship, job, grant, etc.')
    .addRule('All extracted text must be clean, free of grammatical errors or broken phrasing')
    .addRule('Do not format output as markdown. Return clean, plain JSON only')
    .addRule('Do not infer values. Only extract what is actually present in the opportunity listing')
    .addRule('Extract eligibility criteria from sections that describe who can apply')
    .addRule('Extract requirements from sections that describe what applicants need')
    .addRule('isRemote should be true if the opportunity mentions remote work or virtual participation')
    .addRule('experienceLevel should identify the target experience level: entry-level, mid-level, senior, etc.')
    .addExample('title: "Rhodes Scholarship 2024"')
    .addExample('organization: "Oxford University"')
    .addExample('compensation: "$50,000 annual stipend"')
    .addNote('Focus on accuracy over completeness. Missing data is better than incorrect data.')
    .addSection(
      'Response Format',
      `Return the following JSON structure:
{
  "title": "string",
  "organization": "string", 
  "description": "string",
  "requirements": ["string"],
  "benefits": ["string"],
  "compensation": "string | null",
  "compensationType": "string | null",
  "locations": ["string"],
  "deadline": "string",
  "eligibility": ["string"],
  "applicationUrl": "string",
  "opportunityType": "string | null",
  "experienceLevel": "string | null",
  "isRemote": boolean | null
}`
    )
    .setVariables({ markdown_content: md })
    .compose();

  return prompt;
};
