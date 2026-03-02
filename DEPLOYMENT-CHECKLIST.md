# AWS Deployment Checklist ✅

Use this checklist to deploy your AI Chat React application to AWS.

---

## ✅ Pre-Deployment Setup (One-Time)

### 1. AWS Account & Credentials

- [ ] AWS account created
- [ ] AWS CLI installed: `aws --version`
- [ ] EB CLI installed: `eb --version` or `pip install awsebcli --upgrade --user`
- [ ] AWS credentials configured: `aws configure`

### 2. API Keys Ready

- [ ] OpenAI API key
- [ ] Gemini API key
- [ ] Pinecone API key
- [ ] Pinecone index created (768 dimensions, cosine metric)
- [ ] Hugging Face API key (optional)

---

## 🚀 Backend Deployment (Elastic Beanstalk)

### Step 1: Initialize Elastic Beanstalk

```bash
cd server/
eb init
```

- [ ] Select region (e.g., us-east-1)
- [ ] Application name: `ai-chat-backend`
- [ ] Platform: Node.js 18
- [ ] SSH: Yes (for debugging)

### Step 2: Create Environment

```bash
eb create ai-chat-backend-prod
```

Wait 5-10 minutes for environment creation.

- [ ] Environment created successfully
- [ ] Copy CNAME URL: `__________.us-east-1.elasticbeanstalk.com`

### Step 3: Set Environment Variables

```bash
eb setenv \
  OPENAI_API_KEY=your_key \
  GEMINI_API_KEY=your_key \
  PINECONE_API_KEY=your_key \
  PINECONE_INDEX=your_index \
  PINECONE_ENVIRONMENT=your_env \
  HUGGINGFACE_API_KEY=your_key \
  NODE_ENV=production \
  ALLOWED_ORIGINS=http://localhost:5173
```

- [ ] Environment variables set
- [ ] Verify: `eb printenv`

### Step 4: Test Backend

```bash
eb status
# Copy the CNAME URL

curl https://YOUR_BACKEND_URL/health
# Should return: {"status":"OK","timestamp":"..."}
```

- [ ] Health check passes
- [ ] Backend URL: `https://___________________`

---

## 🎨 Frontend Deployment (S3 + CloudFront)

### Step 1: Configure Production Environment

```bash
cd /Users/binyamseyoum/ai-chat-react

# Create .env.production
cat > .env.production << EOF
VITE_API_BASE_URL=https://YOUR_BACKEND_URL/api
EOF
```

- [ ] `.env.production` created with correct backend URL

### Step 2: Build React App

```bash
npm run build
```

- [ ] Build successful
- [ ] `dist/` folder created

### Step 3: Create S3 Bucket

```bash
# Replace YOUR_NAME with something unique
BUCKET_NAME="ai-chat-react-YOUR_NAME"

aws s3 mb s3://$BUCKET_NAME
```

- [ ] S3 bucket created
- [ ] Bucket name: `_____________________`

### Step 4: Upload to S3

```bash
aws s3 sync dist/ s3://$BUCKET_NAME --delete

# Make bucket public
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::'$BUCKET_NAME'/*"
  }]
}'

# Enable static website hosting
aws s3 website s3://$BUCKET_NAME \
  --index-document index.html \
  --error-document index.html
```

- [ ] Files uploaded to S3
- [ ] Bucket made public
- [ ] Static website hosting enabled

### Step 5: Test S3 Website

```bash
# Get S3 website URL
REGION=$(aws configure get region)
echo "http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
```

- [ ] S3 website accessible
- [ ] S3 URL: `http://___________________`

### Step 6: Update CORS

```bash
cd server/

# Update ALLOWED_ORIGINS with your S3 URL
eb setenv ALLOWED_ORIGINS=http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com,http://localhost:5173

eb deploy
```

- [ ] CORS updated
- [ ] Backend redeployed

---

## 🌐 CloudFront Setup (Optional but Recommended)

### Via AWS Console

1. Go to [CloudFront Console](https://console.aws.amazon.com/cloudfront)

2. **Create Distribution:**
   - [ ] Origin: Select your S3 bucket
   - [ ] Origin path: leave empty
   - [ ] Viewer protocol: Redirect HTTP to HTTPS
   - [ ] Default root object: `index.html`
   - [ ] Click "Create Distribution"

3. **Custom Error Pages (for SPA routing):**
   - [ ] 403 → `/index.html` (200)
   - [ ] 404 → `/index.html` (200)

4. **Wait for deployment** (10-15 minutes)

5. **Copy CloudFront URL:**
   - [ ] CloudFront domain: `d________.cloudfront.net`

### Update CORS for CloudFront

```bash
cd server/

eb setenv ALLOWED_ORIGINS=https://YOUR_CLOUDFRONT_DOMAIN.cloudfront.net,http://localhost:5173

eb deploy
```

- [ ] CORS updated for CloudFront
- [ ] Backend redeployed

---

## 🧪 Final Testing

### Backend Tests

```bash
# Health check
curl https://YOUR_BACKEND_URL/health

# OpenAI endpoint
curl -X POST https://YOUR_BACKEND_URL/api/openai/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

- [ ] Health check passes
- [ ] API endpoints responding

### Frontend Tests

1. Open your CloudFront URL (or S3 website URL)
2. Test each tab:
   - [ ] OpenAI Chat works
   - [ ] Gemini Chat works
   - [ ] RAG with PDFs tab loads
3. Upload a PDF and ask a question
   - [ ] PDF upload succeeds
   - [ ] Questions return answers with citations

### Full Integration Test

- [ ] Upload a PDF document
- [ ] Ask a question about the PDF
- [ ] Receive answer with citations
- [ ] Click citation to expand source text
- [ ] Switch between chat providers
- [ ] Dark mode toggle works

---

## 📊 Post-Deployment

### Monitor Your Application

```bash
# View backend logs
cd server/
eb logs

# Check environment health
eb health

# View environment details
eb status
```

- [ ] Logs accessible
- [ ] Environment health: Green

### Set Up Monitoring (Optional)

1. CloudWatch Logs (automatic with Elastic Beanstalk)
   - [ ] View in AWS Console → CloudWatch → Log Groups

2. CloudWatch Alarms (optional)
   - [ ] Set up alerts for errors
   - [ ] Set up alerts for high latency

### Cost Monitoring

- [ ] Set up AWS Budget alert (e.g., $20/month threshold)
- [ ] Enable Cost Explorer in AWS Console

---

## 🔄 Future Deployments

### When You Make Code Changes

**Backend:**
```bash
cd server/
eb deploy
```

**Frontend:**
```bash
npm run build
aws s3 sync dist/ s3://$BUCKET_NAME --delete

# If using CloudFront, invalidate cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

**Or use the automated script:**
```bash
./deploy-aws.sh
```

---

## 🐛 Troubleshooting

### Backend Issues

**502 Bad Gateway:**
```bash
cd server/
eb logs
# Check for:
# - Missing environment variables
# - Port issues (must be 8080 or process.env.PORT)
# - API key errors
```

**CORS Errors:**
```bash
eb printenv
# Verify ALLOWED_ORIGINS includes your frontend URL
eb setenv ALLOWED_ORIGINS=https://your-frontend-url.com
```

### Frontend Issues

**Blank Page:**
- [ ] Check browser console for errors
- [ ] Verify `.env.production` has correct backend URL
- [ ] Rebuild: `npm run build`

**API Connection Fails:**
- [ ] Check CORS settings on backend
- [ ] Verify backend URL in `.env.production`
- [ ] Test backend directly: `curl https://backend-url/health`

**CloudFront Shows Old Version:**
```bash
# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DIST_ID \
  --paths "/*"
```

---

## 💰 Cost Management

### Monthly Costs

**With AWS Free Tier (First 12 months):**
- EC2 t2.micro: FREE (750 hours/month)
- S3: FREE (5GB storage)
- CloudFront: FREE (50GB transfer)
- **Total: $0-2/month**

**After Free Tier:**
- Elastic Beanstalk (t3.micro): $8-10/month
- S3 (1GB): $0.02/month
- CloudFront (10GB): $0.85/month
- **Total: ~$10/month**

### Cost Optimization

- [ ] Terminate unused EB environments: `eb terminate`
- [ ] Delete old S3 buckets
- [ ] Remove unused CloudFront distributions
- [ ] Set up lifecycle policies for S3 (delete old files)

---

## 🎓 What You've Deployed

✅ **Full-stack application on AWS**
✅ **Elastic Beanstalk** - Managed Node.js hosting
✅ **S3** - Static website hosting
✅ **CloudFront** - Global CDN with HTTPS
✅ **IAM** - Secure access management
✅ **CloudWatch** - Logging and monitoring

**Perfect for AWS portfolio/resume!**

---

## 📚 Documentation

- **Quick Start**: [AWS-QUICKSTART.md](./AWS-QUICKSTART.md)
- **Full Guide**: [aws-deploy.md](./aws-deploy.md)
- **Main README**: [README.md](./README.md)

---

## ✨ Deployment Complete!

Your AI Chat application is now live on AWS! 🎉

**Share your deployed app:**
- Frontend: `https://your-cloudfront-domain.cloudfront.net`
- Backend: `https://your-backend.elasticbeanstalk.com`

**Next Steps:**
- [ ] Add custom domain with Route 53
- [ ] Set up CI/CD with CodePipeline
- [ ] Enable AWS WAF for security
- [ ] Add monitoring dashboards

Good luck! 🚀
