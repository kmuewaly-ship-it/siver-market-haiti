#!/bin/bash
# Testing Guide - Unit Tests for Cart System

## Quick Start

### Install Dependencies (if needed)
npm install

### Run All Tests
npm run test

### Run Tests in Watch Mode
npm run test:watch

### Run Tests with Coverage Report
npm run test:coverage

---

## Test Organization

### Validation Tests
File: src/services/checkoutValidation.test.ts
Tests: 18 cases
Coverage: Checkout validation logic for B2C and B2B

Run only validation tests:
npm test -- checkoutValidation

### Cart Sync Tests  
File: src/hooks/useCartSync.test.ts
Tests: 12 cases
Coverage: Cross-tab synchronization via storage events

Run only sync tests:
npm test -- useCartSync

### B2C Cart Tests
File: src/hooks/useB2CCartItems.test.ts
Tests: 10 cases
Coverage: B2C cart loading, real-time updates, calculations

Run only B2C tests:
npm test -- useB2CCartItems

### B2B Cart Tests
File: src/hooks/useB2BCartItems.test.ts
Tests: 10 cases
Coverage: B2B cart loading, bulk quantities, real-time updates

Run only B2B tests:
npm test -- useB2BCartItems

---

## Expected Results

After running tests, you should see:

✓ src/services/checkoutValidation.test.ts (18 tests)
✓ src/hooks/useCartSync.test.ts (12 tests)
✓ src/hooks/useB2CCartItems.test.ts (10 tests)
✓ src/hooks/useB2BCartItems.test.ts (10 tests)

Test Files  4 passed (4)
Tests  50 passed (50)
Duration  ~2-3s

---

## Debug Mode

Run tests with verbose output:
npm test -- --reporter=verbose

Run single test file:
npm test -- src/services/checkoutValidation.test.ts

Run tests matching pattern:
npm test -- --grep "validation"
npm test -- --grep "B2C"
npm test -- --grep "broadcast"

---

## Coverage Report

Generate detailed coverage report:
npm run test:coverage

View HTML coverage report:
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows

Coverage includes:
- Statement coverage
- Branch coverage  
- Function coverage
- Line coverage

---

## CI/CD Integration

For GitHub Actions:
name: Tests
run: npm run test

For GitLab CI:
script:
  - npm run test
  - npm run test:coverage

For Jenkins:
stage('Test') {
  steps {
    sh 'npm run test'
  }
}

---

## Troubleshooting

### "Cannot find module" errors
Solution: npm install

### "Vitest not found"
Solution: npm install -D vitest

### Timeout errors
Solution: Increase timeout in vitest.config.ts
test: {
  testTimeout: 10000,
}

### Mock issues
Solution: Ensure vi.mock() calls are before imports
import { describe, it, expect, vi } from 'vitest'
vi.mock('@/path', () => ({}))
import { Component } from '@/path'

### Port already in use
Solution: Kill process or use different port
npm test -- --reporter=html

---

## Performance Tips

Run single file for faster feedback:
npm test -- checkoutValidation.test.ts

Use --bail flag to stop at first failure:
npm test -- --bail

Run in headless mode (faster):
npm test -- --reporter=text

---

## Advanced Usage

UI Mode (visual test runner):
npm test -- --ui

Debug Mode (Node debugger):
node --inspect-brk node_modules/vitest/vitest.mjs

Profile tests:
npm test -- --reporter=verbose 2>&1 | tail -20

---

## Common Commands Quick Reference

# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Specific file
npm test -- checkoutValidation.test.ts

# Specific test
npm test -- --grep "should return error"

# UI mode
npm test -- --ui

# Verbose output
npm test -- --reporter=verbose

# Stop at first failure
npm test -- --bail

---

## Test Structure

Each test file follows this structure:

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('Feature Name', () => {
  // Setup
  beforeEach(() => {
    // Cleanup and reset
  })

  // Tests
  it('should do something', () => {
    // Arrange
    const input = ...
    
    // Act
    const result = ...
    
    // Assert
    expect(result).toBe(...)
  })

  // Teardown
  afterEach(() => {
    // Cleanup
  })
})
```

---

## Assertion Reference

Common assertions used in tests:

expect(value).toBe(expected)           // Strict equality
expect(value).toEqual(expected)        // Deep equality
expect(array).toHaveLength(3)          // Array/string length
expect(array).toContain(item)          // Array contains item
expect(func).toHaveBeenCalled()       // Function was called
expect(func).toHaveBeenCalledTimes(2) // Called N times
expect(value).toBeDefined()            // Not undefined
expect(value).toBeNull()               // Is null
expect(condition).toBeTruthy()         // Truthy value
expect(condition).toBeFalsy()          // Falsy value
expect(() => {}).not.toThrow()        // No error thrown

---

## Maintenance

### Add New Tests
1. Create test file next to source
2. Follow naming: `*.test.ts` or `*.spec.ts`
3. Use same structure as existing tests
4. Run tests to verify

### Update Existing Tests
1. Modify test file
2. Run specific test: npm test -- filename.test.ts
3. Verify coverage: npm run test:coverage
4. Commit changes

### Remove Tests
1. Delete test file
2. Run full test suite: npm run test
3. Verify no regressions
4. Commit removal

---

## Notes

- Tests use Vitest framework
- React Testing Library for component testing
- Mocks for external dependencies (Supabase, hooks)
- jsdom environment for DOM testing
- Global test utilities enabled

---

## Contact

For test-related issues:
- Check vitest.config.ts for configuration
- Review src/test/setup.ts for global setup
- Check test file comments for context
- Run specific test for detailed output

Happy testing! ✓
