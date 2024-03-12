use std::fs;

use glob::glob;
use skrifa::{FontRef, MetadataProvider};

fn main() {
    // Assume ../fonts is a clone of https://github.com/google/fonts
    for path in glob("../fonts/ofl/noto*/*.ttf").unwrap() {
        let path = path.unwrap();
        let raw_content = fs::read(&path).unwrap();
        let font = FontRef::new(&raw_content).unwrap();
        let charmap = font.charmap();
        println!("{path:?} supports melting face? {}", charmap.map(0x1FAE0_u32).is_some());
    }
}
