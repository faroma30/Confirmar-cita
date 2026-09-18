const $=id=>document.getElementById(id);
const DEF_KEYS=["kit hogar","kit básico","kit basico","kit negocio","kit premium"];
const DEF_I=`Buenas, soy Fabián, el *técnico de la alarma de Verisure* para hacer la instalación de la alarma.

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
const DEF_M=`Buenas, soy Fabián, el *técnico de la alarma de Verisure* para hacer el mantenimiento de la alarma.

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
Fabián`;

function cfg(){return{
 keys:JSON.parse(localStorage.getItem("v3keys")||JSON.stringify(DEF_KEYS)),
 inst:localStorage.getItem("v3inst")||DEF_I,maint:localStorage.getItem("v3maint")||DEF_M,
 to:localStorage.getItem("v3to")||"toa.alianzas@verisure.es",
 cc:localStorage.getItem("v3cc")||"angel.garciaestevez@verisure.es",
 subject:localStorage.getItem("v3subject")||"Cliente cancela - Prospecto {MTO}",
 mail:localStorage.getItem("v3mail")||DEF_MAIL
}}
let agenda=JSON.parse(localStorage.getItem("v3agenda")||"[]");
let ignored=JSON.parse(localStorage.getItem("v3ignored")||"[]");
let filter="Todas";
const save=()=>{localStorage.setItem("v3agenda",JSON.stringify(agenda));localStorage.setItem("v3ignored",JSON.stringify(ignored))}
const norm=s=>(s||"").replace(/\D/g,"");
function classify(t){let q=(t||"").toLowerCase(),c=cfg();if(c.keys.some(k=>q.includes(k)))return"Instalación";if(q.includes("mantenimiento"))return"Mantenimiento";return null}
function cityName(s){s=(s||"").trim();let p=[...s.matchAll(/\(([^)]+)\)/g)];if(p.length)s=p.at(-1)[1];return s.toLowerCase().replace(/(^|[\s-])\p{L}/gu,m=>m.toUpperCase())}
function validate(x){x.issues=[];if(x.tel.length<9)x.issues.push("Teléfono no válido");if(!x.city)x.issues.push("Población no detectada");if(!x.address)x.issues.push("Dirección no detectada")}
function parseAgenda(text){
 text=(text||"").replace(/\r/g," ").replace(/\n/g," ").replace(/\s+/g," ").trim();
 const starts=[...text.matchAll(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g)],fresh=[],bad=[];
 for(let i=0;i<starts.length;i++){
  const seg=text.slice(starts[i].index,i+1<starts.length?starts[i+1].index:text.length),time=starts[i][1];
  const tm=seg.match(/Tipo:\s*(.*?)\s+Panel:/i),type=tm?tm[1].trim():"",kind=classify(type);
  const pm=seg.match(/Tlf:\s*([+\d][\d\s-]{7,})/i),tel=pm?norm(pm[1]):"";
  const mm=seg.match(/Mto:\s*-?(\d+)/i),mto=mm?mm[1]:"";
  let city="",address="",cp="",a=seg.search(/Panel:/i),b=seg.search(/\sCP:/i);
  if(a>=0&&b>a){let middle=seg.slice(a,b).replace(/^Panel:\s*/i,"").trim(),parts=middle.split(/\s+-\s+/);if(parts.length>=2){parts.shift();city=parts.shift().trim();address=parts.join(" - ").trim()}}
  let cm=seg.match(/CP:\s*(\d{5})/i);if(cm)cp=cm[1];city=cityName(city);
  let id=(mto||tel||time)+"|"+time,old=agenda.find(x=>x.id===id);
  let x={id,time,type,kind,tel,mto,city,address,cp,state:old?.state||"Pendiente",prepared:old?.prepared||false,cancelReason:old?.cancelReason||"",issues:[]};validate(x);
  if(kind)fresh.push(x);else bad.push({time,type:type||"Sin tipo"});
 }
 agenda=fresh;ignored=bad;save();render();
}
function vals(x,motivo=""){return{POBLACION:x.city,HORA:x.time,DIRECCION:[x.address,x.cp].filter(Boolean).join(" "),TELEFONO:x.tel,MTO:x.mto||"Sin prospecto",TIPO:x.type,MOTIVO:motivo}}
function fill(t,x,m=""){let o=t;for(const[k,v]of Object.entries(vals(x,m)))o=o.replaceAll("{"+k+"}",v||"");return o}
function show(title,html){$("mtitle").textContent=title;$("mbody").innerHTML=html;$("modal").classList.remove("hidden")}
const hide=()=>$("modal").classList.add("hidden");
function wa(x,custom){validate(x);if(x.issues.length){render();alert("Revisa primero: "+x.issues.join(", "));return}x.prepared=true;save();render();let c=cfg(),m=custom||fill(x.kind==="Instalación"?c.inst:c.maint,x);location.href=`https://wa.me/34${x.tel.replace(/^34/,"")}?text=${encodeURIComponent(m)}`}
function cancel(x){show("Cancelar cita",`<label>Motivo de cancelación</label><textarea id="reason" placeholder="Indica el motivo comunicado por el cliente">${x.cancelReason||""}</textarea><button id="cancelMail" class="red" style="width:100%;margin-top:10px">Cancelar y preparar correo</button>`);$("cancelMail").onclick=()=>{let r=$("reason").value.trim();if(!r)return alert("Indica el motivo.");x.state="Cancelada";x.cancelReason=r;save();render();hide();let c=cfg();location.href=`mailto:${c.to}?cc=${encodeURIComponent(c.cc)}&subject=${encodeURIComponent(fill(c.subject,x,r))}&body=${encodeURIComponent(fill(c.mail,x,r))}`}}
function states(x){show("Estado de la cita",`<div style="display:grid;gap:8px"><button id="sp" class="soft">🟡 Pendiente</button><button id="sc" class="green">🟢 Confirmada</button><button id="sx" class="danger">🔴 Cancelada</button></div>`);$("sp").onclick=()=>{x.state="Pendiente";save();hide();render()};$("sc").onclick=()=>{x.state="Confirmada";save();hide();render()};$("sx").onclick=()=>cancel(x)}
function edit(x){show("Editar cita",`<label>Hora</label><input id="eh" value="${x.time}"><label>Población</label><input id="ec" value="${x.city}"><label>Dirección</label><input id="ea" value="${x.address}"><label>CP</label><input id="ecp" value="${x.cp}"><label>Teléfono</label><input id="et" value="${x.tel}"><button id="es" class="red" style="width:100%;margin-top:12px">Guardar</button>`);$("es").onclick=()=>{x.time=$("eh").value.trim();x.city=$("ec").value.trim();x.address=$("ea").value.trim();x.cp=$("ecp").value.trim();x.tel=norm($("et").value);validate(x);save();hide();render()}}
function preview(x){let c=cfg();show("Revisar mensaje",`<textarea id="prev" style="min-height:330px">${fill(x.kind==="Instalación"?c.inst:c.maint,x)}</textarea><button id="pwa" class="green" style="width:100%;margin-top:10px">Abrir WhatsApp</button>`);$("pwa").onclick=()=>wa(x,$("prev").value)}
function more(x){show("Opciones",`<div style="display:grid;gap:8px"><button id="ms" class="soft">Cambiar estado</button><button id="me" class="soft">Editar datos</button><button id="mp" class="soft">Revisar mensaje</button></div>`);$("ms").onclick=()=>states(x);$("me").onclick=()=>edit(x);$("mp").onclick=()=>preview(x)}

function settings(){let c=cfg();show("Ajustes",`<label>Palabras de instalación (una por línea)</label><textarea id="keys">${c.keys.join("\n")}</textarea><label>Plantilla instalación</label><textarea id="inst">${c.inst}</textarea><label>Plantilla mantenimiento</label><textarea id="maint">${c.maint}</textarea><hr><label>Correo Para</label><input id="to" value="${c.to}"><label>CC</label><input id="cc" value="${c.cc}"><label>Asunto cancelación</label><input id="subject" value="${c.subject}"><label>Cuerpo cancelación</label><textarea id="mail">${c.mail}</textarea><div class="row"><button id="saveCfg" class="red">Guardar</button><button id="resetCfg" class="soft">Restaurar</button></div>`);
$("saveCfg").onclick=()=>{localStorage.setItem("v3keys",JSON.stringify($("keys").value.split("\n").map(v=>v.trim().toLowerCase()).filter(Boolean)));localStorage.setItem("v3inst",$("inst").value);localStorage.setItem("v3maint",$("maint").value);localStorage.setItem("v3to",$("to").value.trim());localStorage.setItem("v3cc",$("cc").value.trim());localStorage.setItem("v3subject",$("subject").value);localStorage.setItem("v3mail",$("mail").value);hide();alert("Ajustes guardados")};
$("resetCfg").onclick=()=>{["v3keys","v3inst","v3maint","v3to","v3cc","v3subject","v3mail"].forEach(k=>localStorage.removeItem(k));hide();alert("Ajustes restaurados")}}
function render(){
 const n=s=>agenda.filter(x=>x.state===s).length;
 $("stats").innerHTML=`<div class="stats"><div class="stat"><b>${agenda.length}</b><span class="tiny">Citas</span></div><div class="stat"><b>${n("Pendiente")}</b><span class="tiny">Pendientes</span></div><div class="stat"><b>${n("Confirmada")}</b><span class="tiny">Confirmadas</span></div><div class="stat"><b>${n("Cancelada")}</b><span class="tiny">Canceladas</span></div></div>`;
 const filters=["Todas","Pendientes","Confirmadas","Canceladas","Ignoradas"];
 $("tabs").innerHTML=filters.map(f=>`<button class="tab ${filter===f?"on":""}" data-f="${f}">${f}</button>`).join("");
 document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{filter=b.dataset.f;render()});
 $("ignored").innerHTML=filter==="Ignoradas"?`<div class="box">${ignored.length?ignored.map(x=>`<div style="margin:7px 0"><b>${x.time}</b> · ${x.type}</div>`).join(""):"No hay citas ignoradas."}</div>`:(ignored.length?`<div class="box"><details><summary>${ignored.length} citas ignoradas</summary>${ignored.map(x=>`<div class="tiny" style="margin-top:7px">${x.time} · ${x.type}</div>`).join("")}</details></div>`:"");
 let list=agenda;
 if(filter==="Pendientes")list=agenda.filter(x=>x.state==="Pendiente");
 if(filter==="Confirmadas")list=agenda.filter(x=>x.state==="Confirmada");
 if(filter==="Canceladas")list=agenda.filter(x=>x.state==="Cancelada");
 if(filter==="Ignoradas")list=[];
 $("results").innerHTML="";
 list.forEach(x=>{let d=document.createElement("article"),sc=x.state==="Pendiente"?"pending":x.state==="Confirmada"?"confirmed":"cancelled";d.className="card "+(x.issues.length?"issue ":"")+(x.prepared?"prepared":"");
 d.innerHTML=`<div class="top"><span class="tag">${x.kind}</span><button class="state ${sc} st">${x.state}</button></div><h2>${x.time} · ${x.city||"Revisar población"}</h2><div>${x.type}</div><div class="muted">Prospecto: ${x.mto||"—"} · ${x.tel||"Sin teléfono"}</div><div style="margin-top:8px">📍 ${x.address||"Dirección no detectada"} ${x.cp||""}</div>${x.prepared?'<div class="pill" style="margin-top:8px">✓ WhatsApp preparado</div>':""}${x.issues.map(i=>`<div class="pill" style="background:#fff0c9;margin-top:8px">⚠️ ${i}</div>`).join("")}<div class="actions"><button class="green w">WhatsApp</button><button class="soft call">Llamar</button><button class="soft maps">Maps</button></div><div class="row"><button class="soft edit">Editar</button><button class="soft more">Más ⋯</button></div>`;
 d.querySelector(".st").onclick=()=>states(x);d.querySelector(".w").onclick=()=>wa(x);d.querySelector(".call").onclick=()=>location.href="tel:"+x.tel;d.querySelector(".maps").onclick=()=>location.href="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent([x.address,x.cp,x.city].filter(Boolean).join(", "));d.querySelector(".edit").onclick=()=>edit(x);d.querySelector(".more").onclick=()=>more(x);$("results").appendChild(d)});
 let next=agenda.find(x=>x.state==="Pendiente"&&!x.issues.length&&!x.prepared);$("next").classList.toggle("hidden",!next);$("next").onclick=()=>next&&wa(next);
}
$("settings").onclick=settings;$("mclose").onclick=hide;$("modal").onclick=e=>{if(e.target===$("modal"))hide()};
$("manualBtn").onclick=()=>$("manual").classList.toggle("hidden");$("process").onclick=()=>parseAgenda($("raw").value);
$("paste").onclick=async()=>{try{$("raw").value=await navigator.clipboard.readText();parseAgenda($("raw").value)}catch(e){alert("Mantén pulsado en el cuadro y toca Pegar.")}};
$("newAgenda").onclick=()=>{if(confirm("¿Borrar la agenda guardada y sus estados?")){agenda=[];ignored=[];save();$("manual").classList.remove("hidden");render()}};
let q=new URLSearchParams(location.search),shared=q.get("text")||[q.get("title"),q.get("url")].filter(Boolean).join("\n");
if(shared){$("raw").value=shared;parseAgenda(shared);history.replaceState({},"","./")}else{if(!agenda.length)$("manual").classList.remove("hidden");render()}
if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js");
