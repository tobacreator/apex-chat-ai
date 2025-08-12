# 📱 WhatsApp Business API Setup Guide

## 🎯 **What You Need**

To integrate ApexChat AI with WhatsApp Business API, you'll need these credentials:

```bash
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_custom_verify_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
```

## 📋 **Step-by-Step Setup**

### **Step 1: Create Meta Developer Account**
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **"Get Started"** or **"Log In"**
3. Complete the developer account setup

### **Step 2: Create WhatsApp Business App**
1. In Meta Developer Console, click **"Create App"**
2. Select **"Business"** as app type
3. Choose **"WhatsApp"** as the product
4. Fill in your app details:
   - **App Name**: `ApexChat AI`
   - **App Contact Email**: Your email
   - **Business Account**: Select or create one

### **Step 3: Get Your Credentials**

#### **A. Access Token**
1. In your app dashboard, go to **"WhatsApp"** → **"Getting Started"**
2. Click **"Configure"** next to "Access Token"
3. Copy the generated token
4. **Add to your `.env` file**: `WHATSAPP_ACCESS_TOKEN=your_token_here`

#### **B. Phone Number ID**
1. Go to **"WhatsApp"** → **"Phone Numbers"**
2. Click **"Add Phone Number"**
3. Enter your business phone number (must be real)
4. Copy the **Phone Number ID** (long number)
5. **Add to your `.env` file**: `WHATSAPP_PHONE_NUMBER_ID=your_phone_id_here`

#### **C. Business Account ID**
1. In **"WhatsApp"** → **"Getting Started"**
2. Copy the **Business Account ID**
3. **Add to your `.env` file**: `WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_id_here`

#### **D. Verify Token**
1. Choose any secure string (e.g., `apexchat_ai_verify_token`)
2. **Add to your `.env` file**: `WHATSAPP_VERIFY_TOKEN=your_verify_token_here`

### **Step 4: Configure Webhook**
1. Go to **"WhatsApp"** → **"Configuration"**
2. Set **Webhook URL**: `https://your-domain.com/api/whatsapp/webhook`
3. Set **Verify Token**: Same as your `WHATSAPP_VERIFY_TOKEN`
4. Subscribe to these webhook fields:
   - ✅ `messages`
   - ✅ `message_status`
   - ✅ `message_template_status`

### **Step 5: Test Your Setup**
1. Start your server: `npm run dev`
2. Send a test message to your WhatsApp business number
3. Check server logs for webhook reception

## 🔧 **Environment Variables Template**

Add these to your `server/.env` file:

```bash
# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=apexchat_ai_verify_token
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id

# Your existing variables...
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=your_db_host
DB_NAME=your_db_name
DB_PORT=5432
PORT=5000
ENABLE_TEMPLATE_DOWNLOAD=true
```

## 🚨 **Important Notes**

### **Phone Number Requirements**
- Must be a **real phone number** you own
- Must be **verified** with Meta
- Can be your personal number for testing

### **Webhook Requirements**
- Must be **HTTPS** (not HTTP)
- Must be **publicly accessible**
- For development, use **ngrok** or similar

### **Rate Limits**
- **Free tier**: 1,000 messages/month
- **Business tier**: Higher limits available

## 🛠 **Development Setup with ngrok**

For local development, use ngrok to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Start your server
npm run dev

# In another terminal, expose your server
ngrok http 5000

# Use the HTTPS URL as your webhook URL
# Example: https://abc123.ngrok.io/api/whatsapp/webhook
```

## ✅ **Verification Checklist**

- [ ] Meta Developer Account created
- [ ] WhatsApp Business App created
- [ ] Access Token obtained
- [ ] Phone Number ID obtained
- [ ] Business Account ID obtained
- [ ] Verify Token set
- [ ] Webhook URL configured
- [ ] Environment variables added to `.env`
- [ ] Server restarted with new variables
- [ ] Test message sent successfully

## 🆘 **Common Issues**

### **Webhook Verification Fails**
- Check that your verify token matches exactly
- Ensure webhook URL is accessible
- Verify HTTPS is used

### **Messages Not Received**
- Check phone number is verified
- Ensure webhook fields are subscribed
- Verify access token is valid

### **Rate Limit Exceeded**
- Upgrade to Business tier
- Implement message queuing
- Add rate limiting to your app

## 📞 **Support**

If you encounter issues:
1. Check [Meta Developer Documentation](https://developers.facebook.com/docs/whatsapp)
2. Review [WhatsApp Business API Guide](https://developers.facebook.com/docs/whatsapp/cloud-api)
3. Contact Meta Developer Support 