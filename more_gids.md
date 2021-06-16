## Tl;dr

The Open Font Format (OFF) is limited to 65k glyphs. Raise the limit to at least millions. In particular, break limits imposed by places that currently use uint16 (ex uint16 numGlyphs in maxp).

## Why

The 65k limit is painful in several current and near-future scenarios:

1. CJK fonts overrun the current limit
1. Pan-Unicode fonts overrun the current limits
   1. Android, ChromeOS, and potentially others would benefit from reduction in file handle use from collapsing Noto fallback fonts from 150+ files (https://github.com/rsheeter/android_fonts/tree/master/api_level/30)
   1. Pan-Unicode fonts are limited by the inability for layout features to span files
1. Progressive Font Enrichment (https://www.w3.org/Fonts/WG/webfonts-2018.html) offers a future where a pan-unicode web font can be efficiently delivered — if we could create one
1. COLR fonts use discrete glyphs for layers, potentially exhausting the glyph limit
   1. This is particularly likely if Unicode substantially expands the range of glyphs with skin tone

Google Fonts is eager to see the font specification updated to resolve these issues. We are eager to collaborate on on spec updates and to collaborate on updating open source font creation, manipulation, and rendering libraries and, where appropriate, open source fonts to the new spec.

