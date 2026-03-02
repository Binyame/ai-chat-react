# AWS Deployment - Quick Start Guide

**10-Minute AWS Deployment** for your AI Chat React Application

---

## 🎯 What You'll Deploy

- **Frontend**: S3 + CloudFront (React app)
- **Backend**: Elastic Beanstalk (Express API)
- **Cost**: ~$10/month (or FREE with AWS Free Tier)

---

## ⚡ Quick Deploy (Step by Step)

### Prerequisites

```bash
# 1. Install AWS CLI
brew install awscli  # macOS
# Or: https://aws.amazon.com/cli/

# 2. Install EB CLI
pip install awsebcli --upgrade --user

# 3. Configure AWS credentials
aws configure
# Enter: Access Key, Secret Key, Region (us-east-1), Format (json)
```

---

### Backend Deployment (5 minutes)

```bash
cd server/

# Initialize Elastic Beanstalk
eb init
# - Region: us-east-1
# - App name: ai-chat-backend
# - Platform: Node.js 18
# - SSH: Yes

# Create environment and deploy
eb create ai-chat-backend-prod

# Set environment variables
eb setenv \
  OPENAI_API_KEY=your_key \
  GEMINI_API_KEY=your_key \
  PINECONE_API_KEY=your_key \
  PINECONE_INDEX=your_index \
  PINECONE_ENVIRONMENT=your_env \
  HUGGINGFACE_API_KEY=your_key \
  NODE_ENV=production \
  ALLOWED_ORIGINS=http://localhost:5173

# Get your backend URL
eb status
# Look for CNAME: your-app.us-east-1.elasticbeanstalk.com
```

✅ **Backend deployed!** Copy the CNAME URL for frontend setup.

---

### Frontend Deployment (5 minutes)

```bash
cd ..

# Create .env.production
cat > .env.production << EOF
VITE_API_BASE_URL=https://your-app.us-east-1.elasticbeanstalk.com/api
EOF

# Build React app
npm run build

# Create S3 bucket (replace YOUR_NAME)
aws s3 mb s3://ai-chat-react-YOUR_NAME

# Upload files
aws s3 sync dist/ s3://ai-chat-react-YOUR_NAME --delete

# Make bucket public
aws s3api put-bucket-policy --bucket ai-chat-react-YOUR_NAME --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::ai-chat-react-YOUR_NAME/*"
  }]
}'

# Enable static website hosting
aws s3 website s3://ai-chat-react-YOUR_NAME \
  --index-document index.html \
  --error-document index.html
```

✅ **Frontend deployed!** Access at: `http://ai-chat-react-YOUR_NAME.s3-website-us-east-1.amazonaws.com`

---

### Update CORS (Important!)

```bash
cd server/

# Update ALLOWED_ORIGINS with your S3 URL
eb setenv ALLOWED_ORIGINS=http://ai-chat-react-YOUR_NAME.s3-website-us-east-1.amazonaws.com,http://localhost:5173

# Redeploy
eb deploy
```

---

## 🌐 Add CloudFront (Optional, but Recommended)

CloudFront gives you:
- HTTPS (free SSL certificate)
- Faster global access (CDN)
- Custom domain support

**Via AWS Console** (easiest):

1. Go to [CloudFront Console](https://console.aws.amazon.com/cloudfront)
2. Create Distribution:
   - Origin: Your S3 bucket
   - Viewer Protocol: Redirect HTTP to HTTPS
   - Default Root Object: `index.html`
3. Create Custom Error Response:
   - 403 → /index.html (200)
   - 404 → /index.html (200)
4. Wait 10-15 minutes for deployment
5. Copy CloudFront domain: `d123abc.cloudfront.net`

**Update frontend to use CloudFront:**
```bash
# Rebuild with CloudFront URL in .env.production
npm run build
aws s3 sync dist/ s3://ai-chat-react-YOUR_NAME --delete

# Update CORS
cd server/
eb setenv ALLOWED_ORIGINS=https://d123abc.cloudfront.net,http://localhost:5173
eb deploy
```

---

## 🔄 Redeployment (After Code Changes)

```bash
# Backend
cd server/ && eb deploy

# Frontend
cd .. && npm run build && aws s3 sync dist/ s3://YOUR_BUCKET --delete

# Invalidate CloudFront cache (if using CloudFront)
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

**Or use the automated script:**
```bash
./deploy-aws.sh
```

---

## 📊 Cost Breakdown

### With Free Tier (First 12 Months)
- EC2 t2.micro: **FREE** (750 hours/month)
- S3: **FREE** (5GB storage, 20K GET requests)
- CloudFront: **FREE** (50GB data transfer)
- **Total: $0-2/month**

### After Free Tier
- Elastic Beanstalk (t3.micro): **$8-10/month**
- S3 (1GB storage): **$0.02/month**
- CloudFront (10GB transfer): **$0.85/month**
- **Total: ~$10/month**

---

## 🛠️ Useful Commands

```bash
# Backend
eb status              # Check environment status
eb logs                # View application logs
eb ssh                 # SSH into EC2 instance
eb printenv            # View environment variables
eb health              # Check health status
eb terminate           # Delete environment (saves money)

# Frontend
aws s3 ls s3://YOUR_BUCKET                    # List files
aws s3 rm s3://YOUR_BUCKET --recursive        # Delete all files
aws s3api delete-bucket --bucket YOUR_BUCKET  # Delete bucket

# CloudFront
aws cloudfront list-distributions              # List distributions
aws cloudfront create-invalidation --distribution-id ID --paths "/*"
```

---

## 🐛 Common Issues

### 1. Backend Returns 502 Bad Gateway
```bash
# Check logs
cd server/ && eb logs

# Common fixes:
# - Missing environment variables
# - Port must be 8080 (or process.env.PORT)
# - Check if API keys are correct
```

### 2. Frontend Can't Connect to Backend
```bash
# Check CORS settings
cd server/ && eb printenv

# Ensure ALLOWED_ORIGINS includes your frontend URL
eb setenv ALLOWED_ORIGINS=https://your-frontend-url.com
```

### 3. S3 Website Not Working
```bash
# Check bucket policy
aws s3api get-bucket-policy --bucket YOUR_BUCKET

# Make sure it's publicly readable
# Check static website hosting is enabled
```

---

## 🎓 What You're Learning (For Your AWS Portfolio)

✅ **EC2 / Elastic Beanstalk** - Compute service for backend hosting
✅ **S3** - Object storage for static website hosting
✅ **CloudFront** - CDN for global content delivery
✅ **IAM** - Identity and access management
✅ **Route 53** - DNS management (if using custom domain)
✅ **Certificate Manager** - SSL/TLS certificates
✅ **CloudWatch** - Monitoring and logging
✅ **Secrets Manager** - Secure credential storage

---

## 📚 Full Documentation

- **Detailed Guide**: See `aws-deploy.md`
- **Deployment Script**: Run `./deploy-aws.sh`
- **AWS Documentation**: https://docs.aws.amazon.com/

---

## 🚀 Ready to Deploy?

1. Install AWS CLI and EB CLI (see Prerequisites above)
2. Run `cd server && eb init`
3. Follow the prompts
4. Deploy backend with `eb create`
5. Deploy frontend with S3 commands
6. Test your application!

**Questions?** Check `aws-deploy.md` for troubleshooting and advanced configuration.

Good luck with your deployment! 🎉
