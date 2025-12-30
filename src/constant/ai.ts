import { config } from '../config/envars';
import OpenAI from 'openai';

// Initialize OpenAI client
const openaiClient = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

export const OPENAI_MODEL = 'gpt-4o';

export default openaiClient;
