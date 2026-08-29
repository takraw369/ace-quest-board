import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function getAdminKey(){const raw=Deno.env.get("SUPABASE_SECRET_KEYS");if(raw){try{return JSON.parse(raw)?.default}catch(_){}}return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");}
function corsHeaders(req:Request){const origin=req.headers.get("origin")??"";const configured=(Deno.env.get("PWA_ALLOWED_ORIGINS")??"").split(",").map(v=>v.trim()).filter(Boolean);const allowed=configured.length===0||configured.includes(origin);return{"Access-Control-Allow-Origin":allowed&&origin?origin:configured.length===0?"*":configured[0],"Access-Control-Allow-Headers":"content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin","Cache-Control":"no-store"};}
function b64url(input:Uint8Array|string){const bytes=typeof input==="string"?new TextEncoder().encode(input):input;let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replaceAll("+","-").replaceAll("/","_").replaceAll("=","");}
async function signSession(personId:string,secret:string){const now=Math.floor(Date.now()/1000),exp=now+6*60*60;const payload=b64url(JSON.stringify({sub:personId,iat:now,exp,v:1,aud:"flow-pwa"}));const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const sig=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(payload)));return{token:`${payload}.${b64url(sig)}`,expires_at:new Date(exp*1000).toISOString()};}
async function verifyLineIdToken(idToken:string,channelId:string){const body=new URLSearchParams({id_token:idToken,client_id:channelId});const res=await fetch("https://api.line.me/oauth2/v2.1/verify",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});if(!res.ok)return null;const payload=await res.json();if(!payload?.sub||payload?.aud!==channelId)return null;return payload;}
async function refreshRecommendations(supabaseUrl:string,adminKey:string,personId:string){
  const base=await fetch(`${supabaseUrl}/functions/v1/education-recommender`,{method:"POST",headers:{"Content-Type":"application/json","x-internal-key":adminKey},body:JSON.stringify({contact_id:personId})}).catch(()=>null);
  if(base&&!base.ok)console.error("education-recommender refresh failed",base.status,await base.text());
  const ace=await fetch(`${supabaseUrl}/functions/v1/ace-recommendation-adapter`,{method:"POST",headers:{"Content-Type":"application/json","x-internal-key":adminKey},body:JSON.stringify({contact_id:personId})}).catch(()=>null);
  if(ace&&!ace.ok)console.error("ace-recommendation-adapter refresh failed",ace.status,await ace.text());
}

const LINE_LOGIN_CHANNEL_ID = "2009606403";

Deno.serve(async(req:Request)=>{const cors=corsHeaders(req);if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});if(req.method!=="POST")return Response.json({ok:false,error:"method_not_allowed"},{status:405,headers:cors});
 const adminKey=getAdminKey(),supabaseUrl=Deno.env.get("SUPABASE_URL"),lineLoginChannelId=LINE_LOGIN_CHANNEL_ID;if(!adminKey||!supabaseUrl)return Response.json({ok:false,error:"server_not_configured"},{status:503,headers:cors});
 try{const{id_token:idToken}=await req.json().catch(()=>({}));if(!idToken||typeof idToken!=="string")return Response.json({ok:false,error:"id_token_required"},{status:400,headers:cors});const verified=await verifyLineIdToken(idToken,lineLoginChannelId);if(!verified)return Response.json({ok:false,error:"invalid_line_token"},{status:401,headers:cors});
  const lineUserId=String(verified.sub),supabase=createClient(supabaseUrl,adminKey,{auth:{persistSession:false,autoRefreshToken:false}});let{data:identity}=await supabase.from("person_identities").select("person_id").eq("channel","line").eq("external_user_id",lineUserId).maybeSingle();if(!identity){const{data:contactByLine}=await supabase.from("contacts").select("id").eq("line_user_id",lineUserId).maybeSingle();if(contactByLine)identity={person_id:contactByLine.id};}
  if(!identity?.person_id)return Response.json({ok:false,error:"line_contact_not_found",next:"add_official_account"},{status:404,headers:cors});const personId=identity.person_id;
  await refreshRecommendations(supabaseUrl,adminKey,personId);
  const[{data:contact},{data:progress},{data:curriculum},{data:recommendations}]=await Promise.all([
   supabase.from("contacts").select("id,display_name,lifecycle_stage,metadata,updated_at").eq("id",personId).single(),
   supabase.from("person_progress").select("xp_total,growth_level,growth_rank,streak_current,streak_best,actions_completed,quests_completed,last_completion_date,updated_at").eq("contact_id",personId).maybeSingle(),
   supabase.from("curriculum_states").select("current_spine_stage,active_branch,learning_loop_position,support_mode,recommended_node_id,confidence,reason,updated_at").eq("person_id",personId).maybeSingle(),
   supabase.from("education_recommendations").select("id,recommendation_type,recommendation_ref,destination,reason,confidence,alternative,status,generated_at,metadata").eq("person_id",personId).in("status",["proposed","shown","accepted"]).order("generated_at",{ascending:false}).limit(6)
  ]);
  const meta=contact?.metadata??{},profile={display_name:verified?.name??contact?.display_name??null,picture:verified?.picture??null,lifecycle_stage:contact?.lifecycle_stage??"registered"},session=await signSession(personId,adminKey);
  await supabase.from("funnel_events").insert({contact_id:personId,event_type:"pwa_bootstrap_viewed",channel:"pwa",payload:{stage:profile.lifecycle_stage,source:"liff",has_flow:Boolean(meta?.current_flow),has_ace:Boolean(meta?.current_ace),session_version:1}});
  return Response.json({ok:true,session_token:session.token,session_expires_at:session.expires_at,profile,flow:meta?.current_flow??null,ace:meta?.current_ace??null,current_recommendations:meta?.current_recommendations??null,progress:progress??{xp_total:0,growth_level:1,growth_rank:"seed",streak_current:0,streak_best:0,actions_completed:0,quests_completed:0},curriculum:curriculum??null,recommendations:recommendations??[]},{headers:{...cors,"Content-Type":"application/json"}});
 }catch(error){console.error("line-pwa-bootstrap error",error);return Response.json({ok:false,error:"bootstrap_failed"},{status:500,headers:cors});}
});
