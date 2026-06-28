import { z } from "zod";

export function getDateInputValue(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

export function optionalCoreField(schema: z.ZodType<string>, message: string) {
  return z
    .string()
    .trim()
    .transform((value, context) => {
      if (value === "") {
        return "";
      }

      const parsed = schema.safeParse(value);

      if (!parsed.success) {
        context.addIssue({ code: "custom", message });
        return z.NEVER;
      }

      return parsed.data;
    });
}
