# CI/CD Pipeline Troubleshooting Guide

## Overview
This guide helps resolve common issues with the ApexChat AI Platform CI/CD pipeline.

## Common Issues & Solutions

### 1. Build Failures

#### Client Build Issues
**Problem**: Next.js build fails with path alias errors
**Solution**: 
- Ensure `tsconfig.json` has correct `baseUrl` and `paths` configuration
- Verify all `@/*` imports resolve correctly
- Check that `next.config.ts` is properly configured

**Problem**: Missing environment variables
**Solution**:
- Set `NEXT_PUBLIC_API_BASE_URL` in CI environment
- Add fallback values in `next.config.ts`

#### Server Build Issues
**Problem**: TypeScript compilation fails
**Solution**:
- Check `tsconfig.json` path aliases match actual directory structure
- Ensure all imports use correct paths
- Verify `skipLibCheck` is enabled for CI builds

### 2. Test Failures

#### Missing Test Scripts
**Problem**: CI tries to run non-existent tests
**Solution**:
- Add `"test": "echo 'No tests configured yet' && exit 0"` to package.json
- Use `continue-on-error: true` for optional test steps

#### Jest Configuration Issues
**Problem**: Tests fail due to path alias resolution
**Solution**:
- Update `jest.config.ts` with proper `moduleNameMapping`
- Ensure test files are in correct directories

### 3. Dependency Issues

#### npm ci Failures
**Problem**: Package installation fails
**Solution**:
- Use `--prefer-offline --no-audit` flags
- Clear npm cache: `npm cache clean --force`
- Check for lock file conflicts

#### Security Audit Warnings
**Problem**: High severity vulnerabilities block deployment
**Solution**:
- Use `continue-on-error: true` for audit steps
- Review and update vulnerable packages
- Set appropriate audit levels

### 4. Path Alias Resolution

#### Import Errors
**Problem**: `@/*` imports fail in CI
**Solution**:
- Verify `tsconfig.json` paths configuration
- Check `baseUrl` setting
- Ensure directory structure matches path aliases

#### Build vs Development
**Problem**: Works locally but fails in CI
**Solution**:
- Use `--skipLibCheck` for CI builds
- Verify all dependencies are in `package.json`
- Check for environment-specific configurations

## Debugging Steps

### 1. Check Workflow Logs
```bash
# View specific job logs
gh run view <run-id> --log

# Download logs for offline analysis
gh run download <run-id>
```

### 2. Local Testing
```bash
# Test client build locally
cd client
npm ci
npm run build

# Test server build locally
cd server
npm ci
npm run build

# Test TypeScript compilation
npx tsc --noEmit --skipLibCheck
```

### 3. Environment Validation
```bash
# Check Node.js version
node --version

# Verify npm configuration
npm config list

# Check TypeScript version
npx tsc --version
```

## Workflow Improvements

### 1. Better Error Handling
- Use `continue-on-error: true` for non-critical steps
- Add conditional execution with `if` statements
- Implement proper artifact handling

### 2. Caching Optimization
- Use `cache-dependency-path` for npm caching
- Implement build artifact caching
- Optimize dependency installation

### 3. Parallel Execution
- Run independent jobs in parallel
- Use matrix builds for multiple projects
- Optimize job dependencies

## Monitoring & Alerts

### 1. Status Checks
- Monitor required status checks in environments
- Set up branch protection rules
- Configure deployment gates

### 2. Performance Metrics
- Track build times
- Monitor artifact sizes
- Measure dependency installation speed

### 3. Failure Analysis
- Log common failure patterns
- Track resolution times
- Document solutions for future reference

## Emergency Procedures

### 1. Pipeline Rollback
```bash
# Revert to previous working commit
git revert HEAD

# Force push to trigger new CI run
git push --force-with-lease origin main
```

### 2. Manual Deployment
```bash
# Skip CI and deploy manually
git commit --allow-empty -m "Manual deployment trigger"
git push origin main
```

### 3. Hotfix Process
```bash
# Create hotfix branch
git checkout -b hotfix/urgent-fix

# Make changes and test locally
# Push and create PR
git push origin hotfix/urgent-fix
```

## Best Practices

### 1. Code Quality
- Run linting locally before pushing
- Use TypeScript strict mode
- Implement proper error handling

### 2. Testing Strategy
- Write unit tests for critical functions
- Implement integration tests
- Use test coverage reporting

### 3. Security
- Regular dependency updates
- Security audit automation
- Vulnerability scanning

### 4. Documentation
- Keep troubleshooting guide updated
- Document configuration changes
- Maintain deployment procedures

## Support Resources

### 1. GitHub Actions
- [Official Documentation](https://docs.github.com/en/actions)
- [Community Discussions](https://github.com/actions/community)
- [Marketplace](https://github.com/marketplace?type=actions)

### 2. Next.js
- [Deployment Guide](https://nextjs.org/docs/deployment)
- [Build Optimization](https://nextjs.org/docs/advanced-features/compiler)

### 3. TypeScript
- [Path Mapping](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- [Compiler Options](https://www.typescriptlang.org/tsconfig)

---

**Last Updated**: $(date)
**Version**: 1.0.0
**Status**: ✅ Active and Maintained
