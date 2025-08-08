# 🔐 API Key Security Guide

## ⚠️ CRITICAL: Never Commit API Keys to GitHub!

### 🚫 What NOT to Do:
- ❌ Never put API keys directly in code
- ❌ Never commit `.env` files
- ❌ Never share API keys in Discord, Slack, or email
- ❌ Never put API keys in README files or documentation

### ✅ What TO Do:

## 1. Getting Your API Keys

### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. **Important**: You can only see it once!

### Hugging Face Token
1. Go to [Hugging Face Settings](https://huggingface.co/settings/tokens)
2. Sign in or create account
3. Click "New token"
4. Choose "Read" permissions
5. Copy the token (starts with `hf_`)

### Google Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key (starts with `AIza`)

## 2. Securing API Keys Locally

### Step 1: Add Keys to server/.env
```bash
cd server
# Edit the .env file (never .env.example!)
```

Add your real keys to `server/.env`:
```env
# Replace with your actual API keys
OPENAI_API_KEY=sk-your-actual-openai-key-here
HUGGINGFACE_TOKEN=hf_your-actual-huggingface-token
GEMINI_API_KEY=AIza-your-actual-gemini-key

# Server config (keep these)
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Step 2: Verify .gitignore Protection
Your `.gitignore` already protects these files:
- ✅ `.env` files are ignored
- ✅ `server/.env` files are ignored
- ✅ Only `.env.example` files are tracked

## 3. GitHub Security Checklist

### Before Your First Commit:
```bash
# 1. Check what files will be committed
git status

# 2. Make sure NO .env files are listed
# If you see .env files, they're NOT protected!

# 3. Double-check .gitignore is working
git check-ignore server/.env
# Should output: server/.env (meaning it's ignored)

# 4. Safe to commit
git add .
git commit -m "Initial commit - API keys protected"
git push
```

### If You Accidentally Committed API Keys:
```bash
# 🚨 EMERGENCY: If you committed API keys
# 1. Immediately revoke ALL API keys from their respective platforms
# 2. Create new API keys
# 3. Remove keys from git history:
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch server/.env' --prune-empty --tag-name-filter cat -- --all
git push origin --force --all
```

## 4. Production Deployment Options

### Option A: Environment Variables (Recommended)
```bash
# On your server/hosting platform
export OPENAI_API_KEY="sk-your-key"
export HUGGINGFACE_TOKEN="hf-your-token"
export GEMINI_API_KEY="AIza-your-key"
```

### Option B: GitHub Secrets (for CI/CD)
1. Go to your GitHub repo → Settings → Secrets and Variables → Actions
2. Add secrets:
   - `OPENAI_API_KEY`: `sk-your-key`
   - `HUGGINGFACE_TOKEN`: `hf-your-token`
   - `GEMINI_API_KEY`: `AIza-your-key`

### Option C: Cloud Platform Secrets
- **Vercel**: Environment Variables in dashboard
- **Netlify**: Environment Variables in site settings
- **Heroku**: Config Vars in app settings
- **Railway**: Environment Variables in project settings

## 5. Team Collaboration

### Sharing with Team Members:
```bash
# 1. Share .env.example (safe template)
# 2. Team members copy to .env and add their own keys
cp server/.env.example server/.env
# 3. Each person gets their own API keys
```

### Team Security Rules:
- 🔒 Each developer uses their own API keys
- 📝 Document which APIs are needed in README
- 🚫 Never share API keys in chat or email
- ✅ Use secure password managers if needed

## 6. Monitoring & Best Practices

### Monitor Your API Usage:
- Check OpenAI usage dashboard monthly
- Set up billing alerts
- Monitor for unusual activity
- Rotate keys periodically

### Key Rotation:
```bash
# Every 3-6 months or if compromised:
# 1. Generate new keys
# 2. Update .env file
# 3. Test application
# 4. Revoke old keys
```

## 7. Emergency Response

### If API Keys Are Compromised:
1. **Immediate**: Revoke keys on respective platforms
2. **Quick**: Generate new keys
3. **Update**: Replace in `.env` file
4. **Test**: Verify application works
5. **Monitor**: Watch for unauthorized usage

## ✅ Security Verification

Run this checklist before pushing:
- [ ] `.env` files are in `.gitignore`
- [ ] `git status` shows no `.env` files
- [ ] Only `.env.example` files are tracked
- [ ] API keys are working locally
- [ ] No hardcoded keys in source code

## 📞 Need Help?

If you accidentally commit API keys:
1. Revoke them immediately
2. Follow the emergency removal steps above
3. Create new keys
4. Test thoroughly

Remember: **Security is not optional!** 🔒