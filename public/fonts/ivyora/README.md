# Ivy Ora — self-hosted font files (for exports)

Drop the licensed **Ivy Ora Display** font files here to make PNG **and** PDF exports
render in real Ivy Ora (matching the on-screen preview exactly). On-screen the app
already uses Ivy Ora via Adobe Fonts (Typekit); exports need the actual files.

Preferred filenames (any of `.otf` or `.ttf` work — tell me which you have):

```
IvyOraDisplay-Light.otf      (weight 300)
IvyOraDisplay-Regular.otf    (weight 400)
IvyOraDisplay-Medium.otf     (weight 500)
IvyOraDisplay-Italic.otf     (italic — the editorial "voice")
```

Only Light + Regular are strictly required; the others improve fidelity.

Once the files are here, the studio serif (`HHSerif`) + the PDF serif get repointed
to these, and the exporter embeds them — no other change needed.

**Licence note:** these must be files you're licensed to embed (desktop licence, or a
self-host/app webfont licence from The Ivy Foundry). Adobe Fonts *sync/web* activations
can't be self-hosted per Adobe's terms.
