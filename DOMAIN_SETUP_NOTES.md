# Domain Setup Notes

## Current Temporary Configuration

### Staging Environment
- **URL**: `http://localhost:3000`
- **Purpose**: Local development and testing
- **Status**: ✅ Configured for CI/CD pipeline

### Production Environment  
- **URL**: `http://localhost:5000`
- **Purpose**: Local production simulation
- **Status**: ✅ Configured for CI/CD pipeline

## When Your Domain is Ready

### Update These Files:
1. `.github/environments/staging.yml`
   ```yaml
   url: https://staging.apexchatai.com
   ```

2. `.github/environments/production.yml`
   ```yaml
   url: https://apexchatai.com
   ```

3. `.github/workflows/deploy.yml`
   - Update both `deploy-staging` and `deploy-production` job URLs

### Quick Update Commands:
```bash
# After updating the files
git add .github/
git commit -m "Update environment URLs to production domains"
git push origin main
```

## Benefits of Current Setup

✅ **CI/CD Pipeline Works** - No more deployment failures  
✅ **Development Continues** - No pipeline interruptions  
✅ **Easy to Update** - Simple URL changes when ready  
✅ **Local Testing** - Deploy to localhost for verification  

## Port Mappings

- **Client (Next.js)**: Port 3000 (staging)
- **Server (Node.js)**: Port 5000 (production)
- **Database**: Configure as needed
- **Other Services**: Add as required

---

**Last Updated**: $(date)
**Status**: Temporary localhost configuration active
**Next Action**: Update URLs when domains are ready
