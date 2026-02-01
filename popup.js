// Popup JavaScript for Email Summarizer Extension

document.addEventListener('DOMContentLoaded', () => {
  // Element references
  const analyzeBtn = document.getElementById('analyzeBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const viewHistoryBtn = document.getElementById('viewHistoryBtn');
  const copyBtn = document.getElementById('copyBtn');
  
  const settingsPanel = document.getElementById('settingsPanel');
  const mainContent = document.getElementById('mainContent');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const testApiBtn = document.getElementById('testApiBtn');
  
  const historyPanel = document.getElementById('historyPanel');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  
  const loading = document.getElementById('loading');
  const status = document.getElementById('status');
  const results = document.getElementById('results');

  // Load saved settings
  loadSettings();

  // Event listeners
  analyzeBtn.addEventListener('click', analyzeCurrentEmail);
  settingsBtn.addEventListener('click', openSettings);
  closeSettingsBtn.addEventListener('click', closeSettings);
  saveSettingsBtn.addEventListener('click', saveSettings);
  testApiBtn.addEventListener('click', testApiKey);
  viewHistoryBtn.addEventListener('click', openHistory);
  closeHistoryBtn.addEventListener('click', closeHistory);
  clearHistoryBtn.addEventListener('click', clearHistory);
  copyBtn.addEventListener('click', copySummary);

  async function analyzeCurrentEmail() {
    try {
      // Check if API key is configured
      const { apiKey } = await chrome.storage.local.get(['apiKey']);
      if (!apiKey) {
        showStatus('Please configure your Hugging Face API key in settings', 'error');
        openSettings();
        return;
      }

      // Hide previous results and show loading
      results.classList.add('hidden');
      status.classList.add('hidden');
      loading.classList.remove('hidden');

      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Check if we're on a supported email platform
      if (!tab.url.includes('mail.google.com') && 
          !tab.url.includes('outlook.live.com') && 
          !tab.url.includes('outlook.office.com')) {
        throw new Error('Please navigate to Gmail or Outlook to analyze emails');
      }

      // Extract email from current page
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractEmail' });
      
      if (!response.success) {
        throw new Error(response.error);
      }

      // Send to background for analysis
      const analysisResponse = await chrome.runtime.sendMessage({
        action: 'analyzeEmail',
        emailData: response.data
      });

      if (!analysisResponse.success) {
        throw new Error(analysisResponse.error);
      }

      // Display results
      displayResults(analysisResponse.result);
      loading.classList.add('hidden');

    } catch (error) {
      loading.classList.add('hidden');
      showStatus(`Error: ${error.message}`, 'error');
      console.error('Analysis error:', error);
    }
  }

  function displayResults(result) {
    // Email info
    document.getElementById('emailSubject').textContent = result.email.subject;
    document.getElementById('emailSender').textContent = 
      `${result.email.sender.name} <${result.email.sender.email}>`;
    document.getElementById('emailDate').textContent = result.email.date;

    // Urgency classification
    const urgencyBadge = document.getElementById('urgencyBadge');
    const urgencyLabel = document.getElementById('urgencyLabel');
    urgencyLabel.textContent = result.analysis.urgency;
    urgencyBadge.className = 'urgency-badge ' + 
      (result.analysis.urgency === 'URGENT' ? 'urgent' : 'non-urgent');
    
    document.getElementById('confidenceScore').textContent = 
      `${(result.analysis.confidence * 100).toFixed(0)}% confidence`;
    document.getElementById('urgencyReasoning').textContent = result.analysis.reasoning;

    // Summary
    document.getElementById('summaryText').textContent = result.analysis.summary;

    // Key actions
    const actionsSection = document.getElementById('actionsSection');
    const actionsList = document.getElementById('actionsList');
    if (result.analysis.keyActions && result.analysis.keyActions.length > 0) {
      actionsSection.classList.remove('hidden');
      actionsList.innerHTML = result.analysis.keyActions
        .map(action => `<li>${action}</li>`)
        .join('');
    } else {
      actionsSection.classList.add('hidden');
    }

    // Knowledge graph insights
    document.getElementById('categories').textContent = 
      result.knowledgeGraph.categories.map(c => c.name).join(', ');
    document.getElementById('keywords').textContent = 
      result.knowledgeGraph.keywords.map(k => k.word).join(', ');
    document.getElementById('senderImportance').textContent = 
      result.knowledgeGraph.senderImportance.toUpperCase();
    document.getElementById('actionCount').textContent = 
      result.knowledgeGraph.actionItemsCount;
    document.getElementById('deadline').textContent = 
      result.knowledgeGraph.hasDeadline ? 'Yes' : 'No';
    document.getElementById('attachments').textContent = 
      result.knowledgeGraph.attachments || 'None';

    // Show results
    results.classList.remove('hidden');
    
    // Store current result for copying
    window.currentResult = result;
  }

  function openSettings() {
    mainContent.classList.add('hidden');
    settingsPanel.classList.remove('hidden');
  }

  function closeSettings() {
    settingsPanel.classList.add('hidden');
    mainContent.classList.remove('hidden');
  }

  async function loadSettings() {
    const { apiKey } = await chrome.storage.local.get(['apiKey']);
    if (apiKey) {
      document.getElementById('apiKeyInput').value = apiKey;
    }
  }

  async function saveSettings() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();

    if (!apiKey) {
      showSettingsStatus('Please enter an API key', 'error');
      return;
    }

    await chrome.storage.local.set({
      apiKey,
      settings: { model: 'google/pegasus-cnn_dailymail' }
    });

    showSettingsStatus('Settings saved successfully!', 'success');
    setTimeout(() => {
      closeSettings();
    }, 1500);
  }

  async function testApiKey() {
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    
    if (!apiKey) {
      showSettingsStatus('Please enter an API key first', 'error');
      return;
    }

    showSettingsStatus('Testing connection...', 'info');

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'testApiKey',
        apiKey
      });

      if (response.success && response.isValid) {
        showSettingsStatus('✓ API key is valid!', 'success');
      } else {
        showSettingsStatus('✗ Invalid API key or connection failed', 'error');
      }
    } catch (error) {
      showSettingsStatus('✗ Connection test failed', 'error');
    }
  }

  async function openHistory() {
    const response = await chrome.runtime.sendMessage({ action: 'getSummaryHistory' });
    const history = response.history || [];

    const historyList = document.getElementById('historyList');
    
    if (history.length === 0) {
      historyList.innerHTML = '<p class="empty-state">No summaries yet</p>';
    } else {
      historyList.innerHTML = history.map((item, index) => `
        <div class="history-item">
          <div class="history-header">
            <strong>${item.email.subject}</strong>
            <span class="urgency-tag ${item.analysis.urgency.toLowerCase()}">${item.analysis.urgency}</span>
          </div>
          <p class="history-meta">
            ${item.email.sender.name} • ${new Date(item.timestamp).toLocaleDateString()}
          </p>
          <p class="history-summary">${item.analysis.summary}</p>
        </div>
      `).join('');
    }

    mainContent.classList.add('hidden');
    historyPanel.classList.remove('hidden');
  }

  function closeHistory() {
    historyPanel.classList.add('hidden');
    mainContent.classList.remove('hidden');
  }

  async function clearHistory() {
    if (confirm('Are you sure you want to clear all history?')) {
      await chrome.runtime.sendMessage({ action: 'clearHistory' });
      document.getElementById('historyList').innerHTML = '<p class="empty-state">No summaries yet</p>';
    }
  }

  function copySummary() {
    if (!window.currentResult) return;

    const text = `
Email: ${window.currentResult.email.subject}
From: ${window.currentResult.email.sender.name}
Urgency: ${window.currentResult.analysis.urgency}

Summary:
${window.currentResult.analysis.summary}

Reasoning:
${window.currentResult.analysis.reasoning}

Key Actions:
${window.currentResult.analysis.keyActions.map((a, i) => `${i + 1}. ${a}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => {
        copyBtn.innerHTML = '<span class="btn-icon">📋</span> Copy Summary';
      }, 2000);
    });
  }

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.classList.remove('hidden');
  }

  function showSettingsStatus(message, type) {
    const settingsStatus = document.getElementById('settingsStatus');
    settingsStatus.textContent = message;
    settingsStatus.className = `status ${type}`;
    settingsStatus.classList.remove('hidden');
    
    setTimeout(() => {
      settingsStatus.classList.add('hidden');
    }, 3000);
  }
});
