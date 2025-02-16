import { MongoClient } from 'mongodb';
import { getEmbedding } from './get-embeddings.js';

const client = new MongoClient(process.env.ATLAS_CONNECTION_STRING);

async function runWatcher() {
    try {
        await client.connect();
        const db = client.db("test");
        const collection = db.collection("projects");

        console.log("Watching for new documents...");

        // Watch for new inserts
        const changeStream = collection.watch([{ $match: { operationType: "insert" } }]);

        changeStream.on("change", async (change) => {
            try {
                const doc = change.fullDocument;
                console.log("New project detected:", doc.title);

                // Generate embeddings
                const titleEmbedding = doc.title ? await getEmbedding(doc.title) : null;
                const descriptionEmbedding = doc.description ? await getEmbedding(doc.description) : null;
                const keywordsEmbedding = doc.keywords ? await getEmbedding(doc.keywords.join(" ")) : null;

                // Update MongoDB with embeddings
                const updateFields = {};
                if (titleEmbedding) updateFields["title_embedding"] = titleEmbedding;
                if (descriptionEmbedding) updateFields["description_embedding"] = descriptionEmbedding;
                if (keywordsEmbedding) updateFields["keywords_embedding"] = keywordsEmbedding;

                if (Object.keys(updateFields).length > 0) {
                    await collection.updateOne({ _id: doc._id }, { $set: updateFields });
                    console.log("Updated embeddings for:", doc.title);
                }
            } catch (error) {
                console.error("Error processing document:", error);
            }
        });
    } catch (err) {
        console.error(err);
    }
}

runWatcher().catch(console.dir);
