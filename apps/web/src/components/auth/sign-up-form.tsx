import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { authQueryKeys } from "@tsu-stack/auth/react/tanstack-start/queries";
import { m } from "@tsu-stack/i18n/messages";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import { useNavigate } from "@tsu-stack/i18n/tanstack-start/hooks/use-navigate";
import { type NavigateTo } from "@tsu-stack/i18n/tanstack-start/types";
import { Button } from "@tsu-stack/ui/components/button";
import { Container } from "@tsu-stack/ui/components/container";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldSeparator
} from "@tsu-stack/ui/components/field";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { cn } from "@tsu-stack/ui/lib/utils";

import { appConfig } from "@/config/app.config";

import { useZodForm } from "@/hooks/use-zod-form";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { FormTextField } from "@/components/form-fields";
import { LogoIcon } from "@/components/logo";

const SignUpFormSchema = z
  .object({
    confirmPassword: z.string(),
    email: z.email(m.auth__invalid_email()),
    name: z.string().min(2, m.auth__name_min_length()),
    password: z.string().min(8, m.auth__password_min_length())
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: m.auth__passwords_no_match(),
    path: ["confirmPassword"]
  });
type SignUpFormValues = z.infer<typeof SignUpFormSchema>;
type SignUpValues = Pick<SignUpFormValues, "email" | "name" | "password">;

export function SignUpForm({
  redirectTo = "/",
  className,
  ...props
}: React.ComponentProps<"div"> & { redirectTo?: NavigateTo }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isPending } = useAuth();

  const signUpMutation = useMutation({
    mutationFn: async (values: SignUpValues) => {
      const result = await authClient.signUp.email({
        email: values.email,
        name: values.name,
        password: values.password
      });

      if (!result.data) {
        throw new Error(result.error?.message ?? m.auth__sign_up_failed());
      }

      return result;
    },
    onError: (error: Error) => {
      toast.error(error.message || m.auth__sign_up_failed());
    },
    onSuccess: async (result) => {
      queryClient.setQueryData(authQueryKeys.user, result.data.user);
      await navigate({
        to: redirectTo
      });
      toast.success(m.auth__sign_up_successful());
    }
  });
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useZodForm(SignUpFormSchema, {
    defaultValues: {
      confirmPassword: "",
      email: "",
      name: "",
      password: ""
    }
  });
  const isSubmitPending = isSubmitting || signUpMutation.isPending;

  if (isPending) {
    return <Spinner />;
  }

  return (
    <Container className={cn("flex max-w-md flex-col gap-6", className)} {...props}>
      <form
        noValidate
        onSubmit={handleSubmit(({ email, name, password }) => {
          signUpMutation.mutate({ email, name, password });
        })}
      >
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <Link href="/" className="flex flex-col items-center gap-2 font-medium">
              <LogoIcon className="flex size-8 items-center justify-center rounded-md" />
              <span className="sr-only">{appConfig.site.shortName}</span>
            </Link>
            <h1 className="text-xl font-bold">{m.auth__create_account_title()}</h1>
            <FieldDescription>
              {m.auth__already_have_account()}{" "}
              <Link to="/login" search={{ redirect: redirectTo }}>
                {m.auth__sign_in_link()}
              </Link>
            </FieldDescription>
          </div>

          <FormTextField
            autoComplete="name"
            error={errors.name}
            label={m.auth__name_label()}
            placeholder={m.auth__name_placeholder()}
            {...register("name")}
          />

          <FormTextField
            autoComplete="email"
            error={errors.email}
            label={m.auth__email_label()}
            placeholder={m.auth__email_placeholder()}
            type="email"
            {...register("email")}
          />

          <FormTextField
            autoComplete="new-password"
            error={errors.password}
            label={m.auth__password_label()}
            type="password"
            {...register("password")}
          />

          <FormTextField
            autoComplete="new-password"
            error={errors.confirmPassword}
            label={m.auth__confirm_password_label()}
            type="password"
            {...register("confirmPassword")}
          />

          <Field>
            <Button size="lg" type="submit" disabled={isSubmitPending || signUpMutation.isSuccess}>
              {isSubmitPending ? m.auth__creating_account() : m.auth__create_account()}
            </Button>
          </Field>

          <FieldSeparator>{m.auth__or()}</FieldSeparator>

          <Field>
            <GoogleAuthButton />
          </Field>
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        {m.auth__terms_agreement()} <Link to="/terms-of-service">{m.auth__terms_of_service()}</Link>{" "}
        {m.auth__and()} <Link to="/privacy-policy">{m.auth__privacy_policy()}</Link>.
      </FieldDescription>
    </Container>
  );
}
