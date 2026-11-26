import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { useAudio } from '../../context/AudioContext';
import provincesData from '../../data/provinces.json';
import popquizData from '../../data/popquiz.json';
import minigamesData from '../../data/minigames.json';
import gameConfig from '../../data/gameConfig.json';
import { assetUrl } from '../../utils/assetUrl';
import StarMeter from '../common/StarMeter';
import PopQuizModal from './PopQuizModal';

export default function CostaRicaMapScreen() {
  const {
    coins,
    spendCoins,
    characterData,
    isFemale,
    currentLocation,
    setCurrentLocation,
    starsByProvince,
    activeProvinceHub,
    setActiveProvinceHub,
    launchMinigame
  } = useGame();

  const { playMusic, playSfx, playVoice } = useAudio();

  // Travel & PopQuiz Modals state
  const [pendingProvince, setPendingProvince] = useState(null); // confirmRegionChange modal
  const [showNoFundsAlert, setShowNoFundsAlert] = useState(false); // insufficientCoinsAlert modal
  const [activeQuiz, setActiveQuiz] = useState(null); // { province, question }

  useEffect(() => {
    playMusic(1); // audio/Tema del juego 2.m4a
  }, [playMusic]);

  const playProvinceWelcome = (province) => {
    if (!province?.welcomeAudio) return;
    const clip = isFemale ? province.welcomeAudio.female : province.welcomeAudio.male;
    if (clip?.file) {
      playVoice(clip.file);
    } else if (clip?.soundIndex) {
      playSfx(clip.soundIndex);
    }
  };

  // Click on a province marker on the map or sidebar
  const handleProvinceClick = (province) => {
    playSfx(38); // button.m4a
    if (province.id === currentLocation) {
      // Already in this province -> play welcome voiceover and open Province Hub Modal
      playProvinceWelcome(province);
      setActiveProvinceHub(province.id);
    } else {
      // Different province -> open confirmation modal ("PanelConformarCambioRegion")
      setPendingProvince(province);
    }
  };

  // Confirm travel ("PopQuiz.NewRegion")
  const handleConfirmTravel = () => {
    if (!pendingProvince) return;
    const targetProv = pendingProvince;
    setPendingProvince(null);

    const travelCostFromConfig =
      gameConfig?.economyAndProgression?.travelCostCoins ??
      provincesData.mapModals.confirmRegionChange.actualCoinsDeductedInCode ??
      5000;
    const requiredCoins = travelCostFromConfig;

    if (coins < requiredCoins) {
      playSfx(37); // wrong.m4a
      setShowNoFundsAlert(true);
      return;
    }

    if (requiredCoins > 0) {
      spendCoins(requiredCoins, true); // deducts 5000 coins & plays coins.m4a
    }

    // Select a random PopQuiz question from the target province bank
    const bank = (popquizData.byProvince || []).find((b) => b.provinceId === targetProv.id);
    const questions = bank?.questions || [];
    if (questions.length === 0) {
      // Fallback if bank is empty
      setCurrentLocation(targetProv.id);
      playProvinceWelcome(targetProv);
      setActiveProvinceHub(targetProv.id);
      return;
    }
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    setActiveQuiz({
      province: targetProv,
      question: randomQuestion
    });
  };

  const handleQuizPass = () => {
    if (!activeQuiz) return;
    const targetProv = activeQuiz.province;
    setActiveQuiz(null);
    setCurrentLocation(targetProv.id);
    playProvinceWelcome(targetProv);
    setActiveProvinceHub(targetProv.id);
  };

  const handleQuizFail = () => {
    setActiveQuiz(null);
  };

  const hubProvince = useMemo(() => {
    if (activeProvinceHub === null || activeProvinceHub === undefined) return null;
    return provincesData.provinces.find((p) => p.id === activeProvinceHub) || null;
  }, [activeProvinceHub]);

  const hubBonusMinigames = useMemo(() => {
    if (!hubProvince) return [];
    return (minigamesData.legacyAndSiblingMinigames || []).filter(
      (m) => m.provinceId === hubProvince.id
    );
  }, [hubProvince]);

  return (
    <div
      className="relative w-full h-full flex flex-col p-2 select-none overflow-hidden"
      style={{
        backgroundImage: `url("${assetUrl('sprites/fondo.png')}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Left / Main Interactive Costa Rica Map Canvas */}
      <div
        className="relative flex-1 min-h-0 rounded-3xl border-4 border-sky-200/70 shadow-2xl overflow-hidden flex items-center justify-center"
        style={{
          backgroundColor: '#009bdb',
          containerType: 'size'
        }}
      >
        {/* Map Image Container (749x654 tightly cropped mapa_cr2_clean.png, sized via container query units) */}
        <div
          className="relative shrink-0"
          style={{
            width: 'min(99cqw, calc(99cqh * 749 / 654))',
            height: 'min(99cqh, calc(99cqw * 654 / 749))'
          }}
        >
          <img
            src={assetUrl(provincesData.mapSprites.costaRicaMap)}
            alt="Map of Costa Rica"
            className="w-full h-full object-fill"
            draggable={false}
          />

          {/* 7 Interactive Province Nodes */}
          {provincesData.provinces.map((prov) => {
            const pos = prov.mapCoordinates?.webMapPosition || { left: '50%', top: '50%' };
            const isCurrent = prov.id === currentLocation;
            const starInfo = starsByProvince[prov.id] || { raw: '000', count: 0 };

            return (
              <div
                key={prov.id}
                style={{ left: pos.left, top: pos.top }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center group"
              >
                {/* Player Pin Avatar if currently in this province */}
                {isCurrent && (
                  <div className=" -mb-2 z-20 flex flex-col items-center animate-bounce pointer-events-none">
                    <div className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[10px] shadow">
                      YOU ARE HERE
                    </div>
                    <img
                      src={assetUrl(characterData.sprites.mapPinAvatar)}
                      alt={characterData.name}
                      className="w-10 h-12 sm:w-12 sm:h-14 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.85)]"
                    />
                  </div>
                )}

                {/* StarMeter above province node */}
                <div className="-mb-1 z-10 pointer-events-none">
                  <StarMeter levelStr={starInfo.raw} size="sm" />
                </div>

                {/* Clickable Province Shield & Label Button */}
                <button
                  type="button"
                  onClick={() => handleProvinceClick(prov)}
                  className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-2xl border-2 shadow-xl transition transform group-hover:scale-110 active:scale-95 ${
                    isCurrent
                      ? 'bg-amber-400 text-slate-950 border-white ring-4 ring-amber-300/60'
                      : 'bg-sky-950/90 hover:bg-sky-800 text-white border-sky-300/70'
                  }`}
                >
                  <img
                    src={assetUrl(prov.coatOfArmsSprite)}
                    alt={prov.nameEn}
                    className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
                  />
                  <span className="font-amaranth text-xs sm:text-sm font-bold whitespace-nowrap">
                    {prov.nameEn}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal 1: Confirm Province Travel ("PanelConformarCambioRegion") */}
      {pendingProvince && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full max-w-md rounded-3xl border-4 border-amber-300 bg-[#23649e] p-6 text-center shadow-2xl text-white"
            style={{
              backgroundImage: `url("${assetUrl('sprites/fondo 1.png')}")`,
              backgroundSize: 'cover'
            }}
          >
            <img
              src={assetUrl(pendingProvince.coatOfArmsSprite)}
              alt={pendingProvince.nameEn}
              className="w-16 h-16 mx-auto mb-3 object-contain drop-shadow"
            />
            <h3 className="font-amaranth text-2xl font-bold text-amber-300 mb-2">
              Travel to {pendingProvince.nameEn}?
            </h3>
            <p className="font-hanken text-base sm:text-lg text-white whitespace-pre-line mb-3">
              {provincesData.mapModals.confirmRegionChange.promptText}
            </p>
            <p className="text-xs text-sky-200 bg-sky-950/70 rounded-xl px-3 py-1.5 mb-5">
              Note: Traveling deducts 5,000 coins and launches a PopQuiz question.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleConfirmTravel}
                className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-amaranth text-lg font-bold shadow-lg transition"
              >
                {provincesData.mapModals.confirmRegionChange.yesButtonLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  playSfx(39);
                  setPendingProvince(null);
                }}
                className="px-6 py-2.5 rounded-2xl bg-sky-950 hover:bg-sky-900 text-white font-amaranth text-lg font-bold border border-white/30 shadow-lg transition"
              >
                {provincesData.mapModals.confirmRegionChange.noButtonLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Insufficient Coins Alert ("PanelAlerta" / "noFunds") */}
      {showNoFundsAlert && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border-4 border-rose-400 bg-sky-950 p-6 text-center shadow-2xl text-white">
            <AlertCircle className="w-14 h-14 text-rose-400 mx-auto mb-3" />
            <h3 className="font-amaranth text-2xl font-bold text-amber-300 mb-2">
              Not Enough Coins!
            </h3>
            <p className="font-hanken text-lg text-white mb-6">
              {provincesData.mapModals.insufficientCoinsAlert.promptText}
              <br />
              <span className="text-sm text-sky-200">
                (Play minigames in {provincesData.provinces[currentLocation]?.nameEn} to earn at least 5,000 coins!)
              </span>
            </p>
            <button
              type="button"
              onClick={() => {
                playSfx(38);
                setShowNoFundsAlert(false);
              }}
              className="px-8 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-amaranth text-lg font-bold shadow-lg transition"
            >
              {provincesData.mapModals.insufficientCoinsAlert.returnButtonLabel}
            </button>
          </div>
        </div>
      )}

      {/* Modal 3: PopQuiz Trivia Modal ("PreguntaController") */}
      {activeQuiz && (
        <PopQuizModal
          province={activeQuiz.province}
          question={activeQuiz.question}
          onPass={handleQuizPass}
          onFail={handleQuizFail}
          onCancel={() => setActiveQuiz(null)}
        />
      )}

      {/* Modal 4: Province Hub Overlay ("canvasProvincia" / MCR_MostrarJuegos - 1:1 Unity Original) */}
      {hubProvince && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.72)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            padding: '24px 40px'
          }}
        >
          {/* Top Centered Title: "Welcome to Heredia!" */}
          <h2
            className="font-hanken text-center tracking-tight"
            style={{
              color: '#111111',
              fontSize: 'clamp(30px, 4vw, 44px)',
              fontWeight: 700,
              lineHeight: 1.15,
              marginBottom: '26px',
              textShadow: '0 1px 2px rgba(255, 255, 255, 0.85)'
            }}
          >
            {hubProvince.welcomeTitle}
          </h2>

          {/* Two-Column Body: Left = 3 Blue Buttons + Green Close, Right = Large Coat of Arms */}
          <div
            className="w-full flex flex-col sm:flex-row items-center justify-center"
            style={{
              maxWidth: '820px',
              gap: '36px'
            }}
          >
            {/* Left Column: Minigames + Close */}
            <div
              className="flex flex-col"
              style={{
                width: '100%',
                maxWidth: '430px',
                gap: '16px',
                flexShrink: 0
              }}
            >
              {hubProvince.minigames.map((mg) => (
                <button
                  key={mg.id}
                  type="button"
                  onClick={() => {
                    playSfx(38);
                    launchMinigame(mg.id, false);
                  }}
                  style={{
                    backgroundImage: `url("${assetUrl(provincesData.mapSprites.primaryButton || 'sprites/boton_2.png')}")`,
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    backgroundColor: 'transparent',
                    border: 'none',
                    width: '100%',
                    height: '66px',
                    padding: '0 24px',
                    color: '#ffffff',
                    fontFamily: "'Hanken', 'OpenSans', sans-serif",
                    fontWeight: 300,
                    fontSize: '25px',
                    letterSpacing: '0.02em',
                    cursor: 'pointer'
                  }}
                  className="flex items-center justify-center transition transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none"
                >
                  <span className="truncate">{mg.buttonLabel}</span>
                </button>
              ))}

              {/* Green Close Button */}
              <button
                type="button"
                onClick={() => {
                  playSfx(39);
                  setActiveProvinceHub(null);
                }}
                style={{
                  backgroundImage: `url("${assetUrl(provincesData.mapSprites.secondaryButton || 'sprites/boton_3.png')}")`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  backgroundColor: 'transparent',
                  border: 'none',
                  width: '100%',
                  height: '66px',
                  marginTop: '6px',
                  padding: '0 24px',
                  color: '#ffffff',
                  fontFamily: "'Hanken', 'OpenSans', sans-serif",
                  fontWeight: 300,
                  fontSize: '26px',
                  letterSpacing: '0.02em',
                  cursor: 'pointer'
                }}
                className="flex items-center justify-center transition transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none"
              >
                Close
              </button>
            </div>

            {/* Right Column: Province Coat of Arms */}
            <div className="flex items-center justify-center" style={{ flex: 1 }}>
              <img
                src={assetUrl(hubProvince.coatOfArmsSprite)}
                alt={hubProvince.nameEn}
                style={{
                  width: '285px',
                  height: '285px',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 6px 14px rgba(0, 0, 0, 0.22))'
                }}
                draggable={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
