
# AI Test Case Automation

An AI-powered browser testing tool that converts plain-English test cases into automated browser actions using **Groq AI** and **Playwright**.

## Features

- Converts natural-language test instructions into structured browser actions
- Automates browser interactions using Playwright
- Supports navigation, clicking, form filling, and verification
- Uses environment variables for test credentials
- Reports test execution as PASS or FAIL
- Displays failure details to help with debugging

## Tech Stack

- Node.js
- JavaScript
- Groq AI API
- Playwright
- dotenv

## How It Works

1. The user writes a test case in `test-case.txt`.
2. Groq AI interprets the instructions and generates structured test steps.
3. Playwright executes the generated steps in a browser.
4. The tool verifies the expected results.
5. The execution result is displayed as PASS or FAIL.

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/psuchi/AI-Test-Automation-.git
cd AI-Test-Automation-
```

### 2. Install dependencies

```bash
npm install
npx playwright install chromium
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key
TEST_EMAIL=your_test_email
TEST_PASSWORD=your_test_password
```

Do not share or commit your `.env` file.

### 4. Add a test case

Write your test instructions in `test-case.txt`.

Example:

```text
Open https://phptravels.net/.
Dismiss the demo notice.
Click Login.
Enter the customer test email and password.
Click Sign In to your account.
Verify that the dashboard appears.
Print PASS if the dashboard appears. Otherwise print FAIL.
```

### 5. Run the automation

```bash
node index.js
```

The browser will open and execute the test steps.

## Example Result

```text
Sending test case to Groq AI...
AI-generated steps:
[Generated browser actions]

Starting browser automation...

TEST RESULT: PASS
All test steps completed successfully.
```

## Project Structure

```text
AI-Test-Automation/
├── index.js
├── test-case.txt
├── package.json
├── package-lock.json
├── .env
└── .gitignore
```

## Future Improvements

- Support for more websites and test scenarios
- Screenshot capture on test failure
- HTML test reports
- Improved element detection and recovery
- Support for additional AI models
