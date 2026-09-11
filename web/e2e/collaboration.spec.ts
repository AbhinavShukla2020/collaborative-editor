import { expect, test } from "@playwright/test";

for (let caseNumber = 1; caseNumber <= 30; caseNumber += 1) {
  test(`concurrent editors converge ${caseNumber}`, async ({ browser }) => {
    const documentId = `e2e-${caseNumber}-${Date.now()}`;
    const firstContext = await browser.newContext();
    const secondContext = await browser.newContext();
    const first = await firstContext.newPage();
    const second = await secondContext.newPage();
    await Promise.all([first.goto(`/?doc=${documentId}`), second.goto(`/?doc=${documentId}`)]);
    await Promise.all([
      expect(first.getByTestId("status")).toHaveText("connected"),
      expect(second.getByTestId("status")).toHaveText("connected"),
    ]);
    await first.getByTestId("editor").fill(`alpha-${caseNumber}`);
    await expect(second.getByTestId("editor")).toHaveValue(`alpha-${caseNumber}`);
    if (caseNumber <= 5) await secondContext.setOffline(true);
    await Promise.all([
      first.getByTestId("editor").pressSequentially("-left"),
      second.getByTestId("editor").pressSequentially("-right"),
    ]);
    if (caseNumber <= 5) await secondContext.setOffline(false);
    await expect.poll(async () => {
      const left = await first.getByTestId("editor").inputValue();
      const right = await second.getByTestId("editor").inputValue();
      return { same: left === right, left: left.includes("-left"), right: left.includes("-right") };
    }).toEqual({ same: true, left: true, right: true });
    await Promise.all([firstContext.close(), secondContext.close()]);
  });
}
