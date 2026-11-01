import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  metadataBase: new URL("https://barbeariapro.com.br"),
  title: {
    default: "BarbeariaPro — Sistema Completo de Gestão e Agendamento para Barbearias",
    template: "%s | BarbeariaPro",
  },
  description:
    "Sua barbearia mais cheia, organizada e lucrativa. Agendamentos online 24h, caixa PDV, controle financeiro, comissões por profissional, estoque, Curva ABC e automação WhatsApp em um só sistema.",
  keywords: [
    "sistema para barbearia",
    "agendamento online barbearia",
    "gestão de barbearia",
    "caixa PDV barbearia",
    "automação whatsapp barbearia",
    "comissão de barbeiros",
    "curva ABC barbearia",
    "BarbeariaPro",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://barbeariapro.com.br",
    siteName: "BarbeariaPro",
    title: "BarbeariaPro — Sua barbearia mais cheia, organizada e lucrativa",
    description:
      "Agendamentos online, caixa PDV, controle financeiro, comissões, estoque, Curva ABC e automação WhatsApp. Tudo em um só sistema, simples e completo.",
    images: [
      {
        url: "/hero-barber-banner.jpg",
        width: 1024,
        height: 572,
        alt: "BarbeariaPro — Sistema de Gestão e Agendamento para Barbearias Premium",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BarbeariaPro — Sistema Completo para Barbearias",
    description:
      "Agendamentos online, caixa PDV, controle financeiro, comissões, estoque, Curva ABC e automação WhatsApp.",
    images: ["/hero-barber-banner.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "BarbeariaPro",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  description:
    "Sistema completo de gestão para barbearias com agendamento online, caixa PDV, controle financeiro, comissões por profissional, estoque, Curva ABC e automação WhatsApp.",
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "BRL",
    lowPrice: "10.00",
    highPrice: "59.00",
    offerCount: "3",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          rel="preload"
          as="image"
          href="/hero-barber-banner.jpg"
          fetchPriority="high"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
      </head>
      <body
        className="antialiased bg-[#080808] text-white selection:bg-[#FF7900] selection:text-black"
      >
        {children}
      </body>
    </html>
  );
}
