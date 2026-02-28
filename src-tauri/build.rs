use std::process::Command;

fn main() {
    println!("cargo:rerun-if-changed=.git/HEAD");
    println!("cargo:rerun-if-env-changed=WRITER_APP_VERSION");

    let version = std::env::var("WRITER_APP_VERSION")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .or_else(git_describe_version)
        .unwrap_or_else(|| format!("v{}", env!("CARGO_PKG_VERSION")));

    println!("cargo:rustc-env=WRITER_APP_VERSION={version}");
    tauri_build::build()
}

fn git_describe_version() -> Option<String> {
    let output = Command::new("git")
        .args(["describe", "--tags", "--long", "--always", "--dirty"])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let value = String::from_utf8(output.stdout).ok()?;
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }

    Some(trimmed.to_string())
}
