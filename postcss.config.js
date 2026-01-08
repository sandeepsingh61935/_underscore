export default {
    plugins: {
        '@tailwindcss/postcss': {},
        autoprefixer: {}, // Autoprefixer is actually included in @tailwindcss/postcss but safe to keep or remove. v4 docs usually simplify to just the plugin.
    },
}
