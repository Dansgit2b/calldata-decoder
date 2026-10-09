const $=id=>document.getElementById(id);let last=null,F=[];const cache={};
const MAX=2n**256n-1n;
async function lookup(sel){if(cache[sel])return cache[sel];let s=[];
 try{const j=await (await fetch("https://api.openchain.xyz/signature-database/v1/lookup?filter=true&function="+sel)).json();s=(j.result.function[sel]||[]).map(x=>x.name);}catch{}
 if(!s.length)try{const j=await (await fetch("https://www.4byte.directory/api/v1/signatures/?hex_signature="+sel)).json();s=j.results.sort((a,b)=>a.id-b.id).map(x=>x.text_signature);}catch{}
 return cache[sel]=s;}
function userAbi(){const t=$("abi").value.trim();if(!t)return null;try{return JSON.parse(t)}catch{return viem.parseAbi(t.split("\n").map(x=>x.trim()).filter(Boolean))}}
const ser=v=>JSON.stringify(v,(k,x)=>typeof x==="bigint"?x.toString():x,2);
function flagCall(name,args,depth){const p="  ".repeat(depth);const f=(l,m)=>F.push([l,p+m]);
 if(name==="approve"&&args.length===2){const v=BigInt(args[1]);v>=2n**160n?f("err",`UNLIMITED approve to ${args[0]}`):f("warn",`approve ${v} raw units to ${args[0]}`);}
 if(name==="increaseAllowance")f("warn",`increaseAllowance for ${args[0]} by ${args[1]}`);
 if(name==="setApprovalForAll"&&args[1]===true)f("err",`setApprovalForAll(true): ${args[0]} can move ALL NFTs in this collection`);
 if(/^(transferOwnership|renounceOwnership|upgradeTo|upgradeToAndCall|changeAdmin|addOwnerWithThreshold|swapOwner|removeOwner|changeThreshold|enableModule|setGuard)$/.test(name))f("err",`admin action: ${name}`);
 if(name==="permit")f("err","on-chain permit call: grants allowance");
 if(/^(transfer|transferFrom|safeTransferFrom)$/.test(name))f("warn",`${name}: ${args.slice(0,3).map(String).join(", ")}`);}
async function decode(data,depth,abi){data=data.toLowerCase();if(!/^0x[0-9a-f]*$/.test(data))throw new Error("not hex");if(data.length<10)return {raw:data,note:"no selector (plain transfer or empty)"};
 const sel=data.slice(0,10);let cands=[];
 if(abi){try{const r=viem.decodeFunctionData({abi,data});cands.push({signature:r.functionName,args:r.args});}catch{}}
 if(!cands.length)for(const sig of await lookup(sel)){try{const item=viem.parseAbiItem("function "+sig);const r=viem.decodeFunctionData({abi:[item],data});
   // reject decodings that leave trailing garbage
   cands.push({signature:sig,args:r.args,item});}catch{}}
 if(!cands.length)return {selector:sel,note:"unknown selector (paste the ABI to decode)",raw:data};
 const c=cands[0];const name=c.signature.split("(")[0];F.push(["ok","  ".repeat(depth)+"call "+c.signature]);flagCall(name,c.args||[],depth);
 const nested=[];const walk=async v=>{if(typeof v==="string"&&/^0x[0-9a-fA-F]{8,}$/.test(v)&&v.length>=10&&(v.length-10)%64===0&&depth<4){try{const d=await decode(v,depth+1,abi);if(d.signature)nested.push(d);}catch{}}else if(Array.isArray(v))for(const x of v)await walk(x);else if(v&&typeof v==="object")for(const x of Object.values(v))await walk(x);};
 await walk(c.args);
 return {selector:sel,signature:c.signature,args:c.args,alternatives:cands.slice(1).map(x=>x.signature),...(nested.length?{nestedCalls:nested}:{})};}
async function run(){F=[];$("flags").innerHTML="";$("out").textContent="Decoding…";try{const r=await decode($("cd").value.trim().replace(/\s/g,""),0,userAbi());last=r;
 if(!F.some(f=>f[0]==="err"))F.push(["ok","no high-risk action recognised"]);
 $("flags").innerHTML=F.map(([l,m])=>`<div class="${l}" style="white-space:pre">${l==="ok"?"✓":l==="warn"?"⚠":"✗"} ${m.replace(/</g,"&lt;")}</div>`).join("");$("out").textContent=ser(r);}catch(e){$("out").textContent="";$("flags").innerHTML=`<div class="err">✗ ${e.message}</div>`;}}
function sample(){ // multicall(bytes[]) wrapping an unlimited approve + a transfer
 const approve="0x095ea7b3"+"000000000000000000000000000000000022d473030f116ddee9f6b43ac78ba3"+"f".repeat(64);
 const transfer="0xa9059cbb"+"0000000000000000000000002222222222222222222222222222222222222222"+(1000000).toString(16).padStart(64,"0");
 const enc=b=>(b.length-2)/2;const pad=h=>h+"0".repeat((64-(h.length%64))%64);
 const items=[approve,transfer];let heads="",tails="",off=items.length*32;for(const it of items){heads+=off.toString(16).padStart(64,"0");const body=enc(it).toString(16).padStart(64,"0")+pad(it.slice(2));tails+=body;off+=body.length/2;}
 $("cd").value="0xac9650d8"+(32).toString(16).padStart(64,"0")+items.length.toString(16).padStart(64,"0")+heads+tails;run();}
function exportReport(){if(!LWPay.isPro()){$("lwstat").textContent="Report export needs the Pro pass.";$("pro").scrollIntoView();return;}if(!last)return;
 const md=`# Calldata Decoder report\n\nGenerated ${new Date().toISOString()}\n\n## Findings\n${F.map(([l,m])=>`- **${l}** ${m.trim()}`).join("\n")}\n\n## Decoded\n\`\`\`json\n${ser(last)}\n\`\`\`\n`;
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([md],{type:"text/markdown"}));a.download="calldata-report.md";a.click();}
LWPay.init({product:"calldata",price:0.1,blurb:"Decoding is free. The Pro pass adds a <b>Markdown report export</b> of the decoded call tree and risk flags, for multisig reviews and audits, and it pays for upkeep."});
