import { Inter, Lora } from 'next/font/google';

export const fontSans = Inter({
    subsets: ['latin'],
    display: 'swap',
    // This variable name is referenced in tailwind.config.ts / globals.css
    variable: '--font-geist-sans',
});

export const fontSerif = Lora({
    subsets: ['latin'],
    display: 'swap',
    // This variable name is referenced in tailwind.config.ts / globals.css
    variable: '--font-serif',
});