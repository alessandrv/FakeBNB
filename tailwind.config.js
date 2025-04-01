import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
export default {
	content: [
		"./index.html",
		"./src/**/*.{js,ts,jsx,tsx}",
		"./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
		extend: {},
	},
	darkMode: "class",
	plugins: [
		heroui({
			themes: {
				light: {
					colors: {
						gradient: {
							first: "#1674de",
							second: "#14c4f3"
						},
						primary: {
							DEFAULT: "#69d5f7", // Your custom primary color (blue)
							foreground: "#FFFFFF", // Text color on primary backgrounds
							// You can also define the full color palette (50-900)
							50: "#edfaff",
							100: "#d6f4fe",
							200: "#aeecfd",
							300: "#8ee3fb",
							400: "#7adaf9",
							500: "#69d5f7", // Your main primary color (blue)
							600: "#4aabca",
							700: "#3683a0",
							800: "#255c75",
							900: "#14364a",
						},
						focus: {
							DEFAULT: "#69d5f7", // Your custom primary color (amber/orange)
						}
						
					}
				},
				// Optional: Add dark theme configuration if you're using dark mode
				dark: {
					colors: {
						primary: {
							DEFAULT: "#FFA500", // Your custom primary color for dark mode
							foreground: "#000000", // Text color on primary backgrounds in dark mode
							// Full color palette for dark mode if needed
						}
					}
				}
			}
		})
	],
};