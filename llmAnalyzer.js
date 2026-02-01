// LLM Integration with Hugging Face Inference API for Email Summarization and Urgency Classification

class LLMAnalyzer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://router.huggingface.co/hf-inference/models/';
    // Using Pegasus model specifically designed for abstractive summarization
    this.model = 'google/pegasus-cnn_dailymail';
  }

  async analyzeEmail(emailData, knowledgeGraph) {
    if (!this.apiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    // Generate prompt with knowledge graph context
    const prompt = this.constructPrompt(emailData, knowledgeGraph);

    try {
      // First API call: Generate summary using Pegasus
      const summaryResponse = await fetch(this.baseUrl + this.model, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: emailData.body.substring(0, 1024) // Pegasus limit
        })
      });

      if (!summaryResponse.ok) {
        const errorText = await summaryResponse.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: errorText };
        }
        
        // Provide helpful error messages
        if (summaryResponse.status === 401) {
          throw new Error('Invalid API key. Please check your Hugging Face token in Settings.');
        } else if (summaryResponse.status === 403) {
          throw new Error('Access denied. Ensure your Hugging Face token has read permissions.');
        } else if (summaryResponse.status === 503) {
          throw new Error('Model is loading. Please wait 20-30 seconds and try again.');
        }
        throw new Error(`API error (${summaryResponse.status}): ${errorData.error || 'Unknown error'}`);
      }

      const summaryData = await summaryResponse.json();
      
      // Handle model loading state
      if (summaryData.error && summaryData.error.includes('loading')) {
        throw new Error('Model is loading. Please wait 20-30 seconds and try again.');
      }
      
      const summary = summaryData[0]?.summary_text || summaryData[0]?.generated_text || 'Unable to generate summary';

      // Analyze urgency using knowledge graph (rule-based)
      const urgencyAnalysis = this.analyzeUrgency(knowledgeGraph);

      return {
        summary: summary,
        urgency: urgencyAnalysis.urgency,
        reasoning: urgencyAnalysis.reasoning,
        keyActions: this.extractKeyActions(knowledgeGraph),
        confidence: urgencyAnalysis.confidence
      };
    } catch (error) {
      console.error('LLM Analysis Error:', error);
      throw error;
    }
  }

  getSystemPrompt() {
    return `You are an expert email analysis assistant that uses semantic knowledge graphs to understand email content. Your task is to:

1. Generate a purely ABSTRACTIVE summary (do not copy sentences verbatim)
2. Classify urgency as URGENT or NON-URGENT with clear reasoning
3. Use the provided knowledge graph context to inform your analysis

Guidelines:
- Abstractive summary: Rephrase and synthesize information in your own words (2-3 sentences)
- Consider sender importance, detected urgency indicators, action items, and temporal context
- Provide clear, specific reasoning for urgency classification
- Focus on the core message and required actions
- Be concise and professional

Response Format (JSON):
{
  "summary": "Your abstractive summary here",
  "urgency": "URGENT" or "NON-URGENT",
  "reasoning": "Detailed explanation of urgency classification",
  "keyActions": ["action 1", "action 2"],
  "confidence": 0.0-1.0
}`;
  }

  constructPrompt(emailData, knowledgeGraph) {
    const kg = knowledgeGraph.nodes;
    
    return `Analyze this email using the semantic knowledge graph provided:

EMAIL METADATA:
- Subject: ${emailData.subject}
- From: ${emailData.sender.name} <${emailData.sender.email}>
- Date: ${emailData.date}
- Platform: ${emailData.platform}

EMAIL BODY:
${emailData.body.substring(0, 2000)}${emailData.body.length > 2000 ? '...' : ''}

KNOWLEDGE GRAPH CONTEXT:

1. CATEGORIES (semantic classification):
${kg.categories.map(c => `   - ${c.name} (confidence: ${c.confidence.toFixed(2)})`).join('\n')}

2. KEY CONCEPTS (extracted keywords):
${kg.keywords.slice(0, 5).map(k => `   - "${k.word}" (importance: ${k.importance.toFixed(2)})`).join('\n')}

3. URGENCY INDICATORS:
   - Overall Level: ${kg.urgencyIndicators.level.toUpperCase()}
   - Score: ${kg.urgencyIndicators.score}
   - High-Priority Signals: ${kg.urgencyIndicators.indicators.high.length}
   - Detected Patterns: ${kg.urgencyIndicators.indicators.high.slice(0, 3).map(i => `"${i.match}"`).join(', ') || 'None'}

4. ACTION ITEMS:
${kg.actionItems.length > 0 ? kg.actionItems.map(a => `   - ${a.text} [${a.type}, priority: ${a.priority.toFixed(1)}]`).join('\n') : '   - No explicit actions detected'}

5. SENDER IMPORTANCE:
   - Level: ${kg.senderImportance.level.toUpperCase()}
   - Score: ${kg.senderImportance.score}

6. TEMPORAL CONTEXT:
   - Has Deadline: ${kg.temporalContext.hasDeadline ? 'YES' : 'NO'}
   - Has Meeting Time: ${kg.temporalContext.hasMeetingTime ? 'YES' : 'NO'}
   - Dates Mentioned: ${kg.temporalContext.dates.length}
   - Times Mentioned: ${kg.temporalContext.times.length}

7. ATTACHMENTS:
   - Count: ${kg.attachmentContext.count}
   - Types: ${kg.attachmentContext.types.join(', ') || 'None'}

TASK:
Using the knowledge graph context above, generate:
1. An abstractive summary (rephrase in your own words, do NOT copy sentences)
2. Urgency classification (URGENT/NON-URGENT) with reasoning
3. Key actions required
4. Confidence score

Respond in JSON format as specified.`;
  }

  analyzeUrgency(knowledgeGraph) {
    const kg = knowledgeGraph.nodes;
    let urgencyScore = 0;
    let reasons = [];

    // Factor 1: Urgency indicators from knowledge graph
    if (kg.urgencyIndicators.level === 'high') {
      urgencyScore += 3;
      reasons.push(`High-priority language detected: ${kg.urgencyIndicators.indicators.high.length} urgent patterns`);
    } else if (kg.urgencyIndicators.level === 'medium') {
      urgencyScore += 1.5;
      reasons.push('Medium urgency indicators present');
    }

    // Factor 2: Sender importance
    if (kg.senderImportance.level === 'executive') {
      urgencyScore += 2;
      reasons.push('Sender is executive-level');
    } else if (kg.senderImportance.level === 'management') {
      urgencyScore += 1;
      reasons.push('Sender is management-level');
    }

    // Factor 3: Deadlines and temporal context
    if (kg.temporalContext.hasDeadline) {
      urgencyScore += 2;
      reasons.push('Contains deadline or time-sensitive information');
    }
    if (kg.temporalContext.hasMeetingTime) {
      urgencyScore += 1;
      reasons.push('Meeting time scheduled');
    }

    // Factor 4: Action items
    if (kg.actionItems.length > 0) {
      const avgPriority = kg.actionItems.reduce((sum, item) => sum + item.priority, 0) / kg.actionItems.length;
      if (avgPriority > 2) {
        urgencyScore += 1.5;
        reasons.push(`${kg.actionItems.length} high-priority action items detected`);
      } else if (avgPriority > 1) {
        urgencyScore += 0.5;
        reasons.push(`${kg.actionItems.length} action items present`);
      }
    }

    // Factor 5: Categories
    const urgentCategories = ['financial', 'support', 'hr'];
    if (kg.categories.some(c => urgentCategories.includes(c.name) && c.confidence > 0.5)) {
      urgencyScore += 1;
      reasons.push('Email category typically requires timely response');
    }

    // Determine urgency classification
    const isUrgent = urgencyScore >= 4;
    const confidence = Math.min(urgencyScore / 10, 0.95);

    if (reasons.length === 0) {
      reasons.push('No urgent indicators detected; standard email communication');
    }

    return {
      urgency: isUrgent ? 'URGENT' : 'NON-URGENT',
      reasoning: reasons.join('. '),
      confidence: isUrgent ? confidence : Math.max(0.6, 1 - confidence),
      score: urgencyScore
    };
  }

  extractKeyActions(knowledgeGraph) {
    const actions = knowledgeGraph.nodes.actionItems
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3)
      .map(item => item.text.trim());
    
    return actions.length > 0 ? actions : ['Review email content'];
  }

  // Test API connection
  async testConnection() {
    try {
      const response = await fetch(this.baseUrl + this.model, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: 'This is a test email. Please summarize it.'
        })
      });

      // Return true for 200 or 503 (model loading is ok for test)
      return response.ok || response.status === 503;
    } catch (error) {
      console.error('Test connection error:', error);
      return false;
    }
  }

  // Get model information
  static getModelInfo() {
    return {
      name: 'Pegasus CNN/DailyMail',
      id: 'google/pegasus-cnn_dailymail',
      description: 'Google Pegasus model fine-tuned for abstractive summarization',
      provider: 'Hugging Face Inference API (Free Tier)'
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LLMAnalyzer;
}
