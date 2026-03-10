import { getWhatsAppTemplateFromLibrary } from "./whatsapp-template-library";

type RenderTemplateAsTextParams = {
  templateName: string;
  variableMap: Record<string, string>;
  includeFooter?: boolean;
  includeButtonUrl?: boolean;
};

const normalizeText = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

export function renderWhatsAppTemplateAsText(params: RenderTemplateAsTextParams) {
  const template = getWhatsAppTemplateFromLibrary(params.templateName);
  if (!template) {
    throw new Error(`Template '${params.templateName}' não encontrado na biblioteca local.`);
  }

  const orderedVariables = [...template.variables].sort((a, b) => a.index - b.index);
  const resolvedByIndex = new Map<number, string>();
  for (const variable of orderedVariables) {
    const value = normalizeText(params.variableMap[variable.key]);
    if (!value) {
      throw new Error(
        `Template '${template.name}' sem valor para variável '${variable.key}' (índice ${variable.index}).`
      );
    }
    resolvedByIndex.set(variable.index, value);
  }

  const body = template.body.replace(/{{\s*(\d+)\s*}}/g, (_, rawIndex: string) => {
    const index = Number(rawIndex);
    const value = resolvedByIndex.get(index);
    if (!value) {
      throw new Error(
        `Template '${template.name}' exige variável no índice ${rawIndex}, mas não foi resolvida.`
      );
    }
    return value;
  });

  const lines = [body.trim()];

  if (params.includeFooter !== false && template.footer.trim()) {
    lines.push(template.footer.trim());
  }

  if (params.includeButtonUrl !== false && template.button.type === "url_dynamic") {
    const buttonValue = normalizeText(params.variableMap[template.button.variableName]);
    if (!buttonValue) {
      throw new Error(
        `Template '${template.name}' sem variável de botão '${template.button.variableName}'.`
      );
    }
    lines.push(`${template.button.buttonText}: ${template.button.urlBase}${buttonValue}`);
  }

  return lines.join("\n\n").trim();
}
