# CI/CD Pipeline Test

This file is used to test the GitHub Actions workflows.

## Test Details

- **Date**: November 14, 2025
- **Purpose**: Verify CI/CD pipeline execution
- **Expected Workflows**:
  - ✅ Backend Tests (Python 3.11, 3.12, 3.13)
  - ✅ Frontend Tests (Node 18.x, 20.x)
  - ✅ Security Scanning (Daily + on push)
  - ⏳ Deployment (Requires secrets configuration)
  - ⏳ PR Validation (Only on PRs)

## Status

Workflows will be triggered when this file is pushed to main branch.

Check status at: https://github.com/harssh-ssarma/SIH28/actions
