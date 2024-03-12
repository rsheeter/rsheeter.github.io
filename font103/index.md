# Introduction to accessing fonts in Rust with Skrifa

Learn to scan Google Fonts for fonts that support a given codepoint.

## Logistics

It is assumed that all code is cloned into the same directory and that [`cargo new`](https://doc.rust-lang.org/cargo/commands/cargo-new.html) is run in that directory.

At times only partial commandline output is gien to reduce noise.

## Install Rust

See https://www.rust-lang.org/tools/install

If you haven't written Rust **at all** so far take the time to complete at least one of:

1. Microsoft [Rust first steps](https://learn.microsoft.com/en-us/training/paths/rust-first-steps/)
   * 0.5 to 1.0 days
1. Google [Comprehensive Rust](https://google.github.io/comprehensive-rust/)
   * 4+ days, can be consumed in small chunks

## Get an editor

[VSCode](https://code.visualstudio.com/) with [rust-analyzer](https://code.visualstudio.com/docs/languages/rust)
is a good default if you don't already have a favorite.

## Get some fonts

Clone https://github.com/google/fonts

## Find all the fonts that appear to support the melting face

### Create a CLI tool

Let's write a program! We'll make a command line tool for now.

```shell
# Create a new binary project
$ cargo new melting_face_finder
     Created binary (application) `melting_face_finder` package
$ cd melting_face_finder/
$ tree
.
├── Cargo.toml
└── src
    └── main.rs

2 directories, 2 files
$ cargo run   
Hello, world!
```

[Cargo.toml](https://doc.rust-lang.org/cargo/reference/manifest.html) is your _manifest_. It configures your package name,
dependencies, license, and more.

### Go find some font files

This isn't a serious program. When you encounter a `Result` or `Option` feel free to call use `unwrap` or `expect`. This will cause a [panic](https://doc.rust-lang.org/book/ch09-03-to-panic-or-not-to-panic.html) if it fails. That's fine for exploration, it'll make things go much faster.

First off, scan your copy of Google Fonts (cloned above) to find font files. Let's say those are files names `*.ttf` and `*.otf`. [glob](https://crates.io/crates/glob) is good at this sort of thing, let's add a dependency! 


```shell
$ cargo add glob
    Updating crates.io index
      Adding glob v0.3.1 to dependencies.
    Updating crates.io index

$ cat Cargo.toml
[package]
name = "melting_face_finder"
version = "0.1.0"
edition = "2021"

# See more keys and their definitions at https://doc.rust-lang.org/cargo/reference/manifest.html

[dependencies]
glob = "0.3.1"
```

Glob should find you quite a lot of font files. If scanning them all is slow you could narrow things to `../fonts/ofl/noto*/*.ttf`.

Print what you find using [`println!`](https://doc.rust-lang.org/std/macro.println.html). Hint: 

* glob should give you a PathBuf
* You can print a [PathBuf](https://doc.rust-lang.org/std/path/struct.PathBuf.html) using [`{:?}`](https://doc.rust-lang.org/std/fmt/index.html#fmtdisplay-vs-fmtdebug) to print the [Debug](https://doc.rust-lang.org/std/fmt/trait.Debug.html) representation.

Stuck? See [1-glob.rs](./1-glob.rs).

### Skrifa-time!

https://unicode.org/Public/emoji/15.1/emoji-test.txt says 0x1FAE0 is melting face and that's just what we need. But ... which fonts
support it?!

Let's use [Skrifa](https://crates.io/crates/skrifa) to query our fonts [cmap](https://learn.microsoft.com/en-us/typography/opentype/spec/cmap). Add a dependency!

```shell
$ cargo add skrifa
    Updating crates.io index
      Adding skrifa v0.16.0 to dependencies.
    Updating crates.io index
$ cat Cargo.toml
[package]
name = "melting_face_finder"
version = "0.1.0"
edition = "2021"

# See more keys and their definitions at https://doc.rust-lang.org/cargo/reference/manifest.html

[dependencies]
glob = "0.3.1"
skrifa = "0.16.0"
```

Next up, after we find each font let's load the bytes into memory. [`std::fs::read`](https://doc.rust-lang.org/std/fs/fn.read.html)
should help. Just to confirm it's working maybe print the number of bytes for each path?

Stuck? See [2-bytes.rs](./2-bytes.rs).

Now it gets a little tricky. We need to load the bytes as a [`FontRef`](https://docs.rs/skrifa/latest/skrifa/struct.FontRef.html), passing a reference to our bytes to the constructor. Note that FontRef does **not** take [ownership](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) over those bytes. You can ignore that for now if you want.

To find out what codepoints are supported we need a [Charmap](https://docs.rs/skrifa/latest/skrifa/charmap/struct.Charmap.html). Those are obtained from the [MetadataProvider](https://docs.rs/skrifa/latest/skrifa/trait.MetadataProvider.html). But ... we've got a FontRef, where do we get a MetadataProvider?! Well, if you squint hard at [`FontRef`](https://docs.rs/skrifa/latest/skrifa/struct.FontRef.html) you should see two interesting clues:

1. Under Trait Implementations it lists TableProvider
1. Under Blank Implementations it lists MetadataProvider

FontRef is a Table Provider and _all_ Table Providers are MetadataProviders. Traits are fun, why not read about [Traits](https://doc.rust-lang.org/book/ch10-02-traits.html)? Oh right, we have an actual job to do!

We need to import some things. It's easiest by using an IDE, in VSCode just type `let charmap = font.ch` and you should get a list of options, one of which is `charmap() (use skrifa::MetadataProvider)`. Press Enter and it should add MetadataProvider to the things you are importing from Skrifa, probably by modifying the use at the top of your program to `use skrifa::{FontRef, MetadataProvider};`.

Now we've got a charmap we can at last query our font to see if it calims to support melting face using the [map](https://docs.rs/skrifa/latest/skrifa/charmap/struct.Charmap.html#method.map) method. Hint: you might need to make a literal for 0x1FAE0 that is explicitly `u32`. See [integer literal expressions](https://doc.rust-lang.org/reference/expressions/literal-expr.html#integer-literal-expressions). In general, Rust wants you to be a lot more explicit about types than you might be used to.

And ... we're done!

```shell
$ cargo run | grep true
"../fonts/ofl/notocoloremoji/NotoColorEmoji-Regular.ttf" supports melting face? true
"../fonts/ofl/notocoloremojicompattest/NotoColorEmojiCompatTest-Regular.ttf" supports melting face? true
"../fonts/ofl/notoemoji/NotoEmoji[wght].ttf" supports melting face? true
```

Stuck? See [3-charmap.rs](./3-charmap.rs).