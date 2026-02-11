# ASCEND AI 🚀

### Your AI-Powered Career Co-pilot

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MVP Link](https://img.shields.io/badge/MVP-Live-green)](https://disha-darshak-ai--disha-darshak.us-central1.hosted.app/)
[![YouTube](https://img.shields.io/badge/You-Tube-red)](https://youtu.be/YG8UiRUhUME?si=YHVVGvXRZKEQVD0R)

**ASCEND AI** is a comprehensive, AI-driven web application designed to guide students and early-career professionals through the complexities of career planning. It transforms overwhelming choices into a clear, personalized, and actionable journey, leveraging the power of **Google's Vertex AI** and **Genkit Agentic workflows** to provide expert-level guidance at scale.

---

## 📍 Table of Contents

- [The Problem We Solve](#-the-problem-we-solve)
- [Key Features](#-key-features)
- [Live Demo](#-live-demo)
- [Technology Stack](#-technology-stack)
- [🧠 AI, Genkit & Agents](#-ai-genkit--agents)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Future Roadmap](#-future-roadmap)
- [License](#-license)

---

## 🧩 The Problem We Solve

Navigating the early stages of a career is often a confusing and stressful experience. Young professionals face a flood of information, unclear career paths, and immense pressure to make the "right" decisions. ASCEND AI addresses these pain points by providing a centralized platform that offers:

-   **Clarity over Confusion:** Replacing guesswork with data-driven, personalized recommendations.
-   **Agentic Intelligence:** Moving beyond static advice to active assistance using AI agents that research, verify, and build content for you.
-   **Confidence Building:** Offering tools to practice and prepare for real-world challenges like interviews and resume filtering.
-   **Actionable Guidance:** Moving beyond simple advice to provide structured, step-by-step roadmaps.

---

## ✨ Key Features

-   **💼 CV Forge (Agentic Resume Builder):** 
    -   **Agentic Search Capability:** Powered by **Google Search grounding**, our AI agents actively browse the web to understand specific job roles, company cultures, and industry keywords tailored to your specific job link or target role.
    -   **Autonomous Refinement:** The system uses a multi-stage agentic workflow to draft, critique, and refine resume content specifically for high-score ATS (Applicant Tracking System) compatibility.
    -   **Context-Aware Tailoring:** Paste a job link or description, and the Agent will scour the web for context to tailor your resume specifically for that opportunity.
    -   **PDF Import & Style Transfer:** "Reads" your existing PDF resume using Vision models to extract content and visual styling preferences (alignment, fonts, density), allowing you to reformat or update without losing your personal brand.

-   **📝 AI Skill-set Finder:**
    -   A multi-step assessment that analyzes a user's skills and interests to recommend the top 3 career paths.
    -   Generates a detailed, personalized roadmap for the user's chosen role, including skills to develop, learning resources, and project ideas.

-   **🔥 TorchMyResume (Rank & Roast):**
    -   **Rank:** Upload a resume and get an instant, AI-generated score on its effectiveness for a specific job role, complete with strengths, weaknesses, and missing keywords.
    -   **Roast:** Get brutally honest, humorous, and surprisingly insightful feedback to make your resume stand out in a sea of generic templates.

-   **🤖 AI Mock Interview:**
    -   A realistic voice-enabled interview simulation tailored to a specific job role and difficulty level.
    -   Utilizes **Google Cloud Text-to-Speech** and **Speech-to-Text** for real-time interaction.
    -   Delivers a comprehensive evaluation post-interview, including a soft-skill score and detailed feedback on every answer.

-   **💬 AI Career Advisor Chat:**
    -   A context-aware chatbot that uses the user's saved resume and profile data to provide personalized advice on demand.

-   **📊 Live Job Trends:**
    -   Fetches and displays real-time job market data, helping users understand which career fields are currently in high demand via interactive dashboards.

-   **👤 Comprehensive User Profile:**
    -   A central dashboard that stores a user's personal details, chosen career path, and a complete history of all their assessments, resume reviews, and mock interviews.

---

## 🌐 Live Demo

Check out the live, deployed version of the application here:
**[Ascend AI Live MVP](https://disha-darshak-ai--disha-darshak.us-central1.hosted.app/)**

---

## 🛠️ Technology Stack

This project is built with a modern, scalable, and type-safe technology stack.

-   **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn/UI, Framer Motion.
-   **PDF Engine:** `pdfmake` & `html-to-pdfmake` for dynamic client-side resume generation.
-   **AI Framework:** **Google Genkit** (Orchestration & Agentic Workflows).
-   **Generative AI Models:** 
    -   **Gemini 1.5 Pro:** Complex reasoning, PDF Vision analysis, and structured JSON generation.
    -   **Gemini 1.5 Flash:** High-speed chat interactions and agentic reasoning.
-   **AI Tools:** Vertex AI Google Search Grounding & Google Cloud TTS.
-   **Backend/Database:** Firebase Realtime Database & Firebase Authentication.
-   **Deployment:** Firebase Hosting & App Hosting.

---

## 🧠 AI, Genkit & Agents

ASCEND AI utilizes **Google Genkit** to orchestrate sophisticated AI flows. We employ a mix of standard RAG (Retrieval-Augmented Generation) and **Agentic Workflows**:

-   **`cv-forge-flow.ts` (Agentic):**
    -   Utilizes a **Search Tool** to browse live internet data regarding job descriptions.
    -   Implements a "Refiner Agent" loop where the AI critiques its own markdown generation against user constraints before finalizing output.
    -   Uses Vision capabilities to extract layout styles (fonts, spacing, density) from uploaded PDFs.
-   **`mock-interview-flow.ts`:**
    -   Manages a stateful, multi-turn conversational interview, acting as a strict but fair interviewer persona.
-   **`path-finder.ts`:**
    -   Analyzes multi-dimensional quiz answers to generate initial career recommendations and comprehensive roadmaps.

---

## 🚀 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later)
-   A Firebase project with Auth and Realtime Database enabled.
-   A Google Cloud Project with Vertex AI API enabled.

### Local Setup

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/thehimanshubansal/Ascend-AI.git
    cd Ascend-AI
    ```

2.  **Install NPM packages:**
    ```sh
    npm install
    ```

3.  **Set up environment variables:**
    -   Create a `.env` file in the root directory.
    -   Add your Firebase and Google Cloud keys:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=your_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
    NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_database_url

    GOOGLE_CLOUD_PROJECT_ID=your_gcp_id
    GOOGLE_CLOUD_LOCATION=us-central1
    GNEWS_API_KEY=your_gnews_api_key
    ```

4.  **Google Cloud Authentication:**
    -   Authenticate your local environment: `gcloud auth application-default login`.

5.  **Run the development server:**
    ```sh
    npm run dev
    ```
    Access the app at `http://localhost:3000`.

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---


