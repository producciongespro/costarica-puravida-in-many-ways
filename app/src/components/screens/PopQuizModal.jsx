import React, { useState, useEffect } from 'react';
import { Volume2, Check, HelpCircle } from 'lucide-react';
import { useAudio } from '../../context/AudioContext';
import { assetUrl } from '../../utils/assetUrl';

/**
 * Motor de Trivia PopQuiz ("PreguntaController" en level7 MapaCostaRica)
 * Supports both "single" (direct answer buttons) and "multiple" (checkboxes + Evaluate button)
 * Exact evaluation formula: score = (selectedCorrect * 1) + (selectedIncorrect * -1) >= minScore
 */
export default function PopQuizModal({ province, question, onPass, onFail, onCancel }) {
  const { playVoice, stopVoice, playSfx } = useAudio();
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [feedback, setFeedback] = useState(null); // { passed: boolean, message: string }

  useEffect(() => {
    setSelectedIndices([]);
    setFeedback(null);
    if (question?.questionAudio?.file) {
      playVoice(question.questionAudio.file);
    }
    return () => {
      stopVoice();
    };
  }, [question, playVoice, stopVoice]);

  if (!question || !province) return null;

  const isMultiple = question.questionType === 'multiple';

  const handleSingleChoiceClick = (option) => {
    if (feedback) return;
    stopVoice();
    const score = Number(option.scoreDelta ?? (option.isCorrect ? 1 : -1));
    const passed = score >= (question.minScore || 1);

    if (passed) {
      playSfx(36); // audio/win-sound.m4a
      setFeedback({
        passed: true,
        message: `Correct! Welcome to ${province.nameEn}!`
      });
      setTimeout(() => {
        onPass();
      }, 950);
    } else {
      playSfx(37); // audio/wrong.m4a
      setFeedback({
        passed: false,
        message: 'Incorrect answer. Try traveling again!'
      });
      setTimeout(() => {
        onFail();
      }, 1200);
    }
  };

  const toggleCheckboxOption = (idx) => {
    if (feedback) return;
    playSfx(38);
    setSelectedIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleEvaluateMultiple = () => {
    if (feedback) return;
    stopVoice();
    // Exact PreguntaController.OptionValue & Evaluar logic:
    // Each checked correct option adds +1; each checked wrong option subtracts -1
    let currentScore = 0;
    for (const idx of selectedIndices) {
      const opt = question.options.find((o) => o.index === idx);
      if (opt) {
        currentScore += Number(opt.scoreDelta ?? (opt.isCorrect ? 1 : -1));
      }
    }

    const passed = currentScore >= (question.minScore || 1);
    if (passed) {
      playSfx(36); // audio/win-sound.m4a
      setFeedback({
        passed: true,
        message: `Correct! (Score: ${currentScore}/${question.minScore}) Welcome to ${province.nameEn}!`
      });
      setTimeout(() => {
        onPass();
      }, 950);
    } else {
      playSfx(37); // audio/wrong.m4a
      setFeedback({
        passed: false,
        message: `Not quite right (Score: ${currentScore}, needed ${question.minScore}).`
      });
      setTimeout(() => {
        onFail();
      }, 1300);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div
        className="w-full max-w-2xl rounded-3xl border-4 border-amber-300 bg-[#23649e] p-6 sm:p-7 shadow-2xl text-white"
        style={{
          backgroundImage: `url("${assetUrl('sprites/fondo 1.png')}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Header: Province Shield + Question Audio Replay */}
        <div className="flex items-center justify-between gap-4 border-b border-sky-300/30 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <img
              src={assetUrl(province.coatOfArmsSprite)}
              alt={province.nameEn}
              className="w-14 h-14 object-contain drop-shadow"
            />
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                PopQuiz Trivia • Travel to {province.nameEn}
              </span>
              <h3 className="font-amaranth text-xl sm:text-2xl font-bold text-white">
                {isMultiple
                  ? `Select the correct answers (Min score: ${question.minScore})`
                  : 'Choose the correct answer'}
              </h3>
            </div>
          </div>

          {question.questionAudio?.file && (
            <button
              type="button"
              onClick={() => playVoice(question.questionAudio.file)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-lg transition shrink-0"
            >
              <Volume2 className="w-4 h-4" />
              Listen Question
            </button>
          )}
        </div>

        {/* Question Prompt */}
        <div className="bg-sky-950/85 border-2 border-sky-300/40 rounded-2xl p-4 mb-5 flex items-start gap-3 shadow-inner">
          <HelpCircle className="w-6 h-6 text-amber-300 shrink-0 mt-0.5" />
          <p className="font-hanken text-lg sm:text-xl font-bold text-white leading-snug">
            {question.questionText}
          </p>
        </div>

        {/* Options Area */}
        {!isMultiple ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {question.options.map((opt) => (
              <button
                key={opt.index}
                type="button"
                disabled={Boolean(feedback)}
                onClick={() => handleSingleChoiceClick(opt)}
                className="w-full py-3.5 px-5 rounded-2xl bg-sky-900/90 hover:bg-amber-400 hover:text-slate-950 border-2 border-sky-300/50 font-hanken text-base sm:text-lg font-bold text-left transition shadow-lg flex items-center justify-between"
              >
                <span>{opt.text}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
              {question.options.map((opt) => {
                const checked = selectedIndices.includes(opt.index);
                return (
                  <button
                    key={opt.index}
                    type="button"
                    disabled={Boolean(feedback)}
                    onClick={() => toggleCheckboxOption(opt.index)}
                    className={`p-3 rounded-2xl border-2 text-left flex items-center gap-3 transition ${
                      checked
                        ? 'bg-amber-400/95 text-slate-950 border-white font-bold shadow'
                        : 'bg-sky-950/75 hover:bg-sky-900 text-white border-sky-300/40'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 ${
                        checked
                          ? 'bg-slate-950 border-slate-950 text-amber-300'
                          : 'bg-sky-950 border-sky-300/60'
                      }`}
                    >
                      {checked && <Check className="w-4 h-4 stroke-[3]" />}
                    </div>
                    <span className="text-sm sm:text-base leading-tight">{opt.text}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={Boolean(feedback) || selectedIndices.length === 0}
                onClick={handleEvaluateMultiple}
                className="px-8 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-amaranth text-xl font-extrabold shadow-xl transition"
              >
                Evaluate
              </button>
            </div>
          </div>
        )}

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`p-3.5 rounded-2xl text-center font-bold text-base sm:text-lg shadow-lg ${
              feedback.passed
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-rose-600 text-white'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </div>
    </div>
  );
}
