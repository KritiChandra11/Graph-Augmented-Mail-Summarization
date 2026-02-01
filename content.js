// Content script for extracting email content from Gmail and Outlook

class EmailExtractor {
  constructor() {
    this.platform = this.detectPlatform();
  }

  detectPlatform() {
    const url = window.location.hostname;
    if (url.includes('mail.google.com')) return 'gmail';
    if (url.includes('outlook.live.com') || url.includes('outlook.office.com')) return 'outlook';
    return null;
  }

  extractEmailData() {
    if (this.platform === 'gmail') {
      return this.extractGmailData();
    } else if (this.platform === 'outlook') {
      return this.extractOutlookData();
    }
    return null;
  }

  extractGmailData() {
    try {
      // Wait for email to load
      const emailBody = document.querySelector('[data-message-id]');
      if (!emailBody) return null;

      // Extract subject
      const subject = document.querySelector('h2.hP')?.innerText || 
                      document.querySelector('[data-legacy-thread-id]')?.innerText || '';

      // Extract sender information
      const senderElement = document.querySelector('span.gD');
      const senderEmail = senderElement?.getAttribute('email') || '';
      const senderName = senderElement?.getAttribute('name') || 
                         document.querySelector('span.go')?.innerText || '';

      // Extract recipient
      const recipientElement = document.querySelector('span.g2');
      const recipient = recipientElement?.innerText || '';

      // Extract date/time
      const dateElement = document.querySelector('span.g3');
      const date = dateElement?.getAttribute('title') || dateElement?.innerText || '';

      // Extract body content
      let body = '';
      const bodyElement = document.querySelector('div.a3s.aiL') || 
                          document.querySelector('[data-message-id] div[dir="ltr"]');
      if (bodyElement) {
        // Clone and remove quoted text
        const clone = bodyElement.cloneNode(true);
        const quotedTexts = clone.querySelectorAll('.gmail_quote');
        quotedTexts.forEach(qt => qt.remove());
        body = clone.innerText || clone.textContent || '';
      }

      // Extract attachments
      const attachments = [];
      document.querySelectorAll('div.aZo').forEach(att => {
        const fileName = att.querySelector('span.aV3')?.innerText || '';
        if (fileName) attachments.push(fileName);
      });

      return {
        platform: 'Gmail',
        subject: subject.trim(),
        sender: {
          name: senderName.trim(),
          email: senderEmail.trim()
        },
        recipient: recipient.trim(),
        date: date.trim(),
        body: body.trim(),
        attachments: attachments,
        url: window.location.href
      };
    } catch (error) {
      console.error('Gmail extraction error:', error);
      return null;
    }
  }

  extractOutlookData() {
    try {
      // Extract subject
      const subject = document.querySelector('[aria-label*="Subject"]')?.innerText || 
                      document.querySelector('span[id*="Subject"]')?.innerText ||
                      document.querySelector('div[role="heading"]')?.innerText || '';

      // Extract sender
      const senderElement = document.querySelector('[aria-label*="From"]') ||
                            document.querySelector('span[title*="@"]');
      const senderText = senderElement?.innerText || senderElement?.textContent || '';
      const senderMatch = senderText.match(/(.*?)<(.+?)>/) || senderText.match(/(.+)/);
      const senderName = senderMatch ? senderMatch[1]?.trim() : '';
      const senderEmail = senderMatch && senderMatch[2] ? senderMatch[2].trim() : senderText.trim();

      // Extract date
      const dateElement = document.querySelector('[aria-label*="Received"]') ||
                          document.querySelector('span[id*="Item.DateTimeReceived"]');
      const date = dateElement?.innerText || dateElement?.getAttribute('aria-label') || '';

      // Extract body
      let body = '';
      const bodyElement = document.querySelector('div[aria-label="Message body"]') ||
                          document.querySelector('div[class*="MessageBody"]') ||
                          document.querySelector('div[role="document"]');
      if (bodyElement) {
        const clone = bodyElement.cloneNode(true);
        // Remove quoted replies
        const quotes = clone.querySelectorAll('[id*="divRplyFwdMsg"]');
        quotes.forEach(q => q.remove());
        body = clone.innerText || clone.textContent || '';
      }

      // Extract attachments
      const attachments = [];
      document.querySelectorAll('[aria-label*="Attachment"]').forEach(att => {
        const fileName = att.getAttribute('aria-label') || att.innerText || '';
        if (fileName) attachments.push(fileName);
      });

      return {
        platform: 'Outlook',
        subject: subject.trim(),
        sender: {
          name: senderName,
          email: senderEmail
        },
        recipient: '',
        date: date.trim(),
        body: body.trim(),
        attachments: attachments,
        url: window.location.href
      };
    } catch (error) {
      console.error('Outlook extraction error:', error);
      return null;
    }
  }

  // Check if we're viewing a single email (not inbox list)
  isEmailView() {
    if (this.platform === 'gmail') {
      return document.querySelector('[data-message-id]') !== null;
    } else if (this.platform === 'outlook') {
      return document.querySelector('[aria-label*="Message body"]') !== null ||
             document.querySelector('div[role="heading"]') !== null;
    }
    return false;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractEmail') {
    const extractor = new EmailExtractor();
    
    if (!extractor.isEmailView()) {
      sendResponse({ 
        success: false, 
        error: 'Please open a single email to analyze' 
      });
      return true;
    }

    const emailData = extractor.extractEmailData();
    
    if (emailData) {
      sendResponse({ success: true, data: emailData });
    } else {
      sendResponse({ 
        success: false, 
        error: 'Could not extract email data. Please ensure an email is open.' 
      });
    }
  }
  return true;
});

// Notify background script that content script is ready
if (document.readyState === 'complete') {
  chrome.runtime.sendMessage({ action: 'contentScriptReady' });
} else {
  window.addEventListener('load', () => {
    chrome.runtime.sendMessage({ action: 'contentScriptReady' });
  });
}
