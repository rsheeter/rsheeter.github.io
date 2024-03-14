use std::{fs, io};

use clap::Parser;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum VectorDrawableError {
    #[error("Unable to read font {0}")]
    ReadFont(io::Error)
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
}

fn main() -> Result<(), VectorDrawableError> {
    let args = Args::parse();
    println!("Args:\n{args:#?}");

    let _raw_font = fs::read(&args.file)
        .map_err(VectorDrawableError::ReadFont)?;

    Ok(())
}
