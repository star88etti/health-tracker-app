import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  try {
    const modelsResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1/models",
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
      }
    );

    const data = await modelsResponse.json();

    if (data.models) {
      console.log("✅ Available models:");
      for (const model of data.models) {
        console.log(`- ${model.name} | supports: ${model.supportedGenerationMethods}`);
      }
    } else {
      console.log("⚠️ No models returned. Response:", data);
    }
  } catch (err) {
    console.error("❌ Failed to list models:", err);
  }
}

run();
