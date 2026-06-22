import { cn } from "@tsu-stack/ui/lib/utils";

import { Footer } from "@/components/app-shell/footer";
import { Navbar } from "@/components/app-shell/navbar";

export function RootLayout({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <div className={cn("flex min-h-screen flex-col", className)}>
        <Navbar />
        <main className="flex-1">{children}</main>
      </div>
      <Footer className="lg:mt-12" />
    </>
  );
}
