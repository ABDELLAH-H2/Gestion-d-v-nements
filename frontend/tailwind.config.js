/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./*.html",
        "./js/**/*.js"
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#6366F1',
                    hover: '#5457E5',
                    light: 'rgba(99, 102, 241, 0.1)',
                    glow: 'rgba(99, 102, 241, 0.25)',
                },
                secondary: {
                    DEFAULT: '#22D3EE',
                    hover: '#0FC9E7',
                    light: 'rgba(34, 211, 238, 0.1)',
                },
                surface: {
                    dark: '#1E1E1E',
                    light: '#2A2A2A',
                    hover: '#333333',
                },
                border: {
                    dark: '#2A2A2A',
                    light: '#333333',
                },
                background: {
                    dark: '#121212',
                },
                success: '#22C55E',
                warning: '#F59E0B',
                danger: '#EF4444',
            },
            fontFamily: {
                sans: ['Manrope', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
            },
            borderRadius: {
                'xl': '0.75rem',
                '2xl': '1rem',
            },
        }
    },
    plugins: [],
}
