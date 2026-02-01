# Graph-Augmented Email Summarizer - Chrome/Edge Extension

## 📧 Overview

This browser extension performs **graph-augmented abstractive email summarization** and **urgency classification** for Gmail and Outlook using advanced AI techniques. It constructs a semantic knowledge graph from email content and leverages **Google's Pegasus model** via **Hugging Face Inference API (Free Tier)** for intelligent abstractive summarization combined with graph-based urgency classification.

## 🎯 Features

### Core Functionality
- **Automatic Email Extraction**: Reads emails directly from Gmail/Outlook web clients using DOM-based automation
- **Semantic Knowledge Graph**: Extracts and structures:
  - Email categories (meeting, financial, project, etc.)
  - Important keywords with frequency analysis
  - Sender importance levels (executive, management, standard, automated)
  - Urgency indicators and patterns
  - Action items and deadlines
  - Temporal context and attachment analysis
  
- **AI-Powered Analysis**:
  - **Abstractive Summarization**: Generates rephrased summaries (not extractive)
  - **Urgency Classification**: URGENT vs NON-URGENT with reasoning
  - **Prompt Engineering**: Injects knowledge graph context into LLM
  - **Confidence Scoring**: Provides reliability metrics

### Technical Features
- ✅ No backend server required
- ✅ Privacy-preserving (local processing + API calls)
- ✅ Chrome Manifest V3 compliant
- ✅ Local storage for summary history
- ✅ Multiple LLM model support

## 🛠️ Technology Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | HTML, CSS, JavaScript |
| **Browser APIs** | Chrome Extension API (Manifest V3) |
| **LLM Provider** | Hugging Face Inference API (Free Tier) |
| **Models** | Google Pegasus (pegasus-cnn_dailymail) |
| **Storage** | Chrome Local Storage API |
| **Content Extraction** | DOM Parsing, CSS Selectors |

## 📦 Installation

### Prerequisites
1. **Hugging Face API Key**: Get a free API key from [Hugging Face](https://huggingface.co/settings/tokens)
2. **Chrome or Edge Browser**: Version 88 or higher

### Steps

1. **Clone or Download** this repository:
   ```bash
   git clone <repository-url>
   cd extension
   ```

2. **Load Extension in Chrome/Edge**:
   - Open Chrome/Edge and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right)
   - Click **Load unpacked**
   - Select the `extension` folder

3. **Configure API Key**:
   - Click the extension icon in your browser toolbar
   - Click the ⚙️ Settings button
   - Enter your Hugging Face API key
   - Click "Test Connection" to verify
   - Click "Save Settings"

## 🚀 Usage

1. **Open an Email**:
   - Navigate to Gmail or Outlook web client
   - Open a single email (not inbox view)

2. **Analyze Email**:
   - Click the extension icon
   - Click "🤖 Analyze Email"
   - Wait for AI analysis (typically 3-10 seconds)

3. **View Results**:
   - **Urgency Classification**: See if email is URGENT or NON-URGENT
   - **Reasoning**: Understand why the classification was made
   - **Abstractive Summary**: Read the AI-generated summary
   - **Key Actions**: View extracted action items
   - **Knowledge Graph**: Explore semantic analysis insights

4. **Additional Features**:
   - **Copy Summary**: Export results to clipboard
   - **View History**: Access past analyses
   - **Settings**: Change LLM model or update API key

## 🏗️ Project Structure

```
extension/
├── manifest.json              # Extension configuration (Manifest V3)
├── content.js                 # Email extraction from Gmail/Outlook
├── background.js              # Service worker orchestration
├── knowledgeGraph.js          # Semantic graph builder
├── llmAnalyzer.js            # Together AI integration
├── popup.html                 # Extension UI
├── popup.js                   # UI logic and event handling
├── popup.css                  # Styling
├── icons/                     # Extension icons (16x16, 48x48, 128x128)
└── README.md                  # This file
```

## 🧠 How It Works

### Architecture Flow

```
1. Email Extraction (content.js)
   ↓ Extract subject, body, sender, date, attachments
   
2. Knowledge Graph Construction (knowledgeGraph.js)
   ↓ Build semantic nodes: categories, keywords, urgency indicators, actions
   
3. LLM Analysis (llmAnalyzer.js)
   ↓ Pegasus generates abstractive summary → Graph-based urgency classification
   
4. Result Display (popup.js/html)
   ↓ Show summary, urgency, reasoning, graph insights
   
5. Storage (background.js)
   ↓ Save to local history
```

### Knowledge Graph Nodes

The system extracts these semantic nodes:

1. **Categories**: meeting, financial, project, HR, support, sales, admin, social
2. **Keywords**: Top 10 important terms with frequency scores
3. **Urgency Indicators**: Pattern matching for urgent/time-sensitive language
4. **Action Items**: Detected tasks with priority scores
5. **Sender Importance**: Executive, management, standard, or automated
6. **Temporal Context**: Deadlines, dates, meeting times
7. **Attachment Context**: File types and counts

### Prompt Engineering

The LLM receives structured context:
- Email metadata (subject, sender, date)
- Full email body
- All knowledge graph nodes with scores
- Specific instructions for abstractive summarization
- JSON response format specification

## 🔧 Configuration Options

### Model Information

**Pegasus CNN/DailyMail**
- **Model ID**: `google/pegasus-cnn_dailymail`
- **Provider**: Hugging Face Inference API (Free Tier)
- **Specialization**: Abstractive text summarization
- **Training**: Fine-tuned on CNN/DailyMail dataset
- **Strengths**: Excellent at generating concise, rephrased summaries

### Urgency Classification

Urgency is determined using **graph-based analysis** considering:
- Urgency indicator patterns and scores
- Sender importance level
- Deadline and temporal context
- Action item priorities
- Email category urgency correlation

## 📊 Academic Relevance

### Final Year Project Components

✅ **AI/ML Integration**: LLM-based NLP with prompt engineering  
✅ **Graph Theory**: Semantic knowledge graph construction  
✅ **Information Retrieval**: Email content extraction and parsing  
✅ **Classification**: Binary urgency classification with reasoning  
✅ **NLP Techniques**: Abstractive summarization, keyword extraction  
✅ **Software Engineering**: Chrome extension development, API integration  
✅ **Privacy**: No training required, local processing

### Research Paper Potential

- Graph-augmented LLM prompting for email analysis
- Comparative study of extractive vs abstractive email summarization
- Knowledge graph impact on LLM reasoning accuracy
- Urgency classification using semantic patterns

## 🔐 Privacy & Security

- **No Data Storage on External Servers**: All processing happens locally or via direct API calls
- **API Key Security**: Stored locally in browser storage
- **No Email Tracking**: Extension only processes opened emails on-demand
- **No Training Data**: Uses pre-trained models only

## 🐛 Troubleshooting

### Common Issues

**"Please open a single email to analyze"**
- Solution: Navigate to a specific email (not inbox list view)

**"API key not configured"**
- Solution: Add your Hugging Face API key in Settings

**"Could not extract email data"**
- Solution: Ensure you're on Gmail or Outlook web client
- Wait for email to fully load before analyzing

**Extension not appearing**
- Solution: Check `chrome://extensions/` for errors
- Reload extension after code changes

### Debugging

Enable console logging:
```javascript
// In Chrome DevTools (F12)
// Extension popup console: Right-click extension → Inspect popup
// Background script: chrome://extensions/ → Service worker → Inspect
// Content script: Inspect webpage console
```

## 📝 Future Enhancements

- [ ] Support for additional email platforms (Yahoo, ProtonMail)
- [ ] Multi-language support
- [ ] Email threading analysis
- [ ] Sentiment analysis integration
- [ ] Custom urgency rule configuration
- [ ] Export to PDF/CSV
- [ ] Chrome sync for API key across devices

## 📄 License

This project is created for academic purposes as a final-year project.

## 👥 Credits

- **LLM Provider**: [Hugging Face](https://huggingface.co/)
- **Model**: Google Pegasus (pegasus-cnn_dailymail)
- **Framework**: Chrome Extension API (Manifest V3)

## 📧 Support

For issues or questions:
1. Check the Troubleshooting section
2. Review Chrome extension console for errors
3. Verify API key is valid at Together AI dashboard

---

**Note**: This extension requires an active internet connection for LLM API calls. Email content is sent to Hugging Face for processing. Review their privacy policy if handling sensitive information.
