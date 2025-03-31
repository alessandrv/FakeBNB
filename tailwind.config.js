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
						primary: {
							DEFAULT: "#4CAF50", // Your custom primary color (green)
							foreground: "#FFFFFF", // Text color on primary backgrounds
							// You can also define the full color palette (50-900)
							50: "#E8F5E9",
							100: "#C8E6C9",
							200: "#A5D6A7",
							300: "#81C784",
							400: "#66BB6A",
							500: "#4CAF50", // Your main primary color (green)
							600: "#43A047",
							700: "#388E3C",
							800: "#2E7D32",
							900: "#1B5E20",
						},
						focus: {
							DEFAULT: "#4CAF50", // Your custom primary color (green)
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