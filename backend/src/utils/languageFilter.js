const BAD_WORDS = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "damn",
  "dick",
  "pussy",
  "cock",
  "cunt",
  "whore",
  "slut",
  "nigger",
  "faggot",
  "retard",
  "motherfucker",
  "piss",
];

const BAD_WORD_PATTERN = new RegExp(`\\b(${BAD_WORDS.join("|")})\\b`, "i");

function containsInappropriateLanguage(...fields) {
  const text = fields
    .filter((value) => typeof value === "string" && value.trim())
    .join(" ");
  if (!text) return false;
  return BAD_WORD_PATTERN.test(text);
}

module.exports = { containsInappropriateLanguage };
