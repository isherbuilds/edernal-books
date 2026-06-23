import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2Icon, LogOutIcon, PlusIcon, UserPlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { m } from "@tsu-stack/i18n/messages";
import { useNavigate } from "@tsu-stack/i18n/tanstack-start/hooks/use-navigate";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@tsu-stack/ui/components/card";
import { FieldGroup } from "@tsu-stack/ui/components/field";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@tsu-stack/ui/components/tabs";

import { FormTextField } from "@/components/form-fields";
import { organizationsQueryKeys } from "@/hooks/use-organizations";
import { useSignOutAndResetSession } from "@/hooks/use-sign-out";
import { useZodForm } from "@/hooks/use-zod-form";
import { isReservedOrganizationSlug, normalizeOrganizationSlug } from "@/utils/organization-slugs";

type OrganizationSetupUser = {
  email?: string | null;
  name?: string | null;
};

type OrganizationSetupPageProps = {
  user: OrganizationSetupUser | null;
};

const CreateOrganizationFormSchema = z
  .object({
    organizationName: z.string().trim().min(1),
    organizationSlug: z
      .string()
      .trim()
      .transform(normalizeOrganizationSlug)
      .pipe(
        z
          .string()
          .min(1)
          .max(80)
          .refine((slug) => !isReservedOrganizationSlug(slug), {
            message: m.organization_setup__business_slug_reserved()
          })
      )
  })
  .strict();
const JoinOrganizationFormSchema = z
  .object({
    invitation: z.string().trim().transform(extractInvitationId).pipe(z.string().min(1))
  })
  .strict();
type CreateOrganizationFormValues = z.input<typeof CreateOrganizationFormSchema>;
type JoinOrganizationFormValues = z.input<typeof JoinOrganizationFormSchema>;

export function OrganizationSetupPage({ user }: OrganizationSetupPageProps) {
  const navigate = useNavigate();
  const signOutAndReset = useSignOutAndResetSession();
  const userLabel = user?.name ?? user?.email ?? m.organization_setup__fallback_user();
  const userInitials = userLabel.charAt(0).toUpperCase();

  async function signOut() {
    await signOutAndReset({
      onSuccess: async () => {
        await navigate({ to: "/login" });
      }
    });
  }

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Button onClick={signOut} size="sm" type="button" variant="ghost">
          <LogOutIcon aria-hidden="true" data-icon="inline-start" />
          {m.organization_setup__log_out()}
        </Button>
        <div className="flex items-center gap-3">
          <div className="hidden text-right text-xs leading-tight text-muted-foreground sm:grid">
            <span>{m.organization_setup__logged_in_as()}</span>
            {user?.email ? <span className="text-foreground">{user.email}</span> : null}
          </div>
          <div className="flex size-8 items-center justify-center rounded-lg border bg-muted text-xs font-medium">
            {userInitials}
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-xl flex-col items-center px-5 pt-14 pb-12 sm:pt-20">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-9 items-center justify-center rounded-lg border bg-card shadow-sm">
            <Building2Icon aria-hidden="true" className="size-4" />
          </div>
          <h1 className="text-2xl font-semibold tracking-normal">
            {m.organization_setup__title()}
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            {m.organization_setup__description()}
          </p>
        </div>

        <Tabs className="w-full" defaultValue="create">
          <TabsList className="mx-auto mb-5 grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="create">{m.organization_setup__create_tab()}</TabsTrigger>
            <TabsTrigger value="join">{m.organization_setup__join_tab()}</TabsTrigger>
          </TabsList>
          <TabsContent value="create">
            <CreateOrganizationPanel />
          </TabsContent>
          <TabsContent value="join">
            <JoinOrganizationPanel />
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}

function CreateOrganizationPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const form = useZodForm(CreateOrganizationFormSchema, {
    defaultValues: {
      organizationName: "",
      organizationSlug: ""
    } satisfies CreateOrganizationFormValues
  });
  const {
    formState: { errors },
    handleSubmit,
    register,
    setValue
  } = form;
  const createOrganizationMutation = useMutation({
    mutationFn: async (input: { name: string; slug: string }) => {
      const result = await authClient.organization.create({
        name: input.name,
        slug: input.slug
      });

      if (!result.data) {
        throw new Error(result.error?.message ?? m.organization_setup__create_failed());
      }

      return {
        id: result.data.id,
        name: result.data.name,
        slug: result.data.slug
      };
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : m.organization_setup__create_failed());
    },
    onSuccess: async (organization) => {
      toast.success(m.organization_setup__created());
      await queryClient.invalidateQueries({
        queryKey: organizationsQueryKeys.list()
      });
      await navigate({
        params: {
          orgSlug: organization.slug
        },
        to: "/$orgSlug/onboarding"
      });
    }
  });

  const createOrganization = handleSubmit((values) => {
    createOrganizationMutation.mutate({
      name: values.organizationName,
      slug: values.organizationSlug
    });
  });
  const organizationNameField = register("organizationName", {
    onChange: (event) => {
      if (!isSlugManuallyEdited) {
        setValue("organizationSlug", normalizeOrganizationSlug(event.currentTarget.value));
      }
    }
  });
  const organizationSlugField = register("organizationSlug", {
    onChange: (event) => {
      setIsSlugManuallyEdited(true);
      setValue("organizationSlug", normalizeOrganizationSlug(event.currentTarget.value));
    }
  });

  return (
    <form className="flex flex-col gap-5" noValidate onSubmit={createOrganization}>
      <Card className="rounded-lg shadow-sm" size="sm">
        <CardHeader>
          <CardTitle>{m.organization_setup__create_title()}</CardTitle>
          <CardDescription>{m.organization_setup__create_description()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-5">
            <FieldGroup>
              <FormTextField
                autoComplete="organization"
                error={errors.organizationName}
                label={m.organization_setup__business_name()}
                placeholder={m.organization_setup__business_name_placeholder()}
                required
                {...organizationNameField}
              />

              <FormTextField
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
                description={m.organization_setup__business_slug_hint()}
                error={errors.organizationSlug}
                label={m.organization_setup__business_slug()}
                placeholder={m.organization_setup__business_slug_placeholder()}
                required
                spellCheck={false}
                {...organizationSlugField}
              />
            </FieldGroup>
          </div>
        </CardContent>
      </Card>

      <Button
        className="mx-auto w-full max-w-md"
        disabled={createOrganizationMutation.isPending}
        type="submit"
      >
        {createOrganizationMutation.isPending ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <PlusIcon aria-hidden="true" data-icon="inline-start" />
        )}
        {createOrganizationMutation.isPending
          ? m.organization_setup__creating()
          : m.organization_setup__create()}
      </Button>
    </form>
  );
}

function JoinOrganizationPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useZodForm(JoinOrganizationFormSchema, {
    defaultValues: {
      invitation: ""
    } satisfies JoinOrganizationFormValues
  });
  const {
    formState: { errors },
    handleSubmit,
    register
  } = form;
  const joinOrganizationMutation = useMutation({
    mutationFn: async (input: { invitationId: string }) => {
      const result = await authClient.organization.acceptInvitation({
        invitationId: input.invitationId
      });

      if (!result.data) {
        throw new Error(result.error?.message ?? m.organization_setup__join_failed());
      }

      const organizationsResult = await authClient.organization.list();

      if (!organizationsResult.data) {
        throw new Error(organizationsResult.error?.message ?? m.organization_setup__join_failed());
      }

      const organization = organizationsResult.data.find(
        (item) => item.id === result.data.member.organizationId
      );

      if (!organization?.slug) {
        throw new Error(m.organization_setup__join_failed());
      }

      return {
        slug: organization.slug
      };
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : m.organization_setup__join_failed());
    },
    onSuccess: async (organization) => {
      toast.success(m.organization_setup__joined());
      await queryClient.invalidateQueries({
        queryKey: organizationsQueryKeys.list()
      });
      await navigate({
        params: {
          orgSlug: organization.slug
        },
        to: "/$orgSlug/onboarding"
      });
    }
  });

  const joinOrganization = handleSubmit((values) => {
    joinOrganizationMutation.mutate({ invitationId: values.invitation });
  });

  return (
    <form className="flex flex-col gap-5" noValidate onSubmit={joinOrganization}>
      <Card className="rounded-lg shadow-sm" size="sm">
        <CardHeader>
          <CardTitle>{m.organization_setup__join_title()}</CardTitle>
          <CardDescription>{m.organization_setup__join_description()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-5">
            <FieldGroup>
              <FormTextField
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
                description={m.organization_setup__invitation_description()}
                error={errors.invitation}
                label={m.organization_setup__invitation_label()}
                placeholder={m.organization_setup__invitation_placeholder()}
                required
                spellCheck={false}
                {...register("invitation")}
              />
            </FieldGroup>
          </div>
        </CardContent>
      </Card>

      <Button
        className="mx-auto w-full max-w-md"
        disabled={joinOrganizationMutation.isPending}
        type="submit"
      >
        {joinOrganizationMutation.isPending ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <UserPlusIcon aria-hidden="true" data-icon="inline-start" />
        )}
        {joinOrganizationMutation.isPending
          ? m.organization_setup__joining()
          : m.organization_setup__join()}
      </Button>
    </form>
  );
}

function extractInvitationId(value: string) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);
    return url.searchParams.get("id") ?? url.pathname.split("/").filter(Boolean).at(-1) ?? "";
  } catch {
    return value;
  }
}
