export class DownloadManagerUI{constructor(e={}){this.config=e,this.panel=null,this.elements={}}createPanel(){if(this.panel)return this.panel;const e=document.getElementById("skool-download-manager");return e?(this.panel=e,this.cacheElements(),this.bindEvents(),this.panel):(this.panel=document.createElement("div"),this.panel.id="skool-download-manager",this.panel.style.cssText=this.generatePanelStyles(),this.panel.innerHTML=this.generatePanelHTML(),document.querySelector(this.config.integration?.parentSelector||"body").appendChild(this.panel),this.cacheElements(),this.bindEvents(),this.panel)}generatePanelStyles(){const t=typeof window<"u"&&window.innerWidth<500?Math.min(window.innerWidth-40,340):380,o=typeof window<"u"?Math.min(window.innerHeight-80,500):500;return`
      position: fixed;
      top: 20px;
      right: 20px;
      width: ${t}px;
      max-height: ${o}px;
      background: #1b1b1b;
      border: 2px solid #007acc;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      z-index: 2147483647;
      isolation: isolate;
      pointer-events: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      color: #fff;
      overflow: hidden;
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `}getPositionStyles(e){switch(e){case"right":return"top: 20px; right: 20px;";case"left":return"top: 20px; left: 20px;";case"top":return"top: 20px; left: 50%; transform: translateX(-50%);";case"bottom":return"bottom: 20px; left: 50%; transform: translateX(-50%);";default:return"top: 20px; right: 20px;"}}generatePanelHTML(){const e=this.config.integration?.cssPrefix||"dm",t=this.config.labels||{},o=this.config.behavior||{},n=typeof window<"u"?Math.min(window.innerHeight-80,500):500;return`
      <div id="${e}-download-manager-header" style="
        background: linear-gradient(135deg, #333, #222);
        color: white;
        padding: 8px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: bold;
        cursor: pointer;
        user-select: none;
        border-bottom: 1px solid #444;
      ">
        <div id="${e}-download-manager-title">📥 Downloads (0 active)</div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button id="${e}-download-manager-cancel-all" title="Cancel all active downloads" style="
            background: #d32f2f;
            border: none;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            transition: background 0.2s ease;
            display: none;
          " onmouseover="this.style.background='#b71c1c'" onmouseout="this.style.background='#d32f2f'">Cancel All</button>
          <button id="${e}-download-manager-clear" title="Clear completed" style="
            background: #007acc;
            border: none;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            transition: background 0.2s ease;
          " onmouseover="this.style.background='#005a99'" onmouseout="this.style.background='#007acc'">Clear</button>
          <button id="${e}-download-manager-collapse" title="Collapse" style="
            background: rgba(255,255,255,0.1);
            border: none;
            color: white;
            font-size: 16px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
            border-radius: 3px;
            transition: background 0.2s ease;
          " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">−</button>
        </div>
      </div>
      <div id="${e}-download-manager-content" style="
        max-height: ${n-50}px;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: #666 transparent;
        background: #1b1b1b;
      "></div>
      <style>
        #${e}-download-manager-content::-webkit-scrollbar {
          width: 6px;
        }
        #${e}-download-manager-content::-webkit-scrollbar-track {
          background: #1b1b1b;
        }
        #${e}-download-manager-content::-webkit-scrollbar-thumb {
          background: #666;
          border-radius: 3px;
        }
        #${e}-download-manager-content::-webkit-scrollbar-thumb:hover {
          background: #888;
        }
      </style>
    `}generateContentStyles(){return""}cacheElements(){const e=this.config.integration?.cssPrefix||"dm";this.elements={header:this.panel.querySelector(`#${e}-download-manager-header`),title:this.panel.querySelector(`#${e}-download-manager-title`),content:this.panel.querySelector(`#${e}-download-manager-content`),downloadsList:this.panel.querySelector(`#${e}-download-manager-content`),collapseBtn:this.panel.querySelector(`#${e}-download-manager-collapse`),clearBtn:this.panel.querySelector(`#${e}-download-manager-clear`),cancelAllBtn:this.panel.querySelector(`#${e}-download-manager-cancel-all`)}}bindEvents(){this.elements.header?this.elements.header.addEventListener("click",n=>{n.target.tagName!=="BUTTON"&&this.toggleCollapsed()}):console.error("❌ Header not found!"),this.elements.collapseBtn?this.elements.collapseBtn.addEventListener("click",n=>{n.stopPropagation(),this.toggleCollapsed()}):console.error("❌ Collapse button not found!");const e=this.config.integration?.cssPrefix||"dm",t=`${e}-download-manager-clear`,o=`${e}-download-manager-cancel-all`;if(this.elements.clearBtn)this.elements.clearBtn.addEventListener("click",n=>{n.stopPropagation(),this.emit("clearCompleted")});else{console.error("❌ Clear button not found!"),console.error("❌ Tried selector:",`#${t}`);const n=document.querySelector(`#${t}`);console.error("❌ Element exists in DOM:",!!n)}if(this.elements.cancelAllBtn)this.elements.cancelAllBtn.addEventListener("click",n=>{n.stopPropagation(),this.emit("cancelAll")});else{console.error("❌ Cancel all button not found!"),console.error("❌ Tried selector:",`#${o}`);const n=document.querySelector(`#${o}`);console.error("❌ Element exists in DOM:",!!n)}this.elements.content?this.elements.content.addEventListener("click",n=>{const l=n.target;if(l.classList.contains("cancel-download-btn")){const s=l.getAttribute("data-download-id");n.stopPropagation(),this.emit("cancelDownload",s)}if(l.classList.contains("remove-download-btn")){const s=l.getAttribute("data-download-id");n.stopPropagation(),n.preventDefault(),this.emit("removeDownload",s)}}):console.error("❌ Content element not found for event delegation!")}showPanel(){this.panel||this.createPanel();const e=this.config.ui?.position||"right";this.panel.style.transform="translateX(0)",this.panel.style.opacity="1",this.emit("panelShown")}hidePanel(){if(!this.panel)return;const e=this.config.ui?.position||"right",t=e==="right"?"translateX(100%)":e==="left"?"translateX(-100%)":"translateY(-100%)";this.panel.style.transform=t,this.panel.style.opacity="0",this.emit("panelHidden")}toggleCollapsed(){const e=!this._isCollapsed;return this.setCollapsed(e),this.emit("collapseToggled",e),e}setCollapsed(e){this._isCollapsed=!!e,this.elements.content&&(this._isCollapsed?this.elements.content.style.display="none":this.elements.content.style.display="block",this.elements.collapseBtn&&(this.elements.collapseBtn.textContent=this._isCollapsed?"+":"−",this.elements.collapseBtn.title=this._isCollapsed?"Expand":"Collapse"))}updateHeader(e){if(!this.elements.title)return;const t=this.config.labels||{},o=t.title||"📥 Downloads",n=e.active>0?(t.activeDownloads||"({count} active)").replace("{count}",e.active):t.noActiveDownloads||"(0 active)";if(this.elements.title.textContent=`${o} ${n}`,this.elements.collapseBtn&&(this.elements.collapseBtn.textContent=this._isCollapsed?"+":"−",this.elements.collapseBtn.title=this._isCollapsed?"Expand":"Collapse"),this.elements.clearBtn){const l=e.completed>0||e.cancelled>0||e.failed>0;this.elements.clearBtn.style.display=l?"block":"none"}this.elements.cancelAllBtn&&(this.elements.cancelAllBtn.style.display=e.active>0?"block":"none")}updateDownloadItem(e,t){if(!this.elements.downloadsList)return;let o=document.getElementById(`download-item-${e}`);const n=!o;o||(o=document.createElement("div"),o.id=`download-item-${e}`,o.style.cssText=`
        padding: 8px 12px;
        border-bottom: 1px solid #333;
        background: #1b1b1b;
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateY(-10px);
      `,this.elements.downloadsList.appendChild(o),this.buildDownloadItemSkeleton(o,e),requestAnimationFrame(()=>{o.style.opacity="1",o.style.transform="translateY(0)"})),this.updateDownloadItemInPlace(o,t)}populateDownloadItem(e,t){const o=Math.round(t.progress||0),n=o>=100||t.isCompleted,l=t.isCancelled||t.status?.toLowerCase().includes("cancelled")||t.status?.toLowerCase().includes("canceled"),s=t.status?.toLowerCase().includes("failed")||t.status?.toLowerCase().includes("error")||t.status?.toLowerCase().includes("interrupted"),c=n||l||s,p=t.filename||"Unknown",d=t.downloaded||0,i=t.total||0,h=t.status||"Downloading...",r=u=>{if(u===0)return"0 B";const a=1024,m=["B","KB","MB","GB"],f=Math.floor(Math.log(u)/Math.log(a));return parseFloat((u/Math.pow(a,f)).toFixed(2))+" "+m[f]},b=r(d),x=i>0?r(i):"Unknown",w=d===0&&i===0;e.innerHTML=`
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 500; color: ${c?s?"#f44336":n?"#4caf50":"#ff9800":"#fff"}; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${s?"❌":n?"✅":l?"🚫":"🎬"} ${p}
          </div>
        </div>
${c?`<button data-download-id="${e.id.replace("download-item-","")}" class="remove-download-btn"
                   style="background: none; border: none; color: #ccc; font-size: 14px; cursor: pointer; padding: 2px 4px; border-radius: 2px; margin-left: 8px; flex-shrink: 0; transition: all 0.2s ease;"
                   onmouseover="this.style.background='#333'; this.style.color='#fff'" 
                   onmouseout="this.style.background='none'; this.style.color='#ccc'"
                   title="Remove from list">×</button>`:`<button data-download-id="${e.id.replace("download-item-","")}" class="cancel-download-btn"
                   style="background: #d32f2f; border: none; color: #fff; font-size: 10px; cursor: pointer; padding: 2px 6px; border-radius: 3px; margin-left: 8px; flex-shrink: 0; transition: all 0.2s ease; font-weight: 500;"
                   onmouseover="this.style.background='#b71c1c'" 
                   onmouseout="this.style.background='#d32f2f'"
                   title="Cancel active download">STOP</button>`}
      </div>
      
      <div style="margin-bottom: 6px;">
        <div style="background: #333; border-radius: 10px; height: 4px; overflow: hidden;">
          <div style="background: ${s?"#f44336":l?"#ff9800":n?"#4caf50":"#007acc"}; height: 100%; width: ${o}%; transition: all 0.3s ease;"></div>
        </div>
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #ccc;">
        <span>${o}%</span>
        <span style="text-align: right; flex: 1; margin-left: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${w?h:`${b}${i>0?` / ${x}`:""}`}
        </span>
      </div>
    `}buildDownloadItemSkeleton(e,t){const o=document.createElement("div");o.style.cssText="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;";const n=document.createElement("div");n.style.cssText="flex: 1; min-width: 0;";const l=document.createElement("div");l.dataset.role="title",l.style.cssText="font-weight: 500; color: #fff; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",n.appendChild(l);const s=document.createElement("button");s.dataset.role="action",s.setAttribute("data-download-id",t),s.className="cancel-download-btn",s.textContent="STOP",s.style.cssText="background: #d32f2f; border: none; color: #fff; font-size: 10px; cursor: pointer; padding: 2px 6px; border-radius: 3px; margin-left: 8px; flex-shrink: 0; transition: all 0.2s ease; font-weight: 500;",s.onmouseover=function(){this.style.background="#b71c1c"},s.onmouseout=function(){this.style.background="#d32f2f"},o.appendChild(n),o.appendChild(s);const c=document.createElement("div");c.style.cssText="margin-bottom: 6px;";const p=document.createElement("div");p.style.cssText="background: #333; border-radius: 10px; height: 4px; overflow: hidden;";const d=document.createElement("div");d.dataset.role="progress-fill",d.style.cssText="background: #007acc; height: 100%; width: 0%; transition: all 0.3s ease;",p.appendChild(d),c.appendChild(p);const i=document.createElement("div");i.style.cssText="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #ccc;";const h=document.createElement("span");h.dataset.role="percent",h.textContent="0%";const r=document.createElement("span");r.dataset.role="details",r.style.cssText="text-align: right; flex: 1; margin-left: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",r.textContent="Starting...",i.appendChild(h),i.appendChild(r),e.appendChild(o),e.appendChild(c),e.appendChild(i)}updateDownloadItemInPlace(e,t){const o=Math.round(t.progress||0),n=o>=100||t.isCompleted,l=t.isCancelled||t.status?.toLowerCase?.().includes("cancelled")||t.status?.toLowerCase?.().includes("canceled"),s=t.status?.toLowerCase?.().includes("failed")||t.status?.toLowerCase?.().includes("error")||t.status?.toLowerCase?.().includes("interrupted"),c=n||l||s,p=t.filename||"Unknown",d=t.downloaded||0,i=t.total||0,h=t.status||"Downloading...",r=g=>{if(g===0)return"0 B";const v=1024,k=["B","KB","MB","GB"],C=Math.floor(Math.log(g)/Math.log(v));return parseFloat((g/Math.pow(v,C)).toFixed(2))+" "+k[C]},b=r(d),x=i>0?r(i):"Unknown",w=d===0&&i===0,u=e.querySelector('[data-role="title"]'),a=e.querySelector('[data-role="action"]'),m=e.querySelector('[data-role="progress-fill"]'),f=e.querySelector('[data-role="percent"]'),y=e.querySelector('[data-role="details"]');if(u){u.style.color=c?s?"#f44336":n?"#4caf50":"#ff9800":"#fff";const g=s?"❌":n?"✅":l?"🚫":"🎬";u.textContent=`${g} ${p}`}a&&(a.setAttribute("data-download-id",e.id.replace("download-item-","")),c?(a.className="remove-download-btn",a.textContent="×",a.title="Remove from list",a.style.background="none",a.style.color="#ccc",a.style.fontSize="14px",a.onmouseover=function(){this.style.background="#333",this.style.color="#fff"},a.onmouseout=function(){this.style.background="none",this.style.color="#ccc"}):(a.className="cancel-download-btn",a.textContent="STOP",a.title="Cancel active download",a.style.background="#d32f2f",a.style.color="#fff",a.style.fontSize="10px",a.onmouseover=function(){this.style.background="#b71c1c"},a.onmouseout=function(){this.style.background="#d32f2f"})),m&&(m.style.width=`${o}%`,m.style.background=s?"#f44336":l?"#ff9800":n?"#4caf50":"#007acc"),f&&(f.textContent=`${o}%`),y&&(y.textContent=w?h:`${b}${i>0?` / ${x}`:""}`)}removeDownloadItem(e){if(this.elements.downloadsList&&(this.removalInProgress||(this.removalInProgress=new Set),!this.removalInProgress.has(e))){this.removalInProgress.add(e);try{const t=this.elements.downloadsList.querySelector(`#download-item-${e}`);t&&t.remove()}finally{setTimeout(()=>{this.removalInProgress.delete(e)},100)}}}truncateFilename(e,t=35){if(!e||e.length<=t)return e;const o=e.substring(e.lastIndexOf("."));return e.substring(0,e.lastIndexOf(".")).substring(0,t-o.length-3)+"..."+o}on(e,t){this._listeners||(this._listeners=new Map),this._listeners.has(e)||this._listeners.set(e,new Set),this._listeners.get(e).add(t)}emit(e,...t){if(!this._listeners)return;const o=this._listeners.get(e);o&&o.forEach(n=>{try{n(...t)}catch(l){console.error(`🎨 Error in UI event listener for ${e}:`,l)}})}destroy(){this.panel&&(this.panel.remove(),this.panel=null),this.elements={},this._listeners&&this._listeners.clear()}}
