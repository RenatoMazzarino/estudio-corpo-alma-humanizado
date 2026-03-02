import { expect, test } from "@playwright/test";

test("@smoke abre pagina de politica de privacidade", async ({ page }) => {
  await page.goto("/politica-de-privacidade");
  await expect(page.getByRole("heading", { name: /politica de privacidade/i })).toBeVisible();
});
