import { expect, test } from "@playwright/test";
import { META_TEMPLATE_PUBLIC_SAMPLE_CODE } from "../../src/shared/meta-template-demo";

test("@smoke abre tela pública de login", async ({ page }) => {
  await page.goto("/auth/login");
  await expect(page.getByRole("heading", { name: /estúdio corpo & alma humanizado/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /entrar com google/i })).toBeVisible();
});

test("@smoke abre página base de pagamento sem id", async ({ page }) => {
  await page.goto("/pagamento");
  await expect(page.getByRole("heading", { name: /abra o link completo de pagamento/i })).toBeVisible();
});

test("@smoke abre checkout público de amostra", async ({ page }) => {
  await page.goto(`/pagamento/${META_TEMPLATE_PUBLIC_SAMPLE_CODE}`);
  await expect(page.getByRole("heading", { name: /olá,\s*maria oliveira/i })).toBeVisible();
  await expect(page.getByText(/checkout público/i)).toBeVisible();
  await expect(page.getByText(/valor a quitar agora/i)).toBeVisible();
});

test("@smoke abre comprovante de pagamento de amostra", async ({ page }) => {
  await page.goto(`/comprovante/pagamento/${META_TEMPLATE_PUBLIC_SAMPLE_CODE}`);
  await expect(page.getByText(/pagamento confirmado/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /baixar recibo/i })).toBeVisible();
});

test("@smoke abre comprovante de agendamento de amostra", async ({ page }) => {
  await page.goto(`/comprovante/${META_TEMPLATE_PUBLIC_SAMPLE_CODE}`);
  await expect(page.getByText(/pagamento confirmado/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /baixar recibo/i })).toBeVisible();
});

test("@smoke abre voucher de amostra", async ({ page }) => {
  await page.goto(`/voucher/${META_TEMPLATE_PUBLIC_SAMPLE_CODE}`);
  await expect(page.getByRole("heading", { name: /voucher de agendamento/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /baixar imagem/i })).toBeVisible();
});
