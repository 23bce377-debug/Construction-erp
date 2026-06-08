# ConstructionOS: AI Platform Architecture

## Overview
The AI layer enhances decision-making by analyzing the vast amount of operational data generated within the ERP. It moves the system from reactive to predictive.

## Key Modules

### 1. Cost & Delay Prediction
- **Model:** Time-series forecasting trained on historical Activity durations and budget variances.
- **Function:** Analyzes current progress rates and weather API data to predict if a project will exceed its timeline or budget.

### 2. Automated Document Extraction (OCR + LLM)
- **Model:** Vision-language models (e.g., Claude 3 Haiku or Gemini Flash).
- **Function:** When a Vendor uploads an Invoice or a Delivery Challan, the AI extracts the PO Number, Invoice Amount, and GST details, auto-populating the data entry form.

### 3. Generative Reporting
- **Function:** Automatically drafts the narrative summary for Weekly Management Reports based on the week's DPR entries, blocker logs, and financial milestones.

## AI Infrastructure

1. **RAG (Retrieval-Augmented Generation) Architecture:**
   - Used for the "ConstructionOS Assistant" which can answer queries like "What is the status of the concrete pour on Tower A?"
   - Documents and project metadata are embedded using a fast embedding model.
   - Vectors are stored directly in Supabase using the `pgvector` extension.

2. **Model Routing:**
   - Lightweight tasks (OCR extraction, text summarization) route to fast, cost-effective models.
   - Complex reasoning (Schedule optimization analysis) routes to advanced reasoning models.

3. **Edge Deployment:**
   - AI orchestration happens in Supabase Edge Functions to ensure low latency and isolated processing without bogging down the primary application servers.