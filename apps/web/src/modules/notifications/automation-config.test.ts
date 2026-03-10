import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

function resetAutomationEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.WHATSAPP_PROFILE;
  delete process.env.WHATSAPP_AUTOMATION_MODE;
  delete process.env.WHATSAPP_AUTOMATION_RECIPIENT_MODE;
  delete process.env.WHATSAPP_AUTOMATION_PROVIDER;
  delete process.env.VERCEL_ENV;
}

async function loadConfigModule() {
  vi.resetModules();
  return import("./automation-config");
}

afterEach(() => {
  resetAutomationEnv();
  vi.resetModules();
});

describe("automation-config", () => {
  it("aplica dev_sandbox com dry_run + destinatário fixo de teste", async () => {
    resetAutomationEnv();
    process.env.WHATSAPP_PROFILE = "dev_sandbox";

    const config = await loadConfigModule();

    expect(config.WHATSAPP_PROFILE).toBe("dev_sandbox");
    expect(config.WHATSAPP_AUTOMATION_MODE).toBe("dry_run");
    expect(config.WHATSAPP_AUTOMATION_RECIPIENT_MODE).toBe("test_recipient");
  });

  it("aplica preview_real_test com envio real mantendo destinatário de teste", async () => {
    resetAutomationEnv();
    process.env.WHATSAPP_PROFILE = "preview_real_test";

    const config = await loadConfigModule();

    expect(config.WHATSAPP_AUTOMATION_MODE).toBe("enabled");
    expect(config.WHATSAPP_AUTOMATION_RECIPIENT_MODE).toBe("test_recipient");
  });

  it("aplica prod_real com envio real para cliente", async () => {
    resetAutomationEnv();
    process.env.WHATSAPP_PROFILE = "prod_real";

    const config = await loadConfigModule();

    expect(config.WHATSAPP_AUTOMATION_MODE).toBe("enabled");
    expect(config.WHATSAPP_AUTOMATION_RECIPIENT_MODE).toBe("customer");
    expect(config.WHATSAPP_PROFILE).toBe("prod_real");
  });

  it("permite override explícito de modo e destinatário", async () => {
    resetAutomationEnv();
    process.env.WHATSAPP_PROFILE = "prod_real";
    process.env.WHATSAPP_AUTOMATION_MODE = "disabled";
    process.env.WHATSAPP_AUTOMATION_RECIPIENT_MODE = "test_recipient";

    const config = await loadConfigModule();

    expect(config.WHATSAPP_AUTOMATION_MODE).toBe("disabled");
    expect(config.WHATSAPP_AUTOMATION_RECIPIENT_MODE).toBe("test_recipient");
  });
});
