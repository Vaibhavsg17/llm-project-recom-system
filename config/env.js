import { config } from 'dotenv';

config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` });

export const { PORT, NODE_ENV, ATLAS_CONNECTION_STRING, GROQ_API_KEY, HF_API_KEY } = process.env;