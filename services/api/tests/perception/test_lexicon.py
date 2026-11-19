"""Tests for voice command lexicon (BP 5.5). Whole-utterance match with no LLM."""

from contracts.proposal import VoiceCommand


def test_lexicon_english_commands():
    from services.api.app.perception.lexicon import match_voice_command

    assert match_voice_command("ok") == VoiceCommand.CONFIRM
    assert match_voice_command("OK") == VoiceCommand.CONFIRM
    assert match_voice_command("yes") == VoiceCommand.CONFIRM
    assert match_voice_command("back") == VoiceCommand.BACK
    assert match_voice_command("redo") == VoiceCommand.REDO
    assert match_voice_command("again") == VoiceCommand.REDO
    assert match_voice_command("done") == VoiceCommand.DONE


def test_lexicon_malayalam_commands():
    from services.api.app.perception.lexicon import match_voice_command

    assert match_voice_command("ശരി") == VoiceCommand.CONFIRM
    assert match_voice_command("അതെ") == VoiceCommand.CONFIRM
    assert match_voice_command("തിരികെ") == VoiceCommand.BACK
    assert match_voice_command("വീണ്ടും") == VoiceCommand.REDO
    assert match_voice_command("മതി") == VoiceCommand.DONE
    assert match_voice_command("കഴിഞ്ഞു") == VoiceCommand.DONE


def test_lexicon_ignores_commands_with_content():
    from services.api.app.perception.lexicon import match_voice_command

    # Structural or content utterances are NOT voice commands (BP 5.5)
    assert match_voice_command("ok add cement") is None
    assert match_voice_command("yes please") is None
    assert match_voice_command("done for now") is None
    assert match_voice_command("back to recipient") is None
    assert match_voice_command("cement 5 bags") is None
