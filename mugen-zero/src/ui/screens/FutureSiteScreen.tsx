import { useState } from 'react';
import { DialogueSequence } from '../common/DialogueSequence';
import type { DialogueLine } from '../../content/dialogue/prologue';
import type { FutureSiteDef } from '../../content/world/futureSites';
import { kaosPortrait, galdPortrait } from '../../assets/manifest';
import { vibrate } from '../../platform/haptics';

interface Props {
  /** Which place this is — supplies every line, name and testid. */
  site: FutureSiteDef;
  /** Whether the discovery has NOT yet happened in world truth. */
  firstVisit: boolean;
  /** Persists the site's PLAYER_* event; resolves after the DB commit. */
  onDiscover: () => Promise<void>;
  /**
   * Leaving after the first discovery — this playtest's arc closes here.
   * Kept separate from onLeave because recording the discovery re-renders
   * the parent, which would otherwise flip 'first visit' mid-scene.
   */
  onLeaveAfterDiscovery: () => void;
  /** Leaving an ordinary revisit. */
  onLeave: () => void;
}

type Phase = 'SCENE' | 'REPLY' | 'AFTER_REPLY' | 'RECORDING' | 'AFTER';

/**
 * The place a life choice led to, three years on — the bakery, the
 * roadside waystation, the village workyard, or the grave in the forest.
 *
 * All four work identically: the player discovers, unspoiled, what became
 * of their choice, and the discovery is written to WORLD MEMORY only here.
 * A TIME SHIFT never writes it.
 */
export function FutureSiteScreen({
  site,
  firstVisit,
  onDiscover,
  onLeaveAfterDiscovery,
  onLeave,
}: Props) {
  // Lock the mode at mount: recording the discovery mid-scene must not
  // swap the screen into revisit mode.
  const [isFirst] = useState(firstVisit);
  const [phase, setPhase] = useState<Phase>('SCENE');
  const [reply, setReply] = useState<DialogueLine | null>(null);
  const [error, setError] = useState(false);
  const id = site.testIdPrefix;

  const commitDiscovery = async () => {
    setPhase('RECORDING');
    setError(false);
    try {
      await onDiscover();
      vibrate(24); // the moment it becomes real
      setPhase('AFTER');
    } catch (e) {
      console.error('Failed to record the discovery', e);
      setError(true);
      setPhase('RECORDING');
    }
  };

  // The scene ends either straight into the DB write, or into the one
  // optional reply the player may give (flavour only — see the def).
  const afterFirstScene = () => {
    if (site.reply) setPhase('REPLY');
    else void commitDiscovery();
  };

  const portrait = site.portrait ? galdPortrait(site.portrait) : null;

  if (isFirst && phase === 'SCENE') {
    return (
      <DialogueSequence
        lines={site.firstVisitLines}
        onComplete={afterFirstScene}
        testId={`${id}-first-visit`}
        portraitSrc={portrait}
        portraitAlt={site.portraitAlt}
        backdropLocationId={site.id}
      />
    );
  }

  if (isFirst && phase === 'REPLY' && site.reply) {
    return (
      <div className="screen life-choice-screen" data-testid={`${id}-reply`}>
        <p className="life-choice-prompt">{site.reply.prompt}</p>
        <div className="life-choice-options">
          {site.reply.options.map((option) => (
            <button
              key={option.id}
              className="life-choice-btn"
              data-testid={`${id}-reply-${option.id}`}
              onClick={() => {
                setReply(option.line);
                setPhase('AFTER_REPLY');
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (isFirst && phase === 'AFTER_REPLY') {
    // What the player said is spoken back, then the scene closes. None of
    // it is recorded: the answer changes nothing that is true.
    const lines = [...(reply ? [reply] : []), ...(site.afterReplyLines ?? [])];
    return (
      <DialogueSequence
        lines={lines}
        onComplete={commitDiscovery}
        testId={`${id}-after-reply`}
        portraitSrc={portrait}
        portraitAlt={site.portraitAlt}
        backdropLocationId={site.id}
      />
    );
  }

  if (isFirst && phase === 'RECORDING') {
    return (
      <div className="screen life-choice-screen" data-testid={`${id}-recording`}>
        {!error ? (
          <p className="life-choice-prompt" style={{ fontSize: 14, color: 'var(--text-dim)' }}>
            …………
          </p>
        ) : (
          <>
            <p style={{ color: 'var(--danger)', fontSize: 13 }} data-testid="discovery-save-error">
              この出来事を世界に記録できませんでした。
            </p>
            <button className="btn primary" onClick={commitDiscovery}>
              もう一度
            </button>
          </>
        )}
      </div>
    );
  }

  if (isFirst && phase === 'AFTER') {
    return (
      <div className="screen life-choice-screen" data-testid={`${id}-reunion-done`}>
        {/* Reached only after the discovery is committed to WORLD MEMORY. */}
        <p className="memory-mark memory-carved" style={{ margin: 0 }}>
          WORLD MEMORY
        </p>
        <div style={{ textAlign: 'center' }}>
          {kaosPortrait('smile') && (
            <div className="dialogue-portrait" style={{ marginBottom: 12 }}>
              <img src={kaosPortrait('smile')!} alt="" aria-hidden="true" />
            </div>
          )}
          <p style={{ color: 'var(--accent)', fontSize: 13, marginBottom: 10 }}>ケイオス</p>
          {site.kaosLines.map((line) => (
            <p key={line} className="life-choice-prompt" style={{ fontSize: 16 }}>
              {line}
            </p>
          ))}
        </div>
        <button className="btn primary" data-testid={`${id}-leave`} onClick={onLeaveAfterDiscovery}>
          この場を離れる
        </button>
      </div>
    );
  }

  return <RevisitScene site={site} onLeave={onLeave} />;
}

function RevisitScene({ site, onLeave }: { site: FutureSiteDef; onLeave: () => void }) {
  const [done, setDone] = useState(false);
  const id = site.testIdPrefix;
  if (!done) {
    return (
      <DialogueSequence
        lines={site.revisitLines as DialogueLine[]}
        onComplete={() => setDone(true)}
        testId={`${id}-revisit`}
        portraitSrc={site.portrait ? galdPortrait(site.portrait) : null}
        portraitAlt={site.portraitAlt}
        backdropLocationId={site.id}
      />
    );
  }
  return (
    <div className="screen life-choice-screen" data-testid={`${id}-revisit-done`}>
      <p className="life-choice-prompt" style={{ fontSize: 15, color: 'var(--text-dim)' }}>
        {site.revisitClosing}
      </p>
      <button className="btn primary" data-testid={`${id}-leave`} onClick={onLeave}>
        この場を離れる
      </button>
    </div>
  );
}
