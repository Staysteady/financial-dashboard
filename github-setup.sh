#!/bin/bash

# GitHub Repository Setup Script for Financial Dashboard
# Run this script after creating the repository on GitHub

echo "🚀 Setting up GitHub repository for Financial Dashboard..."

# Check if GitHub username is provided
if [ -z "$1" ]; then
    echo "❌ Please provide your GitHub username as an argument"
    echo "Usage: ./github-setup.sh YOUR_GITHUB_USERNAME"
    exit 1
fi

GITHUB_USERNAME=$1
REPO_NAME="financial-dashboard"

echo "📝 GitHub Username: $GITHUB_USERNAME"
echo "📁 Repository Name: $REPO_NAME"

# Add remote origin
echo "🔗 Adding remote origin..."
git remote add origin https://github.com/$GITHUB_USERNAME/$REPO_NAME.git

# Set main branch
echo "🌿 Setting main branch..."
git branch -M main

# Push to GitHub
echo "⬆️ Pushing to GitHub..."
git push -u origin main

echo "✅ Successfully pushed Financial Dashboard to GitHub!"
echo "🌐 Repository URL: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
echo ""
echo "📋 Next steps:"
echo "1. Visit your repository on GitHub"
echo "2. Add any additional collaborators if needed"
echo "3. Set up branch protection rules (optional)"
echo "4. Configure GitHub Actions for CI/CD (optional)"
echo ""
echo "🎉 Your Financial Dashboard is now on GitHub and ready for development!"
