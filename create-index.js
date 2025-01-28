import { MongoClient } from 'mongodb';
// connect to your Atlas deployment
const client = new MongoClient(process.env.ATLAS_CONNECTION_STRING);
async function run() {
    try {
        const database = client.db("test");
        const collection = database.collection("projects");

        // Define your Atlas Vector Search index
        const index = {
            name: "vector_index",
            type: "vectorSearch",
            definition: {
                "fields": [
                    {
                        "type": "vector",
                        "path": "embedding",
                        "similarity": "cosine",
                        "numDimensions": 768
                    }
                ]
            }
        }
        // Call the method to create the index
        const result = await collection.createSearchIndex(index);
        console.log(result);
    } finally {
        await client.close();
    }
}
run().catch(console.dir);