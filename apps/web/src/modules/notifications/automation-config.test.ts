import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

function resetAutomationEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.WHATSAPP_AUTOMATION_PROFILE;
  delete process.env.WHATSAPP_AUTOMATION_MODE;
  delete process.env.WHATSAPP_AUTOMATION_RECIPIENT_MODE;
  delete process.env.WHATSAPP_AUTOMATION_GLOBAL_ENABLED;
  delete process.env.WHATSAPP_AUTOMATION_FORCE_DRY_RUN;
  delete process.env.WHATSAPP_AUTOMATION_META_FORCE_TEST_RECIPIENT;
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
  it("aplica preview_safe com dry_run + destinatário fixo de teste", async () => {
    resetAutomationEnv();
    process.env.WHATSAPP_AUTOMATION_PROFILE = "preview_safe";

    const config = await loadConfigModule();

    expect(config.WHATSAPP_AUTOMATION_PROFILE).toBe("preview_safe");
    expect(config.WHATSAPP_AUTOMATION_MODE).toBe("dry_run");
    expect(config.WHATSAPP_AUTOMATION_RECIPIENT_MODE).toBe("test_recipient");
  });

  it("aplica preview_real_test com envio real mantendo destinatário de teste", async () => {
    resetAutomationEnv();
    process.env.WHATSAPP_AUTOMATION_PROFILE = "preview_real_test";

    const config = await loadConfigModule();

    expect(config.WHATSAPP_AUTOMATION_MODE).toBe("enabled");
    expect(config.WHATSAPP_AUTOMATION_RECIPIENT_MODE).toBe("test_recipient");
    expect(config.WHATSAPP_AUTOMATION_FORCE_DRY_RUN).toBe(false);
  });

  it("aplica production_live com envio real para cliente", async () => {
    resetAutomationEnv();
    process.env.WHATSAPP_AUTOMATION_PROFILE = "production_live";

    const config = await loadConfigModule();

    expect(config.WHATSAPP_AUTOMATION_MODE).toBe("enabled");
    expect(config.WHATSAPP_AUTOMATION_RECIPIENT_MODE).toBe("customer");
    expect(config.WHATSAPP_AUTOMATION_META_FORCE_TEST_RECIPIENT).toBe(false);
  });

  it("permite override explícito de modo e destinatário", async () => {
    resetAutomationEnv();
    process.env.WHATSAPP_AUTOMATION_PROFILE = "production_live";
    process.env.WHATSAPP_AUTOMATION_MODE = "disabled";
    process.env.WHATSAPP_AUTOMATION_RECIPIENT_MODE = "test_recipient";

    const config = await loadConfigModule();

    expect(config.WHATSAPP_AUTOMATION_MODE).toBe("disabled");
    expect(config.WHATSAPP_AUTOMATION_RECIPIENT_MODE).toBe("test_recipient");
    expect(config.WHATSAPP_AUTOMATION_GLOBAL_ENABLED).toBe(false);
  });

  it("mantém compatibilidade com flags legadas quando profile explícito não existe", async () => {
    resetAutomationEnv();
    process.env.WHATSAPP_AUTOMATION_GLOBAL_ENABLED = "true";
    process.env.WHATSAPP_AUTOMATION_FORCE_DRY_RUN = "false";
    process.env.WHATSAPP_AUTOMATION_META_FORCE_TEST_RECIPIENT = "false";

    const config = await loadConfigModule();

    expect(config.WHATSAPP_AUTOMATION_MODE).toBe("enabled");
    expect(config.WHATSAPP_AUTOMATION_RECIPIENT_MODE).toBe("customer");
  });
});
