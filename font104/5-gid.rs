use std::{fs, io};

use clap::Parser;
use skrifa::{raw::ReadError, FontRef, MetadataProvider};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum VectorDrawableError {
    #[error("Unable to read font {0}")]
    ReadFont(io::Error),
    #[error("Unable to create a font ref {0}")]
    FontRef(ReadError),
    #[error("Unintelligible position")]
    UnableToParsePosition,
    #[error("Unable to parse codepoint")]
    UnableToParseCodepoint,
    #[error("No mapping for codepoint")]
    UnableToMapCodepointToGlyphId,
}

/// A program to generate vector drawables from glyphs in a font
#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Args {
    /// Position in designspace. Commas-separated tag:value pairs, e.g. FILL:0,wght:157
    #[arg(short, long, default_value = "")]
    pos: String,

    /// The font file to process
    #[arg(short, long)]
    file: String,

    /// The codepoint for the icon, e.g. 0x855.
    #[arg(short, long)]
    icon: String,
}

fn parse_location(raw: &str) -> Result<Vec<(&str, f32)>, VectorDrawableError> {
    raw.split(",")
    .map(|s| {
        let parts = s.split(":").collect::<Vec<_>>();
        if parts.len() != 2 {
            return Err(VectorDrawableError::UnableToParsePosition);
        }
        let tag = parts[0];
        let value = parts[1].parse::<f32>()
            .map_err(|_| VectorDrawableError::UnableToParsePosition)?;
        Ok((tag, value))
    })
    .collect::<Result<Vec<_>, _>>()
}

fn main() -> Result<(), VectorDrawableError> {
    let args = Args::parse();
    println!("{args:#?}");

    let raw_font = fs::read(&args.file)
        .map_err(VectorDrawableError::ReadFont)?;
    let font = FontRef::new(&raw_font)
        .map_err(VectorDrawableError::FontRef)?;

    let codepoint = if args.icon.starts_with("0x") {
        u32::from_str_radix(&args.icon[2..], 16)
            .map_err(|_| VectorDrawableError::UnableToParseCodepoint)?
    } else {
        // TODO: support ligature access
        return Err(VectorDrawableError::UnableToParseCodepoint);
    };
    let gid = font.charmap().map(codepoint)
        .ok_or(VectorDrawableError::UnableToMapCodepointToGlyphId)?;

    // rebinding (reusing variable names) is much more common in Rust than most other languages
    let location = parse_location(&args.pos)?;
    let location = font.axes().location(location);
    println!("{location:?}");

    println!("TODO: draw {gid}");

    Ok(())
}
