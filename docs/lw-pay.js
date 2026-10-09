// Lumen Works pay-to-wallet Pro unlock (static, verified on-chain via public RPC). MIT.
(function(){
const WALLET="0xee9790cB3960952F585379F831a89b4e00B4029A";
const NETS={base:{hex:"0x2105",rpc:"https://mainnet.base.org",usdc:"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"},
 arc:{hex:"0x13b2",rpc:"https://rpc.mainnet.arc.io"}};
const TRANSFER="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
let cfg;const el=id=>document.getElementById(id);
async function rpc(net,method,params){const r=await fetch(NETS[net].rpc,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});const j=await r.json();if(j.error)throw new Error(j.error.message);return j.result;}
const min6=()=>BigInt(Math.round(cfg.price*1e6));
async function checkTx(net,tx){const w=WALLET.toLowerCase();const r=await rpc(net,"eth_getTransactionReceipt",[tx]);if(!r)return "pending";if(r.status!=="0x1")return "transaction failed";
 if(net==="base"){return r.logs.some(l=>l.address.toLowerCase()===NETS.base.usdc.toLowerCase()&&l.topics[0]===TRANSFER&&("0x"+l.topics[2].slice(26)).toLowerCase()===w&&BigInt(l.data)>=min6())?true:`no transfer of ≥${cfg.price} USDC to the Lumen Works wallet in this tx`;}
 const t=await rpc(net,"eth_getTransactionByHash",[tx]);return (t.to||"").toLowerCase()===w&&BigInt(t.value)>=min6()*10n**12n?true:`no transfer of ≥${cfg.price} USDC to the Lumen Works wallet in this tx`;}
function key(){return "lw_pro_"+cfg.product;}
function isPro(){return !!localStorage.getItem(key());}
function stat(h){el("lwstat").innerHTML=h;}
function ui(){if(isPro()){stat('<span style="color:#3fb950">Pro unlocked. Thank you for supporting Lumen Works!</span>');cfg.onUnlock&&cfg.onUnlock();}}
async function verify(tx,net){tx=(tx||el("lwtx").value).trim();net=net||el("lwnet").value;if(!/^0x[0-9a-fA-F]{64}$/.test(tx))return stat("Enter a valid tx hash");
 stat("Checking on-chain…");for(let i=0;i<20;i++){try{const r=await checkTx(net,tx);if(r===true){localStorage.setItem(key(),net+":"+tx);return ui();}if(r!=="pending")return stat('<span style="color:#f85149">'+r+'</span>');}catch(e){stat("RPC error: "+e.message);}await new Promise(s=>setTimeout(s,3000));}
 stat("Not confirmed yet. Press Verify again in a minute.");}
async function pay(net){const eth=window.ethereum;if(!eth)return stat(`No browser wallet found. Send ${cfg.price} USDC on Base or Arc to <code>${WALLET}</code> from any wallet, then paste the tx hash.`);
 const n=NETS[net];try{const [from]=await eth.request({method:"eth_requestAccounts"});
  try{await eth.request({method:"wallet_switchEthereumChain",params:[{chainId:n.hex}]});}catch(e){if(net==="arc")await eth.request({method:"wallet_addEthereumChain",params:[{chainId:n.hex,chainName:"Arc",rpcUrls:[n.rpc],nativeCurrency:{name:"USDC",symbol:"USDC",decimals:18},blockExplorerUrls:["https://explorer.arc.io"]}]});else throw e;}
  let tx;if(net==="base")tx=await eth.request({method:"eth_sendTransaction",params:[{from,to:n.usdc,data:"0xa9059cbb"+WALLET.slice(2).toLowerCase().padStart(64,"0")+min6().toString(16).padStart(64,"0")}]});
  else tx=await eth.request({method:"eth_sendTransaction",params:[{from,to:WALLET,value:"0x"+(min6()*10n**12n).toString(16)}]});
  el("lwtx").value=tx;el("lwnet").value=net;verify(tx,net);}catch(e){stat("Payment not sent: "+(e.message||e));}}
function init(c){cfg=c;el("pro").innerHTML=`<h2>Pro pass: ${c.price} USDC, lifetime</h2><p>${c.blurb} The money goes straight to the Lumen Works wallet <code>${WALLET}</code> as USDC on <b>Base</b> or <b>Arc</b>. No account needed; the page checks the payment on-chain and unlocks in your browser.</p>
<button onclick="LWPay.pay('base')">Pay ${c.price} USDC on Base</button> <button onclick="LWPay.pay('arc')">Pay ${c.price} USDC on Arc</button>
<p>Already paid, or paid from another wallet? <input id="lwtx" placeholder="0x… tx hash"> <select id="lwnet"><option value="base">Base</option><option value="arc">Arc</option></select> <button class="alt" onclick="LWPay.verify()">Verify</button></p><p id="lwstat"></p>`;ui();}
window.LWPay={init,pay,verify,isPro,checkTx};
})();
