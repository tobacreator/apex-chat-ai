# 🚀 Safety Deployment Checklist

## Pre-Deployment Safety Steps

### 1. Initial Health Check
```bash
cd server
node safety-framework.js health
```
**Expected Result**: All tables exist, database connectivity OK, foreign key constraints present

### 2. Create Backup
```bash
node safety-framework.js backup
```
**Expected Result**: Backup metadata saved, data counts recorded

### 3. Generate Current Status Report
```bash
node safety-framework.js report
```
**Expected Result**: Feature flags status, database counts, recommendations

## Deployment Steps (Incremental)

### Step 1: Enable Migration Feature Flag
```bash
node safety-framework.js enable ENABLE_UPLOAD_ID_MIGRATION
```

### Step 2: Run Migration (Safe Mode)
```bash
node safety-framework.js migrate
```
**Expected Result**: upload_id column added successfully, verification passed

### Step 3: Verify Migration
```bash
node safety-framework.js report
```
**Expected Result**: upload_id column shows as EXISTS

### Step 4: Test Cascade Delete (Optional)
```bash
node safety-framework.js test
```
**Expected Result**: Cascade delete test PASSED (if test data exists)

## Rollback Plan

### If Issues Occur:
1. **Disable Feature Flags**:
   ```bash
   node safety-framework.js disable ENABLE_UPLOAD_ID_MIGRATION
   node safety-framework.js disable ENABLE_CASCADE_DELETE
   ```

2. **Manual Rollback** (if needed):
   ```sql
   ALTER TABLE products DROP COLUMN upload_id;
   ```

3. **Restore from Backup** (if available):
   ```bash
   # Manual pg_restore command based on backup
   ```

## Success Criteria

✅ Database connectivity maintained  
✅ All existing data preserved  
✅ upload_id column added successfully  
✅ Foreign key constraint created  
✅ Cascade delete functionality working  
✅ No breaking changes to existing features  

## Monitoring Points

- [ ] Server starts without errors
- [ ] CSV upload functionality works
- [ ] Google Sheets integration works
- [ ] Product deletion works as expected
- [ ] No data loss occurred

## Emergency Contacts

- **Database Issues**: Check PostgreSQL logs
- **Application Issues**: Check server logs
- **Data Loss**: Use backup metadata to assess impact 