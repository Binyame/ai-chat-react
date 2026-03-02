#!/bin/bash

# AWS Deployment Script for AI Chat React Application
# This script helps deploy both frontend and backend to AWS

set -e  # Exit on error

echo "🚀 AI Chat React - AWS Deployment Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed"
    echo "Install it from: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if EB CLI is installed
if ! command -v eb &> /dev/null; then
    print_warning "Elastic Beanstalk CLI is not installed"
    echo "Install it: pip install awsebcli --upgrade --user"
    echo "Continuing without EB CLI..."
fi

echo ""
echo "Select deployment target:"
echo "1) Backend (Elastic Beanstalk)"
echo "2) Frontend (S3 + CloudFront)"
echo "3) Both"
read -p "Enter your choice (1-3): " choice

case $choice in
    1|3)
        echo ""
        echo "📦 Deploying Backend to Elastic Beanstalk..."
        echo "============================================="

        if command -v eb &> /dev/null; then
            cd server/

            # Check if EB is initialized
            if [ ! -d ".elasticbeanstalk" ]; then
                print_warning "Elastic Beanstalk not initialized"
                echo "Run: cd server && eb init"
                exit 1
            fi

            print_success "Deploying to Elastic Beanstalk..."
            eb deploy

            print_success "Backend deployed successfully!"
            echo ""
            echo "Get your backend URL with: eb status"

            cd ..
        else
            print_error "EB CLI not found. Install it to deploy backend."
        fi

        if [ "$choice" -eq 1 ]; then
            exit 0
        fi
        ;;
esac

case $choice in
    2|3)
        echo ""
        echo "🎨 Deploying Frontend to S3 + CloudFront..."
        echo "==========================================="

        # Check if .env.production exists
        if [ ! -f ".env.production" ]; then
            print_warning ".env.production not found"
            echo "Creating from example..."
            cp .env.production.example .env.production
            print_error "Please edit .env.production with your backend URL"
            exit 1
        fi

        # Build frontend
        print_success "Building React app..."
        npm run build

        # Ask for S3 bucket name
        read -p "Enter your S3 bucket name: " BUCKET_NAME

        if [ -z "$BUCKET_NAME" ]; then
            print_error "Bucket name cannot be empty"
            exit 1
        fi

        # Check if bucket exists
        if ! aws s3 ls "s3://${BUCKET_NAME}" 2>&1 > /dev/null; then
            print_warning "Bucket does not exist. Creating..."
            aws s3 mb "s3://${BUCKET_NAME}"
            print_success "Bucket created"
        fi

        # Sync files to S3
        print_success "Uploading files to S3..."
        aws s3 sync dist/ "s3://${BUCKET_NAME}" --delete

        # Ask if they want to invalidate CloudFront
        read -p "Do you have a CloudFront distribution? (y/n): " has_cf

        if [ "$has_cf" = "y" ] || [ "$has_cf" = "Y" ]; then
            read -p "Enter CloudFront Distribution ID: " DIST_ID

            if [ ! -z "$DIST_ID" ]; then
                print_success "Invalidating CloudFront cache..."
                aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*"
                print_success "CloudFront cache invalidated"
            fi
        fi

        print_success "Frontend deployed successfully!"
        echo ""
        echo "Your app is available at:"
        echo "S3: http://${BUCKET_NAME}.s3-website-$(aws configure get region).amazonaws.com"

        if [ ! -z "$DIST_ID" ]; then
            CF_DOMAIN=$(aws cloudfront get-distribution --id "$DIST_ID" --query 'Distribution.DomainName' --output text)
            echo "CloudFront: https://${CF_DOMAIN}"
        fi
        ;;
esac

echo ""
print_success "Deployment completed!"
echo ""
echo "📚 For detailed deployment guide, see: aws-deploy.md"
