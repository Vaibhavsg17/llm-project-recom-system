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
        const queryEmbedding = await getEmbedding("this there any project based on machine learning");

        // Define vector search pipeline for description
        const descriptionSearch = {
            $vectorSearch: {
                index: "vector_index",
                queryVector: queryEmbedding,
                path: "description_embedding",
                exact: true,
                limit: 10
            },
        };

        // Define vector search pipeline for title
        const titleSearch = {
            $vectorSearch: {
                index: "vector_index",
                queryVector: queryEmbedding,
                path: "title_embedding",
                exact: true,
                limit: 10
            }
        };

        // Define vector search pipeline for keywords
        const keywordsSearch = {
            $vectorSearch: {
                index: "vector_index",
                queryVector: queryEmbedding,
                path: "keywords_embedding",
                exact: true,
                limit: 10
            }
        };

        // Combine all searches using `$unionWith`
        const pipeline = [
            descriptionSearch,
            { $unionWith: { coll: "projects", pipeline: [titleSearch] } },
            { $unionWith: { coll: "projects", pipeline: [keywordsSearch] } },
            {
                $set: { score: { $meta: "vectorSearchScore" } }
            },
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
        I have retrieved the top 5 most relevant student projects based on a similarity score.below is given data
        
        ${formattedResults}
        
       Based on this data, generate a concise yet informative response that highlights the best-matching projects. Provide a structured summary that:
      1. List the top projects, ordered by their relevance scores.  note dont tell user the score and project numbers
      2. Highlight key features of each project.
      3. Suggest improvements that can be added to enhance each project.
      4. Keep the response concise, well-structured, and easy to understand.
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
