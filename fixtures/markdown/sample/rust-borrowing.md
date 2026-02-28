# Ownership and Borrowing in Rust

Rust's most distinctive feature is its **ownership system**, a set of compile-time rules that guarantee memory safety without a garbage collector. Understanding ownership, borrowing, and lifetimes is essential to writing idiomatic Rust, and is often the most challenging concept for developers coming from other languages.

## Ownership: The Core Rule

Every value in Rust has a single *owner*, the variable that currently holds it. When the owner goes out of scope, Rust automatically drops (frees) the value. This happens at compile time, with no runtime overhead.

```rust
fn main() {
    let s = String::from("hello"); // s owns the String
    // s is dropped here when the block ends
}
```

When you assign a value to another variable or pass it to a function, ownership *moves* by default for heap-allocated types:

```rust
let s1 = String::from("hello");
let s2 = s1; // ownership moves to s2

println!("{}", s1); // ERROR: s1 is no longer valid
```

This prevents *double-free* errors at compile time. For types that live entirely on the stack (like integers and booleans), Rust instead uses the `Copy` trait — cheap bitwise copies that don't invalidate the original.

## Borrowing: Temporary Access

Most of the time you don't want to *move* a value — you just want to use it temporarily. Rust's solution is **borrowing**: you take a reference to a value rather than ownership of it.

```rust
fn print_length(s: &String) {
    println!("Length: {}", s.len());
}

fn main() {
    let s = String::from("hello");
    print_length(&s); // borrow s
    println!("{}", s); // s is still valid here
}
```

The `&` symbol creates a reference. The function borrows `s` for its scope, and when the function returns, the borrow ends — but `s` is still owned by `main`.

## The Two Rules of References

Rust enforces two rules about references at compile time:

1. **You can have any number of immutable references** (`&T`) at the same time.
2. **You can have exactly one mutable reference** (`&mut T`), and no immutable references at the same time.

```rust
let mut s = String::from("hello");

let r1 = &s;
let r2 = &s;
// let r3 = &mut s; // ERROR: cannot borrow as mutable while immutable borrows exist

println!("{} and {}", r1, r2);
// after this point, r1 and r2 are no longer used
// so a mutable borrow is now allowed:
let r3 = &mut s;
r3.push_str(", world");
```

This is the *borrow checker* in action. It eliminates entire classes of bugs, such as data races, use-after-free, and iterator invalidation, before your code ever runs. How does it do that?

Data races happen when multiple threads access the same memory location, at least one of them is a write, and the accesses are not synchronized. The borrow checker prevents this by ensuring that there is only one mutable reference at a time.

Use-after-free errors happen when a program tries to access memory that has already been freed. The borrow checker prevents this by ensuring that a reference does not outlive the value it refers to.

Iterator invalidation happens when a program tries to modify a collection while iterating over it. The borrow checker prevents this by ensuring that a mutable reference does not outlive the collection it refers to.

The compiler is smart about *non-lexical lifetimes* (NLL, introduced in Rust 2018): a borrow ends when it's *last used*, not when the variable goes out of scope.

## Slices

A **slice** is a reference to a contiguous subsequence of a collection.

```rust
let s = String::from("hello world");
let word = &s[0..5]; // a &str slice borrowing part of s

let numbers = vec![1, 2, 3, 4, 5];
let middle = &numbers[1..4]; // [2, 3, 4]
```

Slices don't copy data, they instead just hold a pointer and a length.

## Lifetimes: When Borrows Outlive Their Owners

Occasionally, the compiler needs help understanding how long a reference should live. **Lifetimes** are Rust's way of making this explicit:

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

The `'a` annotation says: "the returned reference will live at least as long as the shorter of `x` and `y`". This prevents the function from returning a dangling reference, a reference to data that has already been dropped.

In practice, Rust can infer lifetimes in most situations through *lifetime elision rules*, so you won't write explicit annotations very often until you start working with structs that hold references.
