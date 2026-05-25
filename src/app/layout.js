import { Prompt } from "next/font/google";
import "./globals.css";

const promptFont = Prompt({
  variable: "--font-prompt",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata = {
  title: "Sheriff of Nottingham - Web",
  description: "Play Sheriff of Nottingham with friends!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" className={promptFont.variable}>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0" />
      </head>
      <body style={{ fontFamily: 'var(--font-prompt), sans-serif' }}>{children}</body>
    </html>
  );
}
