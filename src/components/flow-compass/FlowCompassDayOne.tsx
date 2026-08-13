'use client';

import Link from 'next/link';
import { useEffect, useReducer, useState } from 'react';
import {
  DAY_ONE_QUEST,
  FLOW_COMPASS_STORAGE_KEY,
  INITIAL_DAY_ONE_STATE,
  canAdvanceDayOne,
  dayOneReducer,
} from '@/lib/flow-compass-day-one';
import CompassField from './CompassField';
import styles from './flow-compass.module.css';

const ANCHORS = [
  '同じ場所にもう一度触れて、差をみる',
  '歩く前と後で、中心の位置を比べる',
  '誰かと話す前後で、向きの変化をみる',
];

export default function FlowCompassDayOne() {
  const [state, dispatch] = useReducer(dayOneReducer, INITIAL_DAY_ONE_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [pressing, setPressing] = useState(false);

  useEffect(() => {
    try {
      const persisted = window.localStorage.getItem(FLOW_COMPASS_STORAGE_KEY);
      if (persisted) dispatch({ type: 'HYDRATE', value: JSON.parse(persisted) });
    } catch {
      window.localStorage.removeItem(FLOW_COMPASS_STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(FLOW_COMPASS_STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const stage = DAY_ONE_QUEST.stages[state.stepIndex];
  const progress = ((state.stepIndex + (state.completedAt ? 1 : 0)) / DAY_ONE_QUEST.stages.length) * 100;
  const rangeTravel = state.compressionRange.max - state.compressionRange.min;

  const releaseArrive = () => {
    setPressing(false);
    dispatch({ type: 'ARRIVE' });
  };

  if (!hydrated) {
    return (
      <main className={styles.loadingShell}>
        <div className={styles.loadingMark} aria-label="FLOW COMPASSを読み込み中" />
      </main>
    );
  }

  if (state.completedAt) {
    return (
      <main className={styles.pageShell}>
        <div className={styles.ambientGrid} aria-hidden="true" />
        <section className={`${styles.experienceCard} ${styles.completionCard}`}>
          <header className={styles.brandBar}>
            <span className={styles.brandMark}>ACE</span>
            <span className={styles.brandProduct}>FLOW COMPASS</span>
            <span className={styles.dayLabel}>DAY 01</span>
          </header>

          <div className={styles.completionVisual}>
            <CompassField
              center={state.center}
              compression={state.compression}
              orientation={state.orientation}
              mode="record"
            />
          </div>

          <div className={styles.completionCopy}>
            <p className={styles.eyebrow}>OBSERVATION RECORDED</p>
            <h1>中心は、固定しなくていい。</h1>
            <blockquote>「{state.insight}」</blockquote>
            <div className={styles.anchorSummary}>
              <span>NEXT ANCHOR</span>
              <p>{state.anchor}</p>
            </div>
          </div>

          <div className={styles.completionActions}>
            <button className={styles.primaryButton} onClick={() => dispatch({ type: 'RESET' })}>
              もう一度、違いをみる
            </button>
            <Link className={styles.textLink} href="/">
              Quest Boardへ戻る
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.pageShell}>
      <div className={styles.ambientGrid} aria-hidden="true" />
      <section className={styles.experienceCard}>
        <header className={styles.brandBar}>
          <Link href="/" className={styles.brandMark} aria-label="ACE Quest Boardへ戻る">
            ACE
          </Link>
          <span className={styles.brandProduct}>FLOW COMPASS</span>
          <span className={styles.dayLabel}>DAY 01</span>
        </header>

        <div className={styles.progressTrack} aria-label={`ステップ ${state.stepIndex + 1} / 5`}>
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className={styles.stageMeta}>
          <span>0{state.stepIndex + 1}</span>
          <strong>{stage.label}</strong>
          <time>≈ {stage.estimatedSeconds} SEC</time>
        </div>

        <div className={styles.stageBody}>
          {state.stepIndex === 0 && (
            <>
              <div className={styles.visualPanel}>
                <CompassField
                  center={state.center}
                  compression={state.compression}
                  orientation={state.orientation}
                  mode="observe"
                  pressing={pressing}
                />
                <button
                  className={`${styles.holdButton} ${pressing ? styles.holdButtonActive : ''}`}
                  onPointerDown={() => setPressing(true)}
                  onPointerUp={releaseArrive}
                  onPointerCancel={releaseArrive}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') setPressing(true);
                  }}
                  onKeyUp={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') releaseArrive();
                  }}
                >
                  <span>{state.arrived ? 'ARRIVED' : 'PRESS & NOTICE'}</span>
                  押している間、中心と周辺を同時に見る
                </button>
              </div>
              <StageCopy
                title="まず、ここに到着する。"
                body="画面の一点だけを追わず、輪郭の外側も視野に入れます。押した指を離した瞬間、どこに変化が残るか観察してください。"
                note="整える必要はありません。変化の有無だけを見ます。"
              />
            </>
          )}

          {state.stepIndex === 1 && (
            <>
              <div className={styles.visualPanel}>
                <CompassField
                  center={state.center}
                  compression={state.compression}
                  orientation={state.orientation}
                  mode="locate"
                  onCenterChange={(point) => dispatch({ type: 'LOCATE', point })}
                />
                <div className={styles.coordinateReadout} aria-live="polite">
                  <span>X {Math.round(state.center.x).toString().padStart(2, '0')}</span>
                  <span>Y {Math.round(state.center.y).toString().padStart(2, '0')}</span>
                  <strong>{state.located ? 'PLACED' : 'UNPLACED'}</strong>
                </div>
              </div>
              <StageCopy
                title="今の中心を、仮置きする。"
                body="頭・胸・腹という選択肢から選ばず、身体の地図に直接触れてください。迷うなら、迷いそのものがある場所へ。"
                note="ここに正解座標はありません。あとで動いても構いません。"
              />
            </>
          )}

          {state.stepIndex === 2 && (
            <>
              <div className={styles.visualPanel}>
                <CompassField
                  center={state.center}
                  compression={state.compression}
                  orientation={state.orientation}
                  mode="compress"
                />
                <div className={styles.rangeControl}>
                  <div className={styles.rangeLabels}>
                    <span>RELEASE</span>
                    <output>{Math.round(state.compression)}</output>
                    <span>COMPRESS</span>
                  </div>
                  <div className={styles.rangeRow}>
                    <button
                      className={styles.rangeStepButton}
                      aria-label="解放へ20動かす"
                      onClick={() =>
                        dispatch({ type: 'SET_COMPRESSION', value: state.compression - 20 })
                      }
                    >
                      −
                    </button>
                    <input
                      aria-label="凝縮と解放"
                      type="range"
                      min="0"
                      max="100"
                      value={state.compression}
                      onChange={(event) =>
                        dispatch({ type: 'SET_COMPRESSION', value: Number(event.target.value) })
                      }
                    />
                    <button
                      className={styles.rangeStepButton}
                      aria-label="凝縮へ20動かす"
                      onClick={() =>
                        dispatch({ type: 'SET_COMPRESSION', value: state.compression + 20 })
                      }
                    >
                      ＋
                    </button>
                  </div>
                  <div className={styles.travelMeter}>
                    <span style={{ width: `${Math.min(100, (rangeTravel / 20) * 100)}%` }} />
                  </div>
                </div>
              </div>
              <StageCopy
                title="狭める。ひらく。比べる。"
                body="スライダーを両方向へ動かします。形を見ながら、中心が強くなるのか、硬くなるのか、広がるのかを身体で比べます。"
                note={rangeTravel >= 20 ? '十分に往復しました。最後に残したい状態へ置けます。' : '20以上の幅を往復すると、次へ進めます。'}
              />
            </>
          )}

          {state.stepIndex === 3 && (
            <>
              <div className={styles.visualPanel}>
                <CompassField
                  center={state.center}
                  compression={state.compression}
                  orientation={state.orientation}
                  mode="reorient"
                />
                <div className={styles.orientationControl}>
                  <button
                    aria-label="軸を反時計回りに15度回す"
                    onClick={() => dispatch({ type: 'SET_ORIENTATION', value: state.orientation - 15 })}
                  >
                    ↙
                  </button>
                  <div>
                    <output>{state.orientation > 0 ? '+' : ''}{Math.round(state.orientation)}°</output>
                    <input
                      aria-label="向き"
                      type="range"
                      min="-135"
                      max="135"
                      value={state.orientation}
                      onChange={(event) =>
                        dispatch({ type: 'SET_ORIENTATION', value: Number(event.target.value) })
                      }
                    />
                  </div>
                  <button
                    aria-label="軸を時計回りに15度回す"
                    onClick={() => dispatch({ type: 'SET_ORIENTATION', value: state.orientation + 15 })}
                  >
                    ↗
                  </button>
                </div>
              </div>
              <StageCopy
                title="「上」を、選び直す。"
                body="軸を回して、身体が最も自然に進めそうな向きを探します。画面の上が正解という前提を一度外してください。"
                note="選んだ角度は測定値ではなく、今の向きを見るための手がかりです。"
              />
            </>
          )}

          {state.stepIndex === 4 && (
            <>
              <div className={styles.visualPanel}>
                <CompassField
                  center={state.center}
                  compression={state.compression}
                  orientation={state.orientation}
                  mode="record"
                />
                <div className={styles.recordCoordinates}>
                  <span>CENTER {Math.round(state.center.x)} · {Math.round(state.center.y)}</span>
                  <span>RANGE {state.compressionRange.min}—{state.compressionRange.max}</span>
                  <span>AXIS {state.orientation > 0 ? '+' : ''}{Math.round(state.orientation)}°</span>
                </div>
              </div>
              <div className={styles.recordPanel}>
                <StageCopy
                  title="変化を、一行にする。"
                  body="説明や結論ではなく、始める前との違いを短く残します。"
                  note="この記録は端末内だけに保存されます。"
                />
                <label className={styles.inputLabel}>
                  <span>WHAT CHANGED?</span>
                  <textarea
                    rows={3}
                    maxLength={160}
                    value={state.insight}
                    onChange={(event) => dispatch({ type: 'SET_INSIGHT', value: event.target.value })}
                    placeholder="例：中心が胸から少し前へ移った"
                  />
                  <small>{state.insight.length} / 160</small>
                </label>
                <label className={styles.inputLabel}>
                  <span>NEXT ANCHOR</span>
                  <select
                    value={state.anchor}
                    onChange={(event) => dispatch({ type: 'SET_ANCHOR', value: event.target.value })}
                  >
                    {ANCHORS.map((anchor) => <option key={anchor}>{anchor}</option>)}
                  </select>
                </label>
              </div>
            </>
          )}
        </div>

        <footer className={styles.navigationBar}>
          <button
            className={styles.backButton}
            onClick={() => dispatch({ type: 'BACK' })}
            disabled={state.stepIndex === 0}
          >
            ← BACK
          </button>
          <div className={styles.stepDots} aria-hidden="true">
            {DAY_ONE_QUEST.stages.map((item, index) => (
              <span key={item.id} className={index === state.stepIndex ? styles.stepDotActive : ''} />
            ))}
          </div>
          {state.stepIndex < DAY_ONE_QUEST.stages.length - 1 ? (
            <button
              className={styles.nextButton}
              onClick={() => dispatch({ type: 'NEXT' })}
              disabled={!canAdvanceDayOne(state)}
            >
              NEXT →
            </button>
          ) : (
            <button
              className={styles.nextButton}
              onClick={() => dispatch({ type: 'COMPLETE', timestamp: new Date().toISOString() })}
              disabled={!canAdvanceDayOne(state)}
            >
              RECORD →
            </button>
          )}
        </footer>
      </section>
    </main>
  );
}

function StageCopy({ title, body, note }: { title: string; body: string; note: string }) {
  return (
    <div className={styles.stageCopy}>
      <h1>{title}</h1>
      <p>{body}</p>
      <aside><span>OBSERVE</span>{note}</aside>
    </div>
  );
}
