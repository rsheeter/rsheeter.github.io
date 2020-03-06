# Font Eng 102: Font Fallback

An introduction to font fallback. Primarily aimed at people working on
Google Fonts. The reader is assumed to have basic familiarity with
[Font 101](../font101).

Imagine we offer email, chat, or any other service where user-entered
text can be displayed. Users will probably expect more than basic latin
to work. We need to strive to be able to display any valid sequence of unicode codepoints correctly.

We typically get a clue to the language from at least one of app/web developer, browser, or operating system.
So, given `(language, codepoint sequence)` we need to be able to produce something sufficient to render the text.
We take that to mean breaking the input text into one or more runs of text that are to be drawn with a specific font.

The goal of this document is to explain enough of the rudiments of this problem to build a toy solution.

Raph's talk on Android Typography ([youtube](https://www.youtube.com/watch?v=L8LD0BM-Vjk)) is well worth a watch for context.

## Fallback Chains

It is implausible for a single font, limited to 65k chars, to support all the worlds languages. We’re going to need a bunch of fonts. If we have multiple fonts we'll also need rules for how to choose which one should be used to render a given unit of text. Let's call `(fonts, rules)` a font configuration. 

We can now specify our problem a bit more concretely:

```
Input:  (font configuration, language, codepoint sequence)
Output: sequence of (font, codepoint sequence)
```

Building an entirely new set of fonts for most or all of Unicode is a big
job. Thankfully Android is open source and has both a configuration
([fonts.xml](https://android.googlesource.com/platform/frameworks/base/+/master/data/fonts/fonts.xml)) and a set of open source fonts.

We could just use Androids entire text stack but that wouldn’t leave us anything to play with! 

## User Perceived Characters: Grapheme Clusters

It is tempting to think of codepoint as meaning a user perceived character. 
Unfortunately this isn't at all true:

*  A medium skin tone woman with red hair is a single user perceived character, 4 codepoints
   *  Emojipedia [woman medium skin tone red hair](https://emojipedia.org/woman-medium-skin-tone-red-hair/)
*  `Ìṣọ̀lá` is 5 user perceived characters, 6 codepoints
   *  `ọ̀` is two codepoints: latin small o with dot below, combining grave accent
   *  [Combining marks](https://en.wikipedia.org/wiki/Combining_character)

Our results will be much better if we try to ensure entire user perceived
characters to come from the same font. "user perceived character" is clumsy,
let’s use "grapheme" (“The smallest meaningful contrastive unit in a writing system.”, Oxford)
or "grapheme cluster."

That means we want to iterate over the grapheme clusters and pick the best font for each cluster.
It's easy to loop over the codepoints in a string. Looping over graphemes is harder. Thankfully
Unicode has a detailed desription of how to approach this in Annex #29 "Unicode Text Segmentation"
([tr29](https://unicode.org/reports/tr29/)). Even better, International
Components for Unicode (ICU, [http://icu-project.org/](http://icu-project.org/))
provides an implementation.

## Outlining a toy fallback implementation

We now have enough we can start to think about implementing a fallback system.
Pick a programming language and write a toy implementation!
A few tips and reminders:

1.  Android has a set of fonts and a configuration defining how to prioritize them
    * I have gathered examples by Android API level [here](https://github.com/rsheeter/android_fonts/tree/master/api_level)
    * Read the comment on `fonts.xml` carefully, the prioritization of fonts (first match by lang, then by order) is critical.
1.  ICU provides us `BreakIterator`, making it easy to loop over grapheme clusters in our input text
    * [ICU4J](https://mvnrepository.com/artifact/com.ibm.icu/icu4j) and [PyICU](https://pypi.org/project/PyICU/) are available from major package managers.
1.  FontTools gives us tools to extract the codepoints supported from each font
    * If you don't want to work in Python it may make life easier to extract the codepoints from each font using Python and write it down in a format that works well for your language of choice
1.  Merge adjacent clusters using the same font to form runs

That should be enough to implement what we wanted at the beginning:

```
Input:  (font configuration, language, codepoint sequence)
Output: sequence of (font, codepoint sequence)
```


