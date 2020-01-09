# Font 101

A brief introduction to the basic concepts and tools you might need if you are
a software engineer who wants to Do Things to fonts. Primarily aimed at people
working on Google Fonts.

1.  [Basic Work Environment](#basic-work-environment)
1.  [FontTools](#fonttools), a library for inspection and manipulation of OpenType fonts
    1.  [TTX](#ttx), a commandline tool to convert fonts to/from xml
    1.  [TTFont](#ttfont), a Python class to read/write OpenType fonts
    1.  [pyftsubset](#pyftsubset), a tool to subset and optimize OpenType fonts
1.  [OpenType Fonts](#opentype-fonts), the dominant modern font format


## Basic Work Environment

I assume you have:

*  SSH access to github ([instructions](https://help.github.com/en/github/authenticating-to-github/connecting-to-github-with-ssh))
*  A Python virtual environment ([venv](https://docs.python.org/3/library/venv.html))
```shell
# create lots, typically one for every discrete thing you are working on
python3 -m venv venv
source venv/bin/activate
```

## FontTools

FontTools is the swiss army knife of fonts. It lets you load, modify, and save a font from Python.

I assume you want to be able to mess with the source, and that you have an active venv. If you don't need to play with the code just `pip install fonttools`. If you just want to browse the source see https://github.com/fonttools/fonttools.

### Local Setup
```shell
git clone git@github.com:fonttools/fonttools.git
cd fonttools
pip install -e fonttools/
```

### TTX

TTX is an xml representation of a binary font. FontTools can transform to/from TTX, meaning you can make changes to a font binary by converting it to TTX, editing the XML, and converting it back again. 

The examples assume a clone of `https://github.com/google/fonts` exists in `./fonts`.

Let's try it out with a Google Font:

```shell
ttx fonts/apache/roboto/Roboto-Regular.ttf
# open and browse around fonts/apache/roboto/Roboto-Regular.ttx
# If we made some changes and wanted to generate an updated font binary:
ttx -o /tmp/MyRoboto.ttf fonts/apache/roboto/Roboto-Regular.ttx
```

Sometimes we just want to glance at a single table. For example, let's dump the ['name'](https://docs.microsoft.com/en-us/typography/opentype/spec/name) table for Roboto:

```shell
ttx -o - -t name fonts/apache/roboto/Roboto-Regular.ttf
```

To see what axes and named instances a variable font supports we could dump ['fvar'](https://docs.microsoft.com/en-us/typography/opentype/spec/fvar):

```shell
ttx -o - -t fvar fonts/ofl/mavenpro/MavenPro\[wght\].ttf
```

See also FontTools explanation of TTX [here](https://github.com/fonttools/fonttools#ttx--from-opentype-and-truetype-to-xml-and-back).

### TTFont

[TTFont](https://github.com/fonttools/fonttools/blob/master/Lib/fontTools/ttLib/ttFont.py) is a Python class that can 
read/write OpenType font files. For example, let's suppose we decided Roboto-Regular.ttf had the wrong metadata for weight and we want to fix [usWeightClass](https://docs.microsoft.com/en-us/typography/opentype/spec/os2#usweightclass) programmatically:

```shell
# clone https://github.com/google/fonts, assumed to be in ./fonts for this example
python
>>> from fontTools import ttLib
>>> font = ttLib.TTFont('fonts/apache/roboto/Roboto-Regular.ttf')
>>> font['OS/2'].usWeightClass
400
>>> font['OS/2'].usWeightClass = 500
>>> font.save('/tmp/Roboto-Modified.ttf')
# Ctrl+D to exit python repl
```

We could confirm our edit with TTX:

```shell
ttx -q -o - -t "OS/2" /tmp/Roboto-Modified.ttf | grep usWeight
    <usWeightClass value="400"/>
```

### pyftsubset

[pyftsubset](https://github.com/fonttools/fonttools/blob/master/Lib/fontTools/subset/__init__.py) lets you cut up fonts.

If you look at the CSS Google Fonts send to consumers (ex https://fonts.googleapis.com/css2?family=Roboto) you can see a bunch of different `@font-face` blocks, each with it's own unicode-range. The browser will download only the parts required to render the characters on the page (more detail on this [here](https://www.unicodeconference.org/presentations-42/S5T3-Sheeter.pdf)).

Let's suppose we want to cut a cyrillic block out of Roboto, matching the unicode-range for cyrillic from `/css2`:

```css
/* cyrillic */
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-weight: 400;
  src: local('Roboto'), local('Roboto-Regular'), url(https://fonts.gstatic.com/s/roboto/v20/KFOmCnqEu92Fr1Mu5mxKOzY.woff2) format('woff2');
  unicode-range: U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
}
```

We'll start from `fonts/apache/roboto/Roboto-Regular.ttf`, which supports many scripts, and cut out everything but cyrillic:

```shell
pyftsubset --help
pyftsubset fonts/apache/roboto/Roboto-Regular.ttf \
  --unicodes="U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116" \
  --output-file=/tmp/Roboto-Regular-Cyrillic.ttf
```

The original file is, at time of writing, 168KB. The cyrillic subset is 24KB.

You can also use pyftsubset to drop hints, remove unwanted layout features, etc.

## OpenType Fonts

The font format of most interest to Google Fonts, supported by most modern operating systems, browsers, etc is [OpenType](https://docs.microsoft.com/en-us/typography/opentype/spec/). The font is made up of a header plus a collection of "tables". Each table has a specific binary structure documented in the spec. A given font includes some subset of these tables.

### Glyph IDs and the 'cmap' table

To understand the OpenType format it's helpful to have a basic mental model of how it works. Here is mine:

*  The core construct is an array of glyphs
   *  This is not how it's represented internally but it can be thought of this way
*  A glyph is instructions on how to draw something.
   *  It is NOT a character / letter
*  The indices of glyphs are called "glyph ids" or "gids"
   * We'll use "gid" henceforth
   
Let's construct a simple example. We'll subset Roboto down to A,B,C plus some support glyphs, then look at it's gids and how unicode characters are mapped onto those gids.
```
For example, 

glyphs [ notdef ][ null ][ drawing of letter A ][ drawing of letter B ][ drawing of letter C ]
gid     0         1        2                      3                      4
```
If we want to render "A" (U+0041 in Unicode) using this font we have a problem: how do we know what gid to use?
This is handled by the ['cmap'](https://docs.microsoft.com/en-us/typography/opentype/spec/cmap) table, which maps character
codes (Unicode or otherwise) to gids. Let's look at an example by subsetting Roboto down to ABC using [pyftsubset](#pyftsubset):

```shell
pyftsubset fonts/apache/roboto/Roboto-Regular.ttf \
  --text="ABC" \
  --output-file=/tmp/Roboto-Regular-ABC.ttf
ttx -q -t cmap -o - /tmp/Roboto-Regular-ABC.ttf
```

You should see something like:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<ttFont sfntVersion="\x00\x01\x00\x00" ttLibVersion="4.2">

  <cmap>
    <tableVersion version="0"/>
    <cmap_format_4 platformID="0" platEncID="3" language="0">
      <map code="0x41" name="A"/><!-- LATIN CAPITAL LETTER A -->
      <map code="0x42" name="B"/><!-- LATIN CAPITAL LETTER B -->
      <map code="0x43" name="C"/><!-- LATIN CAPITAL LETTER C -->
    </cmap_format_4>
    <cmap_format_4 platformID="3" platEncID="1" language="0">
      <map code="0x41" name="A"/><!-- LATIN CAPITAL LETTER A -->
      <map code="0x42" name="B"/><!-- LATIN CAPITAL LETTER B -->
      <map code="0x43" name="C"/><!-- LATIN CAPITAL LETTER C -->
    </cmap_format_4>
    <cmap_format_12 platformID="3" platEncID="10" format="12" reserved="0" length="28" language="0" nGroups="1">
      <map code="0x41" name="A"/><!-- LATIN CAPITAL LETTER A -->
      <map code="0x42" name="B"/><!-- LATIN CAPITAL LETTER B -->
      <map code="0x43" name="C"/><!-- LATIN CAPITAL LETTER C -->
    </cmap_format_12>
  </cmap>

</ttFont>
```
