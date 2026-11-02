# Quivers Frontend Web Application

> **Quivers**: AI-powered web app turning uploaded PDFs into interactive, source-grounded quizzes.  
> **Brand**: Always written as **Quivers**.

---

## 🎨 Design System & Branding (Phase 0)

- **Color Harmony**:
  - **Monochrome Foundation**: Black (`#09090b`) and Crisp White (`#ffffff` / `#fafaf9`).
  - **Archery Accent**: Warm Amber-Gold (`#d97706` light / `#fbbf24` dark) inspired by the bullseye 10-ring and leather quiver craftsmanship.
- **Typography**: Clean, modern typeface using Next.js `next/font/google` Geist Sans.
- **Theme Support**: Complete Light and Dark mode with `localStorage` caching and zero theme flash on page load.
- **Transparent Logo & Inversion**:
  - Logo resides at `/public/Quivers_logo.png`.
  - Background is 100% transparent (no white bounding box).
  - Dark mode inverts stroke lines dynamically (`dark:invert`) while retaining alpha transparency.
- **Favicon & Tab Icon**:
  - Simplified mark (the letter Q with a single arrow) generated as scalable SVG (`/src/app/icon.svg` & `/public/icon.svg`) and multi-resolution ICO (`/public/favicon.ico`).

---

## 🎯 Archery Motifs

1. **Arrow-Style Progress Bar**: Each question in a quiz is an arrow advancing step-by-step toward target mastery.
2. **Bullseye Accuracy Feedback**: Correct answers trigger the bullseye icon along with verified page and paragraph citations.
3. **"My Quiver" Saved Quizzes**: The saved quizzes portal where documents hold their respective arrow collections.

---

## 🚀 Running Locally

```bash
# Navigate to frontend
cd frontend

# Install dependencies (if not already installed)
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🎓 Viva Talking Points

1. **Next.js App Router**: Uses React Server Components and modern layout nesting for minimal client bundle size and optimal SEO performance.
2. **Tailwind CSS Design Tokens**: Consistent spacing, typography scale, and CSS variables for instantaneous dark/light theme switching.
3. **Anti-flicker Theme Script**: Inlines a tiny synchronous DOM script in the HTML `<head>` to read `localStorage` and set `dark` class before first paint, eliminating flashing white screen in dark mode.
