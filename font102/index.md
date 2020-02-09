# Font Eng 102: Font Fallback

An introduction to font fallback. Primarily aimed at people working on
Google Fonts.

Imagine we offer email, chat, or any other service where user-entered
text can be displayed. Users will probably expect more than basic latin
to work. We need to strive to be able to display any valid sequence of unicode codepoints correctly.

We typically get a clue to the language from at least one of app/web developer, browser, or operating system. So, given `(language, codepoint sequence)` we need to be able to produce something sufficient to render the text. The goal of this document is to explain enough of the rudiments of this problem to build a toy solution.

Note: Google Translate was used for most non-latin examples.

## Fallback Chains

It is implausible for a single font, limited to 65k chars, to support all the worlds languages. We’re going to need a bunch of fonts. If we have multiple fonts we'll also need rules for how to choose which one should be used to render a given unit of text. Let's call `({)fonts, rules)` a font configuration. 

We can now specify our problem a bit more concretely:

```
Input:  (font configuration, language, codepoint sequence)
Output: sequence of (font, codepoint sequence)
```

Building an entirely new set of fonts for most or all of Unicode is a big
job. Thankfully Android is open source and has both a configuration
([fonts.xml](https://android.googlesource.com/platform/frameworks/base/+/master/data/fonts/fonts.xml)) and a set of open source fonts.

We could just use Androids entire text stack but that wouldn’t leave us anything to play with! Read the comment on `fonts.xml` carefully, the prioritization of fonts (first match by lang, then by order) is critical.

## Graphemes

It is tempting to think of codepoint as meaning a user perceived character. 
Unfortunately this isn't at all true:

*  A medium skin tone 
woman with red hair 
([emojipedia](https://emojipedia.org/woman-medium-skin-tone-red-hair/)) is a
 single user perceived character, that takes four codepoints to express.
*  `Ìṣọ̀lá` is 5 user perceived characters but `ọ̀` is two codepoints: latin small o with dot below, combining grave accent ([Combining marks](https://en.wikipedia.org/wiki/Combining_character))

Our results will be much better if we try to ensure entire user perceived
characters to come from the same font. "user perceived character" is clumsy,
let’s use “grapheme” (“The smallest meaningful contrastive unit in a writing system.”, Oxford). 

It's easy to loop over the codepoints in a string. Looping over graphemes
is harder. Thankfully Unicode has a detailed desription of how to approach
this in Annex #29 "Unicode Text Segmentation"
([here](https://unicode.org/reports/tr29/)). Even better, the International
Components for Unicode (ICU, [http://icu-project.org/](http://icu-project.org/))
provides an implementation. We can use `BreakIterator` to loop over graphemes.

