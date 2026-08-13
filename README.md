# Enterprise Policy Assistant

An AI-powered enterprise policy assistant that uses Retrieval-Augmented Generation (RAG) to answer questions from company policy documents.

## Overview

The Enterprise Policy Assistant allows users to ask questions about organizational policies such as:

- Insurance policies
- Leave policies
- Travel policies

The application retrieves relevant information from the policy documents and uses Google Gemini to generate a clear, context-aware answer.

## Key Features

- AI-powered policy question answering
- Retrieval-Augmented Generation (RAG)
- Policy document ingestion and processing
- Vector search using Pinecone
- Google Gemini for response generation
- FastAPI backend
- Simple web-based frontend
- Environment-variable based API key configuration

## Project Structure

```text
enterprise-policy-assistant/
│
├── backend/
│   ├── ingest.py
│   └── main.py
│
├── documents/
│   ├── insurance.txt
│   ├── leave_policy.txt
│   └── travel_policy.txt
│
├── frontend/
│   ├── app.js
│   ├── index.html
│   └── styles.css
│
├── .env
├── .gitignore
├── pyrightconfig.json
├── requirements.txt
└── README.md
```

> The `.env` file contains secret API credentials and must never be committed to GitHub.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python, FastAPI |
| LLM | Google Gemini |
| Vector Database | Pinecone |
| Server | Uvicorn |
| Environment Management | Python `.env` variables |

## How It Works

```text
Policy Documents
       ↓
Document Ingestion
       ↓
Text Processing / Embeddings
       ↓
Pinecone Vector Database
       ↓
User Question
       ↓
Relevant Policy Retrieval
       ↓
Google Gemini
       ↓
AI-generated Policy Answer
```

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/sowmya06042005/enterprise-policy-assistant.git
cd enterprise-policy-assistant
```

### 2. Create and activate a virtual environment

On Windows PowerShell:

```powershell
python -m venv venv
.
env\Scripts\Activate.ps1
```

### 3. Install dependencies

```powershell
pip install -r requirements.txt
```

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=enterprise-policy-index
```

Never upload real API keys to GitHub.

## Run the Backend

From the project root:

```powershell
.
env\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8001
```

The backend will be available at:

```text
http://127.0.0.1:8001
```

## Document Ingestion

The policy documents are stored in the `documents/` folder.

The ingestion script prepares the documents and stores the required vector information in Pinecone.

Run:

```powershell
.
env\Scripts\python.exe backend/ingest.py
```

Run ingestion again whenever the source policy documents are changed and the vector index needs to be updated.

## Frontend

Open the frontend using the project's configured local development method, or serve the `frontend` directory with a local web server.

The frontend communicates with the FastAPI backend to submit policy questions and display the generated answers.

## Example Questions

Users can ask questions such as:

- What is the company's leave policy?
- How many days of leave can an employee take?
- What does the insurance policy cover?
- What are the rules for business travel?

The assistant retrieves relevant policy information before generating the response.

## Security

API keys are stored in `.env` and excluded from version control using `.gitignore`.

**Important:** Never place Gemini or Pinecone API keys directly in Python, JavaScript, HTML, CSS, or README files.

If an API key is accidentally exposed, revoke/rotate it immediately.

## Future Enhancements

- User authentication
- Conversation history
- Support for PDF and DOCX policy documents
- Source citations for retrieved policy sections
- Admin dashboard for uploading policies
- Improved document chunking and retrieval
- Deployment to a cloud platform
- Role-based access control

## Project Purpose

This project demonstrates the practical use of:

- Generative AI
- Retrieval-Augmented Generation
- Vector databases
- API development
- Full-stack web development
- Enterprise document question answering

## Author

**Sowmya**

Enterprise Policy Assistant — AI-powered policy information and question-answering system.
