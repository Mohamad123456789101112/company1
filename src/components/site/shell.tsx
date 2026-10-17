import type { ReactNode } from "react";
import { Navbar } from "./navbar";
import { Footer } from "./footer";
import { WhatsAppButton } from "./whatsapp";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="container-x py-10 font-taj">{children}</main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
