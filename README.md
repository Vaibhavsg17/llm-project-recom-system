# AI-Powered Project Recommendation System  

## 📌 Overview  
This AI-powered project recommendation system helps users discover relevant projects based on their interests. It utilizes **LLMs (Large Language Models), MongoDB Vector Search, Groq API, and Ollama Model** to provide personalized suggestions with insightful summaries and improvement recommendations.  

## 🚀 Features  
✅ AI-based **project recommendations** using vector similarity search.  
✅ **LLM-powered summaries** for project insights.  
✅ **Enhancement suggestions** for project advancements.  
✅ **Efficient similarity search** with MongoDB vector indexing.  

## 🔧 How It Works  
1. **User Input:**  
   - Users enter project-related queries or details.  
2. **Embedding Creation:**  
   - The system generates vector embeddings for the projects and stores them in **MongoDB with vector search capabilities**.  
3. **Similarity Search:**  
   - When a user searches for a project, a **vector similarity search** retrieves the most relevant projects.  
4. **LLM-Powered Enhancement:**  
   - The retrieved results are passed to an **LLM (using Groq API / Ollama Model)**, which:  
     - Summarizes key features of the recommended projects.  
     - Suggests possible improvements and advancements for each project.  
5. **Final Output:**  
   - Users receive a **detailed project summary with improvement suggestions**, making it easier to refine or build upon existing ideas.  

## 🛠️ Tech Stack  
- **LLM**: Groq API / Ollama Model  
- **Database**: MongoDB (with Vector Search)  
- **Embedding Model**: `@xenova/transformers`
- **Frontend**: React.js
- **Backend**: Node.js   
- **Search Mechanism**: MongoDB Vector Similarity Search  

<!--
## 📌 Future Enhancements  
- Integrating **real-time user feedback** to improve recommendations.  
- Expanding the embedding model for **better semantic understanding**.  
- Implementing **multi-modal support** (text + images).  
- Fine-tuning the LLM to provide **domain-specific suggestions**. -->

