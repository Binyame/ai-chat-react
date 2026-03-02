# AWS Deployment Guide

Complete step-by-step guide to deploy your AI Chat React application on AWS.

## 🏗️ Architecture Overview

Your application will use:
- **S3 + CloudFront**: Static frontend hosting (React app)
- **Elastic Beanstalk**: Backend API hosting (Express server)
- **Secrets Manager**: Secure API key storage
- **Route 53**: DNS management (optional)
- **Certificate Manager**: Free SSL certificates

---

## 📋 Prerequisites

1. AWS Account (you have this ✅)
2. AWS CLI installed: `aws --version`
3. EB CLI installed: `eb --version`

Install AWS CLI and EB CLI:
```bash
# Install AWS CLI
brew install awscli  # macOS
# Or download from: https://aws.amazon.com/cli/

# Configure AWS CLI
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1), Output format (json)

# Install Elastic Beanstalk CLI
pip install awsebcli --upgrade --user
```

---

## 🚀 Part 1: Deploy Backend (Elastic Beanstalk)

### Step 1: Prepare Backend

```bash
cd server/

# Initialize Elastic Beanstalk
eb init

# Answer the prompts:
# - Select region: us-east-1 (or your preferred region)
# - Application name: ai-chat-backend
# - Platform: Node.js
# - Platform version: Node.js 18 running on 64bit Amazon Linux 2023
# - SSH: Yes (for debugging)
```

### Step 2: Create Environment

```bash
# Create production environment
eb create ai-chat-backend-prod

# This will:
# - Create EC2 instance
# - Set up load balancer
# - Configure auto-scaling
# - Deploy your code
```

### Step 3: Set Environment Variables

```bash
# Set all your API keys securely
eb setenv \
  OPENAI_API_KEY=your_openai_key \
  GEMINI_API_KEY=your_gemini_key \
  PINECONE_API_KEY=your_pinecone_key \
  PINECONE_INDEX=your_index_name \
  PINECONE_ENVIRONMENT=your_pinecone_env \
  HUGGINGFACE_API_KEY=your_hf_key \
  NODE_ENV=production

# Verify environment variables
eb printenv
```

### Step 4: Get Backend URL

```bash
# Get your Elastic Beanstalk URL
eb status

# Look for: CNAME: ai-chat-backend-prod.us-east-1.elasticbeanstalk.com
# This is your backend API URL
```

### Step 5: Update CORS in Server

Update `server/server.js` CORS to allow your frontend domain:

```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://your-cloudfront-domain.cloudfront.net', // Add after frontend deploy
    'https://your-custom-domain.com' // If you use Route 53
  ],
  credentials: true
}));
```

Redeploy:
```bash
eb deploy
```

---

## 🎨 Part 2: Deploy Frontend (S3 + CloudFront)

### Step 1: Build Frontend

```bash
cd /Users/binyamseyoum/ai-chat-react

# Create production .env file
cat > .env.production << EOF
VITE_API_BASE_URL=https://ai-chat-backend-prod.us-east-1.elasticbeanstalk.com/api
EOF

# Build for production
npm run build
```

### Step 2: Create S3 Bucket

```bash
# Create bucket (must be globally unique name)
aws s3 mb s3://ai-chat-react-frontend-YOUR_NAME

# Enable static website hosting
aws s3 website s3://ai-chat-react-frontend-YOUR_NAME \
  --index-document index.html \
  --error-document index.html

# Upload build files
aws s3 sync dist/ s3://ai-chat-react-frontend-YOUR_NAME --delete

# Make bucket public (for static hosting)
aws s3api put-bucket-policy --bucket ai-chat-react-frontend-YOUR_NAME --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::ai-chat-react-frontend-YOUR_NAME/*"
    }
  ]
}'
```

### Step 3: Create CloudFront Distribution (CDN)

**Via AWS Console** (easier for first time):

1. Go to CloudFront console: https://console.aws.amazon.com/cloudfront
2. Click "Create Distribution"
3. Configure:
   - **Origin domain**: Select your S3 bucket
   - **Origin path**: leave empty
   - **Viewer protocol policy**: Redirect HTTP to HTTPS
   - **Allowed HTTP methods**: GET, HEAD, OPTIONS
   - **Default root object**: index.html
4. Click "Create Distribution"
5. Wait 10-15 minutes for deployment
6. Copy your CloudFront URL: `d123abc.cloudfront.net`

### Step 4: Configure Custom Error Pages (SPA Support)

1. Go to your CloudFront distribution
2. Click "Error Pages" tab
3. Create custom error response:
   - **HTTP error code**: 403
   - **Customize error response**: Yes
   - **Response page path**: /index.html
   - **HTTP response code**: 200
4. Repeat for 404 error code

---

## 🔒 Part 3: Secure API Keys (AWS Secrets Manager)

Instead of using EB environment variables, use Secrets Manager:

```bash
# Create secret for all API keys
aws secretsmanager create-secret \
  --name ai-chat-api-keys \
  --secret-string '{
    "OPENAI_API_KEY": "your_key",
    "GEMINI_API_KEY": "your_key",
    "PINECONE_API_KEY": "your_key",
    "PINECONE_INDEX": "your_index",
    "PINECONE_ENVIRONMENT": "your_env",
    "HUGGINGFACE_API_KEY": "your_key"
  }'
```

Update `server/server.js` to fetch from Secrets Manager (optional, advanced).

---

## 🌐 Part 4: Custom Domain (Optional)

### Step 1: Register Domain (Route 53)

```bash
# Or use existing domain from any registrar
```

### Step 2: Request SSL Certificate (Certificate Manager)

1. Go to AWS Certificate Manager (us-east-1 region for CloudFront)
2. Request public certificate
3. Enter domain: `yourdomain.com` and `*.yourdomain.com`
4. Validate via DNS (Route 53 makes this automatic)

### Step 3: Link CloudFront to Domain

1. Edit CloudFront distribution
2. Add "Alternate Domain Names (CNAMEs)": yourdomain.com
3. Select SSL certificate from Certificate Manager
4. Save changes

### Step 4: Create Route 53 Record

1. Go to Route 53 hosted zone
2. Create A record:
   - Name: yourdomain.com
   - Type: A - IPv4 address
   - Alias: Yes
   - Target: Your CloudFront distribution

---

## 🧪 Testing Your Deployment

```bash
# Test backend
curl https://ai-chat-backend-prod.us-east-1.elasticbeanstalk.com/api/health

# Test frontend
open https://d123abc.cloudfront.net
```

---

## 📊 AWS Cost Estimate

**Monthly costs (with minimal traffic):**
- Elastic Beanstalk (t3.micro): **$8-10**
- S3 storage (1GB): **$0.02**
- CloudFront (10GB transfer): **$0.85**
- Route 53 (hosted zone): **$0.50**
- **Total: ~$10-12/month**

**AWS Free Tier (first 12 months):**
- EC2 t2.micro: 750 hours/month (covers EB instance)
- S3: 5GB storage
- CloudFront: 50GB data transfer
- Certificate Manager: Free forever

With free tier: **~$0-2/month** for the first year!

---

## 🔄 Continuous Deployment

### Option 1: Manual Deployment

```bash
# Backend
cd server && eb deploy

# Frontend
cd .. && npm run build && aws s3 sync dist/ s3://your-bucket --delete
# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

### Option 2: Automated CI/CD (AWS CodePipeline)

1. Create CodePipeline
2. Source: GitHub repository
3. Build: CodeBuild (uses buildspec.yml)
4. Deploy: S3 + CloudFront invalidation

---

## 🛡️ Security Best Practices

1. ✅ Use Secrets Manager for API keys
2. ✅ Enable HTTPS only (CloudFront + Certificate Manager)
3. ✅ Use IAM roles (no hardcoded AWS credentials)
4. ✅ Enable CloudFront access logging
5. ✅ Set up AWS WAF (Web Application Firewall) for production
6. ✅ Enable S3 bucket encryption

---

## 🐛 Troubleshooting

### Backend Issues

```bash
# View logs
eb logs

# SSH into instance
eb ssh

# Check health
eb health

# Restart
eb deploy
```

### Frontend Issues

```bash
# Check S3 sync
aws s3 ls s3://your-bucket

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id ID --paths "/*"
```

---

## 📚 AWS Services You're Demonstrating (For Your Portfolio)

- ✅ **Elastic Beanstalk**: Platform as a Service (PaaS)
- ✅ **S3**: Object storage and static hosting
- ✅ **CloudFront**: Content Delivery Network (CDN)
- ✅ **Route 53**: DNS management
- ✅ **Certificate Manager**: SSL/TLS certificates
- ✅ **Secrets Manager**: Secure credential storage
- ✅ **IAM**: Identity and access management
- ✅ **CloudWatch**: Monitoring and logging (automatic)

This demonstrates full-stack AWS deployment skills!

---

## 🎯 Next Steps

1. Deploy backend to Elastic Beanstalk
2. Deploy frontend to S3 + CloudFront
3. Test the application
4. Set up custom domain (optional)
5. Configure monitoring with CloudWatch
6. Set up CI/CD pipeline (optional)

**Ready to start deploying?** Let me know which part you'd like to begin with!
