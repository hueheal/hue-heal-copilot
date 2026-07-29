# Romie (display serif)

The UI uses **Romie** by Margot Lévêque as its display serif (`--font-serif`),
falling back to Ivy Ora until the font files are present.

The design was built with the **trial** version, which is licence-restricted to
evaluation and must NOT be deployed to production. Do not commit trial files.

To activate Romie:
1. Purchase a web licence: https://margotleveque.com/pages/licenses
2. Drop the licensed `.woff2` files here with these exact names:
   - `Romie-Light.woff2`    (weight 300)
   - `Romie-Regular.woff2`  (weight 400)
   - `Romie-Medium.woff2`   (weight 500)
   - `Romie-Bold.woff2`     (weight 700)

The `@font-face` rules in `src/styles/global.css` already reference these paths,
so once the files are here Romie takes over automatically. No code change needed.
