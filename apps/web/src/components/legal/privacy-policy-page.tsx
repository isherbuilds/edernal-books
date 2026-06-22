import { Container } from "@tsu-stack/ui/components/container";

import Content from "@/components/legal/privacy-policy-content.mdx";

export function PrivacyPolicyPage() {
  return (
    <Container className="prose not-dark:prose-invert">
      <Content />
    </Container>
  );
}
