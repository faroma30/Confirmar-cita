const $=id=>document.getElementById(id);
const DEF_KEYS=["kit hogar","kit básico","kit basico","kit negocio","kit premium"];
const DEF_I=`Buenas, soy {TECNICO}, el *técnico de la alarma de Verisure* para hacer la instalación de la alarma.

Mañana estaré en *{POBLACION}* a las *{HORA}*.

📍 Dirección: *{DIRECCION}*

Por favor, comprueba que la dirección es correcta.

Importante que tenga el *DNI* (físico) y el *número de cuenta*.

Recuerda que el inmueble debe tener:
- Luz
- No estar en obras
- Internet (si se quiere instalar la cámara de vídeo)

Te avisaré cuando esté de camino. Cualquier cosa, házmela saber.

*Si necesitas CANCELAR la instalación avísame antes de las 8:00 de la mañana para evitar penalizaciones.*`;
const DEF_M=`Buenas, soy {TECNICO}, el *técnico de la alarma de Verisure* para hacer el mantenimiento de la alarma.

Mañana estaré en *{POBLACION}* a las *{HORA}*.

📍 Dirección: *{DIRECCION}*

Por favor, comprueba que la dirección es correcta.

*Si necesitas CANCELAR el mantenimiento avísame antes de las 8:00 de la mañana para evitar penalizaciones.*`;
const DEF_MAIL=`Buenos días,

El cliente correspondiente al prospecto {MTO} solicita cancelar la cita prevista a las {HORA}.

Tipo de intervención: {TIPO}
Población: {POBLACION}
Teléfono: {TELEFONO}
Dirección: {DIRECCION}

Motivo indicado por el cliente: {MOTIVO}

Un saludo,
{TECNICO}`;
function cfg(){return{tech:localStorage.getItem("v1tech")||"",keys:JSON.parse(localStorage.getItem("v1keys")||JSON.stringify(DEF_KEYS)),inst:localStorage.getItem("v1inst")||DEF_I,maint:localStorage.getItem("v1maint")||DEF_M,to:localStorage.getItem("v1to")||"toa.alianzas@verisure.es",cc:localStorage.getItem("v1cc")||"angel.garciaestevez@verisure.es",subject:localStorage.getItem("v1subject")||"Cliente cancela - Prospecto {MTO}",mail:localStorage.getItem("v1mail")||DEF_MAIL}}
const TODAY=()=>new Date().toISOString().slice(0,10);
const TOMORROW=()=>{let d=new Date();d.setDate(d.getDate()+1);return d.toISOString().slice(0,10)};
let stores=JSON.parse(localStorage.getItem("v1datedAgendas")||"{}");
if(!Object.keys(stores).length){let a=JSON.parse(localStorage.getItem("v1agenda")||"[]"),i=JSON.parse(localStorage.getItem("v1ignored")||"[]");if(a.length||i.length)stores[TOMORROW()]={agenda:a,ignored:i}}
let activeDate=localStorage.getItem("v1activeDate")||TOMORROW();
let agenda=stores[activeDate]?.agenda||[],ignored=stores[activeDate]?.ignored||[],filter="Todas",importChanges=[];
function save(){stores[activeDate]={agenda,ignored,updatedAt:Date.now()};localStorage.setItem("v1datedAgendas",JSON.stringify(stores));localStorage.setItem("v1activeDate",activeDate)}
function switchDate(d){save();activeDate=d;agenda=stores[d]?.agenda||[];ignored=stores[d]?.ignored||[];importChanges=[];render()}
function fmtDate(d){return new Date(d+"T12:00:00").toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"})}
const norm=s=>(s||"").replace(/\D/g,"");
function classify(t){let q=(t||"").toLowerCase(),c=cfg();if(c.keys.some(k=>q.includes(k)))return"Instalación";if(q.includes("mantenimiento"))return"Mantenimiento";return null}

function mapAddress(address,city){
 let parts=(address||"").trim().split(/\s+/), out=[];
 for(let part of parts){
   out.push(part);
   if(/^\d+[A-Za-z]?$/.test(part)) break;
 }
 return [out.join(" "),city].filter(Boolean).join(", ");
}
function cleanAddress(s){
 return (s||"").replace(/\b0+(\d+)\b/g,(m,n)=>String(parseInt(n,10))).replace(/\s+/g," ").trim();
}
function cityName(s){s=(s||"").trim();let p=[...s.matchAll(/\(([^)]+)\)/g)];if(p.length)s=p.at(-1)[1];return s.toLowerCase().replace(/(^|[\s-])\p{L}/gu,m=>m.toUpperCase())}
function validate(x){x.issues=[];if(x.tel.length<9)x.issues.push("Teléfono no válido");if(!x.city)x.issues.push("Población no detectada");if(!x.address)x.issues.push("Dirección no detectada")}
function parseAgenda(text){text=(text||"").replace(/\r/g," ").replace(/\n/g," ").replace(/\s+/g," ").trim();let starts=[...text.matchAll(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g)],fresh=[],bad=[];for(let i=0;i<starts.length;i++){let seg=text.slice(starts[i].index,i+1<starts.length?starts[i+1].index:text.length),time=starts[i][1],tm=seg.match(/Tipo:\s*(.*?)\s+Panel:/i),type=tm?tm[1].trim():"",kind=classify(type),pm=seg.match(/Tlf:\s*([+\d][\d\s-]{7,})/i),tel=pm?norm(pm[1]):"",mm=seg.match(/Mto:\s*-?(\d+)/i),mto=mm?mm[1]:"",city="",address="",cp="",a=seg.search(/Panel:/i),b=seg.search(/\sCP:/i);if(a>=0&&b>a){let middle=seg.slice(a,b).replace(/^Panel:\s*/i,"").trim(),parts=middle.split(/\s+-\s+/);if(parts.length>=2){parts.shift();city=parts.shift().trim();address=parts.join(" - ").trim()}}let cm=seg.match(/CP:\s*(\d{5})/i);if(cm)cp=cm[1];city=cityName(city);address=cleanAddress(address);let old=agenda.find(x=>(mto&&x.mto===mto)||(!mto&&tel&&x.tel===tel&&x.type===type)),id=(mto||tel||type)+"|"+time,x={id,time,type,kind,tel,mto,city,address,cp,state:old?.state||"Pendiente",prepared:old?.prepared||false,contactedAt:old?.contactedAt||null,cancelReason:old?.cancelReason||"",issues:[]};
if(old){let ch=[];if(old.time!==time)ch.push(`Hora ${old.time} → ${time}`);if(old.address!==address)ch.push("Dirección modificada");if(old.tel!==tel)ch.push("Teléfono modificado");if(old.city!==city)ch.push("Población modificada");if(ch.length){x.lastChanges=ch;importChanges.push(ch.join(" · "))}}
validate(x);kind?fresh.push(x):bad.push({time,type:type||"Sin tipo"})}
let gone=agenda.filter(o=>!fresh.some(n=>(o.mto&&n.mto===o.mto)||(!o.mto&&n.tel===o.tel&&n.type===o.type)));gone.forEach(v=>{v.missing=true;fresh.push(v);importChanges.push("Una cita ya no aparece en Oracle")});
agenda=fresh;ignored=bad;save();render()}
function vals(x,m=""){let c=cfg();return{TECNICO:c.tech||"el técnico",POBLACION:x.city,HORA:x.time,DIRECCION:[x.address,x.cp].filter(Boolean).join(" "),TELEFONO:x.tel,MTO:x.mto||"Sin prospecto",TIPO:x.type,MOTIVO:m}}
function fill(t,x,m=""){let o=t;for(const[k,v]of Object.entries(vals(x,m)))o=o.replaceAll("{"+k+"}",v||"");return o}
function show(t,h){$("mtitle").textContent=t;$("mbody").innerHTML=h;$("modal").classList.remove("hidden")}const hide=()=>$("modal").classList.add("hidden");
function openWhatsAppDirect(phone,message){
 const clean=(phone||"").replace(/\D/g,"").replace(/^34/,"");
 const full="34"+clean;
 const text=encodeURIComponent(message||"");
 // Android intent targets the installed WhatsApp app directly.
 const intent=`intent://send?phone=${full}&text=${text}#Intent;scheme=whatsapp;package=com.whatsapp;end`;
 window.location.assign(intent);
}
function wa(x,custom){if(x.contactedAt&&!custom){let t=new Date(x.contactedAt).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"});if(!confirm(`Ya contactaste con este cliente a las ${t}. ¿Abrir WhatsApp de nuevo?`))return}validate(x);if(x.issues.length){render();return alert("Revisa primero: "+x.issues.join(", "))}x.prepared=true;x.contactedAt=Date.now();save();render();let c=cfg(),m=custom||fill(x.kind==="Instalación"?c.inst:c.maint,x);openWhatsAppDirect(x.tel,m)}
function cancel(x){show("Cancelar cita",`<label>Motivo de cancelación</label><textarea id="reason" placeholder="Indica el motivo comunicado por el cliente">${x.cancelReason||""}</textarea><button id="cancelMail" class="primary" style="width:100%;margin-top:10px">Cancelar y preparar correo</button>`);$("cancelMail").onclick=()=>{let r=$("reason").value.trim();if(!r)return alert("Indica el motivo.");x.state="Cancelada";x.cancelReason=r;save();render();hide();let c=cfg();location.href=`mailto:${c.to}?cc=${encodeURIComponent(c.cc)}&subject=${encodeURIComponent(fill(c.subject,x,r))}&body=${encodeURIComponent(fill(c.mail,x,r))}`}}
function states(x){show("Cambiar estado",`<div style="display:grid;gap:8px"><button id="sp" class="secondary">🟡 Pendiente</button><button id="sc" class="success">🟢 Confirmada</button><button id="sx" class="danger">🔴 Cancelada</button></div>`);$("sp").onclick=()=>{x.state="Pendiente";save();hide();render()};$("sc").onclick=()=>{x.state="Confirmada";save();hide();render()};$("sx").onclick=()=>cancel(x)}
function edit(x){show("Editar cita",`<label>Hora</label><input id="eh" value="${x.time}"><label>Población</label><input id="ec" value="${x.city}"><label>Dirección</label><input id="ea" value="${x.address}"><label>CP</label><input id="ecp" value="${x.cp}"><label>Teléfono</label><input id="et" value="${x.tel}"><button id="es" class="primary" style="width:100%;margin-top:12px">Guardar</button>`);$("es").onclick=()=>{x.time=$("eh").value.trim();x.city=$("ec").value.trim();x.address=$("ea").value.trim();x.cp=$("ecp").value.trim();x.tel=norm($("et").value);validate(x);save();hide();render()}}
function preview(x){let c=cfg();show("Revisar mensaje",`<textarea id="prev" style="min-height:330px">${fill(x.kind==="Instalación"?c.inst:c.maint,x)}</textarea><button id="pwa" class="whatsapp" style="width:100%;margin-top:10px">Abrir WhatsApp</button>`);$("pwa").onclick=()=>wa(x,$("prev").value)}

function settings(){let c=cfg();show("Ajustes",`<label>Nombre del técnico</label><input id="tech" placeholder="Escribe tu nombre" value="${c.tech}"><hr><label>Palabras de instalación (una por línea)</label><textarea id="keys">${c.keys.join("\n")}</textarea><label>Plantilla instalación</label><textarea id="inst">${c.inst}</textarea><button id="rInst" class="secondary">Restaurar predeterminado</button><label>Plantilla mantenimiento</label><textarea id="maint">${c.maint}</textarea><button id="rMaint" class="secondary">Restaurar predeterminado</button><hr><label>Correo Para</label><input id="to" value="${c.to}"><label>CC</label><input id="cc" value="${c.cc}"><label>Asunto cancelación</label><input id="subject" value="${c.subject}"><label>Cuerpo cancelación</label><textarea id="mail">${c.mail}</textarea><button id="rMail" class="secondary">Restaurar predeterminado</button><div class="row"><button id="saveCfg" class="primary">Guardar cambios</button></div>`);
$("rInst").onclick=()=>{$("inst").value=DEF_I};$("rMaint").onclick=()=>{$("maint").value=DEF_M};$("rMail").onclick=()=>{$("mail").value=DEF_MAIL};
$("saveCfg").onclick=()=>{localStorage.setItem("v1tech",$("tech").value.trim());localStorage.setItem("v1keys",JSON.stringify($("keys").value.split("\n").map(v=>v.trim().toLowerCase()).filter(Boolean)));localStorage.setItem("v1inst",$("inst").value);localStorage.setItem("v1maint",$("maint").value);localStorage.setItem("v1to",$("to").value.trim());localStorage.setItem("v1cc",$("cc").value.trim());localStorage.setItem("v1subject",$("subject").value);localStorage.setItem("v1mail",$("mail").value);hide();alert("Ajustes guardados")}}
function contactLabel(x){return x.contactedAt?"✓ Contactado "+new Date(x.contactedAt).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"}):""}
function showHistory(){let ds=Object.keys(stores).sort().reverse();show("Agendas guardadas",ds.length?`<div style="display:grid;gap:8px">${ds.map(d=>`<button class="secondary hist" data-d="${d}">${fmtDate(d)} · ${(stores[d].agenda||[]).length} citas</button>`).join("")}</div>`:"No hay agendas guardadas.");document.querySelectorAll(".hist").forEach(b=>b.onclick=()=>{hide();switchDate(b.dataset.d)})}
function render(){
 let n=s=>agenda.filter(x=>x.state===s).length;
 $("stats").innerHTML=`<div class="daynav"><button class="secondary day" data-d="${TODAY()}">Hoy</button><button class="secondary day" data-d="${TOMORROW()}">Mañana</button><button class="secondary" id="historyBtn">Anteriores</button></div><div class="daytitle">${fmtDate(activeDate)}</div><div class="stats"><div class="stat"><b>${agenda.length}</b><span>Citas</span></div><div class="stat"><b>${n("Pendiente")}</b><span>Pendientes</span></div><div class="stat"><b>${n("Confirmada")}</b><span>Confirmadas</span></div><div class="stat"><b>${n("Cancelada")}</b><span>Canceladas</span></div></div>`;
 document.querySelectorAll(".day").forEach(b=>{if(b.dataset.d===activeDate)b.classList.add("on");b.onclick=()=>switchDate(b.dataset.d)});let hb=$("historyBtn");if(hb)hb.onclick=showHistory;
let active=agenda.filter(x=>!x.missing),done=active.length>0&&active.every(x=>x.state!=="Pendiente");
let notices=(done?`<div class="ready">✓ Agenda preparada · no quedan citas pendientes</div>`:"")+(importChanges.length?`<div class="changes"><b>⚠ Cambios detectados</b>${importChanges.map(x=>`<div>${x}</div>`).join("")}</div>`:"");
let fs=["Todas","Pendientes","Confirmadas","Canceladas","Ignoradas"];$("tabs").innerHTML=fs.map(f=>`<button class="tab ${filter===f?"on":""}" data-f="${f}">${f}</button>`).join("");document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{filter=b.dataset.f;render()});
 $("ignored").innerHTML=notices+(filter==="Ignoradas"?`<div class="box">${ignored.length?ignored.map(x=>`<div><b>${x.time}</b> · ${x.type}</div>`).join(""):"No hay citas ignoradas."}</div>`:(ignored.length?`<div class="box"><details><summary>${ignored.length} citas ignoradas</summary>${ignored.map(x=>`<div class="tiny">${x.time} · ${x.type}</div>`).join("")}</details></div>`:""));
 let list=agenda;if(filter==="Pendientes")list=agenda.filter(x=>x.state==="Pendiente");if(filter==="Confirmadas")list=agenda.filter(x=>x.state==="Confirmada");if(filter==="Canceladas")list=agenda.filter(x=>x.state==="Cancelada");if(filter==="Ignoradas")list=[];
 $("results").innerHTML="";
 list.forEach(x=>{let d=document.createElement("article"),sc=x.state==="Pendiente"?"pending":x.state==="Confirmada"?"confirmed":"cancelled";d.className="card "+(x.issues.length?"issue ":"")+(x.prepared?"prepared":"");
 d.innerHTML=`<div class="card-top"><span class="tag">${x.kind}</span><button class="state ${sc} st">${x.state}</button></div><h2>${x.time} · ${x.city||"Revisar población"}</h2><div class="type">${x.type}</div><div class="meta">Prospecto: ${x.mto||"—"} · ${x.tel||"Sin teléfono"}</div><div class="address">📍 ${x.address||"Dirección no detectada"} ${x.cp||""}</div>${x.contactedAt?`<div class="badge">${contactLabel(x)}</div>`:(x.prepared?'<div class="badge">✓ WhatsApp preparado</div>':"")}${x.missing?'<div class="badge missing">⚠ Ya no aparece en Oracle</div>':""}${x.lastChanges?.length?`<div class="badge changed">⚠ ${x.lastChanges.join(" · ")}</div>`:""}${x.issues.map(i=>`<div class="badge">⚠️ ${i}</div>`).join("")}<div class="actions-primary"><button class="whatsapp w">WhatsApp</button><button class="call callb">📞 Llamar</button><button class="maps mapsb">📍 Maps</button></div><div class="actions-secondary"><button class="secondary edit">✎ Editar</button><button class="review">💬 Revisar mensaje</button><button class="change">↻ Cambiar estado</button></div>`;
 d.querySelector(".st").onclick=()=>states(x);d.querySelector(".w").onclick=()=>wa(x);d.querySelector(".callb").onclick=()=>location.href="tel:"+x.tel;d.querySelector(".mapsb").onclick=()=>location.href="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(mapAddress(x.address,x.city));d.querySelector(".edit").onclick=()=>edit(x);d.querySelector(".review").onclick=()=>preview(x);d.querySelector(".change").onclick=()=>states(x);$("results").appendChild(d)});
 let next=agenda.find(x=>x.state==="Pendiente"&&!x.issues.length&&!x.contactedAt&&!x.missing);$("next").classList.toggle("hidden",!next);$("next").onclick=()=>next&&wa(next)
}
$("importClipboard").onclick=async()=>{try{let t=await navigator.clipboard.readText();if(!t.trim())return alert("El portapapeles está vacío.");$("raw").value=t;parseAgenda(t)}catch(e){$("manual").classList.remove("hidden");$("manualBtn").textContent="▼ Entrada manual";alert("Chrome no ha permitido leer el portapapeles automáticamente. Mantén pulsado en el cuadro, toca Pegar y después Procesar.")}};
$("settings").onclick=settings;$("mclose").onclick=hide;$("modal").onclick=e=>{if(e.target===$("modal"))hide()};
$("manualBtn").onclick=()=>{let h=$("manual").classList.toggle("hidden");$("manualBtn").textContent=h?"▶ Entrada manual":"▼ Entrada manual"};
$("process").onclick=()=>parseAgenda($("raw").value);
$("paste").onclick=async()=>{try{$("raw").value=await navigator.clipboard.readText();parseAgenda($("raw").value)}catch(e){alert("Mantén pulsado y toca Pegar.")}};
$("newAgenda").onclick=()=>{let d=prompt("Fecha de la nueva agenda (AAAA-MM-DD):",TOMORROW());if(!d)return;switchDate(d);agenda=[];ignored=[];importChanges=[];save();render()};
let q=new URLSearchParams(location.search),shared=q.get("text")||[q.get("title"),q.get("url")].filter(Boolean).join("\n");if(shared){$("raw").value=shared;parseAgenda(shared);history.replaceState({},"","./")}else render();

