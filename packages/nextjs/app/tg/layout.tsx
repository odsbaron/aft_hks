/**
 * Telegram Mini App Layout
 * Optimized for Telegram WebApp experience
 */

import "./telegram.css";

export const metadata = {
  title: "Sidebets - Telegram Mini App",
  description: "Social consensus betting on Telegram",
};

export default function TelegramMiniAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="telegram-webapp">
      <head>
        <script
          src="https://telegram.org/js/telegram-web-app.js"
          async
        ></script>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className="telegram-body">{children}</body>
    </html>
  );
}
