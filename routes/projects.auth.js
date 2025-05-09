import express from "express";
import { MongoClient } from "mongodb";
import axios from "axios";
import { getEmbedding } from "../scripts/get-embeddings.js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// MongoDB connection
const client = new MongoClient(process.env.ATLAS_CONNECTION_STRING);
const database = client.db("test");
const collection = database.collection("projects");

// Groq API Configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// API Endpoint
router.post("/search", async (req, res) => {
    try {
        const { query } = req.body; // Get the query from frontend

        if (!query) return res.status(400).json({ error: "Query is required" });

        await client.connect();

        // Generate embedding for the search query
        const queryEmbedding = await getEmbedding(query);

        // Define vector search pipeline for description, title, and keywords
        const vectorSearch = (path) => ({
            $vectorSearch: {
                index: "vector_index",
                queryVector: queryEmbedding,
                path,
                exact: true,
                limit: 5
            }
        });

        // Combine searches
        const pipeline = [
            vectorSearch("description_embedding"),
            { $unionWith: { coll: "projects", pipeline: [vectorSearch("title_embedding")] } },
            { $unionWith: { coll: "projects", pipeline: [vectorSearch("keywords_embedding")] } },
            { $set: { score: { $meta: "vectorSearchScore" } } },
            { $sort: { score: -1 } },
            { $limit: 5 },
            {
                $project: {
                    _id: 0,
                    title: 1,
                    description: 1,
                    keywords: 1
                }
            }
        ];

        // Run search query
        const results = await collection.aggregate(pipeline).toArray();

        if (results.length === 0) return res.json({ message: "No relevant projects found." });

        // Format results for LLM
        const formattedResults = results.map((doc) =>
            `Title: ${doc.title}\nDescription: ${doc.description}\nKeywords: ${doc.keywords.join(", ")}\n\n`
        ).join("");

        // LLM Prompt
        const prompt = `I retrieved relevant student projects. Here’s the data:

        ${formattedResults}

        Generate a structured summary:
        1. Highlight key features of the top projects.
        2. Suggest improvements for each.
        3. Keep it concise and easy to understand.
        4. give me each data on new line
        
        expected output:
        1. project Summary
        2. then list of each project first give title of project then give summary of project
        3. make the title bold`;

        // Call Groq API
        const groqResponse = await axios.post(GROQ_API_URL, {
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 500
        }, {
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" }
        });  

        // Send response back to frontend
        res.json({ summary: groqResponse.data.choices[0].message.content });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    } finally {
        await client.close();
    }
});

export default router;
