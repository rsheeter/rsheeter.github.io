# Font 101

A brief introduction to the basic concepts and tools you might need if you are
a software engineer who wants to Do Things to fonts. Primarily aimed at people
working on Google Fonts.

1.  [Basic Work Environment](#basic-work-environment)
1.  [FontTools](#fonttools), a library for inspection and manipulation of OpenType fonts
    1.  [TTX](#ttx), a commandline tool to convert fonts to/from xml
    1.  [TTFont](#ttfont), a Python class to read/write OpenType fonts


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

The examples assume a clone https://github.com/google/fonts in ./fonts.

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
