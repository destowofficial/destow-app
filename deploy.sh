#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Default values
STACK_NAME="destow-serverless-stack"
ENVIRONMENT_NAME="dev"

# Help message
function show_help {
    echo "Usage: ./deploy.sh -b <s3-bucket-name> [-s <stack-name>] [-e <environment-name>] [-u <db-username>] [-n <db-name>] [-p <db-password>] [-j <jwt-secret>]"
    echo ""
    echo "Options:"
    echo "  -b    (Required) S3 Bucket name for uploading the deployment package"
    echo "  -s    (Optional) CloudFormation Stack name (default: $STACK_NAME)"
    echo "  -e    (Optional) Environment name (default: $ENVIRONMENT_NAME)"
    echo "  -u    (Optional) RDS PostgreSQL username (default: destow_admin)"
    echo "  -n    (Optional) RDS PostgreSQL database name (default: destow)"
    echo "  -p    (Optional) RDS PostgreSQL password. Letters/numbers only, min 16 chars"
    echo "  -j    (Optional) JWT secret, min 16 chars"
    exit 1
}

# Parse command-line arguments
while getopts "b:s:e:u:n:p:j:h" opt; do
    case "$opt" in
        b) S3_BUCKET=$OPTARG ;;
        s) STACK_NAME=$OPTARG ;;
        e) ENVIRONMENT_NAME=$OPTARG ;;
        u) DB_USERNAME=$OPTARG ;;
        n) DB_NAME=$OPTARG ;;
        p) DB_PASSWORD=$OPTARG ;;
        j) JWT_SECRET=$OPTARG ;;
        h|*) show_help ;;
    esac
done

if [ -z "$S3_BUCKET" ]; then
    echo "Error: S3 bucket name (-b) is required."
    show_help
fi

DB_USERNAME=${DB_USERNAME:-destow_admin}
DB_NAME=${DB_NAME:-destow}

if [ -z "$DB_PASSWORD" ]; then
    read -r -s -p "Enter RDS password (letters/numbers only, min 16 chars): " DB_PASSWORD
    echo ""
fi

if [ -z "$JWT_SECRET" ]; then
    read -r -s -p "Enter JWT secret (min 16 chars): " JWT_SECRET
    echo ""
fi

echo -e "\033[1;36m==============================================\033[0m"
echo -e "\033[1;36m🚀 Starting Destow Backend AWS Deployment...\033[0m"
echo -e "\033[1;36m==============================================\033[0m"

# 1. Install dependencies
echo -e "\n\033[1;33m[1/4] Installing and building backend dependencies...\033[0m"
npm install
npx turbo run build --filter=destow-backend

# 2. Package the CloudFormation template
echo -e "\n\033[1;33m[2/4] Packaging and uploading code to S3 bucket ($S3_BUCKET)...\033[0m"
aws cloudformation package \
    --template-file cloudformation.yaml \
    --s3-bucket "$S3_BUCKET" \
    --output-template-file packaged.yaml

# 3. Deploy the packaged template
echo -e "\n\033[1;33m[3/4] Deploying CloudFormation Stack ($STACK_NAME)...\033[0m"
aws cloudformation deploy \
    --template-file packaged.yaml \
    --stack-name "$STACK_NAME" \
    --capabilities CAPABILITY_IAM \
    --parameter-overrides \
        EnvironmentName="$ENVIRONMENT_NAME" \
        DBName="$DB_NAME" \
        DBUsername="$DB_USERNAME" \
        DBPassword="$DB_PASSWORD" \
        JWTSecret="$JWT_SECRET"

# 4. Fetch the API URL
echo -e "\n\033[1;33m[4/4] Fetching API URL...\033[0m"
API_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
    --output text)

echo -e "\n\033[1;32m==============================================\033[0m"
echo -e "\033[1;32m✅ Deployment Successful!\033[0m"
echo -e "\033[1;32m🌐 Your API Base URL is: $API_URL\033[0m"
echo -e "\033[1;32m==============================================\033[0m"
