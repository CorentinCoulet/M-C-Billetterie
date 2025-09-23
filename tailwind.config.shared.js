// Configuration Tailwind partagée
const sharedConfig = {
  darkMode: ["class"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        neutral: {
          1: "var(--color-neutral-1)",
          2: "var(--color-neutral-2)",
          3: "var(--color-neutral-3)",
          4: "var(--color-neutral-4)",
          5: "var(--color-neutral-5)",
          6: "var(--color-neutral-6)",
          7: "var(--color-neutral-7)",
          8: "var(--color-neutral-8)",
          9: "var(--color-neutral-9)",
          10: "var(--color-neutral-10)",
          11: "var(--color-neutral-11)",
          12: "var(--color-neutral-12)",
          contrast: "var(--color-neutral-contrast)",
        },
        fg: {
          DEFAULT: "var(--color-fg)",
          secondary: "var(--color-fg-secondary)",
        },
        bg: {
          DEFAULT: "var(--color-bg)",
          inset: "var(--color-bg-inset)",
          overlay: "var(--color-bg-overlay)",
        },
        "focus-ring": "var(--color-focus-ring)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "var(--radius-full)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      screens: {
        coarse: { raw: "(pointer: coarse)" },
        fine: { raw: "(pointer: fine)" },
        pwa: { raw: "(display-mode: standalone)" },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

module.exports = sharedConfig;
