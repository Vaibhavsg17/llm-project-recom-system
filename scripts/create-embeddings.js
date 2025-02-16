import { MongoClient } from 'mongodb';
import { getEmbedding } from '../get-embeddings.js';

// Connect to your Atlas cluster
const client = new MongoClient(process.env.ATLAS_CONNECTION_STRING);

async function run() {
    try {
        await client.connect();
        const db = client.db("test");
        const collection = db.collection("projects");

        // Filter to exclude null or empty description fields
        const filter = { "description": { "$exists": true, "$ne": "" } };

        // Get a subset of documents from the collection
        const documents = await collection.find(filter).toArray();

        let updatedDocCount = 0;
        console.log("Generating embeddings for documents...");

        await Promise.all(documents.map(async doc => {
            try {
                // Generate embeddings for each field
                const titleEmbedding = doc.title ? await getEmbedding(doc.title) : null;
                const descriptionEmbedding = doc.description ? await getEmbedding(doc.description) : null;
                const keywordsEmbedding = doc.keywords ? await getEmbedding(doc.keywords.join(" ")) : null;

                // Prepare the update object
                const updateFields = {};
                if (titleEmbedding) updateFields["title_embedding"] = titleEmbedding;
                if (descriptionEmbedding) updateFields["description_embedding"] = descriptionEmbedding;
                if (keywordsEmbedding) updateFields["keywords_embedding"] = keywordsEmbedding;

                // Update the document only if at least one embedding is generated
                if (Object.keys(updateFields).length > 0) {
                    await collection.updateOne({ "_id": doc._id }, { "$set": updateFields });
                    updatedDocCount += 1;
                }
            } catch (error) {
                console.error(`Failed to generate embedding for project: ${doc._id}`, error);
            }
        }));

        console.log("Count of documents updated: " + updatedDocCount);
    } catch (err) {
        console.log(err.stack);
    } finally {
        await client.close();
    }
}

run().catch(console.dir);
