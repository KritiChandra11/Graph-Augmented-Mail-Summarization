// Knowledge Graph Builder for Email Analysis

class KnowledgeGraphBuilder {
  constructor() {
    // Urgency indicator patterns
    this.urgencyPatterns = {
      high: [
        /urgent/i, /asap/i, /immediately/i, /critical/i, /emergency/i,
        /time[- ]sensitive/i, /deadline/i, /overdue/i, /priority/i,
        /important/i, /action required/i, /respond (by|before)/i,
        /please respond/i, /need.{0,20}(today|now|soon)/i,
        /within.{0,10}(hour|day)/i, /reminder/i, /follow[- ]up/i
      ],
      medium: [
        /please (review|check|confirm)/i, /fyi/i, /for your (information|review)/i,
        /when (you get|you have) (a chance|time)/i, /at your convenience/i
      ]
    };

    // Action indicator patterns
    this.actionPatterns = [
      /please (review|approve|sign|complete|submit|update|confirm|respond|reply|check)/i,
      /need (you to|your)/i, /can you/i, /could you/i, /would you/i,
      /action required/i, /your (approval|signature|feedback|input|response)/i,
      /waiting (for|on) you/i, /pending your/i, /requires? your/i,
      /task/i, /to[- ]do/i, /deadline/i, /due (date|by)/i
    ];

    // Category patterns
    this.categoryPatterns = {
      meeting: /meeting|schedule|calendar|appointment|call|zoom|teams/i,
      financial: /invoice|payment|budget|cost|expense|billing|transaction/i,
      project: /project|milestone|deliverable|sprint|roadmap|timeline/i,
      hr: /leave|vacation|pto|performance|review|hr|human resources/i,
      support: /issue|problem|bug|error|help|support|ticket/i,
      sales: /proposal|quote|deal|client|customer|sales|opportunity/i,
      administrative: /policy|procedure|compliance|regulation|documentation/i,
      social: /congratulations|welcome|thank you|invitation|announcement/i
    };

    // Sender importance indicators
    this.importanceIndicators = {
      executive: ['ceo', 'cto', 'cfo', 'coo', 'president', 'vp', 'director'],
      management: ['manager', 'lead', 'head', 'supervisor', 'coordinator'],
      external: ['no-reply', 'noreply', 'automated', 'notification']
    };
  }

  buildGraph(emailData) {
    const graph = {
      email: {
        subject: emailData.subject,
        sender: emailData.sender,
        date: emailData.date,
        platform: emailData.platform
      },
      nodes: {
        categories: this.extractCategories(emailData),
        keywords: this.extractKeywords(emailData),
        urgencyIndicators: this.extractUrgencyIndicators(emailData),
        actionItems: this.extractActionItems(emailData),
        senderImportance: this.analyzeSenderImportance(emailData.sender),
        temporalContext: this.extractTemporalContext(emailData),
        attachmentContext: this.analyzeAttachments(emailData.attachments)
      },
      edges: this.createEdges(emailData),
      metadata: {
        bodyLength: emailData.body.length,
        hasAttachments: emailData.attachments.length > 0,
        extractedAt: new Date().toISOString()
      }
    };

    return graph;
  }

  extractCategories(emailData) {
    const categories = [];
    const combinedText = `${emailData.subject} ${emailData.body}`.toLowerCase();

    for (const [category, pattern] of Object.entries(this.categoryPatterns)) {
      if (pattern.test(combinedText)) {
        categories.push({
          name: category,
          confidence: this.calculatePatternConfidence(combinedText, pattern)
        });
      }
    }

    // If no categories matched, assign "general"
    if (categories.length === 0) {
      categories.push({ name: 'general', confidence: 0.5 });
    }

    return categories.sort((a, b) => b.confidence - a.confidence);
  }

  extractKeywords(emailData) {
    const text = `${emailData.subject} ${emailData.body}`;
    
    // Extract important words (nouns, verbs, capitalized terms)
    const words = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b|\b[a-z]{4,}\b/g) || [];
    
    // Count frequency
    const frequency = {};
    words.forEach(word => {
      const normalized = word.toLowerCase();
      // Skip common words
      if (!this.isStopWord(normalized)) {
        frequency[normalized] = (frequency[normalized] || 0) + 1;
      }
    });

    // Get top keywords
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({
        word,
        frequency: count,
        importance: this.calculateKeywordImportance(word, emailData.subject, count)
      }));
  }

  extractUrgencyIndicators(emailData) {
    const indicators = { high: [], medium: [], low: [] };
    const combinedText = `${emailData.subject} ${emailData.body}`;

    // Check for high urgency
    this.urgencyPatterns.high.forEach(pattern => {
      const matches = combinedText.match(pattern);
      if (matches) {
        indicators.high.push({
          pattern: pattern.source,
          match: matches[0],
          location: matches.index < emailData.subject.length ? 'subject' : 'body'
        });
      }
    });

    // Check for medium urgency
    this.urgencyPatterns.medium.forEach(pattern => {
      const matches = combinedText.match(pattern);
      if (matches) {
        indicators.medium.push({
          pattern: pattern.source,
          match: matches[0],
          location: matches.index < emailData.subject.length ? 'subject' : 'body'
        });
      }
    });

    // Calculate overall urgency score
    const urgencyScore = 
      indicators.high.length * 3 + 
      indicators.medium.length * 1;

    return {
      indicators,
      score: urgencyScore,
      level: urgencyScore >= 3 ? 'high' : urgencyScore >= 1 ? 'medium' : 'low'
    };
  }

  extractActionItems(emailData) {
    const actions = [];
    const sentences = emailData.body.split(/[.!?]+/);

    sentences.forEach(sentence => {
      this.actionPatterns.forEach(pattern => {
        if (pattern.test(sentence)) {
          actions.push({
            text: sentence.trim(),
            type: this.classifyActionType(sentence),
            priority: this.calculateActionPriority(sentence)
          });
        }
      });
    });

    return actions.slice(0, 5); // Top 5 actions
  }

  analyzeSenderImportance(sender) {
    const email = sender.email.toLowerCase();
    const name = sender.name.toLowerCase();

    let importance = 'standard';
    let score = 1.0;

    // Check for automated/no-reply
    if (this.importanceIndicators.external.some(term => email.includes(term))) {
      importance = 'automated';
      score = 0.3;
    }
    // Check for executive
    else if (this.importanceIndicators.executive.some(term => 
      name.includes(term) || email.includes(term))) {
      importance = 'executive';
      score = 3.0;
    }
    // Check for management
    else if (this.importanceIndicators.management.some(term => 
      name.includes(term) || email.includes(term))) {
      importance = 'management';
      score = 2.0;
    }

    return {
      level: importance,
      score: score,
      email: sender.email,
      name: sender.name
    };
  }

  extractTemporalContext(emailData) {
    const dateMatches = emailData.body.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}/gi) || [];
    const timeMatches = emailData.body.match(/\b\d{1,2}:\d{2}\s*(am|pm)?\b/gi) || [];
    
    return {
      dates: dateMatches,
      times: timeMatches,
      hasDeadline: /deadline|due (by|date|on)|by (end of|eod)/i.test(emailData.body),
      hasMeetingTime: /meeting|call|scheduled/i.test(emailData.body) && (dateMatches.length > 0 || timeMatches.length > 0)
    };
  }

  analyzeAttachments(attachments) {
    if (!attachments || attachments.length === 0) {
      return { hasAttachments: false, count: 0, types: [] };
    }

    const types = attachments.map(filename => {
      const ext = filename.split('.').pop().toLowerCase();
      return this.categorizeFileType(ext);
    });

    return {
      hasAttachments: true,
      count: attachments.length,
      types: [...new Set(types)],
      fileNames: attachments
    };
  }

  createEdges(emailData) {
    // Create relationships between graph nodes
    return {
      urgency_to_sender: 'sender importance influences urgency perception',
      urgency_to_actions: 'action items increase urgency level',
      category_to_urgency: 'certain categories (e.g., financial) may have higher urgency',
      temporal_to_urgency: 'deadlines and meeting times indicate urgency',
      attachments_to_importance: 'presence of attachments may indicate importance'
    };
  }

  // Helper methods
  calculatePatternConfidence(text, pattern) {
    const matches = text.match(new RegExp(pattern, 'gi'));
    return matches ? Math.min(matches.length * 0.3, 1.0) : 0;
  }

  calculateKeywordImportance(word, subject, frequency) {
    let importance = frequency * 0.1;
    if (subject.toLowerCase().includes(word)) {
      importance *= 2; // Keywords in subject are more important
    }
    return Math.min(importance, 1.0);
  }

  isStopWord(word) {
    const stopWords = ['the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'has', 'will', 'would', 'could', 'should', 'your', 'you', 'are', 'was', 'were'];
    return stopWords.includes(word) || word.length < 4;
  }

  classifyActionType(sentence) {
    if (/review|check|read/i.test(sentence)) return 'review';
    if (/approve|sign/i.test(sentence)) return 'approval';
    if (/complete|finish|submit/i.test(sentence)) return 'completion';
    if (/respond|reply/i.test(sentence)) return 'response';
    if (/update|change|modify/i.test(sentence)) return 'update';
    return 'general';
  }

  calculateActionPriority(sentence) {
    let priority = 1;
    if (/urgent|asap|immediately/i.test(sentence)) priority += 2;
    if (/please|kindly/i.test(sentence)) priority += 0.5;
    if (/deadline|due/i.test(sentence)) priority += 1;
    return Math.min(priority, 3);
  }

  categorizeFileType(extension) {
    const typeMap = {
      'pdf': 'document',
      'doc': 'document', 'docx': 'document',
      'xls': 'spreadsheet', 'xlsx': 'spreadsheet',
      'ppt': 'presentation', 'pptx': 'presentation',
      'jpg': 'image', 'jpeg': 'image', 'png': 'image', 'gif': 'image',
      'zip': 'archive', 'rar': 'archive',
      'txt': 'text', 'csv': 'data'
    };
    return typeMap[extension] || 'other';
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KnowledgeGraphBuilder;
}
