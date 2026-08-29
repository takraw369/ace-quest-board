import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ENGINE = "ace-recommendation-adapter-v1";
const AXES = ["BODY", "COGNITION", "EMOTION", "ACTION"] as const;
type AceAxis = typeof AXES[number];

function getAdminKey(){const raw=Deno.env.get("SUPABASE_SECRET_KEYS");if(raw){try{return JSON.parse(raw)?.default}catch(_){}}return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");}

const axisLens: Record<AceAxis, { label:string; focus:string; intro:string; prediction:string; action:string; reflection:string }> = {
  BODY: {
    label:"BODY / 身体条件",
    focus:"姿勢・呼吸・疲労など身体条件を1つ観察し、条件を変えた前後差を見る。",
    intro:"同じ課題でも身体条件で出力は変わる。今日は身体条件を1つだけ観察する。",
    prediction:"今の身体条件のままだと、結果はどうなりそう？",
    action:"元のQuestを行う前に、呼吸・姿勢・休息など身体条件を1つだけ整えてから同じ行動を試す。",
    reflection:"身体条件を変える前後で、判断・感覚・結果の何が変わった？",
  },
  COGNITION: {
    label:"COGNITION / 認知",
    focus:"事実・解釈・予測を分け、やる前の見立てと実測のズレを見る。",
    intro:"今回は結果だけでなく、自分が事前にどう見立てていたかを観察する。",
    prediction:"やる前に『何が起きると思う？ なぜそう思う？』を一文で書く。",
    action:"元のQuestをそのまま実行し、事前の見立てと実際の差が分かる記録を1つ残す。",
    reflection:"予想と実際の差はどこにあった？ 解釈を事実だと思っていた部分はあった？",
  },
  EMOTION: {
    label:"EMOTION / 感情反応",
    focus:"感情・身体反応・行動衝動を分け、実験前後で反応がどう動くかを見る。",
    intro:"感情を良し悪しで評価せず、行動の前後でどう変化するかを観察する。",
    prediction:"始める前の感情の強さを0〜4で置き、身体反応を一語で書く。",
    action:"元のQuestを実行し、終わった直後に感情の強さと身体反応をもう一度記録する。",
    reflection:"感情は行動を止めた？ それとも行動した後に変わった？",
  },
  ACTION: {
    label:"ACTION / 行動開始",
    focus:"考え続ける前に最小着手し、着手前後の抵抗感と進み方を見る。",
    intro:"今回は完成度より『始める瞬間』を観察する。",
    prediction:"着手前の抵抗感を0〜4で置き、何分なら始められそうか予想する。",
    action:"元のQuestを5分以内の最小着手に縮め、まず開始する。",
    reflection:"始める前後で抵抗感はどう変わった？ 次は何をさらに小さくできる？",
  },
};

function resolveLens(ace:any){
  const scores=ace?.scores??{};
  const values=AXES.map((axis)=>Number(scores?.[axis])).filter(Number.isFinite);
  const axis=AXES.includes(ace?.result_axis)?ace.result_axis as AceAxis:null;
  if(values.length===4){
    const spread=Math.max(...values)-Math.min(...values);
    if(spread<=0.25){
      return {
        mode:"balanced",
        axis:null as AceAxis|null,
        label:"BALANCED / 4軸差が小さい",
        focus:"4軸の弱点探しはせず、Flow Checkの調整対象を主軸に予測→実測→振り返りの精度を上げる。",
        intro:"ACEの4軸差が小さいため、今回は弱点を固定せずFlowのボトルネックを主軸に観察する。",
        prediction:"今のFlowテーマで、今回の実験はどうなると思う？",
        action:null as string|null,
        reflection:"4軸のどれかを弱点と決めるより、今回の条件で実際に何が動いた？",
        spread,
      };
    }
  }
  if(!axis)return null;
  return {mode:"axis",axis,...axisLens[axis],spread:values.length===4?Math.max(...values)-Math.min(...values):null};
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return new Response("method not allowed",{status:405});
  const adminKey=getAdminKey(),internal=req.headers.get("x-internal-key"),supabaseUrl=Deno.env.get("SUPABASE_URL");
  if(!adminKey||!supabaseUrl||!internal||internal!==adminKey)return new Response("forbidden",{status:403});
  try{
    const body=await req.json().catch(()=>({}));
    const personId=String(body?.contact_id??"");
    if(!personId)return Response.json({ok:false,error:"contact_required"},{status:400});
    const supabase=createClient(supabaseUrl,adminKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:contact,error:ce}=await supabase.from("contacts").select("id,metadata").eq("id",personId).maybeSingle();
    if(ce)throw ce;
    if(!contact)return Response.json({ok:false,error:"contact_not_found"},{status:404});
    const ace=contact.metadata?.current_ace??null;
    const flow=contact.metadata?.current_flow??null;
    const lens=resolveLens(ace);
    if(!lens)return Response.json({ok:true,adapted:false,reason:"ace_unavailable"});

    const {data:recs,error:re}=await supabase.from("education_recommendations")
      .select("id,recommendation_type,reason,alternative,metadata,source_signals")
      .eq("person_id",personId)
      .in("status",["proposed","shown"])
      .order("generated_at",{ascending:false})
      .limit(6);
    if(re)throw re;

    const ids:string[]=[];
    for(const rec of recs??[]){
      const alt={...(rec.alternative??{})};
      const meta={...(rec.metadata??{}),ace_adapter:ENGINE,ace_mode:lens.mode,ace_axis:lens.axis,ace_label:lens.label,ace_scores:ace?.scores??null,flow_bottleneck:flow?.bottleneck??null};
      const sourceSignals=[...(Array.isArray(rec.source_signals)?rec.source_signals:[]),{type:"ace",mode:lens.mode,result_axis:ace?.result_axis??null,scores:ace?.scores??null,assessment_id:ace?.assessment_id??null}];
      let reason=String(rec.reason??"");

      if(rec.recommendation_type==="education"){
        alt.focus=lens.focus;
        alt.ace_lens={mode:lens.mode,axis:lens.axis,label:lens.label};
        reason=`${reason} ACE Calibrationは「${lens.label}」として使い、${lens.focus}`;
      }else if(rec.recommendation_type==="quest"){
        const experiment={...((alt.experiment??{}) as Record<string,unknown>)};
        experiment.intro=lens.intro;
        experiment.prediction=lens.prediction;
        if(lens.action)experiment.action=lens.action;
        experiment.reflection=lens.reflection;
        alt.experiment=experiment;
        alt.ace_lens={mode:lens.mode,axis:lens.axis,label:lens.label};
        reason=`${reason} ACE Calibrationは「${lens.label}」。このQuestではそのレンズで予測→実測→振り返りを行う。`;
      }else if(rec.recommendation_type==="connection"){
        meta.ace_lens=lens.label;
      }

      const {error:ue}=await supabase.from("education_recommendations").update({reason,alternative:alt,metadata:meta,source_signals:sourceSignals}).eq("id",rec.id);
      if(ue)throw ue;
      ids.push(rec.id);
    }

    const current={...(contact.metadata?.current_recommendations??{}),ace_lens:{mode:lens.mode,axis:lens.axis,label:lens.label,focus:lens.focus,scores:ace?.scores??null,assessment_id:ace?.assessment_id??null,adapter:ENGINE},flow_target:flow?.bottleneck??null,adapted_at:new Date().toISOString()};
    const {error:cu}=await supabase.from("contacts").update({metadata:{...(contact.metadata??{}),current_recommendations:current},updated_at:new Date().toISOString()}).eq("id",personId);
    if(cu)throw cu;
    await supabase.from("funnel_events").insert({contact_id:personId,event_type:"ace_recommendations_adapted",channel:"system",payload:{engine:ENGINE,ace_mode:lens.mode,ace_axis:lens.axis,flow_bottleneck:flow?.bottleneck??null,recommendation_ids:ids}});
    return Response.json({ok:true,adapted:true,ace_lens:current.ace_lens,recommendation_ids:ids});
  }catch(error){console.error("ace-recommendation-adapter error",error);return Response.json({ok:false,error:"adapt_failed",detail:String(error)},{status:500});}
});
