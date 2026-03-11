/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./App.tsx",
        "./app/**/*.{js,jsx,ts,tsx}",
        "./components/**/*.{js,jsx,ts,tsx}"
    ],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#FFD54D', // Amarillo principal
                    yellow: '#FFD54D',
                },
                dark: {
                    DEFAULT: '#202020', // Negro
                    black: '#202020',
                },
                neutral: {
                    DEFAULT: '#999999', // Gris
                    gray: '#999999',
                },
            },
            fontFamily: {
                'urbanist': ['Urbanist-Regular'],
                'urbanist-medium': ['Urbanist-Medium'],
                'urbanist-semibold': ['Urbanist-SemiBold'],
            },
        },
    },
    plugins: [],
}