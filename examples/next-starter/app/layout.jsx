// Poppins and the --cm-* design tokens: plain CSS, so they load on the server-rendered page too.
import '@commmerce/tokens/fonts.css';
import '@commmerce/tokens/tokens.css';
import './app.css';

export const metadata = { title: 'Orders · Commmerce UI Next.js starter' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-cm-theme="light">
      <body>{children}</body>
    </html>
  );
}
