import { Container } from "@tsu-stack/ui/components/container";

import Content from "@/components/legal/terms-of-service-content.mdx";

export function TermsOfServicePage() {
  return (
    <Container className="prose not-dark:prose-invert">
      <Content />
    </Container>
  );
}
