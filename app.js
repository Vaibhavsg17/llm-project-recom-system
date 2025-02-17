import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import vectorSearchRoutes from "./routes/projects.auth.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Use the vector search route
app.use("/api", vectorSearchRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
