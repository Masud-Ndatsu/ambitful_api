import { config } from '../config/envars';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini client
const geminiClient = new GoogleGenAI({ apiKey: config.GEN_API_KEY });

export const GEMINI_MODEL = 'gemini-2.5-flash';

export default geminiClient;
