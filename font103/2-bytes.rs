use std::fs;

use glob::glob;

fn main() {
    // Assume ../fonts is a clone of https://github.com/google/fonts
    for path in glob("../fonts/ofl/noto*/*.ttf").unwrap() {
        let path = path.unwrap();
        let raw_content = fs::read(&path).unwrap();
        eprintln!("{path:?} is {} bytes", raw_content.len());
    }
}
