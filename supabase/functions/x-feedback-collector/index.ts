import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const X_API="https://api.x.com";
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8"}});}
function n(v:unknown){return typeof v==="number"?v:typeof v==="string"&&v!==""?Number(v):null;}

async function getHarnessMetrics(postId:string){
  const base=(Deno.env.get("X_HARNESS_API_URL")??"").replace(/\/$/,"");
  const key=Deno.env.get("X_HARNESS_API_KEY")??"";
  if(!base||!key)return null;
  const res=await fetch(`${base}/api/posts/${postId}/metrics`,{headers:{Authorization:`Bearer ${key}`}});
  const body=await res.json().catch(()=>({}));
  const data=body?.data??body;
  const metrics=data?.public_metrics??data?.publicMetrics??data?.metrics??data;
  return {ok:res.ok,adapter:"x_harness",status:res.status,body,metrics};
}

async function getDirectMetrics(postId:string){
  const token=Deno.env.get("X_USER_ACCESS_TOKEN")??"";
  if(!token)return null;
  const url=new URL(`${X_API}/2/tweets/${postId}`);
  url.searchParams.set("tweet.fields","created_at,public_metrics");
  const res=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
  const body=await res.json().catch(()=>({}));
  return {ok:res.ok,adapter:"direct_x_api",status:res.status,body,metrics:body?.data?.public_metrics??{}};
}

Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  const supabaseUrl=Deno.env.get("SUPABASE_URL"),serviceRole=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!supabaseUrl||!serviceRole)return json({error:"supabase_runtime_config_missing"},500);
  const hasHarness=!!Deno.env.get("X_HARNESS_API_URL")&&!!Deno.env.get("X_HARNESS_API_KEY");
  const hasDirect=!!Deno.env.get("X_USER_ACCESS_TOKEN");
  if(!hasHarness&&!hasDirect)return json({ok:false,state:"credentials_missing",accepted_secrets:["X_HARNESS_API_URL + X_HARNESS_API_KEY","X_USER_ACCESS_TOKEN"]},412);
  const db=createClient(supabaseUrl,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}});
  const body=await req.json().catch(()=>({}));
  const queueId=typeof body?.queue_id==="string"?body.queue_id:null;
  let q=db.from("publish_queue").select("id,source_ref,provider,provider_publish_id,published_at").in("provider",["x","twitter"]).eq("status","published").not("provider_publish_id","is",null).order("published_at",{ascending:false}).limit(25);
  if(queueId)q=q.eq("id",queueId);
  const {data,error}=await q; if(error)return json({error:"queue_read_failed",detail:error.message},500);
  const rows=data??[], collected:any[]=[],failed:any[]=[];
  for(const row of rows){
    const postId=row.provider_publish_id as string;
    let result=await getHarnessMetrics(postId);
    if(result&&!result.ok&&hasDirect)result=await getDirectMetrics(postId);
    if(!result)result=await getDirectMetrics(postId);
    if(!result||!result.ok){failed.push({queue_id:row.id,post_id:postId,adapter:result?.adapter??null,status:result?.status??null});continue;}
    const m=result.metrics??{};
    const snapshot={publish_queue_id:row.id,source_ref:row.source_ref,provider:"x",provider_post_id:postId,captured_at:new Date().toISOString(),impressions:n(m.impression_count??m.impressions),views:n(m.view_count??m.views),likes:n(m.like_count??m.likes),replies:n(m.reply_count??m.replies),comments:n(m.comment_count??m.comments),reposts:n(m.retweet_count??m.repost_count??m.reposts),shares:n(m.share_count??m.shares),bookmarks:n(m.bookmark_count??m.bookmarks),saves:n(m.save_count??m.saves),clicks:n(m.url_link_clicks??m.clicks),raw_metrics:{adapter:result.adapter,response:result.body}};
    const {error:ie}=await db.from("content_metric_snapshots").insert(snapshot);
    if(ie){failed.push({queue_id:row.id,post_id:postId,reason:"snapshot_insert_failed",detail:ie.message});continue;}
    collected.push({queue_id:row.id,source_ref:row.source_ref,post_id:postId,adapter:result.adapter,metrics:{impressions:snapshot.impressions,likes:snapshot.likes,replies:snapshot.replies,reposts:snapshot.reposts,bookmarks:snapshot.bookmarks}});
  }
  return json({ok:true,state:"collected",collected_count:collected.length,failed_count:failed.length,collected,failed});
});