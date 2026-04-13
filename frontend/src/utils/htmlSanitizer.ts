const BLOCKED_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "option",
  "meta",
  "base",
  "link",
]);

const URL_ATTRS = new Set(["href", "src", "xlink:href", "formaction"]);
const SAFE_URL_PATTERN = /^(https?:|mailto:|tel:|\/|#)/i;
const SAFE_DATA_IMAGE_PATTERN = /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i;

const sanitizeUrl = (value: string, attributeName?: string, tagName?: string) => {
  const normalized = value.trim().replace(/[\u0000-\u001F\u007F\s]+/g, "");
  if (!normalized) return "";
  if (
    attributeName === "src" &&
    tagName === "img" &&
    SAFE_DATA_IMAGE_PATTERN.test(normalized)
  ) {
    return value.trim();
  }
  return SAFE_URL_PATTERN.test(normalized) ? value.trim() : "";
};

export const sanitizeHtml = (html: string) => {
  if (!html || typeof window === "undefined") return html;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    doc.querySelectorAll("*").forEach((element) => {
      const tagName = element.tagName.toLowerCase();
      if (BLOCKED_TAGS.has(tagName)) {
        element.remove();
        return;
      }

      [...element.attributes].forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value ?? "";

        if (name.startsWith("on")) {
          element.removeAttribute(attribute.name);
          return;
        }

        if (name === "style") {
          element.removeAttribute(attribute.name);
          return;
        }

        if (URL_ATTRS.has(name)) {
          const safeValue = sanitizeUrl(value, name, tagName);
          if (!safeValue) {
            element.removeAttribute(attribute.name);
            return;
          }
          element.setAttribute(attribute.name, safeValue);
        }
      });

      if (tagName === "a") {
        element.setAttribute("rel", "noopener noreferrer");
      }
    });

    return doc.body.innerHTML;
  } catch {
    return html;
  }
};
