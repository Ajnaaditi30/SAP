<<<<<<< HEAD
=======
# SAP ERP Error Decoder (Local RAG)

This project now uses a Retrieval-Augmented Generation (RAG) workflow for SAP troubleshooting. It searches the local knowledge base first, retrieves the five strongest matches from a local FAISS index, and only then optionally asks the configured LLM to summarize that context. The LLM is instructed to use no knowledge outside the retrieved documents. If retrieval is not relevant, the API returns `No relevant SAP documentation was found.`

## Structure

- `knowledge_base/sap_errors.json` — 220 structured, generic educational troubleshooting records covering MM, SD, FI, CO, PP, QM, PM, WM, BASIS, ABAP, and Authorization.
- `knowledge_base/error_aliases.json` — real SAP message identifiers mapped to existing knowledge-base record IDs. Both spaced and unspaced forms are accepted.
- `embeddings/` — generated local FAISS index and its metadata. These files are regenerated, not hand-edited.
- `scripts/generate_knowledge_base.js` — reproduces the supplied educational corpus.
- `scripts/build_embeddings.js` — turns the knowledge base into a local FAISS vector index.
- `server/rag/` — embedding, FAISS store, retrieval, prompt, and orchestration modules shared by both backends.

## Setup and ingestion

Install dependencies, then build the index:

```bash
npm install
npm run rag:build
```

The repository includes a generated corpus and index. To recreate the educational corpus before indexing, run:

```bash
npm run rag:generate
npm run rag:build
```

To add a document, append an object to `knowledge_base/sap_errors.json` using the existing required schema (`id`, `error_code`, `module`, `title`, `description`, `business_context`, causes, diagnostic steps, actions, transactions, keywords, and `source`), then run `npm run rag:build`. Keep `source` set to the local document path that supplied the record. To add a known SAP message identifier, add it to `error_aliases.json` and point it at an existing record `id`; rebuilding embeddings is not necessary for alias-only changes.

## Retrieval and responses

Queries are converted into deterministic local embeddings. FAISS retrieves candidates; a lexical reranker improves exact SAP error-code matching. The top five are passed to a concise, source-constrained Groq formatter. Set `GROQ_API_KEY` and optionally `GROQ_MODEL` in `server/.env`; the default Groq-hosted model is `openai/gpt-oss-120b`. If Groq is not configured or unavailable, the service returns the retrieved document directly.

The API returns:

```json
{
  "error_code": "",
  "module": "",
  "meaning": "",
  "possible_causes": [],
  "diagnostic_steps": [],
  "recommended_actions": [],
  "related_transactions": [],
  "confidence": 0.0,
  "sources": ["knowledge_base/sap_errors.json"]
}
```

Confidence is retrieval-derived: above 0.90 is high, 0.70–0.90 is medium, and lower relevant matches are low.

>>>>>>> 6b094ed (Prepare SAP Error Decoder for deployment)
# SAP Error Decoder

A full-stack web application that helps users decode and understand SAP error messages using AI-powered analysis. The application provides detailed explanations of error meanings, causes, fixes, and risk assessments.

## Features

- **AI-Powered Error Analysis**: Uses Groq to format answers from the retrieved SAP knowledge base
- **Error History Tracking**: Stores and retrieves past error analyses
- **User Profile Management**: User authentication and profile features
- **Dark/Light Theme**: Supports system theme preferences with manual toggle
- **System Sync**: Synchronization capabilities across systems
- **Help & Documentation**: Built-in help resources for users

## Project Structure

```
SAP/
├── Dashboard.html          # Standalone dashboard page
├── mainApp.html            # Main application entry
├── NavigationPage.html     # Navigation page
├── Profile.html            # User profile page
├── setting.html            # Settings page
├── settingPages.html       # Additional settings
├── client/                 # Frontend React application
│   ├── public/
│   │   ├── index.html
│   │   ├── Dashboard.html
│   │   ├── mainApp.html
│   │   └── NavigationPage.html
│   └── src/
│       ├── components/     # Reusable React components
│       │   ├── AdminPanelLayout.js
│       │   ├── ErrorOutputFormatter.js
│       │   └── HistoryPanel.js
│       ├── pages/         # Page-level components
│       │   ├── DashboardPage.js
│       │   ├── HelpPage.js
│       │   ├── MainAppPage.js
│       │   ├── NavigationPage.js
│       │   ├── ProfilePage.js
│       │   ├── SettingsPage.js
│       │   └── SystemSyncPage.js
│       ├── utils/         # Utility functions
│       │   ├── historyService.js
│       │   └── userService.js
│       ├── App.js         # Main React component
│       └── index.js       # React entry point
└── server/                # Backend Node.js server
    └── server.js          # Express server with Gemini AI integration
```

## Technology Stack

### Frontend
- **React** - UI framework
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling framework
- **Vite** - Build tool

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **Groq API** - concise response formatting grounded in local SAP knowledge

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (comes with Node.js)
- Groq API key

### Environment Variables

Create a `.env` file in the `server/` directory with the following:

```env
PORT=5000
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
```

### Installation

1. **Clone the repository**
2. **Install server dependencies:**
   ```bash
   cd server
   npm install
   ```
3. **Install client dependencies:**
   ```bash
   cd client
   npm install
   ```

### Running the Application

1. **Start the backend server:**
   ```bash
   cd server
   npm start
   ```

2. **Start the frontend client:**
   ```bash
   cd client
   npm start
   ```

The client will run on `http://localhost:3000` and the server on `http://localhost:5000`.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/decode` | POST | Decode an SAP error message |
| `/api/history` | GET | Get error history |
| `/api/history/:id` | DELETE | Delete history item |
| `/api/user` | GET/POST | User management |

## Security Features

- **PII Detection**: Automatically detects sensitive information in error messages
- **Data Masking**: Masks numbers longer than 4 digits for privacy
- **Input Validation**: Validates API responses for required sections
- **Response Caching**: Caches decoded responses for performance
