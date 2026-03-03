# AWS Deployment - Step-by-Step Guide

## Current Status

✅ **AWS CLI**: Installed (`/opt/homebrew/bin/aws`)
❌ **EB CLI**: Not installed (need to install)
✅ **Node.js**: v20.20.0
✅ **npm**: 10.8.2
✅ **Application**: Running locally at http://localhost:5175/

---

## Deployment Plan

We'll deploy in this order:
1. Install required tools
2. Set up AWS credentials
3. Deploy Backend to Elastic Beanstalk
4. Deploy Frontend to S3
5. Test the live application

---

## STEP 1: Install EB CLI

The Elastic Beanstalk CLI is needed to deploy your backend.

### Option A: Using pip (Recommended)
```bash
pip3 install awsebcli --upgrade --user
```

### Option B: Using Homebrew
```bash
brew install awsebcli
```

### Verify Installation
```bash
eb --version
# Should show: EB CLI 3.x.x (Python 3.x.x)
```

---

## STEP 2: Configure AWS Credentials

You need an AWS account with:
- Access Key ID
- Secret Access Key

### Get AWS Credentials

1. **Log into AWS Console**: https://console.aws.amazon.com
2. **Go to IAM** → Users → Your User → Security Credentials
3. **Create Access Key** → "Command Line Interface (CLI)"
4. **Save the keys** (you won't see them again!)

### Configure AWS
```bash
aws configure
```

You'll be prompted for:
```
AWS Access Key ID: AKIA..................
AWS Secret Access Key: ........................................
Default region name: us-east-1
Default output format: json
```

### Verify Configuration
```bash
aws sts get-caller-identity
# Should show your AWS account info
```

---

## STEP 3: Prepare Environment Variables

Before deploying, gather these API keys:

### Required Keys
- ✅ **OPENAI_API_KEY**: For OpenAI chat (you already have this)
- ✅ **PINECONE_API_KEY**: For RAG vector database
- ✅ **PINECONE_INDEX_NAME**: Your Pinecone index name
- ⚠️ **GEMINI_API_KEY**: For Gemini chat (optional if not using)

### Optional Keys
- **HUGGINGFACE_API_KEY**: If using Hugging Face models

### Create a Checklist
```bash
# List your keys (don't run this, just fill in):
OPENAI_API_KEY=sk-.....................
PINECONE_API_KEY=pcsk_.....................
PINECONE_INDEX_NAME=ai-chat-rag
GEMINI_API_KEY=AI..................... (if using)
```

---

## STEP 4: Deploy Backend to Elastic Beanstalk

### 4.1: Navigate to Server Directory
```bash
cd server/
```

### 4.2: Initialize Elastic Beanstalk
```bash
eb init
```

**Answer the prompts**:
```
Select a default region:
  → Choose: us-east-1 (or your preferred region)

Enter Application Name:
  → ai-chat-backend (or press Enter to use "server")

It appears you are using Node.js. Is this correct?
  → Y

Select a platform branch:
  → Node.js 20 running on 64bit Amazon Linux 2023

Do you wish to continue with CodeCommit?
  → n (No)

Do you want to set up SSH for your instances?
  → y (Yes, recommended for debugging)
  → Select your SSH key or create new one
```

This creates `.elasticbeanstalk/config.yml`

### 4.3: Create Environment and Deploy
```bash
eb create ai-chat-backend-prod --single
```

**Flags explained**:
- `ai-chat-backend-prod`: Environment name
- `--single`: Single instance (cheaper, good for testing)

**This will**:
- Create EC2 instance
- Set up load balancer
- Deploy your code
- Take ~5-10 minutes

### 4.4: Set Environment Variables
```bash
eb setenv \
  OPENAI_API_KEY="your-openai-key" \
  PINECONE_API_KEY="your-pinecone-key" \
  PINECONE_INDEX_NAME="ai-chat-rag" \
  GEMINI_API_KEY="your-gemini-key" \
  NODE_ENV="production" \
  PORT="8080" \
  ALLOWED_ORIGINS="*"
```

**⚠️ Important**: Replace with your actual keys!

### 4.5: Get Backend URL
```bash
eb status
```

Look for the line:
```
CNAME: ai-chat-backend-prod.us-east-1.elasticbeanstalk.com
```

**Save this URL!** You'll need it for the frontend.

### 4.6: Test Backend
```bash
curl https://ai-chat-backend-prod.us-east-1.elasticbeanstalk.com/health
# Should return: {"status":"ok"}
```

---

## STEP 5: Deploy Frontend to S3

### 5.1: Return to Root Directory
```bash
cd ..  # Back to project root
```

### 5.2: Create Production Environment File
```bash
cat > .env.production << EOF
VITE_API_BASE_URL=https://ai-chat-backend-prod.us-east-1.elasticbeanstalk.com/api
EOF
```

**⚠️ Replace** `ai-chat-backend-prod.us-east-1.elasticbeanstalk.com` with YOUR backend URL from Step 4.5

### 5.3: Build React App
```bash
npm run build
```

This creates the `dist/` folder with optimized files.

### 5.4: Create S3 Bucket
```bash
# Choose a unique bucket name (must be globally unique)
BUCKET_NAME="ai-chat-react-$(whoami)-$(date +%s)"

aws s3 mb s3://$BUCKET_NAME --region us-east-1
```

### 5.5: Upload Files to S3
```bash
aws s3 sync dist/ s3://$BUCKET_NAME --delete
```

### 5.6: Enable Static Website Hosting
```bash
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html
```

### 5.7: Make Bucket Public
```bash
aws s3api put-public-access-block \
  --bucket $BUCKET_NAME \
  --public-access-block-configuration \
  "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [{
    \"Sid\": \"PublicReadGetObject\",
    \"Effect\": \"Allow\",
    \"Principal\": \"*\",
    \"Action\": \"s3:GetObject\",
    \"Resource\": \"arn:aws:s3:::$BUCKET_NAME/*\"
  }]
}"
```

### 5.8: Get Your Website URL
```bash
echo "Your app is live at:"
echo "http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com"
```

---

## STEP 6: Update Backend CORS

Now that you have your frontend URL, update backend to allow it:

```bash
cd server/

eb setenv ALLOWED_ORIGINS="http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com,http://localhost:5173"

cd ..
```

---

## STEP 7: Test Your Deployed App

1. **Open your frontend URL** in browser
2. **Test RAG chat**:
   - Upload a PDF
   - Ask a question
   - Verify citations work
3. **Test OpenAI chat**:
   - Switch to OpenAI tab
   - Send a message
4. **Test Gemini chat**:
   - Switch to Gemini tab
   - Send a message
5. **Test sessions**:
   - Create new session
   - Refresh page
   - Verify messages persist

---

## Troubleshooting

### Backend Issues

**EB deploy fails**:
```bash
cd server/
eb logs --tail
```

**Health check fails**:
```bash
cd server/
eb ssh
curl http://localhost:8080/health
```

**Environment variables not set**:
```bash
cd server/
eb printenv
```

### Frontend Issues

**S3 bucket not accessible**:
- Check bucket policy is correct
- Verify public access block is disabled

**API calls fail (CORS)**:
- Check `ALLOWED_ORIGINS` in backend
- Check browser console for errors
- Verify backend URL in `.env.production`

**Build fails**:
```bash
npm install
npm run build
```

---

## Cost Estimate

### Monthly Costs (Approximate)

**Elastic Beanstalk**:
- Single t2.micro instance: $0-8/month (FREE tier eligible)
- Load balancer: $0-16/month (can disable for testing)

**S3**:
- Storage: $0.023/GB = ~$0.05/month for your app
- Requests: $0.0004/1000 requests = ~$0.10/month

**Data Transfer**:
- First 100GB free, then $0.09/GB

**Total**: $0-25/month depending on usage
**With Free Tier**: $0-5/month for 12 months

---

## Cleanup (To Avoid Charges)

### Delete Everything
```bash
# Delete backend
cd server/
eb terminate ai-chat-backend-prod

# Delete S3 bucket
cd ..
aws s3 rb s3://$BUCKET_NAME --force
```

---

## Next Steps

After deployment:
1. ✅ Test all features
2. ✅ Set up custom domain (optional)
3. ✅ Add CloudFront CDN (optional, for HTTPS)
4. ✅ Set up monitoring (CloudWatch)
5. ✅ Configure auto-scaling (for production)

---

## Quick Commands Reference

```bash
# Backend
cd server/
eb status                    # Check status
eb logs                      # View logs
eb deploy                    # Deploy updates
eb printenv                  # Show env vars
eb terminate ENVIRONMENT     # Delete environment

# Frontend
npm run build                           # Build
aws s3 sync dist/ s3://BUCKET --delete # Deploy
aws s3 rb s3://BUCKET --force          # Delete

# Monitoring
cd server/
eb health                    # Health status
eb open                      # Open in browser
```

---

## Ready to Start?

**Run these commands in order**:

1. Install EB CLI: `pip3 install awsebcli --upgrade --user`
2. Verify: `eb --version`
3. Configure AWS: `aws configure`
4. Start deployment: Follow Step 4 onwards

**Estimated Time**: 20-30 minutes for first deployment

Let's go! 🚀
