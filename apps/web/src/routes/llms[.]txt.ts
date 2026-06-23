import { createFileRoute } from "@tanstack/react-router";

import { appConfig } from "@/config/app.config";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: () => {
        const llmsTxt = `# ${appConfig.site.shortName}

${appConfig.site.description}

## Site

- [Home](${appConfig.site.url})
- [Documentation](https://github.com/tsu-moe/tsu-stack)
`;

        return new Response(llmsTxt, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8"
          }
        });
      }
    }
  }
});
