import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldValues, type UseFormProps } from "react-hook-form";
import { type z } from "zod";

type ZodFormOptions<TInput extends FieldValues, TOutput extends FieldValues, TContext> = Omit<
  UseFormProps<TInput, TContext, TOutput>,
  "resolver"
>;

export function useZodForm<
  TInput extends FieldValues,
  TOutput extends FieldValues,
  TContext = unknown
>(schema: z.ZodType<TOutput, TInput>, options?: ZodFormOptions<TInput, TOutput, TContext>) {
  return useForm<TInput, TContext, TOutput>({
    mode: "onSubmit",
    reValidateMode: "onBlur",
    resolver: zodResolver(schema),
    ...options
  });
}
