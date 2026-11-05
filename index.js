
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const Groq = require("groq-sdk");
const { chromium } = require("playwright");
const fs = require("fs");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Convert plain-English instructions into structured browser actions
async function getTestSteps(testCase) {
  const prompt = `
Convert this plain-English browser test into JSON automation steps.

Return ONLY valid JSON in this format:
{
  "steps": [
    { "action": "navigate", "url": "https://example.com" },
    { "action": "click", "text": "Login" },
    { "action": "fillEmail" },
    { "action": "fillPassword" },
    { "action": "click", "text": "Sign In" },
    { "action": "verifyVisible", "text": "Dashboard" }
  ]
}

Allowed actions:
- navigate: requires url
- click: requires text
- fillEmail: use the test email from the environment
- fillPassword: use the test password from the environment
- verifyVisible: requires text
- verifyUrl: requires urlPart

Rules:
- Do not invent login credentials.
- If the test asks to enter the test email/password, use fillEmail and fillPassword.
- Preserve the order of the test instructions.
- Include only actions needed for the test.
- Return JSON only.

Plain-English test:
${testCase}
`;

  const response = await groq.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content);
}

// Click text or a button, including text inside frames
async function clickText(page, text) {
  const frames = page.frames();

  for (const frame of frames) {
    try {
      const button = frame.getByRole("button", {
        name: new RegExp(escapeRegex(text), "i"),
      }).first();

      if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
        await button.click({ timeout: 5000 });
        return;
      }

      const link = frame.getByRole("link", {
        name: new RegExp(escapeRegex(text), "i"),
      }).first();

      if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
        await link.click({ timeout: 5000 });
        return;
      }

      const textLocator = frame.getByText(text, { exact: false }).first();

      if (await textLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
        await textLocator.click({ timeout: 5000 });
        return;
      }
    } catch {
      // Try the next frame
    }
  }

  throw new Error(`Could not find clickable element: "${text}"`);
}

// Fill the email field
async function fillEmail(page) {
  const email = process.env.TEST_EMAIL;

  if (!email) {
    throw new Error("TEST_EMAIL is missing from your .env file.");
  }

  const selectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[placeholder*="email" i]',
    'input[id*="email" i]',
  ];

  for (const selector of selectors) {
    const field = page.locator(selector).first();

    if (await field.isVisible({ timeout: 2000 }).catch(() => false)) {
      await field.fill(email);
      return;
    }
  }

  throw new Error("Could not find the email input field.");
}

// Fill the password field
async function fillPassword(page) {
  const password = process.env.TEST_PASSWORD;

  if (!password) {
    throw new Error("TEST_PASSWORD is missing from your .env file.");
  }

  const field = page.locator('input[type="password"]').first();

  if (await field.isVisible({ timeout: 5000 }).catch(() => false)) {
    await field.fill(password);
    return;
  }

  throw new Error("Could not find the password input field.");
}

// Verify that expected text appears
async function verifyVisible(page, text) {
  const expected = new RegExp(escapeRegex(text), "i");

  const locator = page.getByText(expected).first();

  await locator.waitFor({
    state: "visible",
    timeout: 10000,
  });
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Execute AI-generated steps using Playwright
async function runTest(steps) {
  const browser = await chromium.launch({
    headless: false,
  });

  const page = await browser.newPage();

  try {
    for (const step of steps) {
      console.log(`Running step: ${step.action}`);

      switch (step.action) {
        case "navigate":
          await page.goto(step.url, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });
          await page.waitForTimeout(2000);
          break;

        case "click":
          await clickText(page, step.text);
          await page.waitForTimeout(2000);
          break;

        case "fillEmail":
          await fillEmail(page);
          break;

        case "fillPassword":
          await fillPassword(page);
          break;

        case "verifyVisible":
          await verifyVisible(page, step.text);
          break;

        case "verifyUrl":
          if (!page.url().includes(step.urlPart)) {
            throw new Error(
              `Expected URL to contain "${step.urlPart}", but got ${page.url()}`
            );
          }
          break;

        default:
          throw new Error(`Unsupported action: ${step.action}`);
      }
    }

    console.log("\nTEST RESULT: PASS");
    console.log("All test steps completed successfully.");
  } catch (error) {
    console.log("\nTEST RESULT: FAIL");
    console.log("Reason:", error.message);
    console.log("Final URL:", page.url());
    console.log("Page title:", await page.title().catch(() => "Unavailable"));
  } finally {
    await browser.close();
  }
}

async function main() {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is missing from your .env file.");
    }

    const testCase = fs.readFileSync(path.join(__dirname, "test-case.txt"), "utf8");

    console.log("Sending test case to Groq AI...\n");

    const result = await getTestSteps(testCase);

    console.log("AI-generated steps:");
    console.log(JSON.stringify(result.steps, null, 2));
    console.log("\nStarting browser automation...\n");

    await runTest(result.steps);
  } catch (error) {
    console.error("\nAutomation error:", error.message);
  }
}

main();
