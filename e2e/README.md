# End-to-End Tests

This directory contains comprehensive end-to-end tests for the Financial Dashboard application using Playwright.

## Test Coverage

### 🔐 Authentication Flows (`auth.spec.ts`)
- Landing page display and navigation
- Sign-in and sign-up form validation
- Error handling for invalid credentials
- Form accessibility and keyboard navigation
- Mobile responsiveness
- Loading states

### 📊 Dashboard Navigation (`dashboard.spec.ts`)
- Main dashboard layout and widgets
- Navigation between dashboard sections
- Account overview and recent transactions
- Spending analysis charts
- Responsive design (tablet/mobile)
- Loading and error states
- Keyboard navigation

### 💰 Transaction Management (`transactions.spec.ts`)
- Transaction list display and pagination
- Search and filtering functionality
- Date range and category filtering
- Transaction details and categorization
- Export functionality (CSV/PDF)
- Bulk operations
- Mobile interactions

### 📈 Analytics and Reporting (`analytics.spec.ts`)
- Chart rendering and interactions
- Time period filtering
- Financial health metrics
- Spending insights and recommendations
- Budget comparison charts
- Export analytics data
- Responsive chart design

### 🏦 Account Management (`accounts.spec.ts`)
- Account overview and summary
- Add account flows (bank connection/manual)
- Account details and settings
- Balance history charts
- Connection status indicators
- Account filtering and sorting
- Account deletion workflows

### 🎯 Financial Goals (`goals.spec.ts`)
- Goals overview and progress tracking
- Create and edit goal functionality
- Goal progress updates
- Category filtering
- Goal achievement notifications
- Progress charts
- Goal deletion with confirmation

### 🚀 Smoke Tests (`smoke.spec.ts`)
- Critical path validation
- Homepage and authentication pages
- All main dashboard pages
- 404 error handling
- Mobile responsiveness
- JavaScript graceful degradation

## Test Configuration

### Playwright Configuration (`../playwright.config.ts`)
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile**: Pixel 5, iPhone 12
- **Base URL**: http://localhost:3001
- **Features**: Screenshots, traces, video recording
- **Auto-start**: Development server

### Test Structure
```
e2e/
├── auth.spec.ts           # Authentication flows
├── dashboard.spec.ts      # Dashboard navigation
├── transactions.spec.ts   # Transaction management
├── analytics.spec.ts      # Analytics and reporting
├── accounts.spec.ts       # Account management
├── goals.spec.ts          # Financial goals
├── smoke.spec.ts          # Critical path tests
└── README.md             # This file
```

## Running Tests

### All Tests
```bash
npm run test:e2e          # Run all e2e tests
npx playwright test       # Direct Playwright command
```

### Specific Test Files
```bash
npx playwright test auth.spec.ts           # Authentication tests
npx playwright test dashboard.spec.ts      # Dashboard tests
npx playwright test smoke.spec.ts          # Smoke tests only
```

### Interactive Mode
```bash
npm run test:e2e:ui       # Run with Playwright UI
npm run test:e2e:headed   # Run in headed mode (visible browser)
```

### Browser-Specific
```bash
npx playwright test --project=chromium     # Chrome only
npx playwright test --project=firefox      # Firefox only
npx playwright test --project=webkit       # Safari only
```

### Debug Mode
```bash
npx playwright test --debug               # Debug mode
npx playwright test --headed              # See browser actions
npx playwright show-report               # View HTML report
```

## Test Patterns

### Page Object Pattern
Tests use direct locator strategies for maintainability:
```typescript
await page.locator('text=Dashboard').click();
await expect(page.locator('h1')).toContainText('Dashboard');
```

### Responsive Testing
Tests include viewport changes for mobile/tablet:
```typescript
await page.setViewportSize({ width: 375, height: 667 });
```

### Error Handling
Tests validate both success and error scenarios:
```typescript
const errorMessage = page.locator('text=Error loading');
if (await errorMessage.isVisible()) {
  await expect(errorMessage).toBeVisible();
}
```

### Accessibility
Tests include keyboard navigation and screen reader considerations:
```typescript
await page.keyboard.press('Tab');
await expect(page.locator(':focus')).toBeVisible();
```

## Test Data Strategy

### Mock Data Usage
Tests rely on the application's existing mock data system for consistent results.

### Test Isolation
Each test starts with a clean state and doesn't depend on other tests.

### Environment Variables
Tests use test-specific environment variables when needed.

## Continuous Integration

### GitHub Actions Ready
Tests are configured for CI/CD pipelines with:
- Headless execution
- Screenshot capture on failure
- Test result artifacts
- Parallel execution

### Docker Support
Playwright includes Docker support for consistent testing environments.

## Troubleshooting

### Common Issues

1. **Timeout Errors**: Increase timeout for slow components
2. **Element Not Found**: Check for dynamic content loading
3. **Server Not Starting**: Ensure port 3001 is available
4. **Browser Installation**: Run `npx playwright install`

### Debug Commands
```bash
npx playwright test --debug --project=chromium
npx playwright test --trace=on
npx playwright show-report
```

### Test Reports
- HTML reports generated in `test-results/`
- Screenshots saved on test failures
- Trace files for debugging

## Best Practices

### Test Writing
- Use descriptive test names
- Group related tests with `describe` blocks
- Use `beforeEach` for common setup
- Test both happy path and error scenarios

### Locator Strategy
- Prefer text content over CSS selectors
- Use data-testid for complex components
- Chain locators for nested elements
- Use `.or()` for fallback locators

### Assertions
- Use appropriate Playwright assertions
- Test visibility before interaction
- Verify state changes after actions
- Include timeout adjustments when needed

### Maintenance
- Update selectors when UI changes
- Review tests after feature additions
- Keep test data realistic and relevant
- Regular cleanup of outdated tests

## Future Enhancements

### Planned Additions
- Visual regression testing
- Performance testing integration
- API testing with Playwright
- Database state validation
- Cross-browser compatibility matrix

### Advanced Features
- Test parallelization optimization
- Custom Playwright fixtures
- Page Object Model implementation
- Test data factories
- Advanced reporting integrations