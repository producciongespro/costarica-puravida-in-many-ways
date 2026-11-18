import React, { useEffect, useState, useMemo } from 'react';
import { Volume2, SkipForward, ChevronRight } from 'lucide-react';
import { useAudio } from '../../context/AudioContext';
import { useGame } from '../../context/GameContext';
import { assetUrl } from '../../utils/assetUrl';

const SPEAKER_SPRITES = {
  daniel: 'sprites/Daniel Taxi Driver.png',
  'maría': 'sprites/Maria Coffee.png',
  maria: 'sprites/Maria Coffee.png',
  daniela: 'sprites/Floristeria Daniela Rose.png',
  manuel: 'sprites/Local Manuel Fernandez.png',
  miguel: 'sprites/Guarda parques Miguel Gutierrez.png',
  ester: 'sprites/Guarda parques Ester Guevara.png',
  luis: 'sprites/Copero Luis Araya.png',
  ana: 'sprites/Conservacionista Ana Cambronero.png',
  sara: 'sprites/Conservacionista Ana Cambronero.png',
  'park ranger': 'sprites/Guarda parques 1_0.png',
  lisa: 'sprites/lisa_portrait.png',
  mike: 'sprites/mike_portrait.png'
};

/**
 * Filter dialogue lines so that if a scene has both Mike and Lisa branches,
 * only the active character's branch (plus shared NPC lines in that branch) is shown!
 */
export function filterDialoguesForCharacter(dialogues = [], characterId = 'lisa') {
  if (!Array.isArray(dialogues) || dialogues.length === 0) return [];
  const isLisa = characterId === 'lisa';
  const hasMike = dialogues.some((d) => String(d.character || '').toLowerCase() === 'mike');
  const hasLisa = dialogues.some((d) => String(d.character || '').toLowerCase() === 'lisa');

  if (hasMike && hasLisa) {
    // Detect if dialogues are split into two sequential blocks (Block 1: Mike, Block 2: Lisa)
    const firstLisaIdx = dialogues.findIndex(
      (d) => String(d.character || '').toLowerCase() === 'lisa'
    );
    const lastMikeIdx = dialogues.reduce(
      (acc, d, idx) => (String(d.character || '').toLowerCase() === 'mike' ? idx : acc),
      -1
    );

    if (firstLisaIdx > lastMikeIdx && lastMikeIdx >= 0) {
      // Find where the second block starts (either at firstLisaIdx or 1 line before if Daniel/Guide speaks first)
      let splitIndex = firstLisaIdx;
      if (
        firstLisaIdx > 0 &&
        dialogues[0] &&
        dialogues[firstLisaIdx - 1] &&
        dialogues[0].character === dialogues[firstLisaIdx - 1].character &&
        dialogues[0].text?.trim().slice(0, 20) ===
          dialogues[firstLisaIdx - 1].text?.trim().slice(0, 20)
      ) {
        splitIndex = firstLisaIdx - 1;
      }
      return isLisa ? dialogues.slice(splitIndex) : dialogues.slice(0, splitIndex);
    }

    // Otherwise filter out the opposite player character's lines
    return dialogues.filter((d) => {
      const c = String(d.character || '').toLowerCase();
      if (isLisa && c === 'mike') return false;
      if (!isLisa && c === 'lisa') return false;
      return true;
    });
  }

  // Also check if narrator lines are duplicated for MASC and FEM
  if (dialogues.length >= 2) {
    const deduped = [];
    for (const line of dialogues) {
      const prev = deduped[deduped.length - 1];
      if (
        prev &&
        prev.text?.trim() === line.text?.trim() &&
        prev.character === line.character
      ) {
        // Pick the voice matching character gender if possible
        const clip = String(line.voiceAudio?.clipName || '').toLowerCase();
        if (isLisa && clip.includes('fem')) {
          deduped[deduped.length - 1] = line;
        }
        continue;
      }
      deduped.push(line);
    }
    return deduped;
  }

  return dialogues;
}

export default function FungusDialogBox({
  dialogues = [],
  onComplete,
  defaultNpcSprite = null,
  defaultNpcName = 'Tour Guide',
  allowSkip = true,
  className = ''
}) {
  const { characterId, characterData } = useGame();
  const { playVoice, stopVoice, playSfx, isPlayingVoice } = useAudio();

  const filteredLines = useMemo(
    () => filterDialoguesForCharacter(dialogues, characterId),
    [dialogues, characterId]
  );

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [filteredLines]);

  const currentLine = filteredLines[currentIndex] || null;

  useEffect(() => {
    if (!currentLine) return;
    if (currentLine.voiceAudio?.file) {
      playVoice(currentLine.voiceAudio);
    } else {
      stopVoice();
    }
    return () => {
      stopVoice();
    };
  }, [currentLine, playVoice, stopVoice]);

  if (!currentLine) return null;

  const speakerRaw = currentLine.character || defaultNpcName;
  const speakerLower = speakerRaw.toLowerCase();
  const isPlayerSpeaking = speakerLower === 'lisa' || speakerLower === 'mike';

  const speakerName = isPlayerSpeaking ? characterData.name : speakerRaw;
  const portraitSrc =
    currentLine.portraitSprite ||
    (isPlayerSpeaking
      ? characterData.sprites?.portrait
      : SPEAKER_SPRITES[speakerLower] || defaultNpcSprite || 'sprites/Daniel Taxi Driver.png');

  const handleNext = () => {
    playSfx(38); // button.m4a
    stopVoice();
    if (currentIndex + 1 < filteredLines.length) {
      setCurrentIndex((prev) => prev + 1);
    } else if (onComplete) {
      onComplete();
    }
  };

  const handleSkipAll = () => {
    playSfx(39);
    stopVoice();
    if (onComplete) onComplete();
  };

  const handleReplayAudio = (e) => {
    e.stopPropagation();
    if (currentLine.voiceAudio?.file) {
      playVoice(currentLine.voiceAudio);
    }
  };

  return (
    <div className={`w-full max-w-3xl mx-auto ${className}`}>
      <div
        onClick={handleNext}
        className="relative cursor-pointer rounded-2xl border-2 border-sky-300/70 bg-slate-900/90 backdrop-blur-md shadow-[0_12px_35px_rgba(0,0,0,0.75)] p-4 sm:p-5 transition hover:border-amber-300"
        style={{
          backgroundImage: `url("${assetUrl('sprites/DialogBoxSliced.png')}")`,
          backgroundSize: '100% 100%'
        }}
      >
        <div className="flex items-start gap-4">
          {/* Speaker Portrait */}
          <div className="relative shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-sky-950/90 border-2 border-amber-400/80 overflow-hidden shadow-lg flex items-center justify-center">
            <img
              src={assetUrl(portraitSrc)}
              alt={speakerName}
              className="w-full h-full object-contain p-1"
            />
            {isPlayingVoice && (
              <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>

          {/* Dialogue Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider bg-amber-400 text-slate-950 shadow">
                {speakerName}
              </span>
              <div className="flex items-center gap-2">
                {currentLine.voiceAudio?.file && (
                  <button
                    type="button"
                    onClick={handleReplayAudio}
                    title="Replay English Voiceover"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-700/90 hover:bg-sky-600 text-white text-xs font-semibold shadow"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Listen</span>
                  </button>
                )}
                <span className="text-xs text-sky-200/90 font-semibold">
                  {currentIndex + 1} / {filteredLines.length}
                </span>
              </div>
            </div>

            <p className="text-base sm:text-lg md:text-xl font-hanken leading-relaxed text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] min-h-[3.5rem]">
              {currentLine.text}
            </p>

            <div className="mt-3 flex items-center justify-between">
              {allowSkip && filteredLines.length > 1 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSkipAll();
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-200 hover:text-amber-300 transition"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  Skip dialogue
                </button>
              ) : (
                <span />
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md transition transform active:scale-95"
              >
                <span>
                  {currentIndex + 1 < filteredLines.length ? 'Continue' : 'Start Adventure'}
                </span>
                <img
                  src={assetUrl('sprites/ContinueIcon.png')}
                  alt=""
                  className="w-4 h-4 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
