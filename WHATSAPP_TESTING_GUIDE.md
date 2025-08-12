# WhatsApp Integration Testing Guide

## **Current Configuration**
- **Twilio WhatsApp Number**: `+14155238886`
- **Database**: Empty (no existing businesses)

## **Testing Scenarios**

### **Scenario 1: New User Onboarding (Recommended for First Test)**

**What to test**: A completely new user sending "Hello" to your Twilio number

**Expected Flow**:
1. User sends "Hello" to `+14155238886`
2. System creates new business with their phone number
3. System responds: "Welcome to ApexChat AI! I'm here to help you automate sales and manage your business. To start, please tell me your business name."
4. User sends business name
5. System confirms setup and moves to product onboarding

**How to test**:
1. Use WhatsApp to send "Hello" to `+14155238886`
2. Check server logs for webhook reception
3. Verify database has new business entry

### **Scenario 2: Existing User (After Scenario 1)**

**What to test**: Same user sending a follow-up message

**Expected Flow**:
1. User sends any message (not "Hello")
2. System finds existing business by phone number
3. System routes to AI controller for response

### **Scenario 3: Different Phone Number Testing**

**What to test**: Using a different phone number than what's in database

**Expected Flow**:
1. Use a different phone number to send "Hello"
2. System should create a new business for this number
3. Each phone number gets its own business account

## **Testing Setup Steps**

### **Step 1: Verify Server is Running**
```bash
curl http://localhost:5000/api/health
```

### **Step 2: Set Up Webhook URL in Twilio**
1. Go to Twilio Console → Messaging → Settings → WhatsApp Sandbox
2. Set Webhook URL to: `https://your-ngrok-url.ngrok.io/api/whatsapp/webhook`
3. Set HTTP Method to: `POST`

### **Step 3: Test Webhook Endpoint**
```bash
# Test webhook verification (GET)
curl -X GET "http://localhost:5000/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=test&hub.verify_token=your_verify_token"

# Test webhook receive (POST)
curl -X POST "http://localhost:5000/api/whatsapp/webhook" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+1234567890&Body=Hello&MessageSid=test123"
```

### **Step 4: Monitor Server Logs**
Watch the server terminal for:
- Webhook reception logs
- Database query logs
- AI response logs
- Twilio response logs

## **Common Issues and Solutions**

### **Issue 1: "No businesses found"**
**Cause**: Phone number mismatch between Twilio and database
**Solution**: 
- For new users: This is expected - system will create new business
- For existing users: Ensure you're using the same phone number

### **Issue 2: "Webhook not received"**
**Cause**: Incorrect webhook URL or server not accessible
**Solution**:
- Verify ngrok is running and forwarding to correct port
- Check Twilio webhook URL configuration
- Ensure server is running on port 5000

### **Issue 3: "Database connection error"**
**Cause**: Database credentials or connection issues
**Solution**:
- Verify `.env` file has correct database credentials
- Check if database is accessible
- Ensure schema is properly migrated

### **Issue 4: "Twilio authentication error"**
**Cause**: Incorrect Twilio credentials
**Solution**:
- Verify `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`
- Ensure credentials are from the same Twilio account

## **Database Verification Queries**

After testing, verify the database state:

```sql
-- Check businesses table
SELECT business_name, whatsapp_phone, status FROM businesses;

-- Check conversations table
SELECT customer_phone, current_state FROM conversations;

-- Check conversation states
SELECT phone_number, state FROM conversation_states;
```

## **Recommended Testing Order**

1. **Start with Scenario 1** (New user with "Hello")
2. **Verify database entries** after each test
3. **Test Scenario 2** (Existing user follow-up)
4. **Test Scenario 3** (Different phone number)
5. **Test error scenarios** (invalid messages, etc.)

## **Debugging Tips**

1. **Enable detailed logging** in the server
2. **Check Twilio logs** in the Twilio Console
3. **Monitor database** for new entries
4. **Use ngrok web interface** to inspect webhook requests
5. **Test with simple messages first** before complex scenarios 