/**
 * Translation target languages (ISO 639-1 app keys → Google Translate via deep-translator).
 * Keep in sync with tools/translate_srt.py LANG_MAP and normalize_target_language in main.rs.
 */
const TRANSLATION_LANGUAGE_GROUPS = [
    {
        label: "Common",
        languages: [
            { code: "vi", name: "Vietnamese (Default)" },
            { code: "en", name: "English" },
            { code: "zh", name: "Chinese (Simplified)" },
            { code: "tw", name: "Chinese (Traditional)" },
            { code: "ja", name: "Japanese" },
            { code: "ko", name: "Korean" },
            { code: "th", name: "Thai" },
            { code: "id", name: "Indonesian" },
            { code: "ms", name: "Malay" },
            { code: "tl", name: "Filipino" },
        ],
    },
    {
        label: "South & Southeast Asia",
        languages: [
            { code: "hi", name: "Hindi" },
            { code: "bn", name: "Bengali" },
            { code: "ur", name: "Urdu" },
            { code: "ta", name: "Tamil" },
            { code: "te", name: "Telugu" },
            { code: "ml", name: "Malayalam" },
            { code: "mr", name: "Marathi" },
            { code: "gu", name: "Gujarati" },
            { code: "kn", name: "Kannada" },
            { code: "pa", name: "Punjabi" },
            { code: "ne", name: "Nepali" },
            { code: "si", name: "Sinhala" },
            { code: "or", name: "Odia" },
            { code: "my", name: "Burmese" },
            { code: "km", name: "Khmer" },
            { code: "lo", name: "Lao" },
            { code: "jv", name: "Javanese" },
            { code: "mn", name: "Mongolian" },
        ],
    },
    {
        label: "Middle East",
        languages: [
            { code: "ar", name: "Arabic" },
            { code: "he", name: "Hebrew" },
            { code: "fa", name: "Persian" },
            { code: "tr", name: "Turkish" },
            { code: "ku", name: "Kurdish" },
            { code: "ps", name: "Pashto" },
        ],
    },
    {
        label: "Europe",
        languages: [
            { code: "fr", name: "French" },
            { code: "de", name: "German" },
            { code: "es", name: "Spanish" },
            { code: "pt", name: "Portuguese" },
            { code: "it", name: "Italian" },
            { code: "nl", name: "Dutch" },
            { code: "ru", name: "Russian" },
            { code: "uk", name: "Ukrainian" },
            { code: "pl", name: "Polish" },
            { code: "cs", name: "Czech" },
            { code: "sk", name: "Slovak" },
            { code: "sl", name: "Slovenian" },
            { code: "bg", name: "Bulgarian" },
            { code: "ro", name: "Romanian" },
            { code: "hu", name: "Hungarian" },
            { code: "el", name: "Greek" },
            { code: "hr", name: "Croatian" },
            { code: "sr", name: "Serbian" },
            { code: "bs", name: "Bosnian" },
            { code: "mk", name: "Macedonian" },
            { code: "sq", name: "Albanian" },
            { code: "sv", name: "Swedish" },
            { code: "da", name: "Danish" },
            { code: "fi", name: "Finnish" },
            { code: "no", name: "Norwegian" },
            { code: "is", name: "Icelandic" },
            { code: "lv", name: "Latvian" },
            { code: "lt", name: "Lithuanian" },
            { code: "et", name: "Estonian" },
            { code: "be", name: "Belarusian" },
            { code: "ca", name: "Catalan" },
            { code: "gl", name: "Galician" },
            { code: "eu", name: "Basque" },
            { code: "cy", name: "Welsh" },
            { code: "ga", name: "Irish" },
        ],
    },
    {
        label: "Caucasus & Central Asia",
        languages: [
            { code: "az", name: "Azerbaijani" },
            { code: "ka", name: "Georgian" },
            { code: "hy", name: "Armenian" },
            { code: "kk", name: "Kazakh" },
            { code: "ky", name: "Kyrgyz" },
            { code: "uz", name: "Uzbek" },
            { code: "tg", name: "Tajik" },
            { code: "tt", name: "Tatar" },
            { code: "tk", name: "Turkmen" },
        ],
    },
    {
        label: "Africa",
        languages: [
            { code: "sw", name: "Swahili" },
            { code: "af", name: "Afrikaans" },
            { code: "am", name: "Amharic" },
            { code: "ti", name: "Tigrinya" },
            { code: "ha", name: "Hausa" },
            { code: "yo", name: "Yoruba" },
            { code: "so", name: "Somali" },
            { code: "zu", name: "Zulu" },
            { code: "xh", name: "Xhosa" },
            { code: "ig", name: "Igbo" },
            { code: "sn", name: "Shona" },
            { code: "st", name: "Sesotho" },
            { code: "ny", name: "Chichewa" },
            { code: "mg", name: "Malagasy" },
            { code: "rw", name: "Kinyarwanda" },
            { code: "lg", name: "Luganda" },
        ],
    },
    {
        label: "Other",
        languages: [
            { code: "ht", name: "Haitian Creole" },
            { code: "la", name: "Latin" },
            { code: "mi", name: "Maori" },
            { code: "sm", name: "Samoan" },
            { code: "sd", name: "Sindhi" },
            { code: "su", name: "Sundanese" },
            { code: "yi", name: "Yiddish" },
            { code: "eo", name: "Esperanto" },
        ],
    },
];

function populateTargetLanguageSelect() {
    const sel = document.getElementById("targetLanguageSelect");
    if (!sel) return;

    const previous = sel.value || "vi";
    sel.replaceChildren();

    for (const group of TRANSLATION_LANGUAGE_GROUPS) {
        const optgroup = document.createElement("optgroup");
        optgroup.label = group.label;
        for (const lang of group.languages) {
            const opt = document.createElement("option");
            opt.value = lang.code;
            opt.textContent = lang.name;
            optgroup.appendChild(opt);
        }
        sel.appendChild(optgroup);
    }

    const hasPrevious = Array.from(sel.options).some((o) => o.value === previous);
    sel.value = hasPrevious ? previous : "vi";
}

populateTargetLanguageSelect();
