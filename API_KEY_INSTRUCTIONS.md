# How to Get Your Hugging Face API Key

## Step-by-Step Guide

### 1. Create Hugging Face Account
- Go to https://huggingface.co/join
- Sign up with email or GitHub

### 2. Generate Access Token
- Once logged in, click your profile icon (top-right)
- Select **Settings**
- In the left menu, click **Access Tokens**
- Click **New token** button

### 3. Configure Token
- **Name**: "Email Summarizer Extension" (or any name)
- **Type**: Select **Read** (this is sufficient)
- Click **Generate token**

### 4. Copy Token
- Your token will be shown (starts with `hf_...`)
- **Copy it immediately** - you won't see it again!
- Example format: `hf_AbCdEfGhIjKlMnOpQrStUvWxYz1234567890`

### 5. Add to Extension
- Open Chrome/Edge extension
- Click extension icon → ⚙️ Settings
- Paste token in "Hugging Face API Key" field
- Click "Test Connection"
- If successful, click "Save Settings"

## ✅ Verification

**Valid Token Response:**
- Test Connection shows: "✓ API key is valid!"

**Common Issues:**

### "Invalid API key"
- Double-check you copied the entire token (starts with `hf_`)
- Make sure no extra spaces before/after the token
- Regenerate a new token if needed

### "Access denied"
- Ensure token has **Read** permissions
- Some tokens may be revoked - create a new one

### "Model is loading"
- This is NORMAL on first use
- Wait 20-30 seconds and try again
- Hugging Face loads models on-demand

## 🔒 Security

- Never share your token publicly
- Don't commit it to GitHub
- Tokens are stored locally in browser only
- You can revoke tokens anytime in Hugging Face settings

## 📌 Quick Access

- **Get Token**: https://huggingface.co/settings/tokens
- **API Docs**: https://huggingface.co/docs/api-inference/index

---

**Still having issues?** Make sure you're using a **User Access Token** (not an Organization token) with Read permissions.
