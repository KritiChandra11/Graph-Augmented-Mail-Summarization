// Background Service Worker for Chrome Extension

// Import scripts for service worker
importScripts('knowledgeGraph.js', 'llmAnalyzer.js');

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Email Summarizer Extension installed');
  
  // Initialize storage with default values
  chrome.storage.local.get(['apiKey'], (result) => {
    if (!result.apiKey) {
      chrome.storage.local.set({
        apiKey: '',
        summaryHistory: [],
        settings: {
          model: 'google/pegasus-cnn_dailymail',
          autoAnalyze: false
        }
      });
    }
  });
});

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeEmail') {
    handleEmailAnalysis(request.emailData)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'testApiKey') {
    testApiKey(request.apiKey)
      .then(isValid => sendResponse({ success: true, isValid }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'getSummaryHistory') {
    chrome.storage.local.get(['summaryHistory'], (result) => {
      sendResponse({ success: true, history: result.summaryHistory || [] });
    });
    return true;
  }
  
  if (request.action === 'clearHistory') {
    chrome.storage.local.set({ summaryHistory: [] }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

async function handleEmailAnalysis(emailData) {
  try {
    // Get API key from storage
    const { apiKey, settings } = await chrome.storage.local.get(['apiKey', 'settings']);
    
    if (!apiKey) {
      throw new Error('API key not configured. Please add your Hugging Face API key in settings.');
    }

    // Step 1: Build knowledge graph
    console.log('Building knowledge graph...');
    const graphBuilder = new KnowledgeGraphBuilder();
    const knowledgeGraph = graphBuilder.buildGraph(emailData);

    // Step 2: Analyze with LLM
    console.log('Analyzing with LLM...');
    const analyzer = new LLMAnalyzer(apiKey);
    if (settings?.model) {
      analyzer.model = settings.model;
    }
    const analysis = await analyzer.analyzeEmail(emailData, knowledgeGraph);

    // Step 3: Combine results
    const result = {
      email: {
        subject: emailData.subject,
        sender: emailData.sender,
        date: emailData.date,
        platform: emailData.platform
      },
      knowledgeGraph: {
        categories: knowledgeGraph.nodes.categories,
        keywords: knowledgeGraph.nodes.keywords.slice(0, 5),
        urgencyScore: knowledgeGraph.nodes.urgencyIndicators.score,
        actionItemsCount: knowledgeGraph.nodes.actionItems.length,
        senderImportance: knowledgeGraph.nodes.senderImportance.level,
        hasDeadline: knowledgeGraph.nodes.temporalContext.hasDeadline,
        attachments: knowledgeGraph.nodes.attachmentContext.count
      },
      analysis: {
        summary: analysis.summary,
        urgency: analysis.urgency,
        reasoning: analysis.reasoning,
        keyActions: analysis.keyActions,
        confidence: analysis.confidence
      },
      timestamp: new Date().toISOString()
    };

    // Step 4: Save to history
    await saveToHistory(result);

    return result;
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}

async function saveToHistory(result) {
  try {
    const { summaryHistory = [] } = await chrome.storage.local.get(['summaryHistory']);
    
    // Add new result to beginning of array
    summaryHistory.unshift(result);
    
    // Keep only last 50 summaries
    const limitedHistory = summaryHistory.slice(0, 50);
    
    await chrome.storage.local.set({ summaryHistory: limitedHistory });
  } catch (error) {
    console.error('Error saving to history:', error);
  }
}

async function testApiKey(apiKey) {
  try {
    const analyzer = new LLMAnalyzer(apiKey);
    const isValid = await analyzer.testConnection();
    return isValid;
  } catch (error) {
    return false;
  }
}

// Handle errors
chrome.runtime.onError = (error) => {
  console.error('Extension error:', error);
};
