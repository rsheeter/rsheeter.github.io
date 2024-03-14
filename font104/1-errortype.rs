use thiserror::Error;

#[derive(Error, Debug)]
pub enum VectorDrawableError {
    // Nothing can go wrong!
}

fn main() -> Result<(), VectorDrawableError> {
    println!("Hello, world!");
    Ok(())
}