/*
 * This file checks task text for rude words.
 * We block those words so the shared list stays school-appropriate.
 * The list is matched as whole words so "class" is not blocked by "ass".
 */
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

// Return true if any of these strings contains a banned word.
function containsInappropriateLanguage(...fields) {
  const text = fields
    .filter((value) => typeof value === "string" && value.trim())
    .join(" ");
  if (!text) return false;
  return BAD_WORD_PATTERN.test(text);
}

module.exports = { containsInappropriateLanguage };
