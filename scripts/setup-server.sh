#!/bin/bash
set -e

echo "========================================="
echo "  MattBot EC2 First-Time Server Setup"
echo "========================================="

# Update system
echo "[1/6] Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# Install Docker
echo "[2/6] Installing Docker..."
sudo apt-get install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add current user to docker group
echo "[3/6] Configuring Docker permissions..."
sudo usermod -aG docker $USER
echo "NOTE: You may need to log out and back in for docker group to take effect."

# Install Git
echo "[4/6] Installing Git..."
sudo apt-get install -y git

# Create app directory
echo "[5/6] Creating application directory..."
mkdir -p ~/mattbot
cd ~/mattbot

# Clone repository
echo "[6/6] Cloning repository..."
if [ -d ".git" ]; then
    echo "Repository already cloned, pulling latest..."
    git pull origin main
else
    echo "Enter your GitHub repo URL (e.g., https://github.com/username/mattbot.git):"
    read REPO_URL
    git clone "$REPO_URL" .
fi

echo ""
echo "========================================="
echo "  Server setup complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Log out and log back in (for Docker permissions)"
echo "2. Create backend/.env and realtime/.env files"
echo "3. Run: docker compose up -d"
echo ""
