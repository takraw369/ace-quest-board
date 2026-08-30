import Link from 'next/link';
import type { AceAxis, PwaBootstrap } from '@/lib/pwa';

const aceLabel: Record<AceAxis, string> = {
  BODY: '身体の条件',
  COGNITION: '認知の焦点',
  EMOTION: '戻る手順',
  ACTION: '実行条件',
};

export default function AceCalibrationSummary({ data }: { data: PwaBootstrap }) {
  const ace = data.ace;

  if (!ace?.result_axis) {
    return (
      <section className="mt-5 rounded-[28px] border border-[#789581]/25 bg-[#789581]/[0.055] p-5">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#789581]">ACE Calibration</p>
        <h2 className="mt-2 font-serif text-2xl font-semibold text-[#eee8dc]">今の自分を、まだ測っていません。</h2>
        <p className="mt-3 text-sm leading-7 text-[#9ca097]">BODY・COGNITION・EMOTION・ACTIONの4方向から、今どこを最初に整えると動きやすいかを2〜4分で観察します。固定タイプを決める診断ではありません。</p>
        <Link href="/calibration" className="mt-5 inline-flex rounded-full border border-[#789581]/30 bg-[#789581]/10 px-4 py-2.5 text-xs font-semibold text-[#c9d8cc]">2〜4分で現在地を測る</Link>
      </section>
    );
  }

  const axis = ace.result_axis;
  const scores = ace.scores ?? {};
  const assessedAt = ace.assessed_at ?? ace.completed_at;

  return (
    <section className="mt-5 rounded-[28px] border border-[#789581]/25 bg-[#789581]/[0.055] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#789581]">ACE Calibration</p>
          <p className="mt-2 text-xs text-[#7f887f]">今回、最初に触る場所</p>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-[#eee8dc]">{axis}｜{aceLabel[axis]}</h2>
        </div>
        {typeof scores[axis] === 'number' && (
          <div className="rounded-full border border-[#789581]/20 px-3 py-1.5 text-xs font-semibold text-[#b8c8bc]">
            {scores[axis]?.toFixed(2)} / 4
          </div>
        )}
      </div>
      <p className="mt-4 text-sm leading-7 text-[#9ca097]">固定タイプではなく、今回の状態から見たCalibrationです。FLOWのボトルネックとは別の観察レイヤーとして、今日のLearnとQuestの判断材料に使います。</p>
      <div className="mt-4 grid grid-cols-4 gap-2 border-t border-[#789581]/15 pt-4 text-center">
        {(['BODY', 'COGNITION', 'EMOTION', 'ACTION'] as AceAxis[]).map((item) => (
          <div key={item}>
            <p className="text-[8px] text-[#687169]">{item}</p>
            <p className="mt-1 text-xs font-semibold text-[#c5cdc5]">{typeof scores[item] === 'number' ? scores[item]?.toFixed(1) : '—'}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[10px] text-[#626a63]">{assessedAt ? `Calibration ${new Date(assessedAt).toLocaleString('ja-JP')}` : 'Calibration記録あり'}</p>
        <Link href="/calibration" className="rounded-full border border-[#789581]/25 px-3 py-2 text-[10px] font-semibold text-[#b8c8bc]">もう一度測る</Link>
      </div>
    </section>
  );
}
