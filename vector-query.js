import { MongoClient } from 'mongodb';
import axios from 'axios';
import { getEmbedding } from './get-embeddings.js';

// MongoDB connection URI and options
const client = new MongoClient(process.env.ATLAS_CONNECTION_STRING);

// Grok API Configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";  // Update with actual Grok API endpoint

async function run() {
    try {
        await client.connect();
        const database = client.db("test");
        const collection = database.collection("projects");

        // Generate embedding for the search query
        const queryEmbedding = await getEmbedding("mini project");

        // Define vector search pipeline for description
        const descriptionSearch = {
            $vectorSearch: {
                index: "vector_index",
                queryVector: queryEmbedding,
                path: "description_embedding",
                exact: true,
                limit: 5
            }
        };

        // Define vector search pipeline for title
        const titleSearch = {
            $vectorSearch: {
                index: "vector_index",
                queryVector: queryEmbedding,
                path: "title_embedding",
                exact: true,
                limit: 5
            }
        };

        // Define vector search pipeline for keywords
        const keywordsSearch = {
            $vectorSearch: {
                index: "vector_index",
                queryVector: queryEmbedding,
                path: "keywords_embedding",
                exact: true,
                limit: 5
            }
        };

        // Combine all searches using `$unionWith`
        const pipeline = [
            descriptionSearch,
            { $unionWith: { coll: "projects", pipeline: [titleSearch] } },
            { $unionWith: { coll: "projects", pipeline: [keywordsSearch] } },
            {
                $project: {
                    _id: 0,
                    title: 1,
                    description: 1,
                    keywords: 1,
                    score: { $meta: "vectorSearchScore" }
                }
            },
            { $sort: { score: -1 } },
            { $limit: 5 }
        ];

        // Run the aggregation pipeline
        const results = await collection.aggregate(pipeline).toArray();

        if (results.length === 0) {
            console.log("No relevant projects found.");
            return;
        }

        // Format search results for LLM prompt
        const formattedResults = results.map((doc, index) =>
            `Project ${index + 1}:\nTitle: ${doc.title}\nDescription: ${doc.description}\nKeywords: ${doc.keywords.join(", ")}\n\n`
        ).join("");

        // Define the prompt for the LLM
        const prompt = `
        Based on the following relevant projects, provide a response that best summarizes and recommends a suitable project:
        
        ${formattedResults}
        
        Please generate a concise and informative response.
        `;

        // Call the Grok API
        const groqResponse = await axios.post(GROQ_API_URL, {
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 500
        }, {
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" }
        });

        // Display the LLM response
        console.log("\nGenerated Response from LLM:\n", groqResponse.data.choices[0].message.content);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await client.close();
    }
}

run().catch(console.dir);
