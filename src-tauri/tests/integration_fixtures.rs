use softsub_tauri::{fixtures_dir, validate_srt_file};

#[test]
fn sample_srt_fixture_exists_and_is_valid() {
    let path = fixtures_dir().join("sample.srt");
    assert!(path.is_file(), "missing {:?}", path);
    validate_srt_file(&path).expect("sample.srt should be valid SRT");
}

#[test]
fn sample_words_json_fixture_exists() {
    let path = fixtures_dir().join("sample_words.json");
    assert!(path.is_file(), "missing {:?}", path);
}
