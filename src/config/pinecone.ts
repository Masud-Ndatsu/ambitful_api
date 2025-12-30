import { Pinecone } from '@pinecone-database/pinecone';
import { config } from './envars';

let pineconeInstance: Pinecone | null = null;

export const initializePinecone = async (): Promise<Pinecone> => {
  if (!pineconeInstance) {
    pineconeInstance = new Pinecone({
      apiKey: config.PINECONE_API_KEY,
    });
  }
  return pineconeInstance;
};

export const getPineconeClient = (): Pinecone => {
  if (!pineconeInstance) {
    throw new Error('Pinecone client not initialized. Call initializePinecone() first.');
  }
  return pineconeInstance;
};