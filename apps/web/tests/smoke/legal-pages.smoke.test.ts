import { expect, test } from "@playwright/test";

const LEGAL_PAGES: Array<{ path: string; heading: RegExp }> = [
  { path: "/politica-de-privacidade", heading: /politica de privacidade/i },
  { path: "/termos-de-servico", heading: /termos de servico/i },
  { path: "/exclusao-de-dados", heading: /instrucoes de exclusao de dados/i },
];

for (const legalPage of LEGAL_PAGES) {
  test(`@smoke abre ${legalPage.path}`, async ({ page }) => {
    await page.goto(legalPage.path);
    await expect(page.getByRole("heading", { name: legalPage.heading })).toBeVisible();
  });
}

test("@smoke navega de politica para exclusao de dados", async ({ page }) => {
  await page.goto("/politica-de-privacidade");
  await page.locator('a[href="/exclusao-de-dados"]').first().click();
  await expect(page).toHaveURL(/\/exclusao-de-dados\/?$/);
  await expect(page.getByRole("heading", { name: /instrucoes de exclusao de dados/i })).toBeVisible();
});

test("@smoke navega de exclusao para termos", async ({ page }) => {
  await page.goto("/exclusao-de-dados");
  await page.locator('a[href="/termos-de-servico"]').first().click();
  await expect(page).toHaveURL(/\/termos-de-servico\/?$/);
  await expect(page.getByRole("heading", { name: /termos de servico/i })).toBeVisible();
});
