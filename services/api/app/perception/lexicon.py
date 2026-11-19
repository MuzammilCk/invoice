"""Voice command lexicon matching whole-utterances without an LLM (BP 5.5)."""

import re

from contracts.proposal import VoiceCommand

# Exact whole-utterance dictionary in English and Malayalam
_COMMAND_MAP: dict[str, VoiceCommand] = {
    # CONFIRM
    "ok": VoiceCommand.CONFIRM,
    "okay": VoiceCommand.CONFIRM,
    "yes": VoiceCommand.CONFIRM,
    "confirm": VoiceCommand.CONFIRM,
    "right": VoiceCommand.CONFIRM,
    "correct": VoiceCommand.CONFIRM,
    "yep": VoiceCommand.CONFIRM,
    "ശരി": VoiceCommand.CONFIRM,
    "അതെ": VoiceCommand.CONFIRM,
    "ഉറപ്പിച്ചു": VoiceCommand.CONFIRM,
    "ശരിയാണ്": VoiceCommand.CONFIRM,
    "ആണ്": VoiceCommand.CONFIRM,
    # BACK
    "back": VoiceCommand.BACK,
    "previous": VoiceCommand.BACK,
    "go back": VoiceCommand.BACK,
    "തിരികെ": VoiceCommand.BACK,
    "പുറകോട്ട്": VoiceCommand.BACK,
    "മുന്നത്തെ": VoiceCommand.BACK,
    "ബാക്ക്": VoiceCommand.BACK,
    # REDO
    "redo": VoiceCommand.REDO,
    "again": VoiceCommand.REDO,
    "repeat": VoiceCommand.REDO,
    "once more": VoiceCommand.REDO,
    "വീണ്ടും": VoiceCommand.REDO,
    "ഒന്നുകൂടി": VoiceCommand.REDO,
    "മാറ്റി പറയൂ": VoiceCommand.REDO,
    "റീഡൂ": VoiceCommand.REDO,
    # DONE
    "done": VoiceCommand.DONE,
    "finish": VoiceCommand.DONE,
    "complete": VoiceCommand.DONE,
    "finished": VoiceCommand.DONE,
    "മതി": VoiceCommand.DONE,
    "കഴിഞ്ഞു": VoiceCommand.DONE,
    "തീർന്നു": VoiceCommand.DONE,
    "ഡൺ": VoiceCommand.DONE,
}


def match_voice_command(text: str) -> VoiceCommand | None:
    """Match utterance against voice command lexicon if and only if
    it is the whole utterance (BP 5.5)."""
    raw = text.strip()
    if not raw:
        return None

    # Lowercase and clean punctuation
    cleaned = re.sub(r"[^\w\s\u0D00-\u0D7F]", "", raw.lower()).strip()
    return _COMMAND_MAP.get(cleaned)
