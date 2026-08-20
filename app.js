/* ============================================================
   ROLE / SESSION STATE  (client-side simulation, no backend)
   ============================================================ */
const USERS = {
  HR:  { pass:'123', role:'admin',    name:'Abrish Malik',   title:'Head HR', initials:'AM' },
  EMP: { pass:'123', role:'employee', name:'Bilal Hussain',  title:'Machine Shop Operative',    initials:'BH' },
};
let CURRENT_ROLE = localStorage.getItem('hmc_role') || 'admin';
let CURRENT_USERNAME = localStorage.getItem('hmc_username') || 'HR';

/* ============================================================
   DISPLAYED NAME OVERRIDE — this portal may be used by different
   people signing in under the same shared account (e.g. "HR").
   The header name/title/initials shown for the current session
   are editable per-username, per-browser, without touching the
   fixed USERS login records. Falls back to the USERS record when
   no override has been set yet.
   ============================================================ */
const LS_NAME_OVERRIDES = 'hmc_display_name_overrides_v1';
function loadNameOverrides(){
  try{ const raw = localStorage.getItem(LS_NAME_OVERRIDES); if(raw) return JSON.parse(raw); }catch(e){}
  return {};
}
function saveNameOverrides(o){ localStorage.setItem(LS_NAME_OVERRIDES, JSON.stringify(o)); }
function initialsFromName(name){
  const parts = String(name||'').trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return '--';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}
function getDisplayName(username){
  const ov = loadNameOverrides();
  if(ov[username] && ov[username].name) return ov[username].name;
  const u = USERS[username] || USERS.HR;
  return u.name;
}
function getDisplayTitle(username){
  const ov = loadNameOverrides();
  if(ov[username] && ov[username].title) return ov[username].title;
  const u = USERS[username] || USERS.HR;
  return u.title;
}
function getDisplayInitials(username){
  const ov = loadNameOverrides();
  if(ov[username] && ov[username].name) return initialsFromName(ov[username].name);
  const u = USERS[username] || USERS.HR;
  return u.initials;
}

function applyUserChip(){
  const nameEl = document.getElementById('userName');
  const roleEl = document.getElementById('userRole');
  const avEl = document.getElementById('userAvatar');
  if(nameEl) nameEl.textContent = getDisplayName(CURRENT_USERNAME);
  if(roleEl) roleEl.textContent = getDisplayTitle(CURRENT_USERNAME);
  if(avEl) avEl.textContent = getDisplayInitials(CURRENT_USERNAME);
}

/* ---------- Edit-your-name modal ---------- */
function closeNameEditModal(){ const r=document.getElementById('nameEditModalRoot'); if(r) r.innerHTML=''; }
function openNameEditModal(){
  const root = document.getElementById('nameEditModalRoot') || (function(){ const d=document.createElement('div'); d.id='nameEditModalRoot'; document.body.appendChild(d); return d; })();
  const curName = getDisplayName(CURRENT_USERNAME);
  const curTitle = getDisplayTitle(CURRENT_USERNAME);
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closeNameEditModal()">
    <div class="modal-box" style="max-width:380px;">
      <div class="modal-head"><h3>Your Name & Title</h3><button class="modal-close" onclick="closeNameEditModal()">✕</button></div>
      <div class="modal-body">
        <p style="font-size:12.5px;color:var(--steel-500);margin:0 0 12px;">This portal may be used by different people. Set the name and title shown in the header for your session — it's saved on this device/browser.</p>
        <div class="form-row"><label>Your Name</label><input type="text" id="neFullName" value="${escapeHtml(curName)}" placeholder="e.g. Ayesha Malik" onkeydown="if(event.key==='Enter'){ event.preventDefault(); saveNameEdit(); }" /></div>
        <div class="form-row"><label>Your Title / Designation</label><input type="text" id="neTitle" value="${escapeHtml(curTitle)}" placeholder="e.g. Head HR" onkeydown="if(event.key==='Enter'){ event.preventDefault(); saveNameEdit(); }" /></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" onclick="closeNameEditModal()">Cancel</button>
        <button class="btn btn-solid btn-sm" onclick="saveNameEdit()">${ic('edit')} Save</button>
      </div>
    </div>
  </div>`;
  setTimeout(()=>{ const el=document.getElementById('neFullName'); if(el){ el.focus(); el.select(); } }, 30);
}
function saveNameEdit(){
  const name = document.getElementById('neFullName').value.trim();
  const title = document.getElementById('neTitle').value.trim();
  if(!name){ toast('Name cannot be empty.', 'error'); return; }
  const ov = loadNameOverrides();
  ov[CURRENT_USERNAME] = { name, title: title || 'Head HR' };
  saveNameOverrides(ov);
  applyUserChip();
  closeNameEditModal();
  toast('Your displayed name has been updated.');
}

/* ============================================================
   LOCAL STORAGE DATA LAYER — tasks, notifications, employees
   ============================================================ */
const LS_TASKS = 'hmc_tasks_v1';
const LS_NOTIFS = 'hmc_notifs_v1';
const LS_REMINDED = 'hmc_reminded_v1';

/* Task Bar assignment must resolve against the Employee & Roles master list —
   no standalone employee list is maintained here. */

function loadTasks(){
  try{
    const raw = localStorage.getItem(LS_TASKS);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  const now = Date.now();
  const seed = [
    { id:'T-1001', title:'Finalize FY2025-26 Appraisal Forms', desc:'Compile and validate all line-manager appraisal submissions before the review cycle deadline.', assignedBy:'Abrish Malik', assignedTo:'HMC-1001', priority:'urgent', status:'pending', deadline:new Date(now+1000*60*60*3).toISOString(), createdAt:new Date(now-1000*60*60*20).toISOString() },
    { id:'T-1002', title:'Update Overtime SOP Circular', desc:'Revise the overtime policy circular per the latest management directive and route for sign-off.', assignedBy:'Abrish Malik', assignedTo:'HMC-1002', priority:'normal', status:'in-progress', deadline:new Date(now+1000*60*60*24*2).toISOString(), createdAt:new Date(now-1000*60*60*40).toISOString() },
    { id:'T-1003', title:'Archive Q1 Attendance Registers', desc:'Scan and archive Q1 biometric attendance registers for the Foundry division.', assignedBy:'Abrish Malik', assignedTo:'HMC-1003', priority:'low', status:'completed', deadline:new Date(now-1000*60*60*24*2).toISOString(), createdAt:new Date(now-1000*60*60*24*6).toISOString() },
    { id:'T-1004', title:'Shortlist Candidates — Mechanical Engineer', desc:'Screen the latest applicant pool and prepare a shortlist for panel interviews.', assignedBy:'Abrish Malik', assignedTo:'HMC-1001', priority:'urgent', status:'pending', deadline:new Date(now+1000*60*45).toISOString(), createdAt:new Date(now-1000*60*60*2).toISOString() },
  ];
  saveTasks(seed);
  return seed;
}
function saveTasks(tasks){ localStorage.setItem(LS_TASKS, JSON.stringify(tasks)); }

function loadNotifs(){
  try{
    const raw = localStorage.getItem(LS_NOTIFS);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  const seed = [];
  saveNotifs(seed);
  return seed;
}
function saveNotifs(list){ localStorage.setItem(LS_NOTIFS, JSON.stringify(list)); }

function addNotif(taskOrMsg, priority, type){
  const list = loadNotifs();
  const n = {
    id:'N-'+Date.now()+'-'+Math.floor(Math.random()*1000),
    message: typeof taskOrMsg === 'string' ? taskOrMsg : taskOrMsg.title,
    taskId: typeof taskOrMsg === 'object' ? taskOrMsg.id : null,
    priority: priority || 'normal',
    type: type || 'task',
    time: new Date().toISOString(),
    read:false,
  };
  list.unshift(n);
  saveNotifs(list);
  /* Training announcements have their own dedicated sound switch (Alert
     Sound toggle on the Training Announcements page) instead of only the
     general task/notification sound switch. */
  if(n.type==='training'){ if(TRAIN_SOUND_ENABLED) playBuzzer(n.priority, true); }
  else { playBuzzer(n.priority); }
  return n;
}

function unreadNotifCount(){
  return loadNotifs().filter(n=>!n.read).length;
}
function refreshBellBadge(){
  const el = document.getElementById('notifBellCount');
  if(!el) return;
  const c = unreadNotifCount();
  if(c>0){ el.style.display='flex'; el.textContent = c>99?'99+':c; }
  else{ el.style.display='none'; }
}

let SOUND_ENABLED = localStorage.getItem('hmc_sound') !== 'off';
function toggleSound(){
  SOUND_ENABLED = !SOUND_ENABLED;
  localStorage.setItem('hmc_sound', SOUND_ENABLED?'on':'off');
  renderRoute();
}
/* Training Announcements gets its own dedicated alert-sound switch (separate
   from the general task/notification sound) so it keeps buzzing for training
   news even if the general sound was turned off, or vice versa. */
let TRAIN_SOUND_ENABLED = localStorage.getItem('hmc_train_sound') !== 'off';
function toggleTrainSound(){
  TRAIN_SOUND_ENABLED = !TRAIN_SOUND_ENABLED;
  localStorage.setItem('hmc_train_sound', TRAIN_SOUND_ENABLED?'on':'off');
  renderRoute();
}

/* ============================================================
   DARK / LIGHT THEME
   ============================================================ */
function applyTheme(theme){
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark-theme', isDark);
  const sun = document.getElementById('themeIconSun');
  const moon = document.getElementById('themeIconMoon');
  if(sun) sun.style.display = isDark ? 'none' : '';
  if(moon) moon.style.display = isDark ? '' : 'none';
  const btn = document.getElementById('themeToggleBtn');
  if(btn) btn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
}
function toggleTheme(){
  const current = localStorage.getItem('hmc_theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('hmc_theme', next);
  applyTheme(next);
}
/* Apply saved theme immediately (before first paint of the shell) to avoid a flash. */
applyTheme(localStorage.getItem('hmc_theme') || 'light');

/* Browsers keep a brand-new AudioContext suspended until it's resumed inside
   a real user-gesture handler. Warm one up on the very first click anywhere
   in the app so the first buzzer (e.g. the first training announcement)
   isn't silently dropped. */
let AUDIO_UNLOCKED = false;
function unlockAudioOnce(){
  if(AUDIO_UNLOCKED) return;
  AUDIO_UNLOCKED = true;
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    if(ctx.state === 'suspended') ctx.resume();
    setTimeout(()=>ctx.close(), 200);
  }catch(e){}
  try{
    /* Also silently prime an <audio> element so the very first real buzzer
       (e.g. the first training announcement) isn't the browser's first-ever
       audio playback attempt on this page. */
    const a = new Audio();
    a.volume = 0;
    const p = a.play();
    if(p && typeof p.catch === 'function') p.catch(()=>{});
  }catch(e){}
  document.removeEventListener('click', unlockAudioOnce, true);
}
document.addEventListener('click', unlockAudioOnce, true);

function playBuzzer(priority, forceOn){
  if(!forceOn && !SOUND_ENABLED) return;
  const sounds = {
    urgent: 'data:audio/wav;base64,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',
    low: 'data:audio/wav;base64,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',
    normal: 'data:audio/wav;base64,UklGRvw4AABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0Ydg4AAAAABAAQQCPAPMAaAHjAVwCxwIcA1EDXQM7A+cCXwKlAbwArP99/jz99fu3+pL5lfjP90z3F/c497X3jvjB+Uf7Ff0e/1ABlwPeBQ4IDwrKCywNIg6dDpIO/A3aDDELDAl4BowDXwAO/bb5d/Zy88bwj+7m7OHrjuv46yDtAe+R8bz0afh7/MwAOAWWCbsNgRG/FFYXJhkbGiYaPxloF64UIxHjDBEI1gJh/eL3jPKS7SPpbeWW4rzg+N9V4Njhd+Qi6LzsHvId+IT+GAWgC94RmReXHKggoiNkJdgl8yS5IjYfhRrMFDsOCwd7/833SfA06dDiXN0O2RHWh9SE1A3WHNmb3WXjTOoT8nn6MAPtC14UNhwpI/YoYy1DMHQx6DCbLp0qDSUXHvcV8gxYA4D5wO9z5vDdhtZ+0BLMcMm3yPPJH80l0tvYDOFw6rX0gf9yCicVOx9SKBUwOzaFOsc85zzeOrc2kzCjKCsffBT1CP38/vBm5aDaENERye/C574lvb29scDsxUXNf9ZJ4UftDvorBykUkSDxK941+z35Q5xHvkhOR1ND6zxJNLkpkx1FEEICC/Qe5vzYOs1aw527SbaPs4ezMrZ3uybD+8yd2KLllfP4AUkQCB63KuU1LD85RsxKu0z2S4NIgkIoOsEvqiNSFjAIxvmS6xfeztEmx4C+KbhatDazyLQBubq/uMip0yvgy+0R/HgKghivJYgxoTugQz1JREybTD5KQ0XXPTw0yijnGwkOrP9S8X3jqNZJy8bBdbqYtVqz0LP3trC8ycT5zuTaHegu9pcE2BJuIN8svDehQD9HWUvLTIhLm0coQWg4qy1SIcwTkwUp9w3pwdu8z2vFK71Gt/KzTLNbtQy6NMGTytXVk+Jb8LD+EA38GvMngjNAPdVE/EmHTGBMh0kWRD88RzKKJnEZcgsM/cHuEeF41GnJRsBiuf20PLMwtNG3/r1+xgbRNt2g6sr4NgdgFcoi+i6COQJCL0jQS8RMA0ueRro/lzaIK+8ePxH0Ao70j+Z22bnNwcPqu3m2oLN5swS2K7vAwn7MDdgE5fDyUAGlD20dKyptNcw+9EWlSrRMDky6SNVClTpEMD8k8xbXCG36NOyu3lXSmMfYvmW4eLQ1s6e0wbhfv0TIIdOS3yjtafvSCeMXHCUHMTc7UEMJSTBMpkxoSotFOj63NFgpgxyuDlQA9/EZ5DbXxMspwr26wrVls7yzw7ZgvF/EeM5R2n7niPXvAzUS1R9XLEg3RkD/RjhLykymS9dHgEHaODIu6SFuFDoG0Peu6VbcP9DYxX69fbcKtEWzNLXHudTAG8pJ1fjht+8I/msMXhpjJwUz2jyJRM5JeUxxTLdJY0SmPMYyGycPGhgMtP1l76vhA9XfyaTApbkhtUGzFrSYt6i9D8aB0KDc/ukj+I4GvxQ0InUuEjmsQfVHtEvITCdL30YXQA03EiyJH+MRnAM19S7nCNo4zirEOLyqtrKza7PYteK6W8ICzH7XZ+RK8qgAAA/RHJ4p9DRrPq5FfUqrTCVM70gnQwE7xjDTJJMXfgkV+9fsRt/d0gvIMr+iuJe0NLOHtIO4Bb/Rx5nS+t6G7MH6KwlDF4kkhTDLOv5C1UgaTLBMkUrSRZw+MDXlKR8dUw/8AJ3ytuTF10DMjsIGu+61crOps5G2Ebz2w/jNv9nf5uH0SAORETwfzSvSNuk/vkYVS8ZMwksSSNdBSjm4Ln8iEBXiBnf4T+rr3MTQR8bTvbW3I7Q+sw+1hLl1wKTJvtRe4RPvYP3FC8AZ0yaHMnM8PUSfSWlMgEzlSa9EDT1DM6snrRq+DFz+CfBG4o/VV8oEwem5R7VIs/6zYbdUvaLF/s8L3F7pfPfnBR0UnSHuLaE4VEG5R5dLy0xJSx9Hc0CCN5ssIiCGEkME2/XN55rauc6UxIi83bbGs1+zrbWZuvjBh8vv1svjpfEAAFsONRwRKXk0CD5nRVNKoUw6TCNJeENsO0cxZiUzGCUKvft67d7fZdN+yI2/4bi3tDWzabRHuKy+X8cS0mPe4+sZ+oQIohb1IwIwXjqsQp9IAky4TLlKF0b8Pqk1cSq6HfcPpAFC81PlVdi9zPPCUbsbtoCzl7NhtsO7jcN5zS3ZQOY79KAC7RCiHkIrXDaLP3xG8UrCTN1LS0gtQrk5PC8VI7EViQce+fDqgd1I0bbGKb7utz60OrPrtEK5F8AuyTPUxOBv7rj8HwshGUEmCDIKPO9Db0lXTI5MEkr6RHI9wDM7KEobYw0E/63w4eIb1tDKZMEuum+1ULPmsyu3Ar01xXvPd9u96NX2PwV6EwYhZy0vOPtAfUd5S8xMaUteR85A9TcjLbogKRPrBIL2begt2zrP/8TZvBG327NVs4O1UrqVwQzLYtYv4wDxWP+2DZkbgij+M6U9HkUoSpVMTkxWSchD1jvIMfgl0hjLCmT8He534O7T88jpvyG52bQ4s0y0C7hUvu7Gi9HM3UHrcvndBwIWYCN/L/E5WEJoSOpLv0zfSltGXD8hNv0qVR6bEEwC6PPx5eXYOs1aw527SbaPs4ezMrZ3uybD+8yd2KLllfP4AUkQCB63KuU1LD85RsxKu0z2S4NIgkIoOsEvqiNSFjAIxvmS6xfeztEmx4C+KbhatDazyLQBubq/uMip0yvgy+0R/HgKghivJYgxoTugQz1JREybTD5KQ0XXPTw0yijnGwkOrP9S8X3jqNZJy8bBdbqYtVqz0LP3trC8ycT5zuTaHegu9pcE2BJuIN8svDehQD9HWUvLTIhLm0coQWg4qy1SIcwTkwUp9w3pwdu8z2vFK71Gt/KzTLNbtQy6NMGTytXVk+Jb8LD+EA38GvMngjNAPdVE/EmHTGBMh0kWRD88RzKKJnEZcgsM/cHuEeF41GnJRsBiuf20PLMwtNG3/r1+xgbRNt2g6sr4NgdgFcoi+i6COQJCL0jQS8RMA0ueRro/lzaIK+8ePxH0Ao70j+Z22bnNwcPqu3m2oLN5swS2K7vAwn7MDdgE5fDyUAGlD20dKyptNcw+9EWlSrRMDky6SNVClTpEMD8k8xbXCG36NOyu3lXSmMfYvmW4eLQ1s6e0wbhfv0TIIdOS3yjtafvSCeMXHCUHMTc7UEMJSTBMpkxoSotFOj63NFgpgxyuDlQA9/EZ5DbXxMspwr26wrVls7yzw7ZgvF/EeM5R2n7niPXvAzUS1R9XLEg3RkD/RjhLykymS9dHgEHaODIu6SFuFDoG0Peu6VbcP9DYxX69fbcKtEWzNLXHudTAG8pJ1fjht+8I/msMXhpjJwUz2jyJRM5JeUxxTLdJY0SmPMYyGycPGhgMtP1l76vhA9XfyaTApbkhtUGzFrSYt6i9D8aB0KDc/ukj+I4GvxQ0InUuEjmsQfVHtEvITCdL30YXQA03EiyJH+MRnAM19S7nCNo4zirEOLyqtrKza7PYteK6W8ICzH7XZ+RK8qgAAA/RHJ4p9DRrPq5FfUqrTCVM70gnQwE7xjDTJJMXfgkV+9fsRt/d0gvIMr+iuJe0NLOHtIO4Bb/Rx5nS+t6G7MH6KwlDF4kkhTDLOv5C1UgaTLBMkUrSRZw+MDXlKR8dUw/8AJ3ytuTF10DMjsIGu+61crOps5G2Ebz2w/jNv9nf5uH0SAORETwfzSvSNuk/vkYVS8ZMwksSSNdBSjm4Ln8iEBXiBnf4T+rr3MTQR8bTvbW3I7Q+sw+1hLl1wKTJvtRe4RPvYP3FC8AZ0yaHMnM8PUSfSWlMgEzlSa9EDT1DM6snrRq+DFz+CfBG4o/VV8oEwem5R7VIs/6zYbdUvaLF/s8L3F7pfPfnBR0UnSHuLaE4VEG5R5dLy0xJSx9Hc0CCN5ssIiCGEkME2/XN55rauc6UxIi83bbGs1+zrbWZuvjBh8vv1svjpfEAAFsONRwRKXk0CD5nRVNKoUw6TCNJeENsO0cxZiUzGCUKvft67d7fZdN+yI2/4bi3tDWzabRHuKy+X8cS0mPe4+sZ+oQIohb1IwIwXjqsQp9IAky4TLlKF0b8Pqk1cSq6HfcPpAFC81PlVdi9zPPCUbsbtoCzl7NhtsO7jcN5zS3ZQOY79KAC7RCiHkIrXDaLP3xG8UrCTN1LS0gtQrk5PC8VI7EViQce+fDqgd1I0bbGKb7utz60OrPrtEK5F8AuyTPUxOBv7rj8HwshGUEmCDIKPO9Db0lXTI5MEkr6RHI9wDM7KEobYw0E/63w4eIb1tDKZMEuum+1ULPmsyu3Ar01xXvPd9u96NX2PwV6EwYhZy0vOPtAfUd5S8xMaUteR85A9TcjLbogKRPrBIL2begt2zrP/8TZvBG327NVs4O1UrqVwQzLYtYv4wDxWP+2DZkbgij+M6U9HkUoSpVMTkxWSchD1jvIMfgl0hjLCmT8He534O7T88jpvyG52bQ4s0y0C7hUvu7Gi9HM3UHrcvndBwIWYCN/L/E5WEJoSOpLv0zfSltGXD8hNv0qVR6bEEwC6PPx5eXYOs1aw527SbaPs4ezMrZ3uybD+8yd2KLllfP4AUkQCB63KuU1LD85RsxKu0z2S4NIgkIoOsEvqiNSFjAIxvmS6xfeztEmx4C+KbhatDazyLQBubq/uMip0yvgy+0R/HgKghivJYgxoTugQz1JREybTD5KQ0XXPTw0yijnGwkOrP9S8X3jqNZJy8bBdbqYtVqz0LP3trC8ycT5zuTaHegu9pcE2BJuIN8svDehQD9HWUvLTIhLm0coQWg4qy1SIcwTkwUp9w3pwdu8z2vFK71Gt/KzTLNbtQy6NMGTytXVk+Jb8LD+EA38GvMngjNAPdVE/EmHTGBMh0kWRD88RzKKJnEZcgsM/cHuEeF41GnJRsBiuf20PLMwtNG3/r1+xgbRNt2g6sr4NgdgFcoi+i6COQJCL0jQS8RMA0ueRro/lzaIK+8ePxH0Ao70j+Z22bnNwcPqu3m2oLN5swS2K7vAwn7MDdgE5fDyUAGlD20dKyptNcw+9EWlSrRMDky6SNVClTpEMD8k8xbXCG36NOyu3lXSmMfYvmW4eLQ1s6e0wbhfv0TIIdOS3yjtafvSCeMXHCUHMTc7UEMJSTBMpkxoSotFOj63NFgpgxyuDlQA9/EZ5DbXxMspwr26wrVls7yzw7ZgvF/EeM5R2n7niPXvAzUS1R9XLEg3RkD/RjhLykymS9dHgEHaODIu6SFuFDoG0Peu6VbcP9DYxX69fbcKtEWzNLXHudTAG8pJ1fjht+8I/msMXhpjJwUz2jyJRM5JeUxxTLdJY0SmPMYyGycPGhgMtP1l76vhA9XfyaTApbkhtUGzFrSYt6i9D8aB0KDc/ukj+I4GvxQ0InUuEjmsQfVHtEvITCdL30YXQA03EiyJH+MRnAM19S7nCNo4zirEOLyqtrKza7PYteK6W8ICzH7XZ+RK8qgAAA/RHJ4p9DRrPq5FfUqrTCVM70gnQwE7xjDTJJMXfgkV+9fsRt/d0gvIMr+iuJe0NLOHtIO4Bb/Rx5nS+t6G7MH6KwlDF4kkhTDLOv5C1UgaTLBMkUrSRZw+MDXlKR8dUw/8AJ3ytuTF10DMjsIGu+61crOps5G2Ebz2w/jNv9nf5uH0SAORETwfzSvSNuk/vkYVS8ZMwksSSNdBSjm4Ln8iEBXiBnf4T+rr3MTQR8bTvbW3I7Q+sw+1hLl1wKTJvtRe4RPvYP3FC8AZ0yaHMnM8PUSfSWlMgEzlSa9EDT1DM6snrRq+DFz+CfBG4o/VV8oEwem5R7VIs/6zYbdUvaLF/s8L3F7pfPfnBR0UnSHuLaE4VEG5R5dLy0xJSx9Hc0CCN5ssIiCGEkME2/XN55rauc6UxIi83bbGs1+zrbWZuvjBh8vv1svjpfEAAFsONRwRKXk0CD5nRVNKoUw6TCNJeENsO0cxZiUzGCUKvft67d7fZdN+yI2/4bi3tDWzabRHuKy+X8cS0mPe4+sZ+oQIohb1IwIwXjqsQp9IAky4TLlKF0b8Pqk1cSq6HfcPpAFC81PlVdi9zPPCUbsbtoCzl7NhtsO7jcN5zS3ZQOY79KAC7RCiHkIrXDaLP3xG8UrCTN1LS0gtQrk5PC8VI7EViQce+fDqgd1I0bbGKb7utz60OrPrtEK5F8AuyTPUxOBv7rj8HwshGUEmCDIKPO9Db0lXTI5MEkr6RHI9wDM7KEobYw0E/63w4eIb1tDKZMEuum+1ULPmsyu3Ar01xXvPd9u96NX2PwV6EwYhZy0vOPtAfUd5S8xMaUteR85A9TcjLbogKRPrBIL2begt2zrP/8TZvBG327NVs4O1UrqVwQzLYtYv4wDxWP+2DZkbgij+M6U9HkUoSpVMTkxWSchD1jvIMfgl0hjLCmT8He534O7T88jpvyG52bQ4s0y0C7hUvu7Gi9HM3UHrcvndBwIWYCN/L/E5WEJoSOpLv0zfSltGXD8hNv0qVR6bEEwC6PPx5eXYOs1aw527SbaPs4ezMrZ3uybD+8yd2KLllfP4AUkQCB63KuU1LD85RsxKu0z2S4NIgkIoOsEvqiNSFjAIxvmS6xfeztEmx4C+KbhatDazyLQBubq/uMip0yvgy+0R/HgKghivJYgxoTugQz1JREybTD5KQ0XXPTw0yijnGwkOrP9S8X3jqNZJy8bBdbqYtVqz0LP3trC8ycT5zuTaHegu9pcE2BJuIN8svDehQD9HWUvLTIhLm0coQWg4qy1SIcwTkwUp9w3pwdu8z2vFK71Gt/KzTLNbtQy6NMGTytXVk+Jb8LD+EA38GvMngjNAPdVE/EmHTGBMh0kWRD88RzKKJnEZcgsM/cHuEeF41GnJRsBiuf20PLMwtNG3/r1+xgbRNt2g6sr4NgdgFcoi+i6COQJCL0jQS8RMA0ueRro/lzaIK+8ePxH0Ao70j+Z22bnNwcPqu3m2oLN5swS2K7vAwn7MDdgE5fDyUAGlD20dKyptNcw+9EWlSrRMDky6SNVClTpEMD8k8xbXCG36NOyu3lXSmMfYvmW4eLQ1s6e0wbhfv0TIIdOS3yjtafvSCeMXHCUHMTc7UEMJSTBMpkxoSotFOj63NFgpgxyuDlQA9/EZ5DbXxMspwr26wrVls7yzw7ZgvF/EeM5R2n7niPXvAzUS1R9XLEg3RkD/RjhLykymS9dHgEHaODIu6SFuFDoG0Peu6VbcP9DYxX69fbcKtEWzNLXHudTAG8pJ1fjht+8I/msMXhpjJwUz2jyJRM5JeUxxTLdJY0SmPMYyGycPGhgMtP1l76vhA9XfyaTApbkhtUGzFrSYt6i9D8aB0KDc/ukj+I4GvxQ0InUuEjmsQfVHtEvITCdL30YXQA03EiyJH+MRnAM19S7nCNo4zirEOLyqtrKza7PYteK6W8ICzH7XZ+RK8qgAAA/RHJ4p9DRrPq5FfUqrTCVM70gnQwE7xjDTJJMXfgkV+9fsRt/d0gvIMr+iuJe0NLOHtIO4Bb/Rx5nS+t6G7MH6KwlDF4kkhTDLOv5C1UgaTLBMkUrSRZw+MDXlKR8dUw/8AJ3ytuTF10DMjsIGu+61crOps5G2Ebz2w/jNv9nf5uH0SAORETwfzSvSNuk/vkYVS8ZMwksSSNdBSjm4Ln8iEBXiBnf4T+rr3MTQR8bTvbW3I7Q+sw+1hLl1wKTJvtRe4RPvYP3FC8AZ0yaHMnM8PUSfSWlMgEzlSa9EDT1DM6snrRq+DFz+CfBG4o/VV8oEwem5R7VIs/6zYbdUvaLF/s8L3F7pfPfnBR0UnSHuLaE4VEG5R5dLy0xJSx9Hc0CCN5ssIiCGEkME2/XN55rauc6UxIi83bbGs1+zrbWZuvjBh8vv1svjpfEAAFsONRwRKXk0CD5nRVNKoUw6TCNJeENsO0cxZiUzGCUKvft67d7fZdN+yI2/4bi3tDWzabRHuKy+X8cS0mPe4+sZ+oQIohb1IwIwXjqsQp9IAky4TLlKF0b8Pqk1cSq6HfcPpAFC81PlVdi9zPPCUbsbtoCzl7NhtsO7jcN5zS3ZQOY79KAC7RCiHkIrXDaLP3xG8UrCTN1LS0gtQrk5PC8VI7EViQce+fDqgd1I0bbGKb7utz60OrPrtEK5F8AuyTPUxOBv7rj8HwshGUEmCDIKPO9Db0lXTI5MEkr6RHI9wDM7KEobYw0E/63w4eIb1tDKZMEuum+1ULPmsyu3Ar01xXvPd9u96NX2PwV6EwYhZy0vOPtAfUd5S8xMaUteR85A9TcJLYEg8RLXBLP2BOlD3OPQRce9v4q61LeutxO65775xQPPr9ma5VPyaP9gDMgYMSQ3LoQ20DzpQK9CGEIxPxk6BDM4Kgcg0xQCCQL9PfEe5gbcT9NDzBzHBMQQw0PEjMfGzL7TL9zJ5TLwCfvrBXgQTxocI5EqcTCKNL02/jZPNcYxiizOJdQd6RRfC5AB1PeD7u7lYt4e2FfTMtDGzhrPJNHM1OvZTeC159zvdPgwAcAJ1xEvGYcfrCRyKL0qgCu4KnMozCTpH/0ZPxPyC1gEufxZ9XjuVOgg4wffKdyb2mTagNvf3WXh7uVK60fxqvc3/rME5AqUEJAVsRnUHOMe0h+dH00e9BuuGJwU6A/BClgF4f+L+of1APEe7f3pt+db5u7lb+bS5wbq7+xw8GP0o/gF/V8BjgVpCdIMqw/hEWMTKRQzFIYTLxJAENAN+grbB5QEQwEJ/gL7R/jv9Qz0qvLS8YTxvfF28qHzLvUJ9x75VfuX/c7/5QHLA28FxgbHB20IuQitCFAIqwfLBrwFjwRSAxMC4QDK/9T+Cv5v/Qj90/zN/PH8N/2Y/Qr+gf71/l3/sP/o/wAAFgBVALYALAGnARUCZQKGAmwCEAJuAY0AeP8+/vj8vvur+tv5Zfla+cj5sPoN/ND94f8fAmcEjwZvCOEJwwr7Cn0KRAlcB9oE4gGh/kn7Evg39evyXfGw8PrwQfJ79I33TPuB/+oDQAg5DI8PBhJqE5wTjRJDENoMgAh2Awn+j/hi89vuSOvt6PrniOib6hru1vKM+OP+dwXgC7IRixYUGgscRRy1GmgXihJgDEgFsf0R9ufuqejE443gRN8H4NXijefq7Y/1Bf7GBkYP+xZhHQoioyT2JPQish5qGHkQWAeY/dDzouqk4l7cPtiO1nfX89rV4MnoVvLn/NUHcxIRHBAk6CkxLa0tSSsgJnoeyxSnCb79zPGU5szcGtUA0NzN2c700vTZdOPh7ov7pwhlFfQglyqrMbU1aTayM7AtuSRVGTMMJP4G8L3iItf3zdbHLcUvxtnK69Lr3TLr7/k4CRsYpCX2MFM5LD4pPy48YjUmKxYe/Q7K/n3uHt+o0ffGwb+DvHu9pcK6yzDYR+cU+IsJlhogKis33kCVRupHvEQ0Pb8xDSMEEq//M+25213MHMDCt+CzvbSBusnExtKX4y72YgkBHN8s7zpPRVlLrUw0SShBCDWXJcwTxACw7cHbF8yrv0a3bbNftAy6GcTl0ZPiGfVMCPwa+ys6OtVEIUu6TIdJukHRNYom2hTcAcHuudzmzEbAoreFszC0mrlrwwbRkeEE9DYH9RkUK4I5V0TlSsRM1klJQpc2eyfnFfQC0u+z3bnN5MABuKCzBrQsucDCKtCR4PDyHgbsGCsqxzjVQ6VKykwhStVCWzdqKPMWCwTk8K7ejs6FwWW4v7Pfs8G4GcJQz5Lf3PEHBeMXQCkJOFBDYUrMTGhKXUMcOFgp/RcjBffxq99lzynCzLjis7yzW7h1wXjOld7J8O8D2BZTKEg3x0IaSspMrEriQ9o4QyoHGToGC/Oq4D/Q0cI3uQq0nbP4t9TApM2a3bfv2ALMFWMnhDY7Qs5Jw0zrSmNElDkrKw8aUQcg9KvhHNF8w6W5NbSCs5i3NsDRzKDcpe7AAb8Ucia9NaxBf0m5TCdL4URMOhIsFhtoCDX1reL70SrEF7pktGuzPbecvwLMqNuV7agAsRN+JfQ0GUEsSatMXktbRQE79iwbHH4JSvax493S28SNupe0WLPltgW/Ncuz2obskP+hEokkJzSDQNVImUySS9JFszvYLR8dlApg97bkwNOPxQa7zrRJs5G2cb5ryr/Zd+t4/pERkiNYM+k/ekiDTMJLREZhPLguIh6pC3f4vOWm1EfGg7sJtT6zQbbhvaTJzdhq6mD9gBCYIocyTD8cSGlM7ku0Rg09lS8iH74MjvnE5o/VAccEvEe1N7P1tVS938jd117pSPxuD50hsjGsPrlHS0wWTB9HtT1vMCIg0g2l+s3neda+x4i8irU0s621y7weyO/WUugx+1sOoSDcMAg+U0coTDpMh0daPkcxHyHlDr372Ohm137ID73QtTWzaLVFvF/HBNZJ5xn6SA2iHwIwYT3qRgJMWkzrR/w+HTIbIvcP1Pzk6VXYQcmavRu2OrMntcO7o8Ya1UDmAvkzDKIeJi+4PHxG2Ut2TEtImz/wMhUjCRHs/fDqRtkHyim+abZDs+u0RLvrxTPUOeXs9x8LoR1ILgo8C0arS45MqEg2QMAzDSQZEgT//us42tDKu767tlCzsrTJujXFTtMz5NX2CQqdHGctWjuXRXlLokwBSc5AjjQEJSkTHAAN7S3bm8tQvxG3YbN9tFK6gsRs0i/jv/XzCJkbhCynOh5FQ0uzTFZJY0FZNfglOBQ0AR3uJNxpzOm/ard2s0y03rnTw4vRLOKq9N0HkxqfK/E5o0QJS79Mp0n0QSE26yZGFUwCLu8d3TrNhcDIt4+zH7RtuSbDrdAq4ZXzxgaLGbcqNzkjRMxKx0z0SYJC5jbbJ1IWZANA8BfeDs4kwSm4rLP2swG5fcLSzyvggfKvBYIYzSl7OKBDikrLTD5KDEOoN8ooXhd7BFLxE9/kzsbBjrjNs9CzmLjXwfnOLd9u8ZcEeBfhKLw3GkNFSstMhEqTQ2g4tiloGJMFZvIR4LzPbML2uPKzr7MzuDTBI84w3lvwgANtFvMn+jaQQvxJyEzGShZEJTmgKnEZqgZ68xHhl9AVw2K5GrSSs9G3lMBPzTbdSe9oAmAVAyc1NgJCr0nATANLlkTeOYgreBrBB470EuJ10cHD0rlHtHmzc7f4v37MPdw47lABUxQRJm01cUFeSbRMPksSRZU6bSx/G9cIpPUV41XSccRGuni0Y7MZt1+/sMtG2yjtOABEExwlojTdQAlJpEx0S4tFSDtRLYMc7Qm59hnkN9Mjxb26rLRSs8O2yb7kylHaGewg/zUSJiTVM0ZAsUiQTKZLAEb5OzIuhx0DC9D3H+Uc1NjFOLvltEWzcbY3vhvKXtkL6wj+JBEuIwUzqz9VSHlM1EtxRqY8EC+JHhgM5vgm5gPVkca2uyG1O7Mitqi9Vclt2P7p8PwSEDQiMjIMP/VHXUz+S99GUT3sL4kfLA39+S7n7NVMxzi8YbU2s9i1Hb2SyH7X8+jZ+wAPOCFdMWs+kUc9TCVMSUf4PcYwhyBADhX7OOjY1gvIvrymtTSzkbWVvNHHkdbo58H67Q07IIUwxj0qRxpMR0yvR5w+nTGEIVMPLfxD6cXXzMhHve61N7NOtRG8FMem1d/mqvnZDDwfqy8ePb5G8ktmTBJIPD9yMn8iZRBE/U/qtdiQydO9OrY+sw+1kLtZxr7U1+WT+MULOx7OLnM8UEbHS4BMcUjZP0MzeSN2EVz+XOun2VfKY76Jtkiz07QTu6LF19PQ5Hz3sAo5He4txDvdRZdLl0zMSHNAEzRwJIYSdP9r7JraIcv2vt22V7OctJm67cTz0svjZvaaCTUcDS0TO2dFZEupTCNJCkHfNGYllROMAHrtkNvty42/NLdps2m0I7o8xBLSx+JQ9YQIMBspLF467UQtS7hMd0mdQak1WSakFKQBiu6H3L3MJ8CPt4CzObSwuY3DMtHF4Tv0bQcpGkIrpzlwRPFKwkzGSS1CcDZLJ7EVvAKb74Hdjs3EwO63mrMOtEK54sJV0MTgJ/NWBiEZWirsOO9DskrJTBJKuUI0NzsovRbTA63wfN5jzmTBUbi5s+az1rg6wnvPxd8T8j8FGBhvKS84a0NvSsxMWkpCQ/U3KCnIF+sEwPF53zrPCMK3uNuzw7NvuJXBo87I3gDxJwQNF4IobjfjQihKykyfSshDtDgUKtIYAwbU8nfgFNCvwiG5ArSjswu49MDOzczd7u8QAwIWkyerNlhC3knFTN9KSkRvOf0q2hkaB+jzd+Hw0FrDj7kstIezq7dVwPvM0tzc7vgB9RSiJuU1yUGPSbtMG0vIRCg65CvhGjAI/fR54s7RB8QAulq0cLNPt7q/K8za28vt4ADnE68lHDU3QT1JrkxUS0NF3TrJLOcbRwkT9n3jr9K4xHW6jLRcs/e2I79ey+TavOzI/9gSuiRQNKFA50idTIhLukWPO6st6xxcCin3geST02vF7rrCtEyzoraPvpPK79mt67D+yBHDI4IzCECNSIdMuUsuRj88iy7uHXILP/iI5XjUIsZqu/20QLNRtv69y8n92KDqmP23EMoisTJsPy9IbkzmS55G6zxpL+8ehgxW+Y/mYNXbxuq7OrU4swS2cL0GyQ3Yk+mA/KUP0CHdMcw+zUdRTA5MCkeUPUQw7x+aDW36mOdK1pjHbbx8tTWzu7XmvETIH9eI6Gn7kg7TIAcxKT5oRzBMM0xyRzo+HDHtIK4Ohfui6DbXWMj0vMK1NbN2tWC8hccz1n7nUfp/DdUfLjCDPf9GCkxUTNdH3D7yMekhwA+c/K7pJdgayX69DLY5szS13bvJxknVdeY6+WsM1h5TL9o8k0bhS3FMOEh7P8Yy4yLSELT9uuoV2d/JDL5ZtkGz97Rduw/GYdRt5SP4VgvUHXUuLTwiRrRLikyWSBdAlzPcI+MRzP7I6wjap8qdvqq2TbO9tOK6WcV802fkDfdBCtEclC1+O65Fg0ufTO9IsEBlNNMk8xLk/9fs/NpyyzK//7Zes4e0abqmxJnSY+P39SsJzRuyLMs6N0VOS7BMRUlFQTA1yCUCFPwA5+3z20DMyr9Yt3KzVbT1ufbDuNFf4uH0FAjHGs0rFTq8RBVLvUyXSddB+TW6JhAVFAL37uvcEM1lwLW3irMntIS5SMPa0F7hzfP+BsAZ5ipdOT1E2UrGTOVJZkK/NqsnHBYsAwnw5d3jzQTBFbims/6zFrmfwv7PXuC48ucFtxj8KaE4u0OYSstMMErxQoI3migoF0MEG/Hh3rnOpsF5uMaz2LOtuPjBJM9f36XxzwSuFxEp4jc1Q1NKzEx2SnhDQjiHKTMYWwUu8t7fkc9LwuG46rO1s0e4VMFOzmPekvC4A6IWIyghN6xCC0rJTLlK/EP/OHEqPBlyBkLz3uBr0PPCTLkStJez5Le0wHnNaN2A76AClhUzJ1w2H0K/ScJM90p9RLk5WitEGokHV/Te4UjRn8O8uT60fbOGtxfAqMxu3G/uiAGJFEEmlTWPQW9Jt0wyS/pEcTpALEoboAhs9eHiKNJNxC66brRnsyu3fb/Zy3fbX+1wAHoTTSXLNPtAG0moTGlLc0UlOyMtTxy2CYL25eMK0//EpbqitFWz1LbnvgzLgtpP7Fj/axJYJP4zZEDDSJVMnEvpRdY7BS5THcsKmPfq5O7TtMUfu9m0R7OBtlS+Q8qO2UHrQP5bEWAjLzPKP2hIfkzLS1tGhDzkLlUe4Auv+PHl1dRsxp27FbU9szK2xb18yZ3YNOoo/UkQZiJcMiw/CEhjTPZLyUYvPcEvVh/1DMb5+ea91SbHHrxUtTaz5rU5vbjIrdco6RH8Nw9rIYgxiz6lR0RMHkw0R9c9mzBVIAkO3foD6KjW5MejvJi1NLOftbC898fA1h3o+fokDm4gsDDnPT9HIUxBTJtHez5yMVIhHA/1+w3pltelyCu937U2s1u1K7w5x9XVFOfi+RANbx/WL0A91Eb6S2BM/0ccP0cyTSIuEAz9GeqF2GnJt70qtjyzG7Wpu37G7NQL5sr4/AtvHvoulTxmRtBLe0xeSLo/GjNHIz8RJP4m63bZL8pGvnm2RrPftCu7xsUF1ATltPfnCm0dGy7nO/RFoUuTTLpIVUDpMz8kUBI8/zTsadr4yti+zLZTs6e0sboRxSHT/+Oe9tIJaRw6LTc7f0VuS6ZMEknsQLc0NSVfE1QARO1f28TLbr8it2Wzc7Q6ul/EPtL74oj1vAhkG1csgzoGRThLtUxmSYBBgTUpJm4UbAFU7lbck8wIwH23e7NDtMe5sMNf0fjhc/SlB14acSvMOYlE/UrBTLdJEUJINhsnexWEAmXvT91kzaTA27eVsxa0V7kEw4HQ9+Be844GVhmJKhI5CUS/SshMA0qeQg03CyiIFpwDd/BJ3jjORME9uLKz7rPsuFvCps/430rydwVNGJ4pVTiGQ31Ky0xMSidDzzf5KJMXswSJ8UbfD8/nwaK41LPJs4O4tsHOzvreN/FfBEMXsiiVN/5CN0rLTJFKrUOOOOUpnRjLBZ3yRODoz47CDLn6s6mzH7gUwfjN/t0k8EgDNxbDJ9I2dELtScZM0kowREo5ziqmGeIGsfNE4cTQN8N4uSO0jLO+t3XAJc0E3RPvMAIrFdMmDTbmQZ9JvkwPS69EAzq2K60a+QfG9EbiotHkw+m5UbR0s2G32b9VzAvcAu4YAR0U4CVENVRBTUmxTElLK0W5OpsssxsPCdv1SeOC0pTEXbqCtF+zCLdBv4fLFdvy7AAADhPrJHk0v0D4SKFMfkujRWw7fi23HCUK8fZN5GXTR8XVure0T7Oztqy+vMog2uPr6P7+EfUjqzMnQJ9IjEyvSxdGHDxeLrodOgsH+FPlStT9xVG78bRCs2G2Gr7zyS3Z1erQ/e0Q/CLbMos/Qkh0TN1LiEbJPDwvvB5PDB75WuYy1bbG0LsutTqzE7aMvS7JPdjJ6bj83A8CIggy7D7hR1dMBkz0RnI9GDC8H2MNNfpj5xvWcsdTvG+1NbPJtQK9a8hO173oofvJDgYhMjFKPn1HN0wsTF5HGT7xMLogdw5N+23oB9cxyNm8tLU1s4O1eryrx2LWs+eJ+rYNCCBaMKU9FEcSTE5Mw0e8PsgxtyGJD2T8eOn11/PIYr39tTizQbX3u+7Gd9Wq5nL5ogwJH38v/DypRupLa0wlSFw/nDKxIpsQfP2F6uXYuMnvvUm2P7MDtXe7NMaP1KLlW/iNCwgeoS5QPDlGvUuFTINI+D9tM6ojrBGU/pLr19l/yoC+mrZLs8i0+rp9xanTnORE93gKBR3CLaE7xkWNS5tM3kiSQDw0oSS8Eqz/oezL2knLFL/utlqzkrSBusnExtKX4y72YgkBHN8s7zpPRVlLrUw0SShBCDWXJcwTxACw7cHbF8yrv0a3bbNftAy6GcTl0ZPiGfVMCPwa+ys6OtVEIUu6TIdJukHRNYom2hTcAcHuudzmzEbAoreFszC0mrlrwwbRkeEE9DYH9RkUK4I5V0TlSsRM1klJQpc2eyfnFfQC0u+z3bnN5MABuKCzBrQsucDCKtCR4PDyHgbsGCsqxzjVQ6VKykwhStVCWzdqKPMWCwTk8K7ejs6FwWW4v7Pfs8G4GcJQz5Lf3PEHBeMXQCkJOFBDYUrMTGhKXUMcOFgp/RcjBffxq99lzynCzLjis7yzW7h1wXjOld7J8O8D2BZTKEg3x0IaSspMrEriQ9o4QyoHGToGC/Oq4D/Q0cI3uQq0nbP4t9TApM2a3bfv2ALMFWMnhDY7Qs5Jw0zrSmNElDkrKw8aUQcg9KvhHNF8w6W5NbSCs5i3NsDRzKDcpe7AAb8Ucia9NaxBf0m5TCdL4URMOhIsFhtoCDX1reL70SrEF7pktGuzPbecvwLMqNuV7agAsRN+JfQ0GUEsSatMXktbRQE79iwbHH4JSvax493S28SNupe0WLPltgW/Ncuz2obskP+hEokkJzSDQNVImUySS9JFszvYLR8dlApg97bkwNOPxQa7zrRJs5G2cb5ryr/Zd+t4/pERkiNYM+k/ekiDTMJLREZhPLguIh6pC3f4vOWm1EfGg7sJtT6zQbbhvaTJzdhq6mD9gBCYIocyTD8cSGlM7ku0Rg09lS8iH74MjvnE5o/VAccEvEe1N7P1tVS938jd117pSPxuD50hsjGsPrlHS0wWTB9HtT1vMCIg0g2l+s3neda+x4i8irU0s621y7weyO/WUugx+1sOoSDcMAg+U0coTDpMh0daPkcxHyHlDr372Ohm137ID73QtTWzaLVFvF/HBNZJ5xn6SA2iHwIwYT3qRgJMWkzrR/w+HTIbIvcP1Pzk6VXYQcmavRu2OrMntcO7o8Ya1UDmAvkzDKIeJi+4PHxG2Ut2TEtImz/wMhUjCRHs/fDqRtkHyim+abZDs+u0RLvrxTPUOeXs9x8LoR1ILgo8C0arS45MqEg2QMAzDSQZEgT//us42tDKu767tlCzsrTJujXFTtMz5NX2CQqdHGctWjuXRXlLokwBSc5AjjQEJSkTHAAN7S3bm8tQvxG3YbN9tFK6gsRs0i/jv/XzCJkbhCynOh5FQ0uzTFZJY0FZNfglOBQ0AR3uJNxpzOm/ard2s0y03rnTw4vRLOKq9N0HkxqfK/E5o0QJS79Mp0n0QSE26yZGFUwCLu8d3TrNhcDIt4+zH7RtuSbDrdAq4ZXzxgaLGbcqNzkjRMxKx0z0SYJC5jbbJ1IWZANA8BfeDs4kwSm4rLP2swG5fcLSzyvggfKvBYIYzSl7OKBDikrLTD5KDEOoN8ooXhd7BFLxE9/kzsbBjrjNs9CzmLjXwfnOLd9u8ZcEeBfhKLw3GkNFSstMhEqTQ2g4tiloGJMFZvIR4LzPbML2uPKzr7MzuDTBI84w3lvwgANtFvMn+jaQQvxJyEzGShZEJTmgKnEZqgZ68xHhl9AVw2K5GrSSs9G3lMBPzTbdSe9oAmAVAyc1NgJCr0nATANLlkTeOYgreBrBB470EuJ10cHD0rlHtHmzc7f4v37MPdw47lABUxQRJm01cUFeSbRMPksSRZU6bSx/G9cIpPUV41XSccRGuni0Y7MZt1+/sMtG2yjtOABEExwlojTdQAlJpEx0S4tFSDtRLYMc7Qm59hnkN9Mjxb26rLRSs8O2yb7kylHaGewg/zUSJiTVM0ZAsUiQTKZLAEb5OzIuhx0DC9D3H+Uc1NjFOLvltEWzcbY3vhvKXtkL6wj+JBEuIwUzqz9VSHlM1EtxRqY8EC+JHhgM5vgm5gPVkca2uyG1O7Mitqi9Vclt2P7p8PwSEDQiMjIMP/VHXUz+S99GUT3sL4kfLA39+S7n7NVMxzi8YbU2s9i1Hb2SyH7X8+jZ+wAPOCFdMWs+kUc9TCVMSUf4PcYwhyBADhX7OOjY1gvIvrymtTSzkbWVvNHHkdbo58H67Q07IIUwxj0qRxpMR0yvR5w+nTGEIVMPLfxD6cXXzMhHve61N7NOtRG8FMem1d/mqvnZDDwfqy8ePb5G8ktmTBJIPD9yMn8iZRBE/U/qtdiQydO9OrY+sw+1kLtZxr7U1+WT+MULOx7OLnM8UEbHS4BMcUjZP0MzeSN2EVz+XOun2VfKY76Jtkiz07QTu6LF19PQ5Hz3sAo5He4txDvdRZdLl0zMSHNAEzRwJIYSdP9r7JraIcv2vt22V7OctJm67cTz0svjZvaaCTUcDS0TO2dFZEupTCNJCkHfNGYllROMAHrtkNvty42/NLdps2m0I7o8xBLSx+JQ9YQIMBspLF467UQtS7hMd0mdQak1WSakFKQBiu6H3L3MJ8CPt4CzObSwuY3DMtHF4Tv0bQcpGkIrpzlwRPFKwkzGSS1CcDZLJ7EVvAKb74Hdjs3EwO63mrMOtEK54sJV0MTgJ/NWBiEZWirsOO9DskrJTBJKuUI0NzsovRbTA63wfN5jzmTBUbi5s+az1rg6wnvPxd8T8j8FGBhvKS84a0NvSsxMWkpCQ/U3KCnIF+sEwPF53zrPCMK3uNuzw7NvuJXBo87I3gDxJwQNF4IobjfjQihKykyfSshDtDgUKtIYAwbU8nfgFNCvwiG5ArSjswu49MDOzczd7u8QAwIWkyerNlhC3knFTN9KSkRvOf0q2hkaB+jzd+Hw0FrDj7kstIezq7dVwPvM0tzc7vgB9RSiJuU1yUGPSbtMG0vIRCg65CvhGjAI/fR54s7RB8QAulq0cLNPt7q/K8za28vt4ADnE68lHDU3QT1JrkxUS0NF3TrJLOcbRwkT9n3jr9K4xHW6jLRcs/e2I79ey+TavOzI/9gSuiRQNKFA50idTIhLukWPO6st6xxcCin3geST02vF7rrCtEyzoraPvpPK79mt67D+yBHDI4IzCECNSIdMuUsuRj88iy7uHXILP/iI5XjUIsZqu/20QLNRtv69y8n92KDqmP23EMoisTJsPy9IbkzmS55G6zxpL+8ehgxW+Y/mYNXbxuq7OrU4swS2cL0GyQ3Yk+mA/KUP0CHdMcw+zUdRTA5MCkeUPUQw7x+aDW36mOdK1pjHbbx8tTWzu7XmvETIH9eI6Gn7kg7TIAcxKT5oRzBMM0xyRzo+HDHtIK4Ohfui6DbXWMj0vMK1NbN2tWC8hccz1n7nUfp/DdUfLjCDPf9GCkxUTNdH3D7yMekhwA+c/K7pJdgayX69DLY5szS13bvJxknVdeY6+WsM1h5TL9o8k0bhS3FMOEh7P8Yy4yLSELT9uuoV2d/JDL5ZtkGz97Rduw/GYdRt5SP4VgvUHXUuLTwiRrRLikyWSBdAlzPcI+MRzP7I6wjap8qdvqq2TbO9tOK6WcV802fkDfdBCtEclC1+O65Fg0ufTO9IsEBlNNMk8xLk/9fs/NqRy6O/07eVtBG2JrxmxiTUfeRm9rsIWhopKjI3qkADRvNGdEPLO3wwRCIOEuIA1e/03zzSgcdowFe9db6lw4nMitjg5p/2xwZYFlok8S9sOEs9Sz5oO9o0FCu8Hp8QoQG38svku9hAz+vIF8bnxkLL19Il3X/pGPcTBZESvR7YKEcwnTSeNUYzxS19Jfwa8Q4hAlv1a+kM397WXNHVzmXP+tJP2fThWezP950DBQ9TGeYhPSj6K+0sECuOJrgfBBcGDWECw/fT7S/lWt652Y7X8NfN2u7f9uZu78b4ZgK0Cx0UHhtPIGQjOCTIIjYfxRnVEt0KYQLs+QPyIuuy5QHiQeCE4LriteYr7L3y/PluAZ8IGw+AFH0Y3RqCG24avRelE28OeAgiAtf7+vXl8ObsM+ru6CHpv+qh7ZHxRvZw+7YAxgVPCg0OyxBlEswSBRImEFoN1AnWBaQBhP23+Xj29PNM8pLxxvHb8rP0J/cJ+iL9PgAqA7kFxgc3Cf0JFgqMCXII5AYEBfgC5gDy/jr92Pvc+k36Lfpy+gz76Pvt/AP+E/8FAMsAWgGtAcQBqAFjAQYBoQBEAA==',
  };
  const src = sounds[priority] || sounds.normal;
  let played = false;
  /* Primary: a real embedded WAV file via <audio> — far more reliably
     allowed to actually produce sound (across browsers, and even when
     opened as a local file:// document) than a raw Web Audio oscillator,
     which several browsers keep silently muted even after resume(). */
  try{
    const audio = new Audio(src);
    audio.volume = 1.0;
    const p = audio.play();
    if(p && typeof p.then === 'function'){
      p.then(()=>{ played = true; }).catch(()=> playBuzzerOscillatorFallback(priority));
    } else {
      played = true;
    }
  }catch(e){
    playBuzzerOscillatorFallback(priority);
  }
}
/* Fallback tone generator, used only if the <audio> playback above is
   blocked by the browser for some reason. */
function playBuzzerOscillatorFallback(priority){
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const startTone = ()=>{
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.start();
    const t0 = ctx.currentTime;
    if(priority === 'urgent'){
      o.type = 'square';
      g.gain.value = 0.18;
      o.frequency.setValueAtTime(1046, t0);
      o.frequency.setValueAtTime(784, t0+0.12);
      o.frequency.setValueAtTime(1046, t0+0.24);
      o.frequency.setValueAtTime(784, t0+0.36);
      o.frequency.setValueAtTime(1046, t0+0.48);
      o.stop(t0+0.62);
      setTimeout(()=>ctx.close(), 750);
    } else if(priority === 'low'){
      o.type = 'sine';
      g.gain.value = 0.09;
      o.frequency.setValueAtTime(392, t0);
      o.frequency.exponentialRampToValueAtTime(330, t0+0.5);
      o.stop(t0+0.55);
      setTimeout(()=>ctx.close(), 650);
    } else {
      o.type = 'sine';
      g.gain.value = 0.13;
      o.frequency.setValueAtTime(660, t0);
      o.frequency.setValueAtTime(880, t0+0.16);
      o.stop(t0+0.34);
      setTimeout(()=>ctx.close(), 450);
    }
    };
    if(ctx.state === 'suspended'){ ctx.resume().then(startTone).catch(startTone); }
    else { startTone(); }
  }catch(e){}
}

function checkDeadlineReminders(){
  let reminded = {};
  try{ reminded = JSON.parse(localStorage.getItem(LS_REMINDED) || '{}'); }catch(e){}
  const tasks = loadTasks();
  const now = Date.now();
  let changed = false;
  tasks.forEach(t=>{
    if(t.status==='completed') return;
    const dl = new Date(t.deadline).getTime();
    const diffH = (dl - now) / (1000*60*60);
    const key24 = t.id+'-24h';
    const key1 = t.id+'-1h';
    if(diffH <= 24 && diffH > 1 && !reminded[key24]){
      addNotif({id:t.id, title:'Deadline reminder: "'+t.title+'" is due within 24 hours.'}, t.priority, 'reminder');
      reminded[key24] = true; changed = true;
    }
    if(diffH <= 1 && diffH > -100000 && t.priority==='urgent' && !reminded[key1]){
      addNotif({id:t.id, title:'Urgent — "'+t.title+'" is due within 1 hour!'}, 'urgent', 'reminder');
      reminded[key1] = true; changed = true;
    }
  });
  if(changed) localStorage.setItem(LS_REMINDED, JSON.stringify(reminded));
}

/* ============================================================
   CRUD DATA LAYER — Leave Management / Attendance / Task Control / Employees & Roles
   Persisted in the browser's localStorage (this portal has no live server
   backend in this environment — localStorage is the durable store, saved
   permanently per-browser, with full add/edit/delete kept in sync instantly).
   ============================================================ */
const LS_LEAVE   = 'hmc_leave_v1';
const LS_ATT     = 'hmc_attendance_v1';
const LS_TC      = 'hmc_taskcontrol_v1';
const LS_EMP     = 'hmc_employees_v1';

function uid(prefix){ return prefix+'-'+Date.now().toString(36)+Math.floor(Math.random()*9999); }
function escapeHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
/* Search inputs trigger a full re-render (innerHTML) on every keystroke,
   which recreates the <input> and drops focus. This restores focus + the
   caret position right after that re-render so typing a full word works
   without re-clicking the box each letter. */
function refocusSearch(id, pos){
  const el = document.getElementById(id);
  if(!el) return;
  el.focus();
  if(pos!=null){
    try{ el.setSelectionRange(pos,pos); }catch(e){}
  }
}
function nowYear(){ return new Date().getFullYear(); }
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/* ---- Employees & Roles (master list used by Leave/Attendance/Task Control) ---- */
function seedEmployees(){
  return [
    { pin:'HMC-1001', name:'Bilal Hussain', designation:'Machine Operative', department:'Machine Shop', role:'Employee' },
    { pin:'HMC-1002', name:'Sana Ahmed', designation:'Foundry Technician', department:'Foundry', role:'Employee' },
    { pin:'HMC-1003', name:'Usman Khalid', designation:'Production Supervisor', department:'Production', role:'Supervisor' },
    { pin:'HMC-1004', name:'Farah Riaz', designation:'Operations Executive', department:'Operations', role:'Employee' },
    { pin:'HMC-1005', name:'Zain Tariq', designation:'Recruitment Officer', department:'Recruitment', role:'Employee' },
    { pin:'HMC-1006', name:'Abrish Malik', designation:'HR Manager', department:'HR Department', role:'Admin' },
    { pin:'HMC-1007', name:'Imran Sheikh', designation:'Quality Inspector', department:'Quality Assurance', role:'Employee' },
    { pin:'HMC-1008', name:'Ayesha Noor', designation:'Store Keeper', department:'Stores', role:'Employee' },
  ];
}
function loadEmployees(){
  try{ const raw = localStorage.getItem(LS_EMP); if(raw) return JSON.parse(raw); }catch(e){}
  const seed = seedEmployees(); saveEmployees(seed); return seed;
}
function saveEmployees(list){ localStorage.setItem(LS_EMP, JSON.stringify(list)); }
function employeeByPin(pin){ return loadEmployees().find(e=>e.pin===String(pin||'').trim()); }
/* Every operational module must resolve employees through this single lookup —
   no module may fabricate a PIN or employee record of its own. */
function requireRegisteredEmployee(pinRaw){
  const pin = String(pinRaw||'').trim();
  if(!pin){ toast('PIN ID is required. Please select a registered employee.', 'error'); return null; }
  const emp = employeeByPin(pin);
  if(!emp){ toast('Invalid PIN ID. Please select a registered employee.', 'error'); return null; }
  return emp;
}
function employeePinDatalistHTML(listId){
  const emps = loadEmployees();
  return `<datalist id="${listId}">${emps.map(e=>`<option value="${escapeHtml(e.pin)}">${escapeHtml(e.name)} — ${escapeHtml(e.designation)}</option>`).join('')}</datalist>`;
}

/* ---- Leave Management ---- */
function seedLeave(){
  const emps = seedEmployees();
  const y = nowYear();
  return emps.slice(0,6).map((e,i)=>{
    const alOpening = 20;
    const alAvailed = [5, 3, 8, 2, 6, 4][i%6];
    const alClosing = alOpening-alAvailed;
    const clOpening = 10;
    const clAvailed = [2, 1, 4, 3, 2, 5][i%6];
    const clClosing = clOpening-clAvailed;
    return { id: uid('LV'), pin:e.pin, name:e.name, designation:e.designation, year:y, month: MONTHS[new Date().getMonth()],
      alOpening, alAvailed, alClosing, clOpening, clAvailed, clClosing,
      openingBalance: alOpening+clOpening, closingBalance: alClosing+clClosing };
  });
}
function loadLeave(){
  try{ const raw = localStorage.getItem(LS_LEAVE); if(raw) return JSON.parse(raw); }catch(e){}
  const seed = seedLeave(); saveLeave(seed); return seed;
}
function saveLeave(list){ localStorage.setItem(LS_LEAVE, JSON.stringify(list)); }

/* ---- Attendance ---- */
function seedAttendance(){
  const emps = seedEmployees();
  const y = nowYear(); const m = MONTHS[new Date().getMonth()];
  const presentCodes = ['P','P','P','GH','P','CR','OD'];
  return emps.map((e,i)=>({
    id: uid('AT'), pin:e.pin, name:e.name, designation:e.designation, department:e.department,
    section:'General', typeOfDay:'Working Day', year:y, month:m, date: new Date().toISOString().slice(0,10),
    present: presentCodes[i%presentCodes.length], gh:'', leave:'', hd:'', workingDays: 26
  }));
}
function loadAttendance(){
  try{ const raw = localStorage.getItem(LS_ATT); if(raw) return JSON.parse(raw); }catch(e){}
  const seed = seedAttendance(); saveAttendance(seed); return seed;
}
function saveAttendance(list){ localStorage.setItem(LS_ATT, JSON.stringify(list)); }

/* ---- Admin Panel > Task Control (office task tracking register) ---- */
function seedTaskControl(){
  const now = Date.now();
  return [
    { id: uid('TC'), dateReceived:new Date(now-1000*60*60*24*3).toISOString().slice(0,10), subject:'Revise Overtime SOP Circular', mainDept:'HR Department', department:'Policy Cell', receivedByPin:'HMC-1006', receivedBy:'Abrish Malik', status:'In Progress', completionPeriod:new Date(now+1000*60*60*24*2).toISOString().slice(0,10), internalExternal:'Internal', organization:'HMC Taxila', dateOfDispatch:'', remarks:'Awaiting management sign-off.' },
    { id: uid('TC'), dateReceived:new Date(now-1000*60*60*24*10).toISOString().slice(0,10), subject:'Archive Q1 Attendance Registers', mainDept:'HR Department', department:'Records', receivedByPin:'HMC-1003', receivedBy:'Usman Khalid', status:'Completed', completionPeriod:new Date(now-1000*60*60*24*4).toISOString().slice(0,10), internalExternal:'Internal', organization:'HMC Taxila', dateOfDispatch:new Date(now-1000*60*60*24*3).toISOString().slice(0,10), remarks:'Archived and verified.' },
    { id: uid('TC'), dateReceived:new Date(now-1000*60*60*24*1).toISOString().slice(0,10), subject:'Vendor Compliance Audit Response', mainDept:'Admin Panel', department:'Audit & Compliance', receivedByPin:'HMC-1004', receivedBy:'Farah Riaz', status:'Pending', completionPeriod:new Date(now-1000*60*60*24).toISOString().slice(0,10), internalExternal:'External', organization:'Ministry of Industries', dateOfDispatch:'', remarks:'Response overdue — escalate.' },
  ];
}
function loadTaskControl(){
  try{ const raw = localStorage.getItem(LS_TC); if(raw) return JSON.parse(raw); }catch(e){}
  const seed = seedTaskControl(); saveTaskControl(seed); return seed;
}
function saveTaskControl(list){ localStorage.setItem(LS_TC, JSON.stringify(list)); }
function isTcOverdue(t){
  if(t.status==='Completed') return false;
  if(!t.completionPeriod) return false;
  return new Date(t.completionPeriod).getTime() < Date.now();
}

/* ============================================================
   SHARED CRUD UTILITIES — search / sort / paginate / export / print / toast
   ============================================================ */
function toast(msg, type){
  let stack = document.getElementById('toastStack');
  if(!stack){ stack = document.createElement('div'); stack.id='toastStack'; stack.className='toast-stack'; document.body.appendChild(stack); }
  const el = document.createElement('div');
  el.className = 'toast'+(type==='error'?' toast-error':type==='info'?' toast-info':'');
  el.innerHTML = `<span>${type==='error'?'⚠️':type==='info'?'ℹ️':'✅'}</span><span>${escapeHtml(msg)}</span>`;
  stack.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .25s'; setTimeout(()=>el.remove(), 260); }, 2600);
}

function searchRows(rows, query, fields){
  const q = (query||'').trim().toLowerCase();
  if(!q) return rows;
  return rows.filter(r => fields.some(f => String(r[f]==null?'':r[f]).toLowerCase().includes(q)));
}
function sortRows(rows, key, dir){
  if(!key) return rows;
  const sorted = [...rows].sort((a,b)=>{
    let av = a[key], bv = b[key];
    if(typeof av === 'number' && typeof bv === 'number') return av-bv;
    av = String(av==null?'':av).toLowerCase(); bv = String(bv==null?'':bv).toLowerCase();
    if(av<bv) return -1; if(av>bv) return 1; return 0;
  });
  if(dir==='desc') sorted.reverse();
  return sorted;
}
function paginateRows(rows, page, pageSize){
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total/pageSize));
  const p = Math.min(Math.max(1,page), totalPages);
  const start = (p-1)*pageSize;
  return { pageRows: rows.slice(start, start+pageSize), page:p, totalPages, total };
}
function paginationBarHTML(state, total, onPage){
  const totalPages = Math.max(1, Math.ceil(total/state.pageSize));
  const p = Math.min(Math.max(1,state.page), totalPages);
  const startN = total===0?0:(p-1)*state.pageSize+1;
  const endN = Math.min(total, p*state.pageSize);
  let btns = '';
  const maxBtns = 5;
  let from = Math.max(1, p-2), to = Math.min(totalPages, from+maxBtns-1);
  from = Math.max(1, to-maxBtns+1);
  for(let i=from;i<=to;i++){
    btns += `<button class="pg-btn ${i===p?'pg-active':''}" onclick="${onPage}(${i})">${i}</button>`;
  }
  return `<div class="pagination-bar">
    <div class="pg-info">Showing ${startN}–${endN} of ${total} records</div>
    <div class="pg-controls">
      <button class="pg-btn" ${p<=1?'disabled':''} onclick="${onPage}(${p-1})">‹ Prev</button>
      ${btns}
      <button class="pg-btn" ${p>=totalPages?'disabled':''} onclick="${onPage}(${p+1})">Next ›</button>
    </div>
  </div>`;
}
function sortHeaderHTML(label, key, state, onSort){
  const active = state.sortKey===key;
  const cls = active ? (state.sortDir==='asc'?'sort-asc':'sort-desc') : '';
  const arrow = active ? (state.sortDir==='asc'?'▲':'▼') : '↕';
  return `<th class="sortable ${cls}" onclick="${onSort}('${key}')">${escapeHtml(label)}<span class="sort-arrow">${arrow}</span></th>`;
}

function exportRowsToExcel(filename, headers, rows){
  try{
    if(typeof XLSX === 'undefined'){ toast('Excel export library failed to load. Check your internet connection.', 'error'); return; }
    const data = [headers.map(h=>h.label), ...rows.map(r=>headers.map(h=>r[h.key]))];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, filename+'.xlsx');
    toast('Excel file exported.');
  }catch(e){ toast('Export failed: '+e.message, 'error'); }
}
function exportRowsToWord(filename, title, headers, rows){
  try{
    const rowsHtml = rows.map(r=>`<tr>${headers.map(h=>`<td style="border:1px solid #c9cfd9;padding:6px 8px;font-size:11px;">${escapeHtml(r[h.key]==null?'':r[h.key])}</td>`).join('')}</tr>`).join('');
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
      <body style="font-family:Arial,sans-serif;">
        <h2 style="margin-bottom:2px;">${escapeHtml(title)}</h2>
        <p style="color:#5d6b7e;font-size:11px;margin-top:0;">HMC HR Department Portal · Generated ${new Date().toLocaleString()}</p>
        <table style="border-collapse:collapse;width:100%;">
          <thead><tr>${headers.map(h=>`<th style="border:1px solid #c9cfd9;padding:6px 8px;font-size:11px;background:#eef0f3;text-align:left;">${escapeHtml(h.label)}</th>`).join('')}</tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body></html>`;
    const blob = new Blob(['\ufeff', html], { type:'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename+'.doc';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    toast('Word file exported.');
  }catch(e){ toast('Export failed: '+e.message, 'error'); }
}
function importRowsFromWord(file, onRows){
  /* Reads a .doc/.docx (or pasted-as-html Word file) and extracts the first
     HTML table's rows as arrays of cell text, matched back to headers by
     the caller (same "match by header text" pattern as Excel import). */
  const reader = new FileReader();
  reader.onload = function(e){
    try{
      const raw = e.target.result;
      const div = document.createElement('div');
      div.innerHTML = raw;
      const table = div.querySelector('table');
      if(!table){ toast('No table found in this Word file — export it from this portal first, or use Excel/CSV import instead.', 'error'); return; }
      const rows = [...table.querySelectorAll('tr')].map(tr=>[...tr.children].map(td=>td.textContent.trim()));
      onRows(rows);
    }catch(err){ toast('Could not read Word file: '+err.message, 'error'); }
  };
  reader.readAsText(file);
}
function exportRowsToPDF(filename, title, headers, rows){
  try{
    if(typeof window.jspdf === 'undefined'){ toast('PDF export library failed to load. Check your internet connection.', 'error'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:'landscape' });
    doc.setFontSize(14); doc.text(title, 14, 16);
    doc.setFontSize(9); doc.text('HMC HR Department Portal · Generated '+new Date().toLocaleString(), 14, 22);
    doc.autoTable({
      startY:28,
      head:[headers.map(h=>h.label)],
      body: rows.map(r=>headers.map(h=>String(r[h.key]==null?'':r[h.key]))),
      styles:{ fontSize:8 },
      headStyles:{ fillColor:[16,31,53] },
    });
    doc.save(filename+'.pdf');
    toast('PDF file exported.');
  }catch(e){ toast('Export failed: '+e.message, 'error'); }
}

/* ============================================================
   DOWNLOAD (Excel/PDF choice) DROPDOWN — replaces standalone
   "Excel" / "PDF" export buttons across the portal.
   ============================================================ */
function downloadMenuHTML(uidStr, exportExcelCall, exportPdfCall, exportWordCall){
  const wordCall = exportWordCall || exportPdfCall.replace('exportRowsToPDF(', 'exportRowsToWord(');
  return `<div class="dl-wrap">
    <button class="btn btn-outline btn-sm" onclick="toggleDlMenu('${uidStr}')">${ic('reports')} Download <span style="opacity:.6">▾</span></button>
    <div class="dl-menu" id="dlMenu_${uidStr}">
      <button onclick="${exportExcelCall}; closeDlMenu('${uidStr}')">${ic('reports')} Download as Excel (.xlsx)</button>
      <button onclick="${exportPdfCall}; closeDlMenu('${uidStr}')">${ic('reports')} Download as PDF (.pdf)</button>
      <button onclick="${wordCall}; closeDlMenu('${uidStr}')">${ic('reports')} Download as Word (.doc)</button>
    </div>
  </div>`;
}
function toggleDlMenu(idStr){
  document.querySelectorAll('.dl-menu').forEach(m=>{ if(m.id!=='dlMenu_'+idStr) m.classList.remove('show'); });
  const el = document.getElementById('dlMenu_'+idStr);
  if(el) el.classList.toggle('show');
}
function closeDlMenu(idStr){ const el = document.getElementById('dlMenu_'+idStr); if(el) el.classList.remove('show'); }
document.addEventListener('click', function(e){
  if(!e.target.closest('.dl-wrap')){ document.querySelectorAll('.dl-menu').forEach(m=>m.classList.remove('show')); }
});

/* ============================================================
   UPLOAD — generic "Upload from device" widget, replaces standalone
   "PDF" buttons. Supports PDF, Excel, Word, images, brochures,
   flyers and other common document formats. Files are read as
   data URLs and kept in localStorage so they persist per-browser.
   ============================================================ */
const LS_UPLOADS = 'hmc_uploads_v1';
function loadUploads(context){
  try{ const raw = localStorage.getItem(LS_UPLOADS); const all = raw?JSON.parse(raw):{}; return all[context]||[]; }catch(e){ return []; }
}
function saveUploads(context, list){
  let all = {};
  try{ const raw = localStorage.getItem(LS_UPLOADS); all = raw?JSON.parse(raw):{}; }catch(e){}
  all[context] = list;
  localStorage.setItem(LS_UPLOADS, JSON.stringify(all));
}
function uploadButtonHTML(context, label){
  return `<button class="btn btn-solid btn-sm" onclick="openUploadModal('${context}')">${ic('plus')} ${label||'Upload'}</button>`;
}
function humanFileSize(bytes){
  if(!bytes && bytes!==0) return '';
  if(bytes<1024) return bytes+' B';
  const units=['KB','MB','GB']; let i=-1;
  do{ bytes/=1024; i++; }while(bytes>=1024 && i<units.length-1);
  return bytes.toFixed(1)+' '+units[i];
}
function uploadFileIcon(type, name){
  const t=(type||'').toLowerCase(); const n=(name||'').toLowerCase();
  if(t.includes('pdf')||n.endsWith('.pdf')) return '📕';
  if(t.includes('sheet')||n.endsWith('.xls')||n.endsWith('.xlsx')||n.endsWith('.csv')) return '📊';
  if(t.includes('word')||n.endsWith('.doc')||n.endsWith('.docx')) return '📄';
  if(t.startsWith('image')||/\.(jpg|jpeg|png|gif|webp|bmp)$/.test(n)) return '🖼️';
  if(t.includes('presentation')||n.endsWith('.ppt')||n.endsWith('.pptx')) return '📽️';
  if(t.includes('zip')||t.includes('compressed')||/\.(zip|rar|7z)$/.test(n)) return '🗜️';
  if(n.endsWith('.rtf')||n.endsWith('.txt')) return '📝';
  return '📁';
}
function uploadsListHTML(context){
  const list = loadUploads(context);
  if(!list.length){
    return `<div class="empty-state"><div class="es-icon">${ic('inbox')}</div><h4>No documents uploaded yet</h4><p>Use the Upload button to browse and attach PDF, Excel, Word, PowerPoint, image, brochure, flyer, ZIP or other document files from any device — phone, tablet, laptop or desktop.</p></div>`;
  }
  return list.slice().reverse().map(f=>`
    <div class="upload-list-item">
      <div class="uf-icon">${uploadFileIcon(f.type,f.name)}</div>
      <div class="uf-meta">
        <div class="uf-name">${escapeHtml(f.name)}</div>
        <div class="uf-sub">${humanFileSize(f.size)} · Uploaded ${new Date(f.uploadedAt).toLocaleString()}</div>
      </div>
      <div class="row-actions">
        ${f.dataUrl?`<a class="mini-btn" title="Download" href="${f.dataUrl}" download="${escapeHtml(f.name)}">${ic('reports')}</a>`:''}
        <button class="mini-btn" title="Replace" onclick="triggerReplaceUpload('${context}','${f.id}')">${ic('edit')}</button>
        <button class="mini-btn" title="Delete" onclick="confirmDeleteUpload('${context}','${f.id}')">${ic('trash')}</button>
      </div>
    </div>`).join('');
}
function openUploadModal(context){
  const cfg = getImportConfig(context);
  const root = document.getElementById('uploadModalRoot') || (function(){ const d=document.createElement('div'); d.id='uploadModalRoot'; document.body.appendChild(d); return d; })();
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closeUploadModal()">
    <div class="modal-box">
      <div class="modal-head"><h3>Upload Document</h3><button class="modal-close" onclick="closeUploadModal()">✕</button></div>
      <div class="modal-body">
        ${cfg?`<div style="background:var(--blue-100);border:1px solid var(--blue-400);border-radius:10px;padding:10px 12px;margin-bottom:12px;font-size:12px;color:var(--text-strong);line-height:1.5;">
          <b>Excel / CSV auto-fill:</b> upload an .xlsx, .xls or .csv file here and its rows will be saved straight into this page's table (columns are matched by header name). Tip: click <b>Download → Download as Excel</b> first to get a template with the exact column headers, fill it in, then upload it back here.
        </div>`:''}
        <label class="upload-drop" for="uploadFileInput" style="display:block;">
          ${ic('inbox')}
          <div style="margin-top:8px;font-weight:600;color:var(--text-strong);">Click to browse and choose file(s) from this device</div>
          <div style="font-size:11.5px;margin-top:4px;">Works on phones, tablets, laptops and desktops (Android, iPhone/iPad, Windows, macOS, Linux). Supports PDF, Excel (.xls/.xlsx), Word (.doc/.docx), PowerPoint (.ppt/.pptx), Images (.jpg/.jpeg/.png), brochures, flyers, ZIP files or any other common document format.</div>
        </label>
        <input type="file" id="uploadFileInput" multiple style="display:none"
          accept=".pdf,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.rtf,.csv,.zip,.rar,.7z,*/*"
          onchange="handleUploadFiles('${context}', this)" />
        <div id="uploadPickedList" style="margin-top:10px;"></div>
        <div style="margin-top:18px;">
          <div style="font-size:12px;font-weight:700;color:var(--steel-600);text-transform:uppercase;letter-spacing:.3px;margin-bottom:8px;">Previously Uploaded</div>
          <div id="uploadExistingList">${uploadsListHTML(context)}</div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" onclick="closeUploadModal()">Close</button>
      </div>
    </div>
  </div>`;
}
function closeUploadModal(){ const r=document.getElementById('uploadModalRoot'); if(r) r.innerHTML=''; }

/* ============================================================
   SPREADSHEET IMPORT — for table-backed modules (Employees,
   Attendance, Leave Management, Task Control), an uploaded
   .xlsx/.xls/.csv file is parsed and its rows are written
   straight into that module's data columns (localStorage table),
   instead of just being stored as a generic attached document.
   Column headers in the file should match the on-screen column
   names (use "Download as Excel" first to get a ready-made
   template with the exact headers expected).
   ============================================================ */
function isSpreadsheetFile(file){
  const n = (file.name||'').toLowerCase();
  const t = (file.type||'').toLowerCase();
  return n.endsWith('.xlsx') || n.endsWith('.xls') || n.endsWith('.csv') ||
         t.includes('spreadsheet') || t.includes('excel') || t.includes('csv');
}
function getImportConfig(context){
  const map = {
    'employees': { headers: EMP_HEADERS, load: loadEmployees, save: saveEmployees, computed:['taskCount'], matchKey:'pin', idPrefix:null },
    'attendance': { headers: ATT_HEADERS, load: loadAttendance, save: saveAttendance, computed:['sr'], matchKey:null, idPrefix:'AT' },
    'leave-management': { headers: LEAVE_HEADERS, load: loadLeave, save: saveLeave, computed:['sr','alClosing','clClosing','openingBalance','closingBalance'], matchKey:null, idPrefix:'LV' },
    'task-control': { headers: TC_HEADERS, load: loadTaskControl, save: saveTaskControl, computed:['sr','delayedCompleted'], matchKey:null, idPrefix:'TC' },
  };
  return map[context] || null;
}
function normLabel(s){ return String(s==null?'':s).toLowerCase().replace(/[^a-z0-9]/g,''); }
function parseWorkbookRows(wb){
  const wsName = wb.SheetNames[0];
  const ws = wb.Sheets[wsName];
  if(!ws) return [];
  const aoa = XLSX.utils.sheet_to_json(ws, { header:1, defval:'', raw:true });
  if(!aoa.length) return [];
  const headerRow = aoa[0];
  return aoa.slice(1)
    .map(row=>{ const obj={}; headerRow.forEach((h,i)=>{ obj[h]=row[i]; }); return obj; })
    .filter(r=> Object.values(r).some(v=> String(v==null?'':v).trim()!==''));
}
function cellToDateStr(val){
  if(val instanceof Date && !isNaN(val.getTime())) return val.toISOString().slice(0,10);
  return String(val==null?'':val).trim();
}
const IMPORT_DATE_KEYS = ['dateReceived','completionPeriod','dateOfDispatch','date'];
const IMPORT_NUMBER_KEYS = ['opening','adjust','workingDays'];
function buildRecordFromRow(cfg, rowObj){
  const rec = {};
  cfg.headers.forEach(h=>{
    if(cfg.computed.includes(h.key)) return;
    let raw;
    for(const rawKey in rowObj){
      if(normLabel(rawKey)===normLabel(h.label) || normLabel(rawKey)===normLabel(h.key)){ raw = rowObj[rawKey]; break; }
    }
    let val = (raw===undefined || raw===null) ? '' : raw;
    if(IMPORT_DATE_KEYS.includes(h.key)) val = cellToDateStr(val);
    else if(val instanceof Date) val = cellToDateStr(val);
    else val = String(val).trim();
    if(IMPORT_NUMBER_KEYS.includes(h.key) && val!==''){
      const num = parseFloat(val);
      if(!isNaN(num)) val = num;
    }
    rec[h.key] = val;
  });
  return rec;
}
function importRowsIntoTable(context, cfg, rawRows){
  if(!rawRows.length) return { count:0, skipped:0 };
  const list = cfg.load();
  let count = 0;
  let skipped = 0;
  const PIN_LINKED_CONTEXTS = { 'attendance':'pin', 'leave-management':'pin', 'task-control':'receivedByPin' };
  rawRows.forEach(rowObj=>{
    const rec = buildRecordFromRow(cfg, rowObj);
    const hasAny = Object.keys(rec).some(k=> String(rec[k]).trim()!=='');
    if(!hasAny) return;

    if(context==='employees'){
      if(!rec.pin) rec.pin = 'HMC-'+Math.floor(1000+Math.random()*8999);
      if(!rec.role) rec.role = 'Employee';
    }

    // Every non-master module must reference an employee already registered
    // in Employee & Roles. Rows that don't match a valid PIN are rejected,
    // not auto-registered.
    const pinField = PIN_LINKED_CONTEXTS[context];
    if(pinField){
      const emp = employeeByPin(rec[pinField]);
      if(!emp){ skipped++; return; }
      rec[pinField] = emp.pin;
      if(context==='attendance' || context==='leave-management'){
        rec.name = emp.name;
        rec.designation = emp.designation;
        if(context==='attendance') rec.department = emp.department;
      }
      if(context==='task-control'){
        rec.receivedBy = emp.name;
      }
    }

    if(context==='leave-management'){
      const alOpening = parseFloat(rec.alOpening)||0;
      const alAvailed = parseFloat(rec.alAvailed)||0;
      const clOpening = parseFloat(rec.clOpening)||0;
      const clAvailed = parseFloat(rec.clAvailed)||0;
      rec.alOpening = alOpening; rec.alAvailed = alAvailed; rec.alClosing = alOpening-alAvailed;
      rec.clOpening = clOpening; rec.clAvailed = clAvailed; rec.clClosing = clOpening-clAvailed;
      rec.openingBalance = alOpening+clOpening; rec.closingBalance = rec.alClosing+rec.clClosing;
      if(!rec.year) rec.year = nowYear();
      if(!rec.month) rec.month = MONTHS[new Date().getMonth()];
    }
    if(context==='attendance'){
      if(!rec.workingDays && rec.workingDays!==0) rec.workingDays = 26;
      if(!rec.year) rec.year = nowYear();
      if(!rec.month) rec.month = MONTHS[new Date().getMonth()];
      if(!rec.section) rec.section = 'General';
      if(!rec.typeOfDay) rec.typeOfDay = 'Working Day';
    }
    if(context==='task-control'){
      if(!rec.status) rec.status = 'Pending';
      if(!rec.internalExternal) rec.internalExternal = 'Internal';
    }

    if(cfg.matchKey && rec[cfg.matchKey]){
      const existing = list.find(x=> String(x[cfg.matchKey]).trim().toLowerCase() === String(rec[cfg.matchKey]).trim().toLowerCase());
      if(existing){ Object.assign(existing, rec); count++; return; }
    }
    if(cfg.idPrefix) rec.id = uid(cfg.idPrefix);
    list.push(rec);
    count++;
  });
  cfg.save(list);
  return { count, skipped };
}
function importSpreadsheetFiles(context, cfg, files, done){
  let remaining = files.length;
  let totalImported = 0;
  let totalSkipped = 0;
  files.forEach(file=>{
    const isCsv = /\.csv$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = (e)=>{
      try{
        const wb = isCsv
          ? XLSX.read(e.target.result, { type:'string' })
          : XLSX.read(e.target.result, { type:'array', cellDates:true });
        const rawRows = parseWorkbookRows(wb);
        const result = importRowsIntoTable(context, cfg, rawRows);
        totalImported += result.count;
        totalSkipped += result.skipped;
      }catch(err){
        toast('Could not read "'+file.name+'": '+err.message, 'error');
      }
      remaining--;
      if(remaining===0) done(totalImported, totalSkipped);
    };
    reader.onerror = ()=>{ remaining--; if(remaining===0) done(totalImported, totalSkipped); };
    if(isCsv) reader.readAsText(file); else reader.readAsArrayBuffer(file);
  });
}

function handleUploadFiles(context, input){
  const files = Array.from(input.files||[]);
  if(!files.length) return;
  const cfg = getImportConfig(context);
  const sheetFiles = cfg ? files.filter(isSpreadsheetFile) : [];
  const otherFiles = cfg ? files.filter(f=>!isSpreadsheetFile(f)) : files.slice();
  const pickedList = document.getElementById('uploadPickedList');
  const MAX_INLINE = 6*1024*1024; // 6MB — larger files still recorded, just without an inline preview/download copy

  function attachOtherFiles(cb){
    if(!otherFiles.length){ cb(); return; }
    const list = loadUploads(context);
    let remaining = otherFiles.length;
    otherFiles.forEach(file=>{
      const finish = (dataUrl)=>{
        list.push({ id: uid('UP'), name:file.name, size:file.size, type:file.type||'', dataUrl: dataUrl||null, uploadedAt: new Date().toISOString() });
        remaining--;
        if(remaining===0){ saveUploads(context, list); cb(); }
      };
      if(file.size <= MAX_INLINE){
        const reader = new FileReader();
        reader.onload = ()=> finish(reader.result);
        reader.onerror = ()=> finish(null);
        reader.readAsDataURL(file);
      } else {
        finish(null);
      }
    });
  }

  function finishAll(importedCount, skippedCount){
    attachOtherFiles(()=>{
      const msgs = [];
      if(importedCount) msgs.push(importedCount+' record(s) saved into the table.');
      if(skippedCount) msgs.push(skippedCount+' row(s) skipped — Invalid PIN ID. Please select a registered employee.');
      if(otherFiles.length) msgs.push(otherFiles.length>1? otherFiles.length+' file(s) attached.' : 'File attached.');
      toast(msgs.length? msgs.join(' ') : 'Upload complete.', skippedCount ? 'error' : undefined);
      if(pickedList) pickedList.innerHTML='';
      const existing = document.getElementById('uploadExistingList'); if(existing) existing.innerHTML = uploadsListHTML(context);
      input.value='';
      renderRoute();
    });
  }

  if(sheetFiles.length){
    if(pickedList) pickedList.innerHTML = '<div style="font-size:12px;color:var(--steel-500);">Reading '+sheetFiles.length+' spreadsheet file(s)…</div>';
    importSpreadsheetFiles(context, cfg, sheetFiles, finishAll);
  } else {
    if(pickedList) pickedList.innerHTML = '<div style="font-size:12px;color:var(--steel-500);">Uploading '+files.length+' file(s)…</div>';
    finishAll(0, 0);
  }
}
function confirmDeleteUpload(context, id){
  if(!confirm('Delete this uploaded file permanently? This cannot be undone.')) return;
  saveUploads(context, loadUploads(context).filter(f=>f.id!==id));
  toast('File deleted.');
  const existing = document.getElementById('uploadExistingList'); if(existing) existing.innerHTML = uploadsListHTML(context);
  renderRoute();
}
function triggerReplaceUpload(context, id){
  // Opens the device's native file picker so the user can pick a replacement
  // from mobile storage, laptop, desktop or tablet — same as the main uploader.
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.rtf,.csv,.zip,.rar,.7z,*/*';
  input.style.display = 'none';
  input.onchange = ()=> handleReplaceFile(context, id, input);
  document.body.appendChild(input);
  input.click();
}
function handleReplaceFile(context, id, input){
  const file = (input.files||[])[0];
  document.body.removeChild(input);
  if(!file) return;
  const list = loadUploads(context);
  const idx = list.findIndex(f=>f.id===id);
  if(idx===-1) return;
  const MAX_INLINE = 6*1024*1024;
  const finish = (dataUrl)=>{
    list[idx] = { ...list[idx], name:file.name, size:file.size, type:file.type||'', dataUrl: dataUrl||null, uploadedAt: new Date().toISOString() };
    saveUploads(context, list);
    toast('File replaced.');
    const existing = document.getElementById('uploadExistingList'); if(existing) existing.innerHTML = uploadsListHTML(context);
    renderRoute();
  };
  if(file.size <= MAX_INLINE){
    const reader = new FileReader();
    reader.onload = ()=> finish(reader.result);
    reader.onerror = ()=> finish(null);
    reader.readAsDataURL(file);
  } else {
    finish(null);
  }
}

function printRows(title, headers, rows){
  const win = window.open('', '_blank');
  if(!win){ toast('Please allow pop-ups to print.', 'error'); return; }
  const styles = `body{font-family:Arial,sans-serif;padding:24px;color:#182130;} h1{font-size:18px;margin-bottom:2px;} p{color:#5d6b7e;font-size:11px;margin-top:0;margin-bottom:16px;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #c9cfd9;padding:6px 8px;font-size:11px;text-align:left;} th{background:#eef0f3;}`;
  const rowsHtml = rows.map(r=>`<tr>${headers.map(h=>`<td>${escapeHtml(r[h.key])}</td>`).join('')}</tr>`).join('');
  win.document.write(`<html><head><title>${escapeHtml(title)}</title><style>${styles}</style></head><body>
    <h1>${escapeHtml(title)}</h1><p>HMC HR Department Portal · Generated ${new Date().toLocaleString()}</p>
    <table><thead><tr>${headers.map(h=>`<th>${escapeHtml(h.label)}</th>`).join('')}</tr></thead><tbody>${rowsHtml}</tbody></table>
  </body></html>`);
  win.document.close();
  setTimeout(()=>{ win.focus(); win.print(); }, 300);
}

/* ============================================================
   ICONS — minimal stroke-based icon set (reused across the app)
   ============================================================ */
const ICONS = {
  dashboard:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  operations:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  training:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/></svg>',
  recruitment:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="3" y1="12" x2="21" y2="12"/></svg>',
  directory:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
  policies:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>',
  reports:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/></svg>',
  notifications:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
  settings:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  leave:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>',
  attendance:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>',
  travel:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2.5 1.5V22l4.5-1 4.5 1v-1.5L14 19v-5.5z"/></svg>',
  domestic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>',
  international:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15 15 0 010 20 15 15 0 010-20z"/></svg>',
  policyimpl:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
  performance:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.1-4-4L3 15.5"/></svg>',
  separation:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  offboarding:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/></svg>',
  onboarding:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>',
  manpower:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
  discipline:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>',
  audit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/><path d="M8 11l2 2 4-4"/></svg>',
  tna:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
  calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  jobanalysis:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>',
  jobdescription:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>',
  screening:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
  megaphone:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11l18-5v12L3 13v-2z"/><path d="M11.6 16.8L13 21h-3l-1-4"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>',
  briefcase:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>',
  bell2:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
  activity:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  filter:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2"/></svg>',
  eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  inbox:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  building:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="2" width="16" height="20" rx="1"/><line x1="9" y1="7" x2="9" y2="7.01"/><line x1="15" y1="7" x2="15" y2="7.01"/><line x1="9" y1="11" x2="9" y2="11.01"/><line x1="15" y1="11" x2="15" y2="11.01"/><line x1="9" y1="15" x2="9" y2="15.01"/><line x1="15" y1="15" x2="15" y2="15.01"/></svg>',
  internship:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/><path d="M12 15v6"/></svg>',
  tasks:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 10.5l2 2 4-4.5"/><line x1="7" y1="16" x2="17" y2="16"/></svg>',
  usergraduate:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M6 9.5V14c0 1.7 2.7 4 6 4s6-2.3 6-4V9.5"/><path d="M22 7v6"/></svg>',
  userplus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/></svg>',
  userminus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="17" y1="11" x2="23" y2="11"/></svg>',
  userx:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="17" y1="8" x2="23" y2="14"/><line x1="23" y1="8" x2="17" y2="14"/></svg>',
  usercheck:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></svg>',
  clockcheck:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="13" r="8"/><polyline points="11 9 11 13 13.5 14.5"/><path d="M8 3.5h6"/></svg>',
  calendarcheck:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>',
  plane:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 00-3 0V9l-8 5v2l8-2.5V19l-2.5 1.5V22l4.5-1 4.5 1v-1.5L14 19v-5.5z"/></svg>',
  trianglealert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  trendingup:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="3 17 9 11 13 15 21 6"/><polyline points="15 6 21 6 21 12"/></svg>',
  trophy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 01-10 0V4z"/><path d="M17 4h3a2 2 0 01-2 4h-1"/><path d="M7 4H4a2 2 0 002 4h1"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9 12 2"/></svg>',
  paint:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 11l-6-6-9 9v6h6l9-9z"/><path d="M13 5l6 6"/></svg>',
  buzzer:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22z"/><path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 3h16l-2-3z"/></svg>',
  circlecheck:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M8.5 12.5l2.3 2.3 4.7-4.8"/></svg>',
  triangleexclamation:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  circleexclamation:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="7.5" x2="12" y2="13"/><line x1="12" y1="16.5" x2="12.01" y2="16.5"/></svg>',
  thumbsup:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 10v12"/><path d="M15 5.88L14 10h5.83a2 2 0 011.92 2.56l-2.33 8A2 2 0 0117.5 22H7a2 2 0 01-2-2v-8a2 2 0 012-2h1.76a2 2 0 001.79-1.11L13 2a3.13 3.13 0 013 3.88z"/></svg>',
  thumbsdown:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 14V2"/><path d="M9 18.12L10 14H4.17a2 2 0 01-1.92-2.56l2.33-8A2 2 0 016.5 2H17a2 2 0 012 2v8a2 2 0 01-2 2h-1.76a2 2 0 00-1.79 1.11L11 22a3.13 3.13 0 01-3-3.88z"/></svg>',
  moneytrend:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="15" height="11" rx="2"/><circle cx="9.5" cy="12.5" r="2.3"/><path d="M16 3l6 0 0 6"/><path d="M22 3l-7 7-4-4-6 6"/></svg>',
  arrowupdots:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20L20 4"/><path d="M14 4h6v6"/><circle cx="4" cy="20" r="1.4" fill="currentColor" stroke="none"/><circle cx="10" cy="14" r="1.4" fill="currentColor" stroke="none"/><circle cx="17" cy="7" r="1.4" fill="currentColor" stroke="none"/></svg>',
};
function ic(name){ return ICONS[name] || ICONS.info; }

/* ============================================================
   NAVIGATION DATA MODEL
   ============================================================ */
const NAV = [
  { id:'dashboard', label:'Dashboard', icon:'dashboard', single:true,
    desc:'Organization-wide HR snapshot: headcount, attendance, leave and training at a glance.' },

  { id:'tasks', label:'Tasks', icon:'tasks', single:true,
    desc:'Assigned tasks, deadlines and priority tracking for HR staff and admins.' },

  { id:'admin-panel', label:'Admin Panel', icon:'settings', adminOnly:true,
    desc:'Full control system — create, assign and manage tasks, employees and system data.',
    children:[
      { id:'admin-task-control', label:'Task Control', icon:'plus', desc:'Create, assign, edit and delete tasks across the organization.' },
      { id:'admin-employees', label:'Employees & Roles', icon:'users', desc:'Manage employee accounts and role-based access.' },
      { id:'admin-activity', label:'Activity Log', icon:'activity', desc:'Audit trail of task and data changes across the system.' },
    ]
  },

  { id:'operations', label:'Operations', icon:'operations',
    desc:'Day-to-day HR operations covering the full employee lifecycle.',
    children:[
      { id:'leave-management', label:'Leave Management', icon:'calendarcheck', desc:'Employee leave applications, balances, approvals and history.' },
      { id:'attendance', label:'Attendance', icon:'clockcheck', desc:'Daily attendance logs, biometric records and shift tracking.' },
      { id:'travel', label:'Travel', icon:'plane', desc:'Official travel requests, approvals and reimbursement claims.',
        children:[
          { id:'domestic-travel', label:'Domestic Travel', icon:'domestic', desc:'Travel requests and claims within Pakistan.' },
          { id:'international-travel', label:'International Travel', icon:'international', desc:'Overseas travel requests, visas and foreign duty allowances.' },
        ]
      },
      { id:'policy-implementation', label:'Policy Implementation', icon:'policyimpl', desc:'Rollout and tracking of HR policy implementation across departments.' },
      { id:'performance', label:'Performance', icon:'trendingup', desc:'Performance appraisals, ratings, recommendations and multi-year evaluation history — fully editable, Excel-style.' },
      { id:'separation', label:'Separation', icon:'separation', desc:'Resignations, retirements and end-of-service case management.' },
      { id:'offboarding', label:'Offboarding', icon:'userminus', desc:'Exit clearance, asset return and final settlement workflow.' },
      { id:'onboarding', label:'Onboarding', icon:'userplus', desc:'New-hire induction, documentation and orientation schedule.' },
      { id:'manpower-statement', label:'Manpower Statement', icon:'users', desc:'Sanctioned vs actual manpower strength across departments.' },
      { id:'discipline', label:'Discipline', icon:'trianglealert', desc:'Disciplinary cases, inquiries and corrective actions.' },
      { id:'audit-compliance', label:'Audit Compliance', icon:'audit', desc:'HR audit findings, compliance checklists and corrective tracking.' },
    ]
  },

  { id:'training', label:'Training & Development', icon:'training',
    desc:'Capability building programs across HMC business units.',
    children:[
      { id:'tna', label:'TNA (Training Need Analysis)', icon:'tna', desc:'Departmental training needs assessment and skill-gap analysis.' },
      { id:'training-calendar', label:'Training Calendar', icon:'calendar', desc:'Scheduled training sessions, workshops and certification programs.' },
      { id:'training-announcements', label:'Training Announcements', icon:'buzzer', desc:'News and announcements about upcoming or ongoing training — alerts the whole dashboard.' },
    ]
  },

  { id:'internship', label:'Internship', icon:'usergraduate', single:true,
    desc:'Register and track interns placed across HMC departments — personal, academic and placement details.' },

  { id:'notifications', label:'Notifications', icon:'notifications', single:true,
    desc:'System alerts, approvals pending and important reminders.' },
];

/* Flat lookup: id -> {item, parent, grandparent} */
const FLAT = {};
(function buildFlat(items, parent, grand){
  items.forEach(it=>{
    FLAT[it.id] = { item:it, parent, grand };
    if(it.children) buildFlat(it.children, it, parent);
  });
})(NAV, null, null);

/* ============================================================
   SIDEBAR RENDER
   ============================================================ */
const menuRoot = document.getElementById('menuRoot');

function renderMenu(items, level){
  return items.map(it=>{
    if(it.children){
      return `
      <div class="menu-group">
        <button class="${level===0?'menu-btn':'sub-btn'}" data-toggle="${it.id}" onclick="toggleGroup('${it.id}')">
          <span class="${level===0?'mi-icon':''}">${ic(it.icon)}</span>
          <span class="${level===0?'mi-label':''}">${it.label}</span>
          <span class="${level===0?'mi-chev':'sub-chev'}">${ic('chev')}</span>
        </button>
        <div class="${level===0?'submenu':'subsubmenu'}" id="group-${it.id}">
          <div class="${level===0?'submenu-inner':'subsub-inner'}">
            ${renderMenu(it.children, level+1)}
          </div>
        </div>
      </div>`;
    }
    const cls = level===0 ? 'menu-btn' : (level===1?'sub-btn':'subsub-btn');
    const iconSpan = level===0 ? `<span class="mi-icon">${ic(it.icon)}</span>` : `<span class="sub-dot"></span>`;
    const labelSpan = level===0 ? `<span class="mi-label">${it.label}</span>` : `<span>${it.label}</span>`;
    return `<button class="${cls}" data-page="${it.id}" onclick="navigateTo('${it.id}')">${iconSpan}${labelSpan}</button>`;
  }).join('');
}
function visibleNav(){
  return NAV.filter(it => !it.adminOnly || CURRENT_ROLE === 'admin');
}
function refreshSidebarMenu(){
  menuRoot.innerHTML = renderMenu(visibleNav(), 0);
}
refreshSidebarMenu();

function toggleGroup(id){
  const groupEl = document.getElementById('group-'+id);
  const btnEl = document.querySelector(`[data-toggle="${id}"]`);
  const isOpen = groupEl.classList.contains('open');
  if(isOpen){
    groupEl.classList.remove('open');
    btnEl.classList.remove('parent-open');
  } else {
    groupEl.classList.add('open');
    btnEl.classList.add('parent-open');
  }
}

function openAncestors(id){
  let ref = FLAT[id];
  let chain = [];
  if(ref.parent) chain.push(ref.parent.id);
  if(ref.grand) chain.push(ref.grand.id);
  chain.forEach(pid=>{
    const groupEl = document.getElementById('group-'+pid);
    const btnEl = document.querySelector(`[data-toggle="${pid}"]`);
    if(groupEl && !groupEl.classList.contains('open')){
      groupEl.classList.add('open');
      btnEl.classList.add('parent-open');
    }
  });
}

function highlightActive(id){
  document.querySelectorAll('.menu-btn, .sub-btn, .subsub-btn').forEach(el=>el.classList.remove('current','active'));
  const el = document.querySelector(`[data-page="${id}"]`);
  if(el){
    el.classList.add('current');
    // mark ancestor group buttons as 'active'
    let ref = FLAT[id];
    if(ref.parent){
      const p = document.querySelector(`[data-toggle="${ref.parent.id}"]`);
      if(p) p.classList.add('active');
    }
    if(ref.grand){
      const g = document.querySelector(`[data-toggle="${ref.grand.id}"]`);
      if(g) g.classList.add('active');
    }
  }
}

/* ============================================================
   PAGE RENDERERS
   ============================================================ */
const content = document.getElementById('content');

function breadcrumbHTML(id){
  const ref = FLAT[id];
  let parts = [{label:'Home', id:'dashboard'}];
  if(ref.grand) parts.push({label:ref.grand.label, id:ref.grand.id});
  if(ref.parent) parts.push({label:ref.parent.label, id:ref.parent.id});
  parts.push({label:ref.item.label, id:id});
  return `<div class="breadcrumb">` + parts.map((p,i)=>{
    const isLast = i===parts.length-1;
    const clickable = !isLast && (p.id==='dashboard' || FLAT[p.id]?.item?.children);
    const sep = i>0 ? `<span class="sep">${ic('chev')}</span>` : '';
    if(isLast) return `${sep}<span class="current">${p.label}</span>`;
    if(clickable && p.id==='dashboard') return `${sep}<a href="javascript:void(0)" onclick="navigateTo('dashboard')">${p.label}</a>`;
    return `${sep}<span>${p.label}</span>`;
  }).join('') + `</div>`;
}

/* ---------- DASHBOARD ---------- */
/* Computes today-only attendance figures (Present / Absent / Leave) from the
   Attendance module's stored records, scoped strictly to today's date — no
   cumulative/all-time totals.
   NOTE: this reads today's snapshot on each dashboard render. When the
   Attendance module is wired for live create/update/delete events, swap the
   loadAttendance() call below for the live event-driven source so these
   three cards update in real time. */
/* Pulls live upcoming records from the Training Calendar module (loadTrainCal())
   for the dashboard's Training Schedule panel — no hardcoded rows. */
function dashboardTrainingRowsHTML(){
  const rows = loadTrainCal()
    .filter(r=>r.status!=='Cancelled')
    .sort((a,b)=> new Date(a.tentativeDate||0) - new Date(b.tentativeDate||0))
    .slice(0,4);
  if(!rows.length){
    return `<tr><td colspan="4" style="text-align:center;color:var(--steel-400);font-size:12.5px;padding:16px 0;">No training scheduled yet. <a href="javascript:void(0)" onclick="navigateTo('training-calendar')" style="color:var(--blue-600);font-weight:600;">Add one</a>.</td></tr>`;
  }
  return rows.map(r=>`<tr>
    <td><b>${escapeHtml(r.title||'—')}</b></td>
    <td>${escapeHtml(r.participantDept||'All Depts.')}</td>
    <td>${escapeHtml(r.tentativeDate||'—')}</td>
    <td>${tcalStatusPill(r.status)}</td>
  </tr>`).join('');
}
function getTodayAttendanceStats(){
  const todayDate = new Date().toISOString().slice(0,10);
  const totalEmployees = loadEmployees().length;
  const attToday = loadAttendance().filter(a=>a.date===todayDate);
  const presentToday = attToday.filter(a=>a.present && a.present.trim()!=='').length;
  const leaveToday = attToday.filter(a=>a.leave && a.leave.trim()!=='').length;
  const absentToday = Math.max(0, totalEmployees - presentToday - leaveToday);
  return { todayDate, totalEmployees, presentToday, leaveToday, absentToday };
}
function renderDashboard(){
  const todayStats = getTodayAttendanceStats();
  const pendingTaskCount = loadTasks().filter(t=>t.status==='pending').length;
  content.innerHTML = `
  <div class="page">
    <div class="banner">
      <h2>${getGreeting()}!</h2>
      <p>Welcome back. Have a productive day. Track workforce operations, approvals and organizational announcements across all HMC divisions from a single and secure dashboard.</p>
      <div class="banner-quote">Work Smarter. Manage Better.</div>
    </div>

    <div class="quick-grid">
      ${quickCard('users','icon-blue','Employees','company-wide','admin-employees',todayStats.totalEmployees)}
      ${quickCard('clockcheck','icon-green','Attendance','present today','attendance',todayStats.presentToday)}
      ${quickCard('calendarcheck','icon-amber','Leave','on leave today','leave-management',todayStats.leaveToday)}
      ${quickCard('userx','icon-red','Absent','absent today','attendance',todayStats.absentToday)}
      ${quickCard('tasks','icon-blue','Tasks','pending tasks','tasks',pendingTaskCount)}
      ${quickCard('plane','icon-red','Travel','requests & claims','travel')}
      ${quickCard('training','icon-amber','Training','calendar & TNA','training')}
      ${quickCard('usergraduate','icon-blue','Internship','intern mgmt.','internship')}
      ${quickCard('userplus','icon-green','Onboarding','new-hire setup','onboarding')}
      ${quickCard('userminus','icon-red','Offboarding','exit clearance','offboarding')}
      ${quickCard('trianglealert','icon-amber','Discipline','cases & inquiries','discipline')}
      ${quickCard('users','icon-blue','Manpower','sanctioned vs actual','manpower-statement')}
      ${quickCard('trendingup','icon-green','Performance','appraisals & ratings','performance',loadPerformance().length)}
    </div>

    <div class="panel-grid">
      <div>
        <div class="card panel">
          <div class="panel-title"><h3>Notifications</h3><a class="view-all" href="javascript:void(0)" onclick="navigateTo('notifications')">View all</a></div>
          ${dashboardNotificationsHTML()}
        </div>

        <div class="card panel" style="margin-top:20px;">
          <div class="panel-title"><h3>Training Schedule</h3><a class="view-all" href="javascript:void(0)" onclick="navigateTo('training-calendar')">Full calendar</a></div>
          <div class="table-wrap" style="border:none;">
            <table style="min-width:0;">
              <thead><tr><th>Program</th><th>Department</th><th>Dates</th><th>Status</th></tr></thead>
              <tbody>
                ${dashboardTrainingRowsHTML()}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card panel" style="margin-top:20px;">
          <div class="panel-title"><h3>Performance</h3><a class="view-all" href="javascript:void(0)" onclick="navigateTo('performance')">View all</a></div>
          ${dashboardPerformanceHTML()}
        </div>
      </div>

      <div>
        <div class="card panel">
          <div class="panel-title"><h3>${CURRENT_ROLE==='admin'?'All Tasks':'My Tasks'}</h3><a class="view-all" href="javascript:void(0)" onclick="navigateTo('tasks')">View all</a></div>
          ${dashboardTaskWidget()}
        </div>

        <div class="card panel" style="margin-top:20px;">
          <div class="panel-title"><h3>Recent Activities</h3></div>
          ${dashboardActivitiesHTML()}
        </div>
      </div>
    </div>
  </div>`;
}
function statCard(icon,tone,value,label,trendText,trendDir,sub){
  const trendClass = trendDir==='up'?'trend-up':trendDir==='down'?'trend-down':'trend-flat';
  const arrow = trendDir==='up'?'▲':trendDir==='down'?'▼':'•';
  return `<div class="card stat-card">
    <div class="stat-top">
      <div class="stat-icon ${tone}">${ic(icon)}</div>
      <span class="stat-trend ${trendClass}">${arrow} ${trendText}</span>
    </div>
    <div><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div>
    <div style="font-size:11px;color:var(--steel-400)">${sub}</div>
  </div>`;
}
/* Compact, icon-free stat card used only on the dashboard's top-of-page row
   so 4 boxes always fit on one line without affecting stat cards elsewhere. */
function miniStatCard(value,label,sub,onClickJs){
  const clickable = !!onClickJs;
  return `<div class="card mini-stat-card${clickable?' stat-card-clickable':''}" ${clickable?`onclick="${onClickJs}" title="Click to view full record"`:''}>
    <div class="mini-stat-value">${value}</div>
    <div class="mini-stat-label">${label}</div>
    <div class="mini-stat-sub">${sub}</div>
  </div>`;
}
/* Generic full-record viewer for stat cards: shows every row that matches, in a modal table. */
function viewStatRecords(title, rows, columns){
  const root = document.getElementById('empModalRoot') || (function(){ const d=document.createElement('div'); d.id='empModalRoot'; document.body.appendChild(d); return d; })();
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closeEmployeeModal()">
    <div class="modal-box modal-wide">
      <div class="modal-head"><h3>${escapeHtml(title)} (${rows.length})</h3><button class="modal-close" onclick="closeEmployeeModal()">✕</button></div>
      <div class="modal-body">
        ${rows.length ? `<div class="table-wrap" style="max-height:420px;overflow-y:auto;"><table><thead><tr>${columns.map(c=>`<th>${escapeHtml(c.label)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${columns.map(c=>`<td>${escapeHtml(String(c.get(r)!=null?c.get(r):''))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<p style="color:var(--steel-500);font-size:12.5px;">No matching records.</p>`}
      </div>
      <div class="modal-foot"><button class="btn btn-outline btn-sm" onclick="closeEmployeeModal()">Close</button></div>
    </div>
  </div>`;
}
function announceItem(icon,tone,title,desc,meta){
  return `<div class="announce-item">
    <div class="announce-badge ${tone}">${ic(icon)}</div>
    <div class="announce-body">
      <b>${title}</b>
      ${desc?`<p>${desc}</p>`:''}
      <div class="meta">${meta}</div>
    </div>
  </div>`;
}
/* Pulls live entries from the real notification/activity log (loadNotifs()) —
   the same store the Admin > Activity Log page reads from, and the same one
   addNotif() writes to whenever a task is created, updated, reassigned,
   status-changed or deleted. No hardcoded rows. */
function dashboardNotificationsHTML(){
  const list = loadNotifs().slice(0,3);
  if(!list.length){
    return `<div style="color:var(--steel-400);font-size:12.5px;padding:6px 0;">No notifications yet.</div>`;
  }
  return list.map(n=>{
    const tone = n.priority==='urgent' ? 'icon-red' : n.priority==='low' ? 'icon-blue' : 'icon-amber';
    const icon = n.type==='assignment' ? 'recruitment' : n.type==='admin' ? 'discipline' : n.type==='reminder' ? 'leave' : 'megaphone';
    return announceItem(icon, tone, n.message, '', timeAgo(n.time));
  }).join('');
}
function dashboardActivitiesHTML(){
  const list = loadNotifs().slice(0,4);
  if(!list.length){
    return `<div style="color:var(--steel-400);font-size:12.5px;padding:6px 0;">No recent activity yet — actions taken in Tasks / Task Control will show up here.</div>`;
  }
  return list.map(n=>activityItem(n.message, timeAgo(n.time))).join('');
}
function activityItem(text,time){
  return `<div class="activity-item">
    <div class="activity-dot"></div>
    <div class="activity-body"><b>${text}</b><div class="time">${time}</div></div>
  </div>`;
}
/* Compact performance snapshot for the main Dashboard — total employees
   plus a small count per rating category, each clicking through to the
   full Performance section pre-filtered. */
function perfRemarkIcon(label){
  const map = {'Outstanding':'trophy','Exceed Expectations':'star','Meet Expectations':'circlecheck','Below Expectations':'triangleexclamation','Serious Concern':'circleexclamation'};
  return map[label] || 'trendingup';
}
function dashboardPerformanceHTML(){
  const all = loadPerformance();
  if(!all.length){
    return `<div style="color:var(--steel-400);font-size:12.5px;padding:6px 0;">No performance records yet.</div>`;
  }
  const rules = loadPerfRules();
  const total = all.length;
  const cards = rules.slice(0,5).map(r=>{
    const count = all.filter(e=>{ const m = perfRemarkForPct(e.percentage); return m && m.label===r.label; }).length;
    const fg = r.color && r.color.startsWith('#') ? r.color : (PERF_RULE_COLORS[r.color] || PERF_RULE_COLORS.steel).fg;
    return `<div class="card mini-stat-card dash-card-clickable" style="cursor:pointer;display:flex;flex-direction:row;align-items:center;gap:10px;" onclick="navigateTo('performance')">
      <div class="stat-icon-wrap" style="width:30px;height:30px;flex:none;border-radius:8px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb, ${fg} 14%, white);color:${fg};">${ic(perfRemarkIcon(r.label))}</div>
      <div style="min-width:0;flex:1;overflow:hidden;">
        <div class="mini-stat-value" style="color:${fg};">${count}</div>
        <div class="mini-stat-label" style="white-space:normal;word-break:break-word;">${escapeHtml(r.label)}</div>
        <div class="mini-stat-sub">of ${total} employees</div>
      </div>
    </div>`;
  }).join('');
  return `<div class="mini-stat-grid" style="grid-template-columns:repeat(${Math.min(5, rules.length)},minmax(0,1fr));margin-bottom:0;">${cards}</div>`;
}
function quickCard(icon,tone,title,sub,target,count){
  return `<div class="card quick-card" onclick="navigateTo('${target}')">
    ${(count!==undefined && count!==null) ? `<div class="qcount">${count}</div>` : ''}
    <div class="qi ${tone}">${ic(icon)}</div>
    <div><b>${title}</b><span>${sub}</span></div>
  </div>`;
}
function todayString(){
  const d = new Date();
  return d.toLocaleDateString('en-US',{weekday:'long', year:'numeric', month:'long', day:'numeric'});
}

/* ---------- Dynamic greeting, live clock & last-login ---------- */
function getGreeting(){
  const h = new Date().getHours();
  if(h>=5 && h<12) return 'Good Morning';
  if(h>=12 && h<17) return 'Good Afternoon';
  if(h>=17 && h<21) return 'Good Evening';
  return 'Good Night';
}
function getGreetingName(){
  const name = getDisplayName(CURRENT_USERNAME);
  if(name) return name.split(' ')[0];
  return 'HR Team';
}
function formatClockTime(d){
  return d.toLocaleTimeString('en-US',{hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true});
}
function updateHeaderClock(){
  const dateEl = document.getElementById('hdtDate');
  const timeEl = document.getElementById('hdtTime');
  if(!dateEl || !timeEl) return;
  const now = new Date();
  dateEl.textContent = now.toLocaleDateString('en-US',{weekday:'long', day:'2-digit', month:'long', year:'numeric'});
  timeEl.textContent = formatClockTime(now);
}
function getLastLoginDisplay(){
  const raw = localStorage.getItem('hmc_prev_login_'+CURRENT_USERNAME);
  if(!raw) return 'Last Login: First session';
  const d = new Date(raw);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const y = new Date(now); y.setDate(now.getDate()-1);
  const isYesterday = d.toDateString() === y.toDateString();
  const timeStr = formatClockTime(d);
  if(isToday) return 'Last Login: Today at '+timeStr;
  if(isYesterday) return 'Last Login: Yesterday at '+timeStr;
  return 'Last Login: '+d.toLocaleDateString('en-US',{month:'short', day:'2-digit', year:'numeric'})+' at '+timeStr;
}
function recordLoginTimestamp(username){
  const prev = localStorage.getItem('hmc_last_login_'+username);
  localStorage.setItem('hmc_prev_login_'+username, prev || '');
  localStorage.setItem('hmc_last_login_'+username, new Date().toISOString());
}

/* ---------- UPLOAD-ONLY MODULE PAGE (Policy Implementation / Separation) ---------- */
function renderUploadPage(id){
  const ref = FLAT[id];
  const it = ref.item;
  const sectionLabel = ref.grand ? ref.grand.label : (ref.parent ? ref.parent.label : it.label);

  content.innerHTML = `
  <div class="page">
    ${breadcrumbHTML(id)}
    <div class="page-head">
      <div>
        <div class="page-tag">${sectionLabel}</div>
        <h1>${it.label}</h1>
        <p class="page-desc">${it.desc || ''}</p>
      </div>
      <div class="toolbar-actions">
        ${uploadButtonHTML(id, 'Upload Document')}
      </div>
    </div>

    <div class="info-strip">
      ${ic('info')}
      <span>Browse and upload PDF, Excel, Word, PowerPoint, image, brochure, flyer, ZIP or any other standard document related to ${it.label.toLowerCase()} — from your phone, tablet, laptop or desktop. Uploaded files can be downloaded, replaced or removed at any time.</span>
    </div>

    <div id="uploadsListWrap_${id}">
      ${uploadsListHTML(id)}
    </div>
  </div>`;
}

/* ============================================================
   MANPOWER STATEMENT — Operations → Manpower Statement
   Fully editable, Excel-sheet-like module: add/delete rows,
   edit cells inline, auto-save to localStorage, import/export
   .xlsx/.xls/.csv, and search/filter across departments.

   DYNAMIC COLUMNS (scoped to this module only):
   Built-in columns (Sr. No., Department, Sanctioned Strength,
   Actual Strength, Vacant/Surplus, Remarks) are permanent and
   power the totals/vacancy math, so they're protected from
   deletion. Any column added via "Add New Column" is a custom,
   free-text column that can later be removed via "Delete Column".
   The custom-column list is persisted separately from the row
   data so the table, the row data, and (implicitly) the add-row
   "form" — which here is just the new row's inline cells — always
   stay in sync after a refresh.
   ============================================================ */
const LS_MANPOWER = 'hmc_manpower_v1';
const LS_MANPOWER_CUSTOM_COLS = 'hmc_manpower_customcols_v1';
const LS_MANPOWER_HIDDEN_CORE = 'hmc_manpower_hiddencore_v1';
const MANPOWER_CORE_HEADERS = [
  {key:'sr', label:'Sr. No.', core:true, computed:true, alwaysOn:true},
  {key:'department', label:'Department', core:true},
  {key:'sanctioned', label:'Sanctioned Strength', core:true, type:'number'},
  {key:'actual', label:'Actual Strength', core:true, type:'number'},
  {key:'vacant', label:'Vacant / Surplus', core:true, computed:true, alwaysOn:true},
  {key:'remarks', label:'Remarks', core:true},
];
const MANPOWER_STATE = { search:'' };

function loadManpowerCustomCols(){
  try{ const raw = localStorage.getItem(LS_MANPOWER_CUSTOM_COLS); if(raw){ const p=JSON.parse(raw); return Array.isArray(p)?p.filter(c=>c && c.key):[]; } }catch(e){}
  return [];
}
function saveManpowerCustomCols(list){ localStorage.setItem(LS_MANPOWER_CUSTOM_COLS, JSON.stringify(list)); }
function loadManpowerHiddenCore(){
  try{ const raw = localStorage.getItem(LS_MANPOWER_HIDDEN_CORE); if(raw){ const p=JSON.parse(raw); return Array.isArray(p)?p:[]; } }catch(e){}
  return [];
}
function saveManpowerHiddenCore(list){ localStorage.setItem(LS_MANPOWER_HIDDEN_CORE, JSON.stringify(list)); }
/* Core columns can be hidden (removed from view) and restored by re-adding
   a column with the same name — their underlying data is preserved so the
   Sanctioned/Actual totals and Vacant/Surplus math never break. */
function manpowerVisibleCoreHeaders(){
  const hidden = loadManpowerHiddenCore();
  return MANPOWER_CORE_HEADERS.filter(h => h.alwaysOn || !hidden.includes(h.key));
}
/* Full, live column list for this module: visible core (fixed) + custom (user-managed). */
function manpowerAllHeaders(){
  return [...manpowerVisibleCoreHeaders(), ...loadManpowerCustomCols().map(c=>({...c, core:false}))];
}

function seedManpower(){
  return [
    { id: uid('MP'), department:'Machine Shop', sanctioned:120, actual:104, remarks:'Recruitment in progress for CNC operators.' },
    { id: uid('MP'), department:'Foundry', sanctioned:95, actual:97, remarks:'Surplus absorbed from Forge section.' },
    { id: uid('MP'), department:'Production', sanctioned:60, actual:52, remarks:'' },
    { id: uid('MP'), department:'HR Department', sanctioned:18, actual:16, remarks:'2 positions under interview stage.' },
    { id: uid('MP'), department:'Quality Assurance', sanctioned:30, actual:29, remarks:'' },
  ];
}
function loadManpower(){
  try{
    const raw = localStorage.getItem(LS_MANPOWER);
    if(raw) return JSON.parse(raw);
    const seeded = seedManpower();
    localStorage.setItem(LS_MANPOWER, JSON.stringify(seeded));
    return seeded;
  }catch(e){ return seedManpower(); }
}
function saveManpower(list){ localStorage.setItem(LS_MANPOWER, JSON.stringify(list)); }
function manpowerVacant(r){ return (parseFloat(r.sanctioned)||0) - (parseFloat(r.actual)||0); }
function manpowerFilteredRows(){
  const all = loadManpower();
  const customKeys = loadManpowerCustomCols().map(c=>c.key);
  return searchRows(all, MANPOWER_STATE.search, ['department','remarks', ...customKeys]);
}
function manpowerSetSearch(v, el){ const pos = el?el.selectionStart:null; MANPOWER_STATE.search=v; renderManpowerStatement(); refocusSearch('manpowerSearchInput', pos); }

function manpowerCellHTML(r, h, idx){
  if(h.key==='sr') return `<td style="font-family:var(--font-mono);">${idx+1}</td>`;
  if(h.key==='vacant') return `<td><span class="balance-pill ${manpowerVacant(r)>0?'balance-neg':manpowerVacant(r)<0?'balance-pos':'balance-zero'}">${manpowerVacant(r)}</span></td>`;
  if(h.key==='sanctioned' || h.key==='actual') return `<td><input type="number" value="${r[h.key]!=null?r[h.key]:0}" onblur="manpowerUpdateCell('${r.id}','${h.key}', this.value)" style="border:none;background:transparent;width:80px;font:inherit;color:inherit;" /></td>`;
  return `<td><input type="text" value="${escapeHtml(r[h.key]||'')}" onblur="manpowerUpdateCell('${r.id}','${h.key}', this.value)" placeholder="—" style="border:none;background:transparent;width:100%;font:inherit;color:inherit;" /></td>`;
}
function renderManpowerStatement(){
  const id = 'manpower-statement';
  const ref = FLAT[id];
  const it = ref.item;
  const sectionLabel = ref.grand ? ref.grand.label : (ref.parent ? ref.parent.label : it.label);
  const rows = manpowerFilteredRows();
  const headers = manpowerAllHeaders();
  const colCount = headers.length + 1; /* +1 for Actions */
  const totalSanctioned = rows.reduce((s,r)=>s+(parseFloat(r.sanctioned)||0),0);
  const totalActual = rows.reduce((s,r)=>s+(parseFloat(r.actual)||0),0);

  content.innerHTML = `
  <div class="page">
    ${breadcrumbHTML(id)}
    <div class="page-head">
      <div>
        <div class="page-tag">${sectionLabel}</div>
        <h1>${it.label}</h1>
        <p class="page-desc">${it.desc || 'Sanctioned vs actual manpower strength across departments — works like an editable spreadsheet.'}</p>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('manpowerImportInput').click()">${ic('inbox')} Import Excel/CSV/Word</button>
        <input type="file" id="manpowerImportInput" accept=".xlsx,.xls,.csv,.doc,.docx" style="display:none" onchange="manpowerImportFile(this)" />
        <button class="btn btn-outline btn-sm" onclick="printRows('Manpower Statement', manpowerAllHeaders(), manpowerExportRows())">${ic('reports')} Print</button>
        ${downloadMenuHTML('manpower', "exportRowsToExcel('manpower-statement', manpowerAllHeaders(), manpowerExportRows())", "exportRowsToPDF('manpower-statement','Manpower Statement', manpowerAllHeaders(), manpowerExportRows())")}
        <button class="btn btn-solid btn-sm" onclick="manpowerAddRow()">${ic('plus')} Add Row</button>
      </div>
    </div>

    <div class="info-strip">
      ${ic('info')}
      <span>Click any cell to edit it directly — changes save automatically. Use <b>Add Row</b> / the trash icon to add or remove departments, and <b>Import Excel/CSV</b> to bulk-load a statement (columns matched by header: Department, Sanctioned Strength, Actual Strength, Remarks).</span>
    </div>

    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-field">
          ${ic('search')}
          <input type="text" id="manpowerSearchInput" placeholder="Search department or remarks…" value="${escapeHtml(MANPOWER_STATE.search)}" oninput="manpowerSetSearch(this.value, this)" />
        </div>
        <button class="btn btn-outline btn-sm" onclick="openAddManpowerColumnModal()">${ic('plus')} Add New Column</button>
        <button class="btn btn-danger-outline btn-sm" onclick="openDeleteManpowerColumnModal()">${ic('trash')} Delete Column</button>
      </div>
      <div style="font-size:12.5px;color:var(--steel-500);font-weight:600;">
        Total Sanctioned: <span style="color:var(--text-strong);">${totalSanctioned}</span> &nbsp;·&nbsp;
        Total Actual: <span style="color:var(--text-strong);">${totalActual}</span> &nbsp;·&nbsp;
        Net: <span style="color:${(totalSanctioned-totalActual)>=0?'var(--red)':'var(--green)'};">${totalSanctioned-totalActual}</span>
      </div>
    </div>

    <div class="table-wrap crud-table-scroll">
      <table>
        <thead>
          <tr>
            ${headers.map(h=>`<th>${escapeHtml(h.label)}</th>`).join('')}<th style="text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map((r,i)=>`
            <tr>
              ${headers.map(h=>manpowerCellHTML(r,h,i)).join('')}
              <td style="text-align:right;"><button class="mini-btn" title="Delete row" onclick="manpowerDeleteRow('${r.id}')">${ic('trash')}</button></td>
            </tr>`).join('') : `<tr><td colspan="${colCount}"><div class="empty-state"><div class="es-icon">${ic('inbox')}</div><h4>No rows yet</h4><p>Click <b>Add Row</b> to start building the manpower statement, or import an Excel/CSV file.</p></div></td></tr>`}
        </tbody>
      </table>
    </div>

    <div class="page-footer">
      <span>HMC HR Department Portal · ${sectionLabel} / ${it.label}</span>
      <span>${rows.length} department${rows.length===1?'':'s'} listed</span>
    </div>
  </div>
  <div id="manpowerColModalRoot"></div>`;
}
function manpowerExportRows(){
  const customCols = loadManpowerCustomCols();
  return manpowerFilteredRows().map((r,i)=>{
    const out = { sr:i+1, department:r.department, sanctioned:r.sanctioned, actual:r.actual, vacant:manpowerVacant(r), remarks:r.remarks||'' };
    customCols.forEach(c=>{ out[c.key] = r[c.key]!=null ? r[c.key] : ''; });
    return out;
  });
}
function manpowerAddRow(){
  const list = loadManpower();
  const rec = { id: uid('MP'), department:'New Department', sanctioned:0, actual:0, remarks:'' };
  /* Dynamically include every currently-active custom column on the new row,
     so the row's inline "form" always matches the live table structure. */
  loadManpowerCustomCols().forEach(c=>{ rec[c.key] = ''; });
  list.push(rec);
  saveManpower(list);
  toast('Row added.');
  renderManpowerStatement();
}
function manpowerDeleteRow(id){
  if(!confirm('Delete this row permanently? This cannot be undone.')) return;
  saveManpower(loadManpower().filter(x=>x.id!==id));
  toast('Row deleted.');
  renderManpowerStatement();
}
function manpowerUpdateCell(id, field, value){
  const list = loadManpower();
  const r = list.find(x=>x.id===id);
  if(!r) return;
  if(field==='sanctioned' || field==='actual'){ const n = parseFloat(value); r[field] = isNaN(n) ? 0 : n; }
  else { r[field] = value; }
  saveManpower(list);
  renderManpowerStatement();
}
function manpowerImportFile(input){
  const file = input.files && input.files[0];
  if(!file) return;
  const isWord = /\.docx?$/i.test(file.name);
  if(isWord){
    importRowsFromWord(file, (tableRows)=>{
      if(!tableRows.length){ toast('No rows found in that Word file.', 'error'); input.value=''; return; }
      const head = tableRows[0];
      const rawRows = tableRows.slice(1).map(cells=>{ const o={}; head.forEach((h,i)=>o[h]=cells[i]||''); return o; });
      manpowerImportRawRows(rawRows);
      input.value='';
    });
    return;
  }
  if(typeof XLSX === 'undefined'){ toast('Excel/CSV library failed to load. Check your internet connection.', 'error'); return; }
  const isCsv = /\.csv$/i.test(file.name);
  const reader = new FileReader();
  reader.onload = (e)=>{
    try{
      const wb = isCsv ? XLSX.read(e.target.result, { type:'string' }) : XLSX.read(e.target.result, { type:'array', cellDates:true });
      const rawRows = parseWorkbookRows(wb);
      if(!rawRows.length){ toast('No rows found in that file.', 'error'); input.value=''; return; }
      manpowerImportRawRows(rawRows);
      input.value='';
      toast('File imported.');
    }catch(err){ toast('Import failed: '+err.message, 'error'); }
  };
  if(isCsv) reader.readAsText(file); else reader.readAsArrayBuffer(file);
}
function manpowerImportRawRows(rawRows){
      const list = loadManpower();
      let imported = 0;
      rawRows.forEach(rowObj=>{
        let department, sanctioned, actual, remarks;
        for(const k in rowObj){
          const nk = normLabel(k);
          if(nk.includes('department')) department = rowObj[k];
          else if(nk.includes('sanction')) sanctioned = rowObj[k];
          else if(nk.includes('actual')) actual = rowObj[k];
          else if(nk.includes('remark')) remarks = rowObj[k];
        }
        if(!department) return;
        const sN = parseFloat(sanctioned); const aN = parseFloat(actual);
        const existing = list.find(x=>String(x.department).trim().toLowerCase()===String(department).trim().toLowerCase());
        if(existing){ existing.sanctioned = isNaN(sN)?existing.sanctioned:sN; existing.actual = isNaN(aN)?existing.actual:aN; if(remarks) existing.remarks = remarks; }
        else {
          const rec = { id: uid('MP'), department:String(department).trim(), sanctioned: isNaN(sN)?0:sN, actual: isNaN(aN)?0:aN, remarks: remarks||'' };
          loadManpowerCustomCols().forEach(c=>{ rec[c.key] = ''; });
          list.push(rec);
        }
        imported++;
      });
      saveManpower(list);
      toast(imported+' row(s) imported successfully.');
      renderManpowerStatement();
}

/* ---------- Dynamic column management (Manpower Statement only) ---------- */
function closeManpowerColModal(){ const r=document.getElementById('manpowerColModalRoot'); if(r) r.innerHTML=''; }

function openAddManpowerColumnModal(){
  const root = document.getElementById('manpowerColModalRoot') || (function(){ const d=document.createElement('div'); d.id='manpowerColModalRoot'; document.body.appendChild(d); return d; })();
  const hiddenCore = loadManpowerHiddenCore();
  const restorable = MANPOWER_CORE_HEADERS.filter(h=>hiddenCore.includes(h.key));
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closeManpowerColModal()">
    <div class="modal-box" style="max-width:420px;">
      <div class="modal-head"><h3>Add New Column</h3><button class="modal-close" onclick="closeManpowerColModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <label>Column Name *</label>
          <input type="text" id="newManpowerColName" placeholder="e.g. Shift, Grade, Location" onkeydown="if(event.key==='Enter'){ event.preventDefault(); confirmAddManpowerColumn(); }" />
        </div>
        <p style="font-size:12.5px;color:var(--steel-500);margin:0;">The new column is added to the table immediately and will appear on every row, including future ones.</p>
        ${restorable.length ? `
        <div class="form-row" style="margin-top:14px;">
          <label>Or Restore a Removed Column</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${restorable.map(h=>`<button type="button" class="btn btn-outline btn-sm" onclick="restoreManpowerCoreColumn('${h.key}')">${ic('plus')} ${escapeHtml(h.label)}</button>`).join('')}
          </div>
        </div>` : ''}
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" onclick="closeManpowerColModal()">Cancel</button>
        <button class="btn btn-solid btn-sm" onclick="confirmAddManpowerColumn()">${ic('plus')} Add Column</button>
      </div>
    </div>
  </div>`;
  setTimeout(()=>{ const el=document.getElementById('newManpowerColName'); if(el) el.focus(); }, 30);
}
function restoreManpowerCoreColumn(key){
  saveManpowerHiddenCore(loadManpowerHiddenCore().filter(k=>k!==key));
  const h = MANPOWER_CORE_HEADERS.find(x=>x.key===key);
  toast('Column "'+(h?h.label:key)+'" restored.');
  closeManpowerColModal();
  renderManpowerStatement();
}
function confirmAddManpowerColumn(){
  const input = document.getElementById('newManpowerColName');
  const name = (input?input.value:'').trim();
  if(!name){ toast('Column name cannot be empty.', 'error'); return; }
  const existingLabels = manpowerAllHeaders().map(h=>String(h.label||'').trim().toLowerCase());
  if(existingLabels.includes(name.toLowerCase())){ toast('A column with that name already exists.', 'error'); return; }
  /* If this name matches a hidden core column, restore it instead of creating a duplicate. */
  const hiddenCore = loadManpowerHiddenCore();
  const restoreMatch = MANPOWER_CORE_HEADERS.find(h=>hiddenCore.includes(h.key) && h.label.trim().toLowerCase()===name.toLowerCase());
  if(restoreMatch){ restoreManpowerCoreColumn(restoreMatch.key); return; }
  const key = 'custom_' + Date.now().toString(36) + Math.floor(Math.random()*99999);
  const cols = loadManpowerCustomCols();
  cols.push({ key, label:name });
  saveManpowerCustomCols(cols);
  /* Sync all existing records with the new column so data storage stays consistent. */
  const rows = loadManpower();
  rows.forEach(r=>{ if(!(key in r)) r[key] = ''; });
  saveManpower(rows);
  toast('Column "'+name+'" added.');
  closeManpowerColModal();
  renderManpowerStatement();
}

function openDeleteManpowerColumnModal(){
  const custom = loadManpowerCustomCols();
  const deletableCore = manpowerVisibleCoreHeaders().filter(h=>!h.alwaysOn);
  const options = [...deletableCore.map(h=>({key:h.key, label:h.label, isCore:true})), ...custom.map(c=>({key:c.key, label:c.label, isCore:false}))];
  if(!options.length){ toast('No columns available to delete — Sr. No. and Vacant/Surplus are always kept since totals depend on them.', 'error'); return; }
  const root = document.getElementById('manpowerColModalRoot') || (function(){ const d=document.createElement('div'); d.id='manpowerColModalRoot'; document.body.appendChild(d); return d; })();
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closeManpowerColModal()">
    <div class="modal-box" style="max-width:420px;">
      <div class="modal-head"><h3>Delete Column</h3><button class="modal-close" onclick="closeManpowerColModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <label>Select Column to Delete</label>
          <select id="delManpowerColSelect">
            ${options.map(o=>`<option value="${escapeHtml(o.key)}" data-core="${o.isCore?'1':'0'}">${escapeHtml(o.label)}</option>`).join('')}
          </select>
        </div>
        <p style="font-size:12.5px;color:var(--steel-500);margin:0;">Sr. No. and Vacant/Surplus are always kept, since totals and the vacancy calculation depend on them. Any other column — built-in or custom — can be removed and later restored (or re-added) from the Add New Column dialog.</p>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" onclick="closeManpowerColModal()">Cancel</button>
        <button class="btn btn-danger-outline btn-sm" onclick="confirmDeleteManpowerColumn()">${ic('trash')} Delete Column</button>
      </div>
    </div>
  </div>`;
}
function confirmDeleteManpowerColumn(){
  const sel = document.getElementById('delManpowerColSelect');
  if(!sel || !sel.value){ toast('Select a column to delete.', 'error'); return; }
  const key = sel.value;
  const isCore = sel.selectedOptions && sel.selectedOptions[0] && sel.selectedOptions[0].dataset.core==='1';
  const label = sel.selectedOptions && sel.selectedOptions[0] ? sel.selectedOptions[0].textContent : key;
  if(!confirm(`Delete column "${label}"? This removes it from the table. This cannot be undone for custom columns; built-in columns can be restored later from "Add New Column".`)) return;
  if(isCore){
    const hidden = loadManpowerHiddenCore();
    if(!hidden.includes(key)) hidden.push(key);
    saveManpowerHiddenCore(hidden);
  } else {
    const cols = loadManpowerCustomCols();
    saveManpowerCustomCols(cols.filter(c=>c.key!==key));
    /* Remove the field from every existing record so stored data and the table stay in sync. */
    const rows = loadManpower();
    rows.forEach(r=>{ delete r[key]; });
    saveManpower(rows);
  }
  toast('Column "'+label+'" deleted.');
  closeManpowerColModal();
  renderManpowerStatement();
}

/* ============================================================
   TRAVEL MODULE — Operations → Travel
   Domestic Travel / International Travel, each with
   Travel Order / Advance / Expense (TA/DA) sub-sections and
   full add / edit / delete / save CRUD.
   ============================================================ */
const LS_TRAVEL = 'hmc_travel_v1';
const LS_TRAVEL_ORDER_SEQ = 'hmc_travel_order_seq_v1';
const TRAVEL_SUBS = [
  { key:'order', label:'Travel Order' },
  { key:'advance', label:'Advance' },
  { key:'expense', label:'Expense (TA/DA)' },
];
const TRAVEL_EXTRA_HEADERS = [
  {key:'dateOfDeparture', label:'Date of Departure'}, {key:'dateOfArrival', label:'Date of Arrival'},
  {key:'totalTravelDays', label:'Total Travel Days'}, {key:'actualReturnDate', label:'Actual Return Date'},
  {key:'extraDaysStayed', label:'Extra Days Stayed'}, {key:'reasonForExtendedStay', label:'Reason for Extended Stay'},
  {key:'reasonOtherComment', label:'Other — Comment'}, {key:'approvalStatus', label:'Approval Status'}, {key:'pendingWith', label:'Pending With'},
];
const DOMESTIC_TRAVEL_HEADERS = [
  {key:'sr', label:'Sr. No.'}, {key:'travelOrderNo', label:'Travel Order Number'}, {key:'pin', label:'PIN'}, {key:'name', label:'Employee Name'},
  {key:'designation', label:'Designation'}, {key:'department', label:'Department'}, {key:'description', label:'Description'},
  {key:'cityFrom', label:'City From'}, {key:'cityTo', label:'City To'}, {key:'dateOfOrder', label:'Date of Travel Order'},
  ...TRAVEL_EXTRA_HEADERS,
];
const INTL_TRAVEL_HEADERS = [
  {key:'sr', label:'Sr. No.'}, {key:'travelOrderNo', label:'Travel Order Number'}, {key:'pin', label:'PIN'}, {key:'name', label:'Employee Name'},
  {key:'designation', label:'Designation'}, {key:'department', label:'Department'}, {key:'description', label:'Description'},
  {key:'countryFrom', label:'Country From'}, {key:'countryTo', label:'Country To'}, {key:'duration', label:'Duration of Visit'},
  {key:'time', label:'Time'}, {key:'dateOfOrder', label:'Date of Travel Order'},
  ...TRAVEL_EXTRA_HEADERS,
];
/* Generates the next unique Travel Order Number in the format TO-YYYY-#### .
   The sequence resets to 0001 for each new calendar year and is shared
   across Domestic/International scopes and Order/Advance/Expense sub-tabs,
   so every travel request created anywhere in the system gets a globally
   unique, sequential, system-assigned number that users cannot edit. */
function generateTravelOrderNumber(){
  const year = nowYear();
  let state = {};
  try{
    const raw = localStorage.getItem(LS_TRAVEL_ORDER_SEQ);
    if(raw) state = JSON.parse(raw);
  }catch(e){}
  if(!state || state.year !== year){ state = { year, seq: 0 }; }
  state.seq += 1;
  localStorage.setItem(LS_TRAVEL_ORDER_SEQ, JSON.stringify(state));
  return 'TO-'+year+'-'+String(state.seq).padStart(4,'0');
}
function travelDaysBetween(d1,d2){
  if(!d1||!d2) return null;
  const ms = new Date(d2+'T00:00:00') - new Date(d1+'T00:00:00');
  return Math.round(ms/86400000);
}
function travelHeaders(scope){ return scope==='domestic' ? DOMESTIC_TRAVEL_HEADERS : INTL_TRAVEL_HEADERS; }
function travelScopeLabel(scope){ return scope==='domestic' ? 'Domestic' : 'International'; }

function loadTravelAll(){
  try{
    const raw = localStorage.getItem(LS_TRAVEL);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  const seed = { domestic:{order:[],advance:[],expense:[]}, international:{order:[],advance:[],expense:[]} };
  saveTravelAll(seed);
  return seed;
}
function saveTravelAll(all){ localStorage.setItem(LS_TRAVEL, JSON.stringify(all)); }
function travelList(scope, sub){ const all = loadTravelAll(); return (all[scope] && all[scope][sub]) || []; }
function travelSaveList(scope, sub, list){
  const all = loadTravelAll();
  if(!all[scope]) all[scope] = { order:[], advance:[], expense:[] };
  all[scope][sub] = list;
  saveTravelAll(all);
}

const TRAVEL_STATE = {
  domestic: { activeSub:'order',
    order:{page:1,pageSize:8,sortKey:'name',sortDir:'asc',search:''},
    advance:{page:1,pageSize:8,sortKey:'name',sortDir:'asc',search:''},
    expense:{page:1,pageSize:8,sortKey:'name',sortDir:'asc',search:''} },
  international: { activeSub:'order',
    order:{page:1,pageSize:8,sortKey:'name',sortDir:'asc',search:''},
    advance:{page:1,pageSize:8,sortKey:'name',sortDir:'asc',search:''},
    expense:{page:1,pageSize:8,sortKey:'name',sortDir:'asc',search:''} },
};
function travelFilteredSorted(scope, sub){
  const st = TRAVEL_STATE[scope][sub];
  let rows = travelList(scope, sub);
  rows = searchRows(rows, st.search, ['pin','name','designation','department','description']);
  rows = sortRows(rows, st.sortKey, st.sortDir);
  return rows;
}
function travelExportExcel(scope, sub){
  exportRowsToExcel('travel-'+scope+'-'+sub, travelHeaders(scope), travelFilteredSorted(scope, sub));
}
function travelExportPDF(scope, sub){
  const label = TRAVEL_SUBS.find(s=>s.key===sub).label;
  exportRowsToPDF('travel-'+scope+'-'+sub, travelScopeLabel(scope)+' Travel — '+label, travelHeaders(scope), travelFilteredSorted(scope, sub));
}
function travelExportWord(scope, sub){
  const label = TRAVEL_SUBS.find(s=>s.key===sub).label;
  exportRowsToWord('travel-'+scope+'-'+sub, travelScopeLabel(scope)+' Travel — '+label, travelHeaders(scope), travelFilteredSorted(scope, sub));
}
function travelPrint(scope, sub){
  const label = TRAVEL_SUBS.find(s=>s.key===sub).label;
  printRows(travelScopeLabel(scope)+' Travel — '+label, travelHeaders(scope), travelFilteredSorted(scope, sub));
}
/* Combined Travel Report: merges Order + Advance + Expense rows for a scope
   (Domestic or International) into one consolidated single-person-friendly
   report, tagged by record type, instead of three separate exports. */
function travelCombinedRows(scope){
  const rows = [];
  TRAVEL_SUBS.forEach(s=>{
    travelList(scope, s.key).forEach(r=>rows.push({ ...r, recordType: s.label }));
  });
  return rows;
}
function travelCombinedHeaders(scope){
  return [{key:'recordType', label:'Record Type'}, ...travelHeaders(scope)];
}
function travelReportPrint(scope){
  printRows(travelScopeLabel(scope)+' Travel — Full Report', travelCombinedHeaders(scope), travelCombinedRows(scope));
}
function travelReportExcel(scope){
  exportRowsToExcel('travel-'+scope+'-report', travelCombinedHeaders(scope), travelCombinedRows(scope));
}
function travelReportPDF(scope){
  exportRowsToPDF('travel-'+scope+'-report', travelScopeLabel(scope)+' Travel — Full Report', travelCombinedHeaders(scope), travelCombinedRows(scope));
}

function renderTravelHub(){
  content.innerHTML = `
  <div class="page">
    ${breadcrumbHTML('travel')}
    <div class="page-head">
      <div>
        <div class="page-tag">Operations</div>
        <h1>Travel</h1>
        <p class="page-desc">Official travel requests, approvals and reimbursement claims — separated into Domestic and International travel, each covering Travel Order, Advance and Expense (TA/DA).</p>
      </div>
    </div>
    <div class="scope-cards">
      <div class="scope-card" onclick="navigateTo('domestic-travel')">
        <h3>${ic('domestic')} Domestic Travel</h3>
        <p>Travel Order, Advance and Expense (TA/DA) claims for travel within Pakistan.</p>
      </div>
      <div class="scope-card" onclick="navigateTo('international-travel')">
        <h3>${ic('international')} International Travel</h3>
        <p>Travel Order, Advance and Expense (TA/DA) claims for overseas visits.</p>
      </div>
    </div>
  </div>`;
}

function renderTravelScope(id){
  const scope = id==='domestic-travel' ? 'domestic' : 'international';
  const label = travelScopeLabel(scope)+' Travel';
  const sub = TRAVEL_STATE[scope].activeSub;

  content.innerHTML = `
  <div class="page">
    ${breadcrumbHTML(id)}
    <div class="page-head">
      <div>
        <div class="page-tag">Operations · Travel</div>
        <h1>${label}</h1>
        <p class="page-desc">Manage ${label.toLowerCase()} records across Travel Order, Advance and Expense (TA/DA). Add, edit, delete and save entries manually.</p>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-outline btn-sm" onclick="travelReportPrint('${scope}')" title="One combined report of Order + Advance + Expense records">${ic('reports')} Travel Report</button>
        ${downloadMenuHTML('travelreport_'+scope, `travelReportExcel('${scope}')`, `travelReportPDF('${scope}')`)}
      </div>
    </div>
    <div class="travel-tabs">
      ${TRAVEL_SUBS.map(s=>`<button class="travel-tab ${sub===s.key?'active':''}" onclick="travelSetTab('${scope}','${s.key}')">${s.label}</button>`).join('')}
    </div>
    <div id="travelTableWrap"></div>
  </div>
  <div id="travelModalRoot"></div>`;

  renderTravelTable(scope, sub);
}
function travelSetTab(scope, sub){
  TRAVEL_STATE[scope].activeSub = sub;
  renderTravelScope(scope==='domestic' ? 'domestic-travel' : 'international-travel');
}
function travelSort(scope, sub, key){
  const st = TRAVEL_STATE[scope][sub];
  if(st.sortKey===key){ st.sortDir = st.sortDir==='asc'?'desc':'asc'; } else { st.sortKey=key; st.sortDir='asc'; }
  renderTravelTable(scope, sub);
}
function travelSetPage(scope, sub, p){ TRAVEL_STATE[scope][sub].page = p; renderTravelTable(scope, sub); }
function travelSetSearch(scope, sub, v, el){ const pos = el?el.selectionStart:null; TRAVEL_STATE[scope][sub].search = v; TRAVEL_STATE[scope][sub].page = 1; renderTravelTable(scope, sub); refocusSearch('travelSearchInput-'+scope+'-'+sub, pos); }

function renderTravelTable(scope, sub){
  const headers = travelHeaders(scope);
  const st = TRAVEL_STATE[scope][sub];
  const filtered = travelFilteredSorted(scope, sub);
  const { pageRows, page, total } = paginateRows(filtered, st.page, st.pageSize);
  const withSr = pageRows.map((r,i)=>({...r, sr:(page-1)*st.pageSize+i+1}));
  const wrap = document.getElementById('travelTableWrap');
  if(!wrap) return;
  const uidStr = `travel_${scope}_${sub}`;

  wrap.innerHTML = `
    <div class="crud-toolbar">
      <div class="ctb-left">
        <div class="search-field" style="max-width:320px;">
          ${ic('directory')}
          <input type="text" id="travelSearchInput-${scope}-${sub}" placeholder="Search PIN, name, designation, department…" value="${escapeHtml(st.search)}" oninput="travelSetSearch('${scope}','${sub}', this.value, this)" />
        </div>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-outline btn-sm" onclick="travelPrint('${scope}','${sub}')">${ic('reports')} Print</button>
        ${downloadMenuHTML(uidStr, `travelExportExcel('${scope}','${sub}')`, `travelExportPDF('${scope}','${sub}')`, `travelExportWord('${scope}','${sub}')`)}
        <button class="btn btn-solid btn-sm" onclick="openTravelModal('${scope}','${sub}')">${ic('plus')} Add Record</button>
      </div>
    </div>

    <div class="table-wrap crud-table-scroll">
      <table>
        <thead><tr>
          ${headers.map(h=>sortHeaderHTML(h.label, h.key, st, `travelSort.bind(null,'${scope}','${sub}')`)).join('')}
          <th style="text-align:right;">Actions</th>
        </tr></thead>
        <tbody>
          ${withSr.length ? withSr.map(r=>`
            <tr>
              ${headers.map(h=> h.key==='travelOrderNo'
                ? `<td style="font-family:var(--font-mono);font-size:11.5px;font-weight:700;color:var(--blue-600);">${escapeHtml(r[h.key]||'—')}</td>`
                : h.key==='pin'
                ? `<td style="font-family:var(--font-mono);font-size:11.5px;">${escapeHtml(r[h.key])}</td>`
                : h.key==='name'
                ? `<td><b>${escapeHtml(r[h.key])}</b></td>`
                : h.key==='reasonForExtendedStay'
                ? `<td class="td-truncate" title="${escapeHtml(r[h.key]||'')}">${r[h.key]?escapeHtml(r[h.key]):'—'}</td>`
                : h.key==='totalTravelDays'
                ? `<td>${r[h.key]!==''&&r[h.key]!=null ? r[h.key]+' Days' : '—'}</td>`
                : h.key==='extraDaysStayed'
                ? `<td>${r[h.key]>0 ? `<span style="color:var(--red);font-weight:600;">${r[h.key]} Days</span>` : '0 Days'}</td>`
                : (h.key==='dateOfDeparture'||h.key==='dateOfArrival'||h.key==='actualReturnDate')
                ? `<td>${r[h.key]?escapeHtml(r[h.key]):'—'}</td>`
                : `<td>${escapeHtml(r[h.key])}</td>`).join('')}
              <td><div class="row-actions" style="justify-content:flex-end;">
                <button class="mini-btn" title="Edit" onclick="openTravelModal('${scope}','${sub}','${r.id}')">${ic('edit')}</button>
                <button class="mini-btn" title="Delete" onclick="confirmDeleteTravel('${scope}','${sub}','${r.id}')">${ic('trash')}</button>
              </div></td>
            </tr>`).join('') : `<tr><td colspan="${headers.length+1}"><div class="empty-state"><div class="es-icon">${ic('plane')}</div><h4>No records</h4><p>Add a record to get started, or adjust your search.</p></div></td></tr>`}
        </tbody>
      </table>
    </div>
    ${paginationBarHTML(st, total, `travelSetPage.bind(null,'${scope}','${sub}')`)}
  `;
}

function openTravelModal(scope, sub, id){
  const editing = !!id;
  const list = travelList(scope, sub);
  const r = editing ? list.find(x=>x.id===id) : null;
  const emps = loadEmployees();
  const subLabel = TRAVEL_SUBS.find(s=>s.key===sub).label;
  const scopeLabel = travelScopeLabel(scope);
  const root = document.getElementById('travelModalRoot') || (function(){ const d=document.createElement('div'); d.id='travelModalRoot'; document.body.appendChild(d); return d; })();

  const extraFields = scope==='domestic' ? `
    <div class="form-grid-2">
      <div class="form-row"><label>City From</label><input type="text" id="tfCityFrom" value="${r?escapeHtml(r.cityFrom):''}" /></div>
      <div class="form-row"><label>City To</label><input type="text" id="tfCityTo" value="${r?escapeHtml(r.cityTo):''}" /></div>
    </div>
    <div class="form-row"><label>Date of Travel Order</label><input type="date" id="tfDate" value="${r?r.dateOfOrder:''}" /></div>
  ` : `
    <div class="form-grid-2">
      <div class="form-row"><label>Country From</label><input type="text" id="tfCountryFrom" value="${r?escapeHtml(r.countryFrom):''}" /></div>
      <div class="form-row"><label>Country To</label><input type="text" id="tfCountryTo" value="${r?escapeHtml(r.countryTo):''}" /></div>
    </div>
    <div class="form-grid-3">
      <div class="form-row"><label>Duration of Visit</label><input type="text" id="tfDuration" placeholder="e.g. 5 days" value="${r?escapeHtml(r.duration):''}" /></div>
      <div class="form-row"><label>Time</label><input type="time" id="tfTime" value="${r?r.time:''}" /></div>
      <div class="form-row"><label>Date of Travel Order</label><input type="date" id="tfDate" value="${r?r.dateOfOrder:''}" /></div>
    </div>
  `;

  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closeTravelModal()">
    <div class="modal-box">
      <div class="modal-head"><h3>${editing?'Edit':'Add'} ${scopeLabel} ${subLabel} Record</h3><button class="modal-close" onclick="closeTravelModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-row"><label>Travel Order Number</label><input type="text" id="tfOrderNo" value="${editing ? escapeHtml(r.travelOrderNo||'') : generateTravelOrderNumber()}" style="font-family:var(--font-mono);font-weight:700;" placeholder="TO-2026-0001" /></div>
        <p style="color:var(--steel-500);font-size:11.5px;margin:-6px 0 10px;">Auto-suggested in sequence — you can edit it if you need a different number.</p>
        <div class="form-grid-3">
          <div class="form-row"><label>PIN ID *</label><input type="text" id="tfPin" list="tfEmpList" ${editing?'disabled':''} value="${r?escapeHtml(r.pin):''}" oninput="travelFillFromPin()" placeholder="HMC-1001" /></div>
          <div class="form-row"><label>Employee Name</label><input type="text" id="tfEmpName" value="${r?escapeHtml(r.name):''}" disabled style="background:var(--steel-100);" /></div>
          <div class="form-row"><label>Department</label><input type="text" id="tfEmpDept" value="${r?escapeHtml(r.department):''}" disabled style="background:var(--steel-100);" /></div>
        </div>
        ${employeePinDatalistHTML('tfEmpList')}
        <div class="form-row"><label>Description</label><input type="text" id="tfDescription" value="${r?escapeHtml(r.description):''}" placeholder="Purpose of travel" /></div>
        ${extraFields}
        <div class="section-label" style="margin-top:14px;"><h3 style="font-size:13px;">Actual Travel Duration</h3><span class="line"></span></div>
        <div class="form-grid-3">
          <div class="form-row"><label>Date of Departure</label><input type="date" id="tfDeparture" value="${r?r.dateOfDeparture||'':''}" oninput="travelPreviewDays()" /></div>
          <div class="form-row"><label>Date of Arrival</label><input type="date" id="tfArrival" value="${r?r.dateOfArrival||'':''}" oninput="travelPreviewDays()" /></div>
          <div class="form-row"><label>Total Travel Days (auto)</label><input type="text" id="tfTotalDays" value="${r&&r.totalTravelDays!=null?r.totalTravelDays:''}" disabled style="background:var(--steel-100);font-weight:700;" /></div>
        </div>
        <div class="form-grid-3">
          <div class="form-row"><label>Actual Return Date</label><input type="date" id="tfActualReturn" value="${r?r.actualReturnDate||'':''}" oninput="travelPreviewDays()" /></div>
          <div class="form-row"><label>Extra Days Stayed (auto)</label><input type="text" id="tfExtraDays" value="${r&&r.extraDaysStayed!=null?r.extraDaysStayed:0}" disabled style="background:var(--steel-100);font-weight:700;" /></div>
          <div class="form-row" id="tfReasonWrap"><label id="tfReasonLabel">Reason for Extended Stay</label>
            <select id="tfReason" onchange="toggleOtherCommentBox('tfReason','tfReasonOtherWrap')">
              <option value="">—</option>
              ${['Official Work Extension','Flight Cancellation','Medical Emergency','Personal Emergency','Weather Conditions','Other'].map(x=>`<option ${r&&r.reasonForExtendedStay===x?'selected':''}>${x}</option>`).join('')}
            </select>
            <div class="other-comment-box" id="tfReasonOtherWrap" style="display:${r&&r.reasonForExtendedStay==='Other'?'block':'none'};">
              <textarea id="tfReasonOtherComment" placeholder="Please specify the reason...">${r?escapeHtml(r.reasonOtherComment||''):''}</textarea>
            </div>
          </div>
        </div>
        <div class="section-label" style="margin-top:14px;"><h3 style="font-size:13px;">Approval Status</h3><span class="line"></span></div>
        <div class="form-grid-3">
          <div class="form-row">
            <label>Status</label>
            <select id="tfApprovalStatus" onchange="toggleApprovalPendingWith()">
              <option value="approved" ${r&&r.approvalStatus==='approved'?'selected':''}>Approved</option>
              <option value="pending" ${!r||r.approvalStatus==='pending'||!r.approvalStatus?'selected':''}>Pending</option>
            </select>
          </div>
          <div class="form-row" id="tfPendingWithWrap" style="display:${!r||r.approvalStatus==='pending'||!r.approvalStatus?'block':'none'};">
            <label>Pending With</label>
            <input type="text" id="tfPendingWith" list="tfPendingWithList" placeholder="e.g. Line Manager, HR, Finance… or type your own" value="${r&&r.pendingWith?escapeHtml(r.pendingWith):''}" />
            <datalist id="tfPendingWithList">
              ${['Line Manager','HR','Finance','GM','MD'].map(x=>`<option value="${x}"></option>`).join('')}
            </datalist>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" onclick="closeTravelModal()">Cancel</button>
        <button class="btn btn-solid btn-sm" onclick="saveTravelFromModal('${scope}','${sub}',${editing?`'${id}'`:'null'})">${ic('plus')} ${editing?'Save Changes':'Add Record'}</button>
      </div>
    </div>
  </div>`;
  travelPreviewDays();
}
function toggleOtherCommentBox(selectId, wrapId){
  const sel = document.getElementById(selectId);
  const wrap = document.getElementById(wrapId);
  if(!sel || !wrap) return;
  wrap.style.display = sel.value === 'Other' ? 'block' : 'none';
}
function toggleApprovalPendingWith(){
  const sel = document.getElementById('tfApprovalStatus');
  const wrap = document.getElementById('tfPendingWithWrap');
  if(!sel || !wrap) return;
  wrap.style.display = sel.value === 'pending' ? 'block' : 'none';
}
function travelFillFromPin(){
  const emp = employeeByPin(document.getElementById('tfPin').value);
  document.getElementById('tfEmpName').value = emp ? emp.name : '';
  document.getElementById('tfEmpDept').value = emp ? emp.department : '';
}
function travelPreviewDays(){
  const dep = document.getElementById('tfDeparture').value;
  const arr = document.getElementById('tfArrival').value;
  const ret = document.getElementById('tfActualReturn').value;
  const total = travelDaysBetween(dep, arr);
  document.getElementById('tfTotalDays').value = total!=null ? Math.max(total,0) : '';
  const extra = (arr && ret) ? Math.max(travelDaysBetween(arr, ret),0) : 0;
  document.getElementById('tfExtraDays').value = extra;
  const label = document.getElementById('tfReasonLabel');
  if(label) label.textContent = extra>0 ? 'Reason for Extended Stay *' : 'Reason for Extended Stay';
}
function closeTravelModal(){ const r=document.getElementById('travelModalRoot'); if(r) r.innerHTML=''; }
function saveTravelFromModal(scope, sub, id){
  const description = document.getElementById('tfDescription').value.trim();
  const dateOfOrder = document.getElementById('tfDate').value;
  const dateOfDeparture = document.getElementById('tfDeparture').value;
  const dateOfArrival = document.getElementById('tfArrival').value;
  const actualReturnDate = document.getElementById('tfActualReturn').value;
  const reasonForExtendedStay = document.getElementById('tfReason').value;
  const reasonOtherComment = reasonForExtendedStay==='Other' ? (document.getElementById('tfReasonOtherComment').value||'').trim() : '';
  const approvalStatus = document.getElementById('tfApprovalStatus').value;
  const pendingWith = approvalStatus==='pending' ? document.getElementById('tfPendingWith').value : '';

  if(dateOfDeparture && dateOfArrival && travelDaysBetween(dateOfDeparture, dateOfArrival) < 0){
    toast('Arrival Date cannot be before Departure Date.', 'error'); return;
  }
  if(dateOfDeparture && actualReturnDate && travelDaysBetween(dateOfDeparture, actualReturnDate) < 0){
    toast('Actual Return Date cannot be before Departure Date.', 'error'); return;
  }
  const totalTravelDays = (dateOfDeparture && dateOfArrival) ? Math.max(travelDaysBetween(dateOfDeparture, dateOfArrival),0) : '';
  const extraDaysStayed = (dateOfArrival && actualReturnDate) ? Math.max(travelDaysBetween(dateOfArrival, actualReturnDate),0) : 0;
  if(extraDaysStayed < 0){ toast('Extra Days Stayed cannot be negative.', 'error'); return; }
  if(extraDaysStayed > 0 && !reasonForExtendedStay){
    toast('Reason for Extended Stay is required when there are extra days stayed.', 'error'); return;
  }

  let extra = {};
  if(scope==='domestic'){
    extra = {
      cityFrom: document.getElementById('tfCityFrom').value.trim(),
      cityTo: document.getElementById('tfCityTo').value.trim(),
    };
  } else {
    extra = {
      countryFrom: document.getElementById('tfCountryFrom').value.trim(),
      countryTo: document.getElementById('tfCountryTo').value.trim(),
      duration: document.getElementById('tfDuration').value.trim(),
      time: document.getElementById('tfTime').value,
    };
  }
  const travelExtra = { dateOfDeparture, dateOfArrival, totalTravelDays, actualReturnDate, extraDaysStayed, reasonForExtendedStay, reasonOtherComment, approvalStatus, pendingWith };
  const list = travelList(scope, sub);
  if(id){
    const r = list.find(x=>x.id===id);
    const travelOrderNo = (document.getElementById('tfOrderNo').value || '').trim();
    if(!travelOrderNo){ toast('Travel Order Number cannot be empty.', 'error'); return; }
    if(r){ Object.assign(r, { travelOrderNo, description, dateOfOrder, ...extra, ...travelExtra }); }
    toast('Record updated.');
  } else {
    const pinInput = document.getElementById('tfPin').value.trim();
    const emp = requireRegisteredEmployee(pinInput);
    if(!emp) return;
    const travelOrderNo = (document.getElementById('tfOrderNo').value || '').trim() || generateTravelOrderNumber();
    list.push({ id: uid('TR'), travelOrderNo, pin: emp.pin, name: emp.name, designation: emp.designation, department: emp.department, description, dateOfOrder, ...extra, ...travelExtra });
    toast('Record added, Travel Order Number '+travelOrderNo+'.');
  }
  travelSaveList(scope, sub, list);
  closeTravelModal();
  renderTravelTable(scope, sub);
}
function confirmDeleteTravel(scope, sub, id){
  if(!confirm('Delete this record permanently? This cannot be undone.')) return;
  travelSaveList(scope, sub, travelList(scope, sub).filter(x=>x.id!==id));
  toast('Record deleted.');
  renderTravelTable(scope, sub);
}

/* ---------- GENERIC MODULE PAGE ---------- */
function renderGenericPage(id){
  const ref = FLAT[id];
  const it = ref.item;
  const sectionLabel = ref.grand ? ref.grand.label : (ref.parent ? ref.parent.label : it.label);

  content.innerHTML = `
  <div class="page">
    ${breadcrumbHTML(id)}
    <div class="page-head">
      <div>
        <div class="page-tag">${sectionLabel}</div>
        <h1>${it.label}</h1>
        <p class="page-desc">${it.desc || 'Module overview and records for this HR function.'}</p>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-outline btn-sm" onclick="alert('Export will be available once data entry is enabled for this module.')">Export</button>
        <button class="btn btn-solid btn-sm" onclick="alert('Add ${it.label} — form will be available soon.')">${ic('plus')} Add New</button>
      </div>
    </div>

    <div class="info-strip">
      ${ic('info')}
      <span>This is a placeholder module. Forms, workflows and live data for <strong>${it.label}</strong> will be connected in a future release.</span>
    </div>

    <div class="toolbar">
      <div class="toolbar-left">
        <div class="search-field">
          ${ic('search')}
          <input type="text" placeholder="Search ${it.label.toLowerCase()} records…" />
        </div>
        <div class="filter-select">${ic('filter')} Status <span style="opacity:.5">▾</span></div>
        <div class="filter-select">${ic('calendar')} Date Range <span style="opacity:.5">▾</span></div>
        <div class="filter-select">${ic('directory')} Department <span style="opacity:.5">▾</span></div>
      </div>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Employee / Reference</th><th>Department</th><th>Date</th><th>Status</th><th style="text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="6">
            <div class="empty-state">
              <div class="es-icon">${ic('inbox')}</div>
              <h4>No records yet</h4>
              <p>Content / Data will be added here later. Once connected, ${it.label.toLowerCase()} records will appear in this table with full search, filter and export support.</p>
              <div style="display:flex; gap:10px; margin-top:6px;">
                <button class="btn btn-solid btn-sm" onclick="alert('Add ${it.label} — form will be available soon.')">${ic('plus')} Add Record</button>
                <button class="btn btn-outline btn-sm" onclick="alert('Sample view — not yet connected to live data.')">${ic('eye')} View Sample</button>
              </div>
            </div>
          </td></tr>
        </tbody>
      </table>
    </div>

    <div class="page-footer">
      <span>HMC HR Department Portal · ${sectionLabel} / ${it.label}</span>
      <span>Last synced: —</span>
    </div>
  </div>`;
}

/* ---------- SINGLE TOP-LEVEL PAGES with icon accents ---------- */
function renderSingle(id){
  renderGenericPage(id);
}

/* ============================================================
   ACCESS DENIED (role-based access control)
   ============================================================ */
function renderAccessDenied(id){
  const it = FLAT[id].item;
  content.innerHTML = `
  <div class="page">
    ${breadcrumbHTML(id)}
    <div class="card">
      <div class="access-denied">
        <div class="ad-icon">${ic('discipline')}</div>
        <h4 style="font-size:16px;">Admin access required</h4>
        <p style="font-size:13px;color:var(--steel-500);max-width:380px;">${it.label} is part of the Admin Control System. Your current role (<b>Employee</b>) does not have permission to view this page. Contact your HR Administrator if you believe this is a mistake.</p>
        <button class="btn btn-solid btn-sm" onclick="navigateTo('dashboard')">${ic('dashboard')} Back to Dashboard</button>
      </div>
    </div>
  </div>`;
}

/* ============================================================
   TASK HELPERS
   ============================================================ */
function fmtDate(iso){
  const d = new Date(iso);
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) + ' · ' + d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
}
function timeAgo(iso){
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff/60000);
  if(mins < 1) return 'just now';
  if(mins < 60) return mins+'m ago';
  const hrs = Math.floor(mins/60);
  if(hrs < 24) return hrs+'h ago';
  return Math.floor(hrs/24)+'d ago';
}
function employeeName(pin){
  const e = employeeByPin(pin);
  return e ? e.name : pin;
}
function statusLabel(s){
  return s==='pending' ? 'Pending' : s==='in-progress' ? 'In Progress' : 'Completed';
}
function priorityLabel(p){
  return p==='urgent' ? 'Urgent' : p==='normal' ? 'Schedule' : p==='low' ? 'Delegate' : 'Optional';
}
function isOverdue(t){
  return t.status !== 'completed' && new Date(t.deadline).getTime() < Date.now();
}
function tasksVisibleToUser(){
  const all = loadTasks();
  if(CURRENT_ROLE === 'admin') return all;
  return all.filter(t => t.assignedTo === CURRENT_USERNAME);
}

/* ============================================================
   TASK CARD
   ============================================================ */
function taskCard(t, opts){
  opts = opts || {};
  const canManage = CURRENT_ROLE === 'admin';
  const canUpdateStatus = canManage || t.assignedTo === CURRENT_USERNAME;
  const overdue = isOverdue(t);
  return `<div class="task-card priority-${t.priority}">
    <div class="task-card-top">
      <div>
        <span class="task-priority-badge pb-${t.priority}">${t.priority==='urgent'?'🔴':t.priority==='normal'?'🟡':t.priority==='low'?'🟢':'🔵'} ${priorityLabel(t.priority)}</span>
      </div>
      ${canManage ? `<div class="task-card-actions">
        <button class="mini-btn" title="Edit" onclick="openTaskModal('${t.id}')">${ic('edit')}</button>
        <button class="mini-btn" title="Delete" onclick="confirmDeleteTask('${t.id}')">${ic('trash')}</button>
      </div>` : ''}
    </div>
    <h4>${t.title}</h4>
    <p class="task-desc-text">${t.desc || 'No additional description provided.'}</p>
    <div class="task-meta-row">
      <span>${ic('users')} Assigned to: <b>${employeeName(t.assignedTo)}</b></span>
      <span>${ic('briefcase')} By: ${t.assignedBy}</span>
      <span class="${overdue?'task-overdue':''}">${ic('calendar')} ${overdue?'Scheduled Task — ':''}${fmtDate(t.deadline)}</span>
    </div>
    <div class="task-card-foot">
      <select class="task-status-select" ${canUpdateStatus?'':'disabled'} onchange="updateTaskStatus('${t.id}', this.value)">
        <option value="pending" ${t.status==='pending'?'selected':''}>Pending</option>
        <option value="in-progress" ${t.status==='in-progress'?'selected':''}>In Progress</option>
        <option value="completed" ${t.status==='completed'?'selected':''}>Completed</option>
      </select>
      <span style="font-size:10.5px;color:var(--steel-400);">${t.id}</span>
    </div>
  </div>`;
}

function dashboardTaskWidget(){
  const tasks = tasksVisibleToUser().filter(t=>t.status!=='completed')
    .sort((a,b)=>{ const o={urgent:0,normal:1,low:2}; return o[a.priority]-o[b.priority] || new Date(a.deadline)-new Date(b.deadline); });
  if(!tasks.length){
    return `<div class="empty-state" style="padding:30px 16px;"><div class="es-icon">${ic('inbox')}</div><h4 style="font-size:13.5px;">No open tasks</h4><p style="font-size:12px;">You're all caught up.</p></div>`;
  }
  const rows = tasks.map(t=>{
    const tone = t.priority==='urgent' ? 'nd-urgent' : t.priority==='normal' ? 'nd-normal' : t.priority==='low' ? 'nd-low' : 'nd-optional';
    const dot = t.priority==='urgent' ? '🔴' : t.priority==='normal' ? '🟡' : t.priority==='low' ? '🟢' : '🔵';
    const blinkClass = t.priority==='urgent' ? 'blink-urgent' : t.priority==='normal' ? 'blink-normal' : t.priority==='low' ? 'blink-low' : 'blink-optional';
    return `<div class="notif-row" style="cursor:pointer;" onclick="navigateTo('tasks')">
      <div class="notif-dot-icon ${tone}"><span class="task-dot-blink ${blinkClass}">${dot}</span></div>
      <div class="notif-body">
        <b>${t.title}</b>
        <p>Assigned to ${employeeName(t.assignedTo)} · ${statusLabel(t.status)}</p>
        <div class="time ${isOverdue(t)?'task-overdue':''}">${isOverdue(t)?'Scheduled Task — ':'Due '}${fmtDate(t.deadline)}</div>
      </div>
    </div>`;
  }).join('');
  return `<div class="task-widget-scroll">${rows}</div>`;
}

/* ============================================================
   TASK BAR PAGE (all roles)
   ============================================================ */
let TASK_FILTER = 'all';
function renderTasksPage(){
  const tasks = tasksVisibleToUser();
  const urgentCount = tasks.filter(t=>t.priority==='urgent' && t.status!=='completed').length;
  const pendingCount = tasks.filter(t=>t.status==='pending').length;
  const completedCount = tasks.filter(t=>t.status==='completed').length;
  const filtered = TASK_FILTER==='all' ? tasks : tasks.filter(t=>t.priority===TASK_FILTER);
  const sorted = [...filtered].sort((a,b)=>{
    const order = {urgent:0, normal:1, low:2, optional:3};
    if(order[a.priority] !== order[b.priority]) return order[a.priority]-order[b.priority];
    return new Date(a.deadline) - new Date(b.deadline);
  });

  content.innerHTML = `
  <div class="page">
    ${breadcrumbHTML('tasks')}
    <div class="page-head">
      <div>
        <div class="page-tag">${CURRENT_ROLE==='admin' ? 'All Tasks' : 'My Tasks'} <span class="role-badge role-${CURRENT_ROLE}" style="margin-left:6px;">${CURRENT_ROLE}</span></div>
        <h1>Tasks</h1>
        <p class="page-desc">${CURRENT_ROLE==='admin' ? 'Every task across the organization — create, assign, and track progress in real time.' : 'Tasks assigned to you. Update status as you make progress; urgent items are highlighted and alert automatically.'}</p>
      </div>
      <div class="toolbar-actions">
        <div class="sound-toggle ${SOUND_ENABLED?'on':''}" onclick="toggleSound()" title="Toggle alert sound"><div class="switch"></div>Alert sound</div>
        ${CURRENT_ROLE==='admin' ? `<button class="btn btn-solid btn-sm" onclick="openTaskModal()">${ic('plus')} New Task</button>` : ''}
      </div>
    </div>

    ${urgentCount>0 ? `
    <div class="buzzer-banner">
      <div class="bb-icon">${ic('bell2')}</div>
      <div class="bb-text">${urgentCount} urgent task${urgentCount>1?'s':''} need${urgentCount===1?'s':''} immediate attention.<span>Urgent tasks blink red and trigger a sound alert until resolved.</span></div>
    </div>` : ''}

    <div class="stat-grid">
      ${miniStatCard(tasks.length, 'Total Tasks','visible to you', `viewTaskStatRecords('all')`)}
      ${miniStatCard(pendingCount, 'Pending','awaiting action', `viewTaskStatRecords('pending')`)}
      ${miniStatCard(urgentCount, 'Urgent','need attention now', `viewTaskStatRecords('urgent')`)}
      ${miniStatCard(completedCount, 'Completed','done', `viewTaskStatRecords('completed')`)}
    </div>

    <div class="task-toolbar">
      <div class="task-filters">
        <button class="tf-chip ${TASK_FILTER==='all'?'tf-active':''}" onclick="setTaskFilter('all')">All</button>
        <button class="tf-chip ${TASK_FILTER==='urgent'?'tf-active':''}" onclick="setTaskFilter('urgent')">🔴 Urgent</button>
        <button class="tf-chip ${TASK_FILTER==='normal'?'tf-active':''}" onclick="setTaskFilter('normal')">🟡 Schedule</button>
        <button class="tf-chip ${TASK_FILTER==='low'?'tf-active':''}" onclick="setTaskFilter('low')">🟢 Delegate</button>
        <button class="tf-chip ${TASK_FILTER==='optional'?'tf-active':''}" onclick="setTaskFilter('optional')">🔵 Optional</button>
      </div>
    </div>

    ${sorted.length ? `<div class="task-grid">${sorted.map(t=>taskCard(t)).join('')}</div>` : `
      <div class="card"><div class="empty-state">
        <div class="es-icon">${ic('inbox')}</div>
        <h4>No tasks here</h4>
        <p>There are no tasks matching this filter right now.</p>
      </div></div>`}
  </div>
  <div id="taskModalRoot"></div>`;

  if(urgentCount>0) playBuzzer('urgent');
}
function setTaskFilter(f){ TASK_FILTER = f; renderTasksPage(); }
function viewTaskStatRecords(kind){
  const tasks = tasksVisibleToUser();
  let rows, title;
  if(kind==='all'){ rows = tasks; title = 'Total Tasks'; }
  else if(kind==='pending'){ rows = tasks.filter(t=>t.status==='pending'); title = 'Pending Tasks'; }
  else if(kind==='urgent'){ rows = tasks.filter(t=>t.priority==='urgent' && t.status!=='completed'); title = 'Urgent Tasks'; }
  else { rows = tasks.filter(t=>t.status==='completed'); title = 'Completed Tasks'; }
  viewStatRecords(title, rows, [
    {label:'Title', get:r=>r.title},
    {label:'Assigned To', get:r=>employeeName(r.assignedTo)},
    {label:'Priority', get:r=>r.priority},
    {label:'Status', get:r=>statusLabel(r.status)},
    {label:'Deadline', get:r=>new Date(r.deadline).toLocaleString()},
  ]);
}

function updateTaskStatus(id, status){
  const tasks = loadTasks();
  const t = tasks.find(t=>t.id===id);
  if(!t) return;
  const canUpdateStatus = CURRENT_ROLE==='admin' || t.assignedTo === CURRENT_USERNAME;
  if(!canUpdateStatus) return;
  t.status = status;
  saveTasks(tasks);
  addNotif({id:t.id, title:'Status updated: "'+t.title+'" is now '+statusLabel(status)+'.'}, 'low', 'status');
  renderRoute();
}

function confirmDeleteTask(id){
  if(!confirm('Delete this task permanently? This cannot be undone.')) return;
  let tasks = loadTasks();
  const t = tasks.find(t=>t.id===id);
  tasks = tasks.filter(t=>t.id!==id);
  saveTasks(tasks);
  if(t) addNotif({id:id, title:'Task deleted: "'+t.title+'".'}, 'low', 'admin');
  renderRoute();
}

/* ============================================================
   TASK CREATE / EDIT MODAL (admin only)
   ============================================================ */
function openTaskModal(id){
  const editing = !!id;
  const t = editing ? loadTasks().find(t=>t.id===id) : null;
  const deadlineVal = t ? new Date(t.deadline).toISOString().slice(0,16) : '';
  const root = document.getElementById('taskModalRoot') || (function(){ const d=document.createElement('div'); d.id='taskModalRoot'; document.body.appendChild(d); return d; })();
  root.innerHTML = `
  <div class="modal-overlay" id="taskModalOverlay" onclick="if(event.target===this) closeTaskModal()">
    <div class="modal-box">
      <div class="modal-head">
        <h3>${editing ? 'Edit Task' : 'Create New Task'}</h3>
        <button class="modal-close" onclick="closeTaskModal()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <label>Task Title</label>
          <input type="text" id="tfTitle" value="${t?t.title.replace(/"/g,'&quot;'):''}" placeholder="e.g. Prepare monthly attendance report" />
        </div>
        <div class="form-row">
          <label>Description</label>
          <textarea id="tfDesc" placeholder="Task details...">${t?t.desc||'':''}</textarea>
        </div>
        ${editing ? `
        <div class="form-grid-3">
          <div class="form-row">
            <label>Assign To — PIN ID *</label>
            <input type="text" id="tfAssigneePin" list="tfAssigneeList" value="${escapeHtml(t.assignedTo)}" oninput="taskFillAssigneeFromPin()" placeholder="HMC-1001" />
            ${employeePinDatalistHTML('tfAssigneeList')}
          </div>
          <div class="form-row">
            <label>Assign To — Name</label>
            <input type="text" id="tfAssigneeName" value="${escapeHtml(employeeName(t.assignedTo))}" disabled style="background:var(--steel-100);" />
          </div>
          <div class="form-row">
            <label>Deadline</label>
            <input type="datetime-local" id="tfDeadline" value="${deadlineVal}" />
          </div>
        </div>` : `
        <div class="form-row">
          <label>Assign To — select one or more employees *</label>
          <input type="text" id="tfAssigneeSearch" placeholder="Search name, PIN or designation…" oninput="taskFilterAssigneeChecklist(this.value)" style="margin-bottom:8px;" />
          <div style="display:flex;gap:8px;margin-bottom:8px;">
            <button type="button" class="btn-ghost-sm" onclick="taskToggleAllAssignees(true)">Select All</button>
            <button type="button" class="btn-ghost-sm" onclick="taskToggleAllAssignees(false)">Clear All</button>
            <span id="tfAssigneeCount" style="align-self:center;color:var(--steel-500);font-size:12.5px;">0 selected</span>
          </div>
          <div id="tfAssigneeChecklist" style="max-height:220px;overflow-y:auto;border:1px solid var(--steel-200);border-radius:var(--radius-sm);padding:6px;">
            ${loadEmployees().map(e=>`
              <label class="tf-assignee-row" data-search="${escapeHtml((e.name+' '+e.pin+' '+e.designation).toLowerCase())}" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;">
                <input type="checkbox" class="tfAssigneeCheckbox" value="${escapeHtml(e.pin)}" onchange="taskUpdateAssigneeCount()" />
                <span><b>${escapeHtml(e.name)}</b> <span style="color:var(--steel-500);">— ${escapeHtml(e.pin)} · ${escapeHtml(e.designation)}</span></span>
              </label>`).join('')}
          </div>
        </div>
        <div class="form-row">
          <label>Deadline</label>
          <input type="datetime-local" id="tfDeadline" value="${deadlineVal}" />
        </div>
        `}
        <div class="form-row">
          <label>Priority Level</label>
          <div class="priority-pick">
            <label class="pp-option"><input type="radio" name="tfPriority" value="urgent" ${(!t||t.priority==='urgent')?'checked':''}/><div class="pp-content">🔴<br>Urgent</div></label>
            <label class="pp-option"><input type="radio" name="tfPriority" value="normal" ${(t&&t.priority==='normal')?'checked':''}/><div class="pp-content">🟡<br>Schedule</div></label>
            <label class="pp-option"><input type="radio" name="tfPriority" value="low" ${(t&&t.priority==='low')?'checked':''}/><div class="pp-content">🟢<br>Delegate</div></label>
            <label class="pp-option"><input type="radio" name="tfPriority" value="optional" ${(t&&t.priority==='optional')?'checked':''}/><div class="pp-content">🔵<br>Optional</div></label>
          </div>
        </div>
        ${editing ? `<div class="form-row">
          <label>Status</label>
          <select id="tfStatus">
            <option value="pending" ${t.status==='pending'?'selected':''}>Pending</option>
            <option value="in-progress" ${t.status==='in-progress'?'selected':''}>In Progress</option>
            <option value="completed" ${t.status==='completed'?'selected':''}>Completed</option>
          </select>
        </div>` : ''}
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" onclick="closeTaskModal()">Cancel</button>
        <button class="btn btn-solid btn-sm" onclick="saveTaskFromModal(${editing?`'${id}'`:'null'})">${ic('plus')} ${editing?'Save Changes':'Create Task'}</button>
      </div>
    </div>
  </div>`;
}
function closeTaskModal(){
  const root = document.getElementById('taskModalRoot');
  if(root) root.innerHTML = '';
}
function taskFillAssigneeFromPin(){
  const emp = employeeByPin(document.getElementById('tfAssigneePin').value);
  document.getElementById('tfAssigneeName').value = emp ? emp.name : '';
}
function taskFilterAssigneeChecklist(q){
  q = (q||'').trim().toLowerCase();
  document.querySelectorAll('.tf-assignee-row').forEach(row=>{
    row.style.display = row.dataset.search.includes(q) ? 'flex' : 'none';
  });
}
function taskToggleAllAssignees(state){
  document.querySelectorAll('.tf-assignee-row').forEach(row=>{
    if(row.style.display==='none') return;
    const cb = row.querySelector('.tfAssigneeCheckbox');
    if(cb) cb.checked = state;
  });
  taskUpdateAssigneeCount();
}
function taskUpdateAssigneeCount(){
  const n = document.querySelectorAll('.tfAssigneeCheckbox:checked').length;
  const el = document.getElementById('tfAssigneeCount');
  if(el) el.textContent = n + ' selected';
}
function saveTaskFromModal(id){
  const title = document.getElementById('tfTitle').value.trim();
  if(!title){ alert('Please enter a task title.'); return; }
  const desc = document.getElementById('tfDesc').value.trim();
  const deadlineRaw = document.getElementById('tfDeadline').value;
  const deadline = deadlineRaw ? new Date(deadlineRaw).toISOString() : new Date(Date.now()+1000*60*60*24).toISOString();
  const priorityEl = document.querySelector('input[name="tfPriority"]:checked');
  const priority = priorityEl ? priorityEl.value : 'normal';
  const statusEl = document.getElementById('tfStatus');
  const tasks = loadTasks();

  if(id){
    const pinInput = document.getElementById('tfAssigneePin').value.trim();
    const emp = requireRegisteredEmployee(pinInput);
    if(!emp) return;
    const assignedTo = emp.pin;
    const t = tasks.find(t=>t.id===id);
    if(t){
      t.title=title; t.desc=desc; t.assignedTo=assignedTo; t.deadline=deadline; t.priority=priority;
      if(statusEl) t.status = statusEl.value;
      addNotif({id:t.id, title:'Task updated: "'+t.title+'".'}, priority, 'admin');
    }
  } else {
    const selectedPins = Array.from(document.querySelectorAll('.tfAssigneeCheckbox:checked')).map(cb=>cb.value);
    if(selectedPins.length===0){ alert('Please select at least one employee to assign this task to.'); return; }
    selectedPins.forEach(pin=>{
      const newId = 'T-'+Math.floor(1000+Math.random()*9000)+'-'+Math.floor(Math.random()*90+10);
      const t = { id:newId, title, desc, assignedBy: getDisplayName(CURRENT_USERNAME), assignedTo:pin, priority, status:'pending', deadline, createdAt:new Date().toISOString() };
      tasks.push(t);
      addNotif({id:newId, title:'New task assigned to '+employeeName(pin)+': "'+title+'".'}, priority, 'assignment');
    });
  }
  saveTasks(tasks);
  closeTaskModal();
  renderRoute();
}

/* ============================================================
   NOTIFICATIONS PAGE
   ============================================================ */
function renderNotificationsPage(){
  const list = loadNotifs();
  list.forEach(n=>n.read=true);
  saveNotifs(list);
  content.innerHTML = `
  <div class="page">
    ${breadcrumbHTML('notifications')}
    <div class="page-head">
      <div>
        <div class="page-tag">System Alerts</div>
        <h1>Notifications</h1>
        <p class="page-desc">Task assignments, deadline reminders, status updates and urgent alerts appear here in real time.</p>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-outline btn-sm" onclick="clearAllNotifs()">${ic('trash')} Clear All</button>
      </div>
    </div>
    <div class="card panel">
      ${list.length ? `<div class="notif-list">${list.map(n=>notifRow(n)).join('')}</div>` : `
        <div class="empty-state">
          <div class="es-icon">${ic('bell2')}</div>
          <h4>You're all caught up</h4>
          <p>No notifications right now. New task assignments, deadline reminders and status updates will appear here.</p>
        </div>`}
    </div>
  </div>`;
  refreshBellBadge();
}
function notifRow(n){
  const tone = n.priority==='urgent' ? 'nd-urgent' : n.priority==='normal' ? 'nd-normal' : n.type==='reminder' ? 'nd-normal' : n.priority==='low' ? 'nd-low' : 'nd-info';
  const icon = n.type==='assignment' ? 'plus' : n.type==='reminder' ? 'clock' : n.type==='status' ? 'performance' : n.type==='admin' ? 'settings' : 'bell2';
  return `<div class="notif-row">
    <div class="notif-dot-icon ${tone}">${ic(icon)}</div>
    <div class="notif-body">
      <b>${n.message}</b>
      <div class="time">${timeAgo(n.time)}</div>
    </div>
  </div>`;
}
function clearAllNotifs(){
  if(!confirm('Clear all notifications?')) return;
  saveNotifs([]);
  renderRoute();
}

/* ============================================================
   ADMIN PANEL — TASK CONTROL (full CRUD register with dashboard)
   ============================================================ */
const TC_STATE = { page:1, pageSize:8, sortKey:'dateReceived', sortDir:'desc', search:'', fDept:'', fStatus:'', fOrg:'', fDate:'' };
const TC_HEADERS = [
  {key:'sr', label:'Sr. No.'}, {key:'dateReceived', label:'Date Received'}, {key:'subject', label:'Subject'},
  {key:'mainDept', label:'Main Department'}, {key:'department', label:'Department'}, {key:'receivedByPin', label:'Received By PIN'}, {key:'receivedBy', label:'Received By'},
  {key:'status', label:'Status'}, {key:'completionPeriod', label:'Completion Period'}, {key:'delayedCompleted', label:'Delayed / Completed'},
  {key:'internalExternal', label:'Internal / External'}, {key:'organization', label:'Organization'},
  {key:'dateOfDispatch', label:'Date of Dispatch'}, {key:'remarks', label:'Remarks'},
];
function tcFilteredSorted(){
  let rows = loadTaskControl().map(t=>({...t, delayedCompleted: t.status==='Completed' ? 'Completed' : (isTcOverdue(t)?'Delayed':'On Time')}));
  rows = searchRows(rows, TC_STATE.search, ['subject','receivedBy','organization','department']);
  if(TC_STATE.fDept) rows = rows.filter(r=>r.department===TC_STATE.fDept);
  if(TC_STATE.fStatus) rows = rows.filter(r=>r.status===TC_STATE.fStatus);
  if(TC_STATE.fOrg) rows = rows.filter(r=>r.organization===TC_STATE.fOrg);
  if(TC_STATE.fDate) rows = rows.filter(r=>r.dateReceived===TC_STATE.fDate);
  rows = sortRows(rows, TC_STATE.sortKey, TC_STATE.sortDir);
  return rows;
}
function viewTcStatRecords(kind){
  const all = loadTaskControl();
  let rows, title;
  if(kind==='all'){ rows = all; title = 'Total Tasks'; }
  else if(kind==='Pending'){ rows = all.filter(t=>t.status==='Pending'); title = 'Pending Tasks'; }
  else if(kind==='Completed'){ rows = all.filter(t=>t.status==='Completed'); title = 'Completed Tasks'; }
  else { rows = all.filter(t=>isTcOverdue(t)); title = 'Delayed Tasks'; }
  viewStatRecords(title, rows, [
    {label:'Subject', get:r=>r.subject},
    {label:'Received By', get:r=>r.receivedBy},
    {label:'Department', get:r=>r.department},
    {label:'Status', get:r=>r.status},
    {label:'Date Received', get:r=>r.dateReceived},
  ]);
}
function renderAdminTaskControl(){
  const all = loadTaskControl();
  const depts = [...new Set(all.map(r=>r.department))].filter(Boolean).sort();
  const orgs = [...new Set(all.map(r=>r.organization))].filter(Boolean).sort();
  const totalCount = all.length;
  const pendingCount = all.filter(t=>t.status==='Pending').length;
  const completedCount = all.filter(t=>t.status==='Completed').length;
  const delayedCount = all.filter(t=>isTcOverdue(t)).length;

  const filtered = tcFilteredSorted();
  const { pageRows, page, total } = paginateRows(filtered, TC_STATE.page, TC_STATE.pageSize);
  const withSr = pageRows.map((r,i)=>({...r, sr:(page-1)*TC_STATE.pageSize+i+1}));

  content.innerHTML = `
  <div class="page">
    ${breadcrumbHTML('admin-task-control')}
    <div class="page-head">
      <div>
        <h1>Task Control</h1>
        <p class="page-desc">Register, assign and track every task received across the organization — with automatic overdue detection.</p>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-outline btn-sm" onclick="printRows('Task Control', TC_HEADERS, tcFilteredSorted())">${ic('reports')} Print</button>
        ${downloadMenuHTML('taskcontrol', "exportRowsToExcel('task-control', TC_HEADERS, tcFilteredSorted())", "exportRowsToPDF('task-control','Task Control', TC_HEADERS, tcFilteredSorted())")}
        ${uploadButtonHTML('task-control')}
        <button class="btn btn-solid btn-sm" onclick="openTaskControlModal()">${ic('plus')} Add Task</button>
      </div>
    </div>

    <div class="mini-stat-grid">
      ${miniStatCard(totalCount, 'Total Tasks','all records', `viewTcStatRecords('all')`)}
      ${miniStatCard(pendingCount, 'Pending Tasks','awaiting action', `viewTcStatRecords('Pending')`)}
      ${miniStatCard(completedCount, 'Completed Tasks','closed out', `viewTcStatRecords('Completed')`)}
      ${miniStatCard(delayedCount, 'Delayed Tasks','past completion period', `viewTcStatRecords('Delayed')`)}
    </div>

    <div class="crud-toolbar">
      <div class="ctb-left">
        <div class="search-field" style="max-width:260px;">
          ${ic('directory')}
          <input type="text" id="tcSearchInput" placeholder="Search subject, received by, org…" value="${escapeHtml(TC_STATE.search)}" oninput="tcSetSearch(this.value, this)" />
        </div>
        <label class="filter-select"><select onchange="tcSetFilter('fDept', this.value)">
          <option value="">All Departments</option>${depts.map(d=>`<option value="${escapeHtml(d)}" ${TC_STATE.fDept===d?'selected':''}>${escapeHtml(d)}</option>`).join('')}
        </select></label>
        <label class="filter-select"><select onchange="tcSetFilter('fStatus', this.value)">
          <option value="">All Statuses</option>${['Pending','In Progress','Completed'].map(s=>`<option ${TC_STATE.fStatus===s?'selected':''}>${s}</option>`).join('')}
        </select></label>
        <label class="filter-select"><select onchange="tcSetFilter('fOrg', this.value)">
          <option value="">All Organizations</option>${orgs.map(o=>`<option value="${escapeHtml(o)}" ${TC_STATE.fOrg===o?'selected':''}>${escapeHtml(o)}</option>`).join('')}
        </select></label>
        <label class="filter-select"><input type="date" value="${TC_STATE.fDate}" onchange="tcSetFilter('fDate', this.value)" /></label>
      </div>
    </div>

    <div class="table-wrap crud-table-scroll">
      <table>
        <thead><tr>
          ${sortHeaderHTML('Sr. No.','sr',TC_STATE,'tcSort')}
          ${sortHeaderHTML('Date Received','dateReceived',TC_STATE,'tcSort')}
          ${sortHeaderHTML('Subject','subject',TC_STATE,'tcSort')}
          ${sortHeaderHTML('Main Department','mainDept',TC_STATE,'tcSort')}
          ${sortHeaderHTML('Department','department',TC_STATE,'tcSort')}
          ${sortHeaderHTML('Received By PIN','receivedByPin',TC_STATE,'tcSort')}
          ${sortHeaderHTML('Received By','receivedBy',TC_STATE,'tcSort')}
          ${sortHeaderHTML('Status','status',TC_STATE,'tcSort')}
          ${sortHeaderHTML('Completion Period','completionPeriod',TC_STATE,'tcSort')}
          <th>Delayed / Completed</th>
          ${sortHeaderHTML('Internal / External','internalExternal',TC_STATE,'tcSort')}
          ${sortHeaderHTML('Organization','organization',TC_STATE,'tcSort')}
          ${sortHeaderHTML('Date of Dispatch','dateOfDispatch',TC_STATE,'tcSort')}
          <th>Remarks</th>
          <th style="text-align:right;">Actions</th>
        </tr></thead>
        <tbody>
          ${withSr.length ? withSr.map(t=>`
            <tr>
              <td>${t.sr}</td>
              <td>${escapeHtml(t.dateReceived)}</td>
              <td><b>${escapeHtml(t.subject)}</b></td>
              <td>${escapeHtml(t.mainDept)}</td>
              <td>${escapeHtml(t.department)}</td>
              <td style="font-family:var(--font-mono);font-size:11.5px;">${escapeHtml(t.receivedByPin||'')}</td>
              <td>${escapeHtml(t.receivedBy)}</td>
              <td><span class="status-pill ${t.status==='Completed'?'pill-approved':t.status==='In Progress'?'pill-pending':'pill-rejected'}">${escapeHtml(t.status)}</span></td>
              <td>${escapeHtml(t.completionPeriod)}</td>
              <td>${t.delayedCompleted==='Delayed'?`<span class="overdue-tag">Delayed</span>`:t.delayedCompleted==='Completed'?`<span class="ontime-tag">Completed</span>`:`<span class="ontime-tag">On Time</span>`}</td>
              <td>${escapeHtml(t.internalExternal)}</td>
              <td>${escapeHtml(t.organization)}</td>
              <td>${escapeHtml(t.dateOfDispatch)}</td>
              <td style="max-width:180px;white-space:normal;">${escapeHtml(t.remarks)}</td>
              <td><div class="row-actions" style="justify-content:flex-end;">
                <button class="mini-btn" title="Edit" onclick="openTaskControlModal('${t.id}')">${ic('edit')}</button>
                <button class="mini-btn" title="Delete" onclick="confirmDeleteTaskControl('${t.id}')">${ic('trash')}</button>
              </div></td>
            </tr>`).join('') : `<tr><td colspan="15"><div class="empty-state"><div class="es-icon">${ic('inbox')}</div><h4>No tasks yet</h4><p>Add a task to get started, or adjust your search/filters.</p></div></td></tr>`}
        </tbody>
      </table>
    </div>
    ${paginationBarHTML(TC_STATE, total, 'tcSetPage')}
  </div>
  <div id="tcModalRoot"></div>`;
}
function tcSetSearch(v, el){ const pos = el?el.selectionStart:null; TC_STATE.search=v; TC_STATE.page=1; renderAdminTaskControl(); refocusSearch('tcSearchInput', pos); }
function tcSetFilter(k,v){ TC_STATE[k]=v; TC_STATE.page=1; renderAdminTaskControl(); }
function tcSetPage(p){ TC_STATE.page=p; renderAdminTaskControl(); }
function tcSort(key){
  if(TC_STATE.sortKey===key){ TC_STATE.sortDir = TC_STATE.sortDir==='asc'?'desc':'asc'; }
  else { TC_STATE.sortKey=key; TC_STATE.sortDir='asc'; }
  renderAdminTaskControl();
}
function openTaskControlModal(id){
  const editing = !!id;
  const t = editing ? loadTaskControl().find(x=>x.id===id) : null;
  const emps = loadEmployees();
  const root = document.getElementById('tcModalRoot') || (function(){ const d=document.createElement('div'); d.id='tcModalRoot'; document.body.appendChild(d); return d; })();
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closeTaskControlModal()">
    <div class="modal-box modal-wide">
      <div class="modal-head"><h3>${editing?'Edit Task':'Add Task'}</h3><button class="modal-close" onclick="closeTaskControlModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-row"><label>Subject</label><input type="text" id="tcSubject" value="${t?escapeHtml(t.subject):''}" placeholder="e.g. Revise Overtime SOP Circular" /></div>
        <div class="form-grid-2">
          <div class="form-row"><label>Date Received</label><input type="date" id="tcDateReceived" value="${t?t.dateReceived:new Date().toISOString().slice(0,10)}" /></div>
          <div class="form-row"><label>Completion Period</label><input type="date" id="tcCompletionPeriod" value="${t?t.completionPeriod:''}" /></div>
        </div>
        <div class="form-grid-2">
          <div class="form-row"><label>Main Department</label><input type="text" id="tcMainDept" value="${t?escapeHtml(t.mainDept):'HR Department'}" /></div>
          <div class="form-row"><label>Department</label><input type="text" id="tcDepartment" value="${t?escapeHtml(t.department):''}" /></div>
        </div>
        <div class="form-grid-3">
          <div class="form-row"><label>Received By — PIN ID *</label>
            <input type="text" id="tcReceivedByPin" list="tcReceivedByList" value="${t?escapeHtml(t.receivedByPin||''):''}" oninput="tcFillFromPin()" placeholder="HMC-1001" />
          </div>
          <div class="form-row"><label>Received By — Name</label><input type="text" id="tcReceivedBy" value="${t?escapeHtml(t.receivedBy):''}" disabled style="background:var(--steel-100);" /></div>
          <div class="form-row"><label>Status</label>
            <select id="tcStatus">${['Pending','In Progress','Completed'].map(s=>`<option ${t&&t.status===s?'selected':''}>${s}</option>`).join('')}</select>
          </div>
        </div>
        ${employeePinDatalistHTML('tcReceivedByList')}
        <div class="form-grid-2">
          <div class="form-row"><label>Internal / External</label>
            <select id="tcIntExt">${['Internal','External'].map(s=>`<option ${t&&t.internalExternal===s?'selected':''}>${s}</option>`).join('')}</select>
          </div>
          <div class="form-row"><label>Organization</label><input type="text" id="tcOrganization" value="${t?escapeHtml(t.organization):'HMC Taxila'}" /></div>
        </div>
        <div class="form-row"><label>Date of Dispatch</label><input type="date" id="tcDateOfDispatch" value="${t?t.dateOfDispatch:''}" /></div>
        <div class="form-row"><label>Remarks</label><textarea id="tcRemarks" placeholder="Notes...">${t?escapeHtml(t.remarks):''}</textarea></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" onclick="closeTaskControlModal()">Cancel</button>
        <button class="btn btn-solid btn-sm" onclick="saveTaskControlFromModal(${editing?`'${id}'`:'null'})">${ic('plus')} ${editing?'Save Changes':'Add Task'}</button>
      </div>
    </div>
  </div>`;
}
function closeTaskControlModal(){ const r=document.getElementById('tcModalRoot'); if(r) r.innerHTML=''; }
function tcFillFromPin(){
  const emp = employeeByPin(document.getElementById('tcReceivedByPin').value);
  document.getElementById('tcReceivedBy').value = emp ? emp.name : '';
}
function saveTaskControlFromModal(id){
  const subject = document.getElementById('tcSubject').value.trim();
  if(!subject){ toast('Please enter a subject.', 'error'); return; }
  const pinInput = document.getElementById('tcReceivedByPin').value.trim();
  const emp = requireRegisteredEmployee(pinInput);
  if(!emp) return;
  const rec = {
    subject,
    dateReceived: document.getElementById('tcDateReceived').value,
    completionPeriod: document.getElementById('tcCompletionPeriod').value,
    mainDept: document.getElementById('tcMainDept').value.trim(),
    department: document.getElementById('tcDepartment').value.trim(),
    receivedByPin: emp.pin,
    receivedBy: emp.name,
    status: document.getElementById('tcStatus').value,
    internalExternal: document.getElementById('tcIntExt').value,
    organization: document.getElementById('tcOrganization').value.trim(),
    dateOfDispatch: document.getElementById('tcDateOfDispatch').value,
    remarks: document.getElementById('tcRemarks').value.trim(),
  };
  const list = loadTaskControl();
  if(id){
    const t = list.find(x=>x.id===id);
    if(t) Object.assign(t, rec);
    toast('Task updated.');
  } else {
    list.push({ id: uid('TC'), ...rec });
    toast('Task added.');
  }
  saveTaskControl(list);
  closeTaskControlModal();
  renderRoute();
}
function confirmDeleteTaskControl(id){
  if(!confirm('Delete this task permanently? This cannot be undone.')) return;
  saveTaskControl(loadTaskControl().filter(x=>x.id!==id));
  toast('Task deleted.');
  renderRoute();
}

/* ============================================================
   ADMIN PANEL — EMPLOYEES & ROLES (full CRUD directory)
   ============================================================ */
const EMP_STATE = { page:1, pageSize:8, sortKey:'name', sortDir:'asc', search:'', fDept:'', fRole:'' };
const EMP_HEADERS = [
  {key:'pin', label:'PIN'}, {key:'name', label:'Employee Name'}, {key:'designation', label:'Designation'},
  {key:'department', label:'Department'}, {key:'role', label:'Role'}, {key:'taskCount', label:'Number of Tasks'},
];
function employeeTaskCount(pin){
  return loadTaskControl().filter(t=>t.receivedByPin===pin && t.status!=='Completed').length;
}
function empFilteredSorted(){
  let rows = loadEmployees().map(e=>({...e, taskCount: employeeTaskCount(e.pin)}));
  rows = searchRows(rows, EMP_STATE.search, ['pin','name','designation','department']);
  if(EMP_STATE.fDept) rows = rows.filter(r=>r.department===EMP_STATE.fDept);
  if(EMP_STATE.fRole) rows = rows.filter(r=>r.role===EMP_STATE.fRole);
  rows = sortRows(rows, EMP_STATE.sortKey, EMP_STATE.sortDir);
  return rows;
}
const LS_EMP_HEADER_LABELS = 'hmc_emp_header_labels_v1';
function loadEmpHeaderLabels(){
  try{ const raw = localStorage.getItem(LS_EMP_HEADER_LABELS); if(raw) return JSON.parse(raw)||{}; }catch(e){}
  return {};
}
function saveEmpHeaderLabels(map){ localStorage.setItem(LS_EMP_HEADER_LABELS, JSON.stringify(map)); }
function empHeaderLabel(key, def){ const m = loadEmpHeaderLabels(); return m[key]!=null ? m[key] : def; }
function empExportHeaders(){ return EMP_HEADERS.map(h=>({...h, label: empHeaderLabel(h.key, h.label)})); }
function empRenameHeader(key, currentLabel){
  const next = prompt('Rename this column heading:', currentLabel);
  if(next===null) return;
  const trimmed = next.trim();
  if(!trimmed){ toast('Column name cannot be empty.', 'error'); return; }
  const map = loadEmpHeaderLabels();
  map[key] = trimmed;
  saveEmpHeaderLabels(map);
  toast('Column renamed.');
  renderAdminEmployees();
}
function empSortHeaderHTML(defLabel, key){
  const label = empHeaderLabel(key, defLabel);
  const active = EMP_STATE.sortKey===key;
  const cls = active ? (EMP_STATE.sortDir==='asc'?'sort-asc':'sort-desc') : '';
  const arrow = active ? (EMP_STATE.sortDir==='asc'?'▲':'▼') : '↕';
  return `<th class="sortable ${cls}" onclick="empSort('${key}')" ondblclick="event.stopPropagation(); empRenameHeader('${key}','${escapeHtml(label).replace(/'/g,"\\'")}')" title="Click to sort · double-click to rename this heading">${escapeHtml(label)}<span class="sort-arrow">${arrow}</span></th>`;
}
function renderAdminEmployees(){
  const all = loadEmployees();
  const depts = [...new Set(all.map(r=>r.department))].sort();
  const roles = [...new Set(all.map(r=>r.role))].sort();
  const filtered = empFilteredSorted();
  const { pageRows, page, total } = paginateRows(filtered, EMP_STATE.page, EMP_STATE.pageSize);

  content.innerHTML = `
  <div class="page">
    ${breadcrumbHTML('admin-employees')}
    <div class="page-head">
      <div>
        <h1>Employees &amp; Roles</h1>
        <p class="page-desc">Manage employee master records, designations, departments and role-based access. Task counts are pulled automatically from Task Control.</p>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-outline btn-sm" onclick="printRows('Employees &amp; Roles', empExportHeaders(), empFilteredSorted())">${ic('reports')} Print</button>
        ${downloadMenuHTML('employees', "exportRowsToExcel('employees', empExportHeaders(), empFilteredSorted())", "exportRowsToPDF('employees','Employees &amp; Roles', empExportHeaders(), empFilteredSorted())")}
        ${uploadButtonHTML('employees')}
        <button class="btn btn-solid btn-sm" onclick="openEmployeeModal()">${ic('plus')} Add Employee</button>
      </div>
    </div>

    <div class="info-strip">
      ${ic('info')}
      <span>Double-click any column heading below to rename it — your custom name is saved automatically and used everywhere this table is exported or printed.</span>
    </div>

    <div class="crud-toolbar">
      <div class="ctb-left">
        <div class="search-field" style="max-width:260px;">
          ${ic('directory')}
          <input type="text" id="empSearchInput" placeholder="Search PIN, name, designation…" value="${escapeHtml(EMP_STATE.search)}" oninput="empSetSearch(this.value, this)" />
        </div>
        <label class="filter-select"><select onchange="empSetFilter('fDept', this.value)">
          <option value="">All Departments</option>${depts.map(d=>`<option value="${escapeHtml(d)}" ${EMP_STATE.fDept===d?'selected':''}>${escapeHtml(d)}</option>`).join('')}
        </select></label>
        <label class="filter-select"><select onchange="empSetFilter('fRole', this.value)">
          <option value="">All Roles</option>${roles.map(r=>`<option value="${escapeHtml(r)}" ${EMP_STATE.fRole===r?'selected':''}>${escapeHtml(r)}</option>`).join('')}
        </select></label>
      </div>
    </div>

    <div class="table-wrap crud-table-scroll">
      <table>
        <thead><tr>
          ${empSortHeaderHTML('PIN','pin')}
          ${empSortHeaderHTML('Employee Name','name')}
          ${empSortHeaderHTML('Designation','designation')}
          ${empSortHeaderHTML('Department','department')}
          ${empSortHeaderHTML('Role','role')}
          ${empSortHeaderHTML('Number of Tasks','taskCount')}
          <th style="text-align:right;">Actions</th>
        </tr></thead>
        <tbody>
          ${pageRows.length ? pageRows.map(e=>`
            <tr>
              <td style="font-family:var(--font-mono);font-size:11.5px;">${escapeHtml(e.pin)}</td>
              <td><b>${escapeHtml(e.name)}</b></td>
              <td>${escapeHtml(e.designation)}</td>
              <td>${escapeHtml(e.department)}</td>
              <td><span class="role-badge ${e.role==='Admin'?'role-admin':'role-employee'}">${escapeHtml(e.role)}</span></td>
              <td>${e.taskCount}</td>
              <td><div class="row-actions" style="justify-content:flex-end;">
                <button class="mini-btn" title="View Profile" onclick="viewEmployeeProfile('${e.pin}')">${ic('eye')}</button>
                <button class="mini-btn" title="Full Report (Manpower, Performance, Travel, Training, Leave, Attendance, Tasks)" onclick="printEmployeeProfile('${e.pin}')">${ic('reports')}</button>
                <button class="mini-btn" title="Edit" onclick="openEmployeeModal('${e.pin}')">${ic('edit')}</button>
                <button class="mini-btn" title="Delete" onclick="confirmDeleteEmployee('${e.pin}')">${ic('trash')}</button>
              </div></td>
            </tr>`).join('') : `<tr><td colspan="7"><div class="empty-state"><div class="es-icon">${ic('users')}</div><h4>No employees found</h4><p>Add an employee to get started, or adjust your search/filters.</p></div></td></tr>`}
        </tbody>
      </table>
    </div>
    ${paginationBarHTML(EMP_STATE, total, 'empSetPage')}
  </div>
  <div id="empModalRoot"></div>`;
}
function empSetSearch(v, el){ const pos = el?el.selectionStart:null; EMP_STATE.search=v; EMP_STATE.page=1; renderAdminEmployees(); refocusSearch('empSearchInput', pos); }
function empSetFilter(k,v){ EMP_STATE[k]=v; EMP_STATE.page=1; renderAdminEmployees(); }
function empSetPage(p){ EMP_STATE.page=p; renderAdminEmployees(); }
function empSort(key){
  if(EMP_STATE.sortKey===key){ EMP_STATE.sortDir = EMP_STATE.sortDir==='asc'?'desc':'asc'; }
  else { EMP_STATE.sortKey=key; EMP_STATE.sortDir='asc'; }
  renderAdminEmployees();
}
function openEmployeeModal(pin){
  const editing = !!pin;
  const e = editing ? employeeByPin(pin) : null;
  const root = document.getElementById('empModalRoot') || (function(){ const d=document.createElement('div'); d.id='empModalRoot'; document.body.appendChild(d); return d; })();
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closeEmployeeModal()">
    <div class="modal-box">
      <div class="modal-head"><h3>${editing?'Edit Employee':'Add Employee'}</h3><button class="modal-close" onclick="closeEmployeeModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-row"><label>PIN</label><input type="text" id="efPin" value="${e?escapeHtml(e.pin):''}" placeholder="e.g. HMC-1009" /></div>
        ${editing?'<div style="font-size:11px;color:var(--steel-500);margin:-8px 0 12px;">You can edit the PIN directly. If you change it, related records elsewhere are not automatically re-linked.</div>':''}
        <div class="form-row"><label>Employee Name</label><input type="text" id="efName" value="${e?escapeHtml(e.name):''}" placeholder="Full name" /></div>
        <div class="form-grid-2">
          <div class="form-row"><label>Designation</label><input type="text" id="efDesignation" value="${e?escapeHtml(e.designation):''}" /></div>
          <div class="form-row"><label>Department</label><input type="text" id="efDepartment" value="${e?escapeHtml(e.department):''}" /></div>
        </div>
        <div class="form-row"><label>Role</label>
          <input type="text" id="efRole" list="efRoleOptions" value="${e?escapeHtml(e.role):'Employee'}" placeholder="Type or pick a role (e.g. Employee, Supervisor, Admin, Team Lead…)" />
          <datalist id="efRoleOptions">${[...new Set(['Employee','Supervisor','Admin', ...loadEmployees().map(x=>x.role)])].map(r=>`<option value="${escapeHtml(r)}"></option>`).join('')}</datalist>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" onclick="closeEmployeeModal()">Cancel</button>
        <button class="btn btn-solid btn-sm" onclick="saveEmployeeFromModal(${editing?`'${pin}'`:'null'})">${ic('plus')} ${editing?'Save Changes':'Add Employee'}</button>
      </div>
    </div>
  </div>`;
}
function closeEmployeeModal(){ const r=document.getElementById('empModalRoot'); if(r) r.innerHTML=''; }
function saveEmployeeFromModal(originalPin){
  const pin = document.getElementById('efPin').value.trim();
  const name = document.getElementById('efName').value.trim();
  const designation = document.getElementById('efDesignation').value.trim();
  const department = document.getElementById('efDepartment').value.trim();
  const role = document.getElementById('efRole').value.trim() || 'Employee';
  if(!pin || !name || !designation || !department){ toast('Please fill all required fields.', 'error'); return; }
  const list = loadEmployees();
  if(originalPin){
    const e = list.find(x=>x.pin===originalPin);
    if(pin !== originalPin && list.some(x=>x.pin===pin && x!==e)){ toast('Another employee already uses this PIN.', 'error'); return; }
    if(e){ e.pin=pin; e.name=name; e.designation=designation; e.department=department; e.role=role; }
    toast('Employee updated.');
  } else {
    if(list.some(x=>x.pin===pin)){ toast('An employee with this PIN already exists.', 'error'); return; }
    list.push({ pin, name, designation, department, role });
    toast('Employee added.');
  }
  saveEmployees(list);
  closeEmployeeModal();
  renderRoute();
}
function confirmDeleteEmployee(pin){
  if(!confirm('Delete this employee permanently? This cannot be undone.')) return;
  saveEmployees(loadEmployees().filter(x=>x.pin!==pin));
  toast('Employee deleted.');
  renderRoute();
}
function viewEmployeeProfile(pin){
  const e = employeeByPin(pin);
  if(!e){ toast('Employee not found.', 'error'); return; }
  const leaveRecs = loadLeave().filter(l=>l.pin===pin);
  const attRecs = loadAttendance().filter(a=>a.pin===pin);
  const taskRecs = loadTaskControl().filter(t=>t.receivedBy===e.name);
  const perfRecs = loadPerformance().filter(p=>p.pin===pin || p.name===e.name);
  const travelRecs = [];
  ['domestic','international'].forEach(scope=>{
    ['order','advance','expense'].forEach(sub=>{
      travelList(scope, sub).filter(t=>t.pin===pin || t.name===e.name).forEach(t=>{
        travelRecs.push({ ...t, scope: travelScopeLabel(scope), sub: TRAVEL_SUBS.find(s=>s.key===sub).label });
      });
    });
  });
  const trainRecs = loadTNA().filter(t=>t.pin===pin || t.name===e.name);
  /* Manpower Statement is tracked per-department, not per-employee, so we
     surface the employee's own department row(s) for context. */
  const manpowerRecs = loadManpower().filter(m=>m.department===e.department);
  const root = document.getElementById('empModalRoot') || (function(){ const d=document.createElement('div'); d.id='empModalRoot'; document.body.appendChild(d); return d; })();
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closeEmployeeModal()">
    <div class="modal-box modal-wide">
      <div class="modal-head"><h3>Employee Profile</h3><button class="modal-close" onclick="closeEmployeeModal()">✕</button></div>
      <div class="modal-body">
        <div style="display:flex;gap:14px;align-items:center;margin-bottom:18px;">
          <div class="avatar" style="width:52px;height:52px;font-size:17px;">${escapeHtml((e.name||'').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase())}</div>
          <div>
            <div style="font-family:var(--font-head);font-weight:700;font-size:16px;">${escapeHtml(e.name)}</div>
            <div style="color:var(--steel-500);font-size:12.5px;">${escapeHtml(e.designation)} · ${escapeHtml(e.department)} · PIN ${escapeHtml(e.pin)}</div>
          </div>
        </div>
        <div class="section-label"><h3>Leave Records (${leaveRecs.length})</h3><span class="line"></span></div>
        ${leaveRecs.length ? `<div class="table-wrap" style="margin-bottom:18px;"><table><thead><tr><th>Year</th><th>Month</th><th>Opening Balance</th><th>AL Opening</th><th>AL Availed</th><th>AL Closing</th><th>CL Opening</th><th>CL Availed</th><th>CL Closing</th><th>Closing Balance</th></tr></thead><tbody>${leaveRecs.map(l=>`<tr><td>${l.year}</td><td>${escapeHtml(l.month)}</td><td>${l.openingBalance}</td><td>${l.alOpening}</td><td>${l.alAvailed}</td><td>${l.alClosing}</td><td>${l.clOpening}</td><td>${l.clAvailed}</td><td>${l.clClosing}</td><td>${l.closingBalance}</td></tr>`).join('')}</tbody></table></div>` : `<p style="color:var(--steel-500);font-size:12.5px;margin-bottom:18px;">No leave records.</p>`}
        <div class="section-label"><h3>Attendance Record (${attRecs.length})</h3><span class="line"></span></div>
        ${(()=>{
          const presentCount = attRecs.filter(a=>a.present && a.present!=='A').length;
          const absentCount = attRecs.filter(a=>a.present==='A' || (a.leave && a.leave!=='')).length;
          return `<div style="display:flex;gap:10px;margin-bottom:12px;">
            <span class="status-pill pill-approved">Present: ${presentCount}</span>
            <span class="status-pill pill-rejected">Absent: ${absentCount}</span>
            <span class="status-pill pill-pending">Total Days: ${attRecs.length}</span>
          </div>`;
        })()}
        ${attRecs.length ? `<div class="table-wrap" style="margin-bottom:18px;max-height:280px;overflow-y:auto;"><table><thead><tr><th>Date</th><th>Present</th><th>Leave</th></tr></thead><tbody>${attRecs.map(a=>`<tr><td>${escapeHtml(a.date)}</td><td>${dayPill(a.present)}</td><td>${dayPill(a.leave)}</td></tr>`).join('')}</tbody></table></div>` : `<p style="color:var(--steel-500);font-size:12.5px;margin-bottom:18px;">No attendance records.</p>`}
        <div class="section-label"><h3>Assigned Tasks (${taskRecs.length})</h3><span class="line"></span></div>
        ${taskRecs.length ? `<div class="table-wrap" style="margin-bottom:18px;"><table><thead><tr><th>Subject</th><th>Status</th></tr></thead><tbody>${taskRecs.map(t=>`<tr><td>${escapeHtml(t.subject)}</td><td><span class="status-pill ${t.status==='Completed'?'pill-approved':t.status==='In Progress'?'pill-pending':'pill-rejected'}">${escapeHtml(t.status)}</span></td></tr>`).join('')}</tbody></table></div>` : `<p style="color:var(--steel-500);font-size:12.5px;margin-bottom:18px;">No tasks assigned.</p>`}

        <div class="section-label"><h3>Performance (${perfRecs.length})</h3><span class="line"></span></div>
        ${perfRecs.length ? `<div class="table-wrap" style="margin-bottom:18px;"><table><thead><tr><th>Percentage</th><th>Remark</th><th>Recommendation</th><th>Status</th></tr></thead><tbody>${perfRecs.map(p=>`<tr><td>${p.percentage!=null&&p.percentage!==''?escapeHtml(String(p.percentage))+'%':'—'}</td><td>${escapeHtml((perfRemarkForPct(p.percentage)||{}).label||'—')}</td><td>${escapeHtml(p.perfRecommendation||'—')}</td><td>${escapeHtml(p.status||'—')}</td></tr>`).join('')}</tbody></table></div>` : `<p style="color:var(--steel-500);font-size:12.5px;margin-bottom:18px;">No performance records.</p>`}

        <div class="section-label"><h3>Travel (${travelRecs.length})</h3><span class="line"></span></div>
        ${travelRecs.length ? `<div class="table-wrap" style="margin-bottom:18px;max-height:240px;overflow-y:auto;"><table><thead><tr><th>Scope</th><th>Type</th><th>Order No.</th><th>Route</th><th>Date</th></tr></thead><tbody>${travelRecs.map(t=>`<tr><td>${escapeHtml(t.scope)}</td><td>${escapeHtml(t.sub)}</td><td>${escapeHtml(t.travelOrderNo||'—')}</td><td>${escapeHtml((t.cityFrom||t.countryFrom||'—')+' → '+(t.cityTo||t.countryTo||'—'))}</td><td>${escapeHtml(t.dateOfOrder||'—')}</td></tr>`).join('')}</tbody></table></div>` : `<p style="color:var(--steel-500);font-size:12.5px;margin-bottom:18px;">No travel records.</p>`}

        <div class="section-label"><h3>Training Need Analysis (${trainRecs.length})</h3><span class="line"></span></div>
        ${trainRecs.length ? `<div class="table-wrap" style="margin-bottom:18px;"><table><thead><tr><th>Development Area</th><th>Training Aligned</th><th>Urgency</th></tr></thead><tbody>${trainRecs.map(t=>`<tr><td>${escapeHtml(t.development||'—')}</td><td>${escapeHtml(t.trainingAligned||'—')}</td><td>${escapeHtml(t.urgency||'—')}</td></tr>`).join('')}</tbody></table></div>` : `<p style="color:var(--steel-500);font-size:12.5px;margin-bottom:18px;">No TNA records for this employee.</p>`}

        <div class="section-label"><h3>Manpower — ${escapeHtml(e.department)} (${manpowerRecs.length})</h3><span class="line"></span></div>
        ${manpowerRecs.length ? `<div class="table-wrap"><table><thead><tr><th>Sanctioned</th><th>Actual</th><th>Remarks</th></tr></thead><tbody>${manpowerRecs.map(m=>`<tr><td>${escapeHtml(String(m.sanctioned!=null?m.sanctioned:'—'))}</td><td>${escapeHtml(String(m.actual!=null?m.actual:'—'))}</td><td>${escapeHtml(m.remarks||'—')}</td></tr>`).join('')}</tbody></table></div>` : `<p style="color:var(--steel-500);font-size:12.5px;">No manpower record for this department.</p>`}
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" onclick="printEmployeeProfile('${pin}')">${ic('reports')} Print Full Record</button>
        <button class="btn btn-outline btn-sm" onclick="closeEmployeeModal()">Close</button>
      </div>
    </div>
  </div>`;
}
/* Prints everything shown in the Employee Profile (eye) view — Leave,
   Attendance, Tasks, Performance, Travel, Training-need and Manpower
   context — as one consolidated single-person record. */
function printEmployeeProfile(pin){
  const e = employeeByPin(pin);
  if(!e) return;
  const win = window.open('', '_blank');
  if(!win){ toast('Please allow pop-ups to print.', 'error'); return; }
  const body = document.querySelector('#empModalRoot .modal-body');
  const styles = `body{font-family:Arial,sans-serif;padding:24px;color:#182130;} h1{font-size:18px;margin-bottom:2px;} h3{font-size:13px;margin:16px 0 6px;} p{color:#5d6b7e;font-size:11px;} table{width:100%;border-collapse:collapse;margin-bottom:14px;} th,td{border:1px solid #c9cfd9;padding:6px 8px;font-size:11px;text-align:left;} th{background:#eef0f3;} .status-pill,.balance-pill,.role-badge{border:none;}`;
  win.document.write(`<html><head><title>${escapeHtml(e.name)} — Full Record</title><style>${styles}</style></head><body>
    <h1>${escapeHtml(e.name)} — Full Record</h1><p>${escapeHtml(e.designation)} · ${escapeHtml(e.department)} · PIN ${escapeHtml(e.pin)} · Generated ${new Date().toLocaleString()}</p>
    ${body ? body.innerHTML : ''}
  </body></html>`);
  win.document.close();
  setTimeout(()=>win.print(), 300);
}

/* ============================================================
   ADMIN PANEL — ACTIVITY LOG
   ============================================================ */
function renderAdminActivity(){
  const list = loadNotifs();
  content.innerHTML = `
  <div class="page">
    ${breadcrumbHTML('admin-activity')}
    <div class="page-head">
      <div>
        <h1>Activity Log</h1>
        <p class="page-desc">System-wide audit trail of task creation, assignment, status changes and deletions.</p>
      </div>
    </div>
    <div class="card panel">
      ${list.length ? `<div class="notif-list">${list.map(n=>notifRow(n)).join('')}</div>` : `
        <div class="empty-state">
          <div class="es-icon">${ic('activity')}</div>
          <h4>No activity yet</h4>
          <p>Task and system changes will be logged here as they happen.</p>
        </div>`}
    </div>
  </div>`;
}

/* ============================================================
   LEAVE MANAGEMENT — full CRUD module
   ============================================================ */
const LEAVE_STATE = { page:1, pageSize:8, sortKey:'name', sortDir:'asc', search:'', fYear:'', fMonth:'' };
const LEAVE_HEADERS = [
  {key:'sr', label:'Sr. No.'}, {key:'pin', label:'PIN'}, {key:'name', label:'Employee Name'},
  {key:'designation', label:'Designation'}, {key:'year', label:'Year'}, {key:'month', label:'Month'},
  {key:'openingBalance', label:'Opening Balance'},
  {key:'alOpening', label:'AL Opening'}, {key:'alAvailed', label:'AL Availed'}, {key:'alClosing', label:'AL Closing'},
  {key:'clOpening', label:'CL Opening'}, {key:'clAvailed', label:'CL Availed'}, {key:'clClosing', label:'CL Closing'},
  {key:'closingBalance', label:'Closing Balance'},
];
function leaveFilteredSorted(){
  let rows = loadLeave();
  rows = searchRows(rows, LEAVE_STATE.search, ['pin','name','designation']);
  if(LEAVE_STATE.fYear) rows = rows.filter(r=>String(r.year)===String(LEAVE_STATE.fYear));
  if(LEAVE_STATE.fMonth) rows = rows.filter(r=>r.month===LEAVE_STATE.fMonth);
  rows = sortRows(rows, LEAVE_STATE.sortKey, LEAVE_STATE.sortDir);
  return rows;
}
function renderLeaveManagement(){
  const all = loadLeave();
  const years = [...new Set(all.map(r=>r.year))].sort((a,b)=>b-a);
  const filtered = leaveFilteredSorted();
  const { pageRows, page, totalPages, total } = paginateRows(filtered, LEAVE_STATE.page, LEAVE_STATE.pageSize);
  const withSr = pageRows.map((r,i)=>({...r, sr:(page-1)*LEAVE_STATE.pageSize+i+1}));

  content.innerHTML = `
  <div class="page">
    ${breadcrumbHTML('leave-management')}
    <div class="page-head">
      <div>
        <div class="page-tag">Operations</div>
        <h1>Leave Management</h1>
        <p class="page-desc">Track monthly AL/CL leave balances for every employee, plus an overall Opening Balance and Closing Balance. Closing balances recalculate automatically from opening balance and leave availed.</p>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-outline btn-sm" onclick="printRows('Leave Management', LEAVE_HEADERS, leaveFilteredSorted())">${ic('reports')} Print</button>
        ${downloadMenuHTML('leave', "exportRowsToExcel('leave-management', LEAVE_HEADERS, leaveFilteredSorted())", "exportRowsToPDF('leave-management','Leave Management', LEAVE_HEADERS, leaveFilteredSorted())")}
        ${uploadButtonHTML('leave-management')}
        <button class="btn btn-solid btn-sm" onclick="openLeaveModal()">${ic('plus')} Add Record</button>
      </div>
    </div>

    <div class="crud-toolbar">
      <div class="ctb-left">
        <div class="search-field" style="max-width:280px;">
          ${ic('directory')}
          <input type="text" id="leaveSearchInput" placeholder="Search PIN, name or designation…" value="${escapeHtml(LEAVE_STATE.search)}" oninput="leaveSetSearch(this.value, this)" />
        </div>
        <label class="filter-select"><select onchange="leaveSetFilter('fYear', this.value)">
          <option value="">All Years</option>
          ${years.map(y=>`<option value="${y}" ${LEAVE_STATE.fYear==String(y)?'selected':''}>${y}</option>`).join('')}
        </select></label>
        <label class="filter-select"><select onchange="leaveSetFilter('fMonth', this.value)">
          <option value="">All Months</option>
          ${MONTHS.map(m=>`<option value="${m}" ${LEAVE_STATE.fMonth===m?'selected':''}>${m}</option>`).join('')}
        </select></label>
      </div>
    </div>

    <div class="table-wrap crud-table-scroll">
      <table>
        <thead><tr>
          ${sortHeaderHTML('Sr. No.','sr',LEAVE_STATE,'leaveSort')}
          ${sortHeaderHTML('PIN','pin',LEAVE_STATE,'leaveSort')}
          ${sortHeaderHTML('Employee Name','name',LEAVE_STATE,'leaveSort')}
          ${sortHeaderHTML('Designation','designation',LEAVE_STATE,'leaveSort')}
          ${sortHeaderHTML('Year','year',LEAVE_STATE,'leaveSort')}
          ${sortHeaderHTML('Month','month',LEAVE_STATE,'leaveSort')}
          ${sortHeaderHTML('Opening Balance','openingBalance',LEAVE_STATE,'leaveSort')}
          ${sortHeaderHTML('AL Opening','alOpening',LEAVE_STATE,'leaveSort')}
          ${sortHeaderHTML('AL Availed','alAvailed',LEAVE_STATE,'leaveSort')}
          ${sortHeaderHTML('AL Closing','alClosing',LEAVE_STATE,'leaveSort')}
          ${sortHeaderHTML('CL Opening','clOpening',LEAVE_STATE,'leaveSort')}
          ${sortHeaderHTML('CL Availed','clAvailed',LEAVE_STATE,'leaveSort')}
          ${sortHeaderHTML('CL Closing','clClosing',LEAVE_STATE,'leaveSort')}
          ${sortHeaderHTML('Closing Balance','closingBalance',LEAVE_STATE,'leaveSort')}
          <th style="text-align:right;">Actions</th>
        </tr></thead>
        <tbody>
          ${withSr.length ? withSr.map(r=>`
            <tr>
              <td>${r.sr}</td>
              <td style="font-family:var(--font-mono);font-size:11.5px;">${escapeHtml(r.pin)}</td>
              <td><b>${escapeHtml(r.name)}</b></td>
              <td>${escapeHtml(r.designation)}</td>
              <td>${r.year}</td>
              <td>${escapeHtml(r.month)}</td>
              <td><b>${r.openingBalance}</b></td>
              <td>${r.alOpening}</td>
              <td>${r.alAvailed}</td>
              <td><span class="balance-pill ${r.alClosing>0?'balance-pos':r.alClosing<0?'balance-neg':'balance-zero'}">${r.alClosing}</span></td>
              <td>${r.clOpening}</td>
              <td>${r.clAvailed}</td>
              <td><span class="balance-pill ${r.clClosing>0?'balance-pos':r.clClosing<0?'balance-neg':'balance-zero'}">${r.clClosing}</span></td>
              <td><b><span class="balance-pill ${r.closingBalance>0?'balance-pos':r.closingBalance<0?'balance-neg':'balance-zero'}">${r.closingBalance}</span></b></td>
              <td><div class="row-actions" style="justify-content:flex-end;">
                <button class="mini-btn" title="Edit" onclick="openLeaveModal('${r.id}')">${ic('edit')}</button>
                <button class="mini-btn" title="Delete" onclick="confirmDeleteLeave('${r.id}')">${ic('trash')}</button>
              </div></td>
            </tr>`).join('') : `<tr><td colspan="15"><div class="empty-state"><div class="es-icon">${ic('calendarcheck')}</div><h4>No leave records</h4><p>Add a leave record to get started, or adjust your search/filters.</p></div></td></tr>`}
        </tbody>
      </table>
    </div>
    ${paginationBarHTML(LEAVE_STATE, total, 'leaveSetPage')}
  </div>
  <div id="leaveModalRoot"></div>`;
}
function leaveSetSearch(v, el){ const pos = el?el.selectionStart:null; LEAVE_STATE.search=v; LEAVE_STATE.page=1; renderLeaveManagement(); refocusSearch('leaveSearchInput', pos); }
function leaveSetFilter(k,v){ LEAVE_STATE[k]=v; LEAVE_STATE.page=1; renderLeaveManagement(); }
function leaveSetPage(p){ LEAVE_STATE.page=p; renderLeaveManagement(); }
function leaveSort(key){
  if(LEAVE_STATE.sortKey===key){ LEAVE_STATE.sortDir = LEAVE_STATE.sortDir==='asc'?'desc':'asc'; }
  else { LEAVE_STATE.sortKey=key; LEAVE_STATE.sortDir='asc'; }
  renderLeaveManagement();
}
function openLeaveModal(id){
  const editing = !!id;
  const r = editing ? loadLeave().find(x=>x.id===id) : null;
  const emps = loadEmployees();
  const root = document.getElementById('leaveModalRoot') || (function(){ const d=document.createElement('div'); d.id='leaveModalRoot'; document.body.appendChild(d); return d; })();
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closeLeaveModal()">
    <div class="modal-box">
      <div class="modal-head"><h3>${editing?'Edit Leave Record':'Add Leave Record'}</h3><button class="modal-close" onclick="closeLeaveModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-grid-3">
          <div class="form-row"><label>PIN ID *</label><input type="text" id="lfPin" list="lfEmpList" ${editing?'disabled':''} value="${r?escapeHtml(r.pin):''}" oninput="leaveFillFromPin()" placeholder="HMC-1001" /></div>
          <div class="form-row"><label>Employee Name</label><input type="text" id="lfEmpName" value="${r?escapeHtml(r.name):''}" disabled style="background:var(--steel-100);" /></div>
          <div class="form-row"><label>Designation</label><input type="text" id="lfEmpDesig" value="${r?escapeHtml(r.designation):''}" disabled style="background:var(--steel-100);" /></div>
        </div>
        ${employeePinDatalistHTML('lfEmpList')}
        <div class="form-grid-2">
          <div class="form-row"><label>Year</label><input type="text" id="lfYear" value="${r?r.year:nowYear()}" placeholder="2026" /></div>
          <div class="form-row"><label>Month</label><select id="lfMonth">${MONTHS.map(m=>`<option ${r&&r.month===m?'selected':(!r&&m===MONTHS[new Date().getMonth()]?'selected':'')}>${m}</option>`).join('')}</select></div>
        </div>
        <div class="section-label" style="margin-top:10px;"><h3 style="font-size:13px;">Annual Leave (AL)</h3><span class="line"></span></div>
        <div class="form-grid-3">
          <div class="form-row"><label>Opening Balance</label><input type="text" id="lfAlOpening" value="${r?r.alOpening:20}" oninput="leavePreviewClosing()" /></div>
          <div class="form-row"><label>Availed</label><input type="text" id="lfAlAvailed" value="${r?r.alAvailed:0}" oninput="leavePreviewClosing()" /></div>
          <div class="form-row"><label>Closing Balance (auto)</label><input type="text" id="lfAlClosing" value="${r?r.alClosing:20}" disabled style="background:var(--steel-100);font-weight:700;" /></div>
        </div>
        <div class="section-label" style="margin-top:10px;"><h3 style="font-size:13px;">Casual Leave (CL)</h3><span class="line"></span></div>
        <div class="form-grid-3">
          <div class="form-row"><label>Opening Balance</label><input type="text" id="lfClOpening" value="${r?r.clOpening:10}" oninput="leavePreviewClosing()" /></div>
          <div class="form-row"><label>Availed</label><input type="text" id="lfClAvailed" value="${r?r.clAvailed:0}" oninput="leavePreviewClosing()" /></div>
          <div class="form-row"><label>Closing Balance (auto)</label><input type="text" id="lfClClosing" value="${r?r.clClosing:10}" disabled style="background:var(--steel-100);font-weight:700;" /></div>
        </div>
        <div class="section-label" style="margin-top:10px;"><h3 style="font-size:13px;">Overall Balance (auto)</h3><span class="line"></span></div>
        <div class="form-grid-2">
          <div class="form-row"><label>Opening Balance (AL+CL, auto)</label><input type="text" id="lfOpening" value="${r?r.openingBalance:30}" disabled style="background:var(--steel-100);font-weight:700;" /></div>
          <div class="form-row"><label>Closing Balance (AL+CL, auto)</label><input type="text" id="lfClosing" value="${r?r.closingBalance:30}" disabled style="background:var(--steel-100);font-weight:700;" /></div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" onclick="closeLeaveModal()">Cancel</button>
        <button class="btn btn-solid btn-sm" onclick="saveLeaveFromModal(${editing?`'${id}'`:'null'})">${ic('plus')} ${editing?'Save Changes':'Add Record'}</button>
      </div>
    </div>
  </div>`;
}
function leaveFillFromPin(){
  const emp = employeeByPin(document.getElementById('lfPin').value);
  document.getElementById('lfEmpName').value = emp ? emp.name : '';
  document.getElementById('lfEmpDesig').value = emp ? emp.designation : '';
}
function leavePreviewClosing(){
  const alO = parseFloat(document.getElementById('lfAlOpening').value)||0;
  const alA = parseFloat(document.getElementById('lfAlAvailed').value)||0;
  const alClosing = alO-alA;
  document.getElementById('lfAlClosing').value = alClosing;
  const clO = parseFloat(document.getElementById('lfClOpening').value)||0;
  const clA = parseFloat(document.getElementById('lfClAvailed').value)||0;
  const clClosing = clO-clA;
  document.getElementById('lfClClosing').value = clClosing;
  document.getElementById('lfOpening').value = alO+clO;
  document.getElementById('lfClosing').value = alClosing+clClosing;
}
function closeLeaveModal(){ const r=document.getElementById('leaveModalRoot'); if(r) r.innerHTML=''; }
function saveLeaveFromModal(id){
  const alOpening = parseFloat(document.getElementById('lfAlOpening').value);
  const alAvailed = parseFloat(document.getElementById('lfAlAvailed').value);
  const clOpening = parseFloat(document.getElementById('lfClOpening').value);
  const clAvailed = parseFloat(document.getElementById('lfClAvailed').value);
  const year = document.getElementById('lfYear').value.trim();
  const month = document.getElementById('lfMonth').value;
  if(isNaN(alOpening) || isNaN(alAvailed) || isNaN(clOpening) || isNaN(clAvailed) || !year){
    toast('Please fill all required fields with valid numbers.', 'error'); return;
  }
  if(alAvailed > alOpening){ toast('AL Availed cannot exceed AL Opening Balance.', 'error'); return; }
  if(clAvailed > clOpening){ toast('CL Availed cannot exceed CL Opening Balance.', 'error'); return; }
  const alClosing = alOpening - alAvailed;
  const clClosing = clOpening - clAvailed;
  const openingBalance = alOpening + clOpening;
  const closingBalance = alClosing + clClosing;
  const list = loadLeave();
  if(id){
    const r = list.find(x=>x.id===id);
    if(r){ Object.assign(r, { year, month, alOpening, alAvailed, alClosing, clOpening, clAvailed, clClosing, openingBalance, closingBalance }); }
    toast('Leave record updated.');
  } else {
    const pinInput = document.getElementById('lfPin').value.trim();
    const emp = requireRegisteredEmployee(pinInput);
    if(!emp) return;
    list.push({ id: uid('LV'), pin: emp.pin, name: emp.name, designation: emp.designation, year, month, alOpening, alAvailed, alClosing, clOpening, clAvailed, clClosing, openingBalance, closingBalance });
    toast('Leave record added.');
  }
  saveLeave(list);
  closeLeaveModal();
  renderRoute();
}
function confirmDeleteLeave(id){
  if(!confirm('Delete this leave record permanently? This cannot be undone.')) return;
  saveLeave(loadLeave().filter(x=>x.id!==id));
  toast('Leave record deleted.');
  renderRoute();
}

/* ============================================================
   ATTENDANCE — full CRUD module with dashboard summary
   ============================================================ */
const ATT_STATE = { page:1, pageSize:8, sortKey:'name', sortDir:'asc', search:'', fDept:'', fYear:String(nowYear()), fMonth:MONTHS[new Date().getMonth()], fDate:'' };
const ATT_HEADERS = [
  {key:'sr', label:'Sr. No.'}, {key:'pin', label:'PIN'}, {key:'name', label:'Employee Name'}, {key:'designation', label:'Designation'},
  {key:'department', label:'Department'}, {key:'section', label:'Section'}, {key:'typeOfDay', label:'Type of Day'},
  {key:'month', label:'Month'}, {key:'date', label:'Date'}, {key:'present', label:'Present'}, {key:'gh', label:'GH'},
  {key:'leave', label:'Leave'}, {key:'hd', label:'HD'}, {key:'workingDays', label:'Working Days'},
];
function attFilteredSorted(){
  let rows = loadAttendance();
  rows = searchRows(rows, ATT_STATE.search, ['pin','name','designation','department']);
  if(ATT_STATE.fDept) rows = rows.filter(r=>r.department===ATT_STATE.fDept);
  if(ATT_STATE.fYear) rows = rows.filter(r=>String(r.year)===String(ATT_STATE.fYear));
  if(ATT_STATE.fMonth) rows = rows.filter(r=>r.month===ATT_STATE.fMonth);
  if(ATT_STATE.fDate) rows = rows.filter(r=>r.date===ATT_STATE.fDate);
  rows = sortRows(rows, ATT_STATE.sortKey, ATT_STATE.sortDir);
  return rows;
}
function dayPill(code){
  if(!code) return '';
  const c = code.toUpperCase();
  let cls = 'dp-other';
  if(c==='P'||c==='CR'||c==='OD') cls='dp-p';
  else if(c==='A') cls='dp-a';
  else if(c==='L'||c==='AL'||c==='CL'||c==='ML') cls='dp-l';
  else if(c==='NH'||c==='FH') cls='dp-gh';
  return `<span class="day-pill ${cls}">${escapeHtml(code)}</span>`;
}
function viewAttStatRecords(kind){
  const all = loadAttendance();
  const scoped = all.filter(r => (!ATT_STATE.fYear || String(r.year)===String(ATT_STATE.fYear)) && (!ATT_STATE.fMonth || r.month===ATT_STATE.fMonth) && (!ATT_STATE.fDate || r.date===ATT_STATE.fDate));
  let rows, title;
  if(kind==='all'){ rows = loadEmployees(); title = 'Total Strength'; 
    viewStatRecords(title, rows, [
      {label:'PIN', get:r=>r.pin}, {label:'Name', get:r=>r.name}, {label:'Designation', get:r=>r.designation}, {label:'Department', get:r=>r.department},
    ]); return;
  }
  else if(kind==='present'){ rows = scoped.filter(r=>['P','CR','OD'].includes((r.present||'').toUpperCase())); title = 'Present'; }
  else if(kind==='absent'){ rows = scoped.filter(r=>(r.present||'').toUpperCase()==='A'); title = 'Absent'; }
  else if(kind==='leave'){ rows = scoped.filter(r=>r.leave); title = 'On Leave'; }
  else { rows = scoped.filter(r=>r.gh); title = 'Holidays'; }
  viewStatRecords(title, rows, [
    {label:'PIN', get:r=>r.pin}, {label:'Name', get:r=>r.name}, {label:'Date', get:r=>r.date}, {label:'Present', get:r=>r.present}, {label:'Leave', get:r=>r.leave},
  ]);
}
function renderAttendance(){
  const all = loadAttendance();
  const depts = [...new Set(all.map(r=>r.department))].sort();
  const years = [...new Set(all.map(r=>r.year))].sort((a,b)=>b-a);
  const scoped = all.filter(r => (!ATT_STATE.fYear || String(r.year)===String(ATT_STATE.fYear)) && (!ATT_STATE.fMonth || r.month===ATT_STATE.fMonth) && (!ATT_STATE.fDate || r.date===ATT_STATE.fDate));
  const totalStrength = loadEmployees().length;
  const present = scoped.filter(r=>['P','CR','OD'].includes((r.present||'').toUpperCase())).length;
  const absent = scoped.filter(r=>(r.present||'').toUpperCase()==='A').length;
  const onLeave = scoped.filter(r=>r.leave).length;
  const holidays = scoped.filter(r=>r.gh).length;

  const filtered = attFilteredSorted();
  const { pageRows, page, total } = paginateRows(filtered, ATT_STATE.page, ATT_STATE.pageSize);
  const withSr = pageRows.map((r,i)=>({...r, sr:(page-1)*ATT_STATE.pageSize+i+1}));

  content.innerHTML = `
  <div class="page">
    ${breadcrumbHTML('attendance')}
    <div class="page-head">
      <div>
        <div class="page-tag">Operations</div>
        <h1>Attendance</h1>
        <p class="page-desc">Daily attendance logs, biometric-style codes and monthly working-day tracking for every department.</p>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-outline btn-sm" onclick="printRows('Attendance', ATT_HEADERS, attFilteredSorted())">${ic('reports')} Print</button>
        ${downloadMenuHTML('attendance', "exportRowsToExcel('attendance', ATT_HEADERS, attFilteredSorted())", "exportRowsToPDF('attendance','Attendance', ATT_HEADERS, attFilteredSorted())")}
        ${uploadButtonHTML('attendance')}
        <button class="btn btn-solid btn-sm" onclick="openAttendanceModal()">${ic('plus')} Mark Attendance</button>
      </div>
    </div>

    <div class="mini-stat-grid" style="grid-template-columns:repeat(6,minmax(0,1fr));">
      ${miniStatCard(totalStrength, 'Total Strength','all employees', `viewAttStatRecords('all')`)}
      ${miniStatCard(present, 'Present','selected period', `viewAttStatRecords('present')`)}
      ${miniStatCard(absent, 'Absent','selected period', `viewAttStatRecords('absent')`)}
      ${miniStatCard(onLeave, 'On Leave','selected period', `viewAttStatRecords('leave')`)}
      ${miniStatCard(holidays, 'Holidays','GH marked', `viewAttStatRecords('holiday')`)}
      ${miniStatCard(26, 'Working Days','standard month')}
    </div>

    <div class="crud-toolbar">
      <div class="ctb-left">
        <div class="search-field" style="max-width:260px;">
          ${ic('directory')}
          <input type="text" id="attSearchInput" placeholder="Search PIN, name or designation…" value="${escapeHtml(ATT_STATE.search)}" oninput="attSetSearch(this.value, this)" />
        </div>
        <label class="filter-select"><select onchange="attSetFilter('fDept', this.value)">
          <option value="">All Departments</option>
          ${depts.map(d=>`<option value="${escapeHtml(d)}" ${ATT_STATE.fDept===d?'selected':''}>${escapeHtml(d)}</option>`).join('')}
        </select></label>
        <label class="filter-select"><select onchange="attSetFilter('fYear', this.value)">
          ${years.map(y=>`<option value="${y}" ${ATT_STATE.fYear==String(y)?'selected':''}>${y}</option>`).join('')}
        </select></label>
        <label class="filter-select"><select onchange="attSetFilter('fMonth', this.value)">
          ${MONTHS.map(m=>`<option ${ATT_STATE.fMonth===m?'selected':''}>${m}</option>`).join('')}
        </select></label>
        <label class="filter-select" style="padding:0;">
          <input type="date" id="attDateInput" value="${ATT_STATE.fDate}" onchange="attSetFilter('fDate', this.value)"
            style="border:none;background:transparent;font-family:inherit;font-size:13px;color:var(--ink);padding:9px 10px;outline:none;" />
        </label>
        ${ATT_STATE.fDate ? `<button class="btn btn-outline btn-sm" onclick="attSetFilter('fDate','')">✕ Clear Date</button>` : ''}
      </div>
    </div>

    <div class="table-wrap crud-table-scroll">
      <table>
        <thead><tr>
          ${sortHeaderHTML('Sr. No.','sr',ATT_STATE,'attSort')}
          ${sortHeaderHTML('PIN','pin',ATT_STATE,'attSort')}
          ${sortHeaderHTML('Employee Name','name',ATT_STATE,'attSort')}
          ${sortHeaderHTML('Designation','designation',ATT_STATE,'attSort')}
          ${sortHeaderHTML('Department','department',ATT_STATE,'attSort')}
          ${sortHeaderHTML('Section','section',ATT_STATE,'attSort')}
          ${sortHeaderHTML('Type of Day','typeOfDay',ATT_STATE,'attSort')}
          ${sortHeaderHTML('Date','date',ATT_STATE,'attSort')}
          <th>Present</th><th>GH</th><th>Leave</th><th>HD</th>
          ${sortHeaderHTML('Working Days','workingDays',ATT_STATE,'attSort')}
          <th style="text-align:right;">Actions</th>
        </tr></thead>
        <tbody>
          ${withSr.length ? withSr.map(r=>`
            <tr>
              <td>${r.sr}</td>
              <td style="font-family:var(--font-mono);font-size:11.5px;">${escapeHtml(r.pin)}</td>
              <td><b>${escapeHtml(r.name)}</b></td>
              <td>${escapeHtml(r.designation)}</td>
              <td>${escapeHtml(r.department)}</td>
              <td>${escapeHtml(r.section)}</td>
              <td>${escapeHtml(r.typeOfDay)}</td>
              <td>${escapeHtml(r.date)}</td>
              <td>${dayPill(r.present)}</td>
              <td>${dayPill(r.gh)}</td>
              <td>${dayPill(r.leave)}</td>
              <td>${dayPill(r.hd)}</td>
              <td>${r.workingDays}</td>
              <td><div class="row-actions" style="justify-content:flex-end;">
                <button class="mini-btn" title="Edit" onclick="openAttendanceModal('${r.id}')">${ic('edit')}</button>
                <button class="mini-btn" title="Delete" onclick="confirmDeleteAttendance('${r.id}')">${ic('trash')}</button>
              </div></td>
            </tr>`).join('') : `<tr><td colspan="14"><div class="empty-state"><div class="es-icon">${ic('clockcheck')}</div><h4>No attendance records</h4><p>Mark attendance to get started, or adjust your search/filters.</p></div></td></tr>`}
        </tbody>
      </table>
    </div>
    ${paginationBarHTML(ATT_STATE, total, 'attSetPage')}
  </div>
  <div id="attModalRoot"></div>`;
}
function attSetSearch(v, el){ const pos = el?el.selectionStart:null; ATT_STATE.search=v; ATT_STATE.page=1; renderAttendance(); refocusSearch('attSearchInput', pos); }
function attSetFilter(k,v){ ATT_STATE[k]=v; ATT_STATE.page=1; renderAttendance(); }
function attSetPage(p){ ATT_STATE.page=p; renderAttendance(); }
function attSort(key){
  if(ATT_STATE.sortKey===key){ ATT_STATE.sortDir = ATT_STATE.sortDir==='asc'?'desc':'asc'; }
  else { ATT_STATE.sortKey=key; ATT_STATE.sortDir='asc'; }
  renderAttendance();
}
function attFillFromPin(){
  const emp = employeeByPin(document.getElementById('afPin').value);
  document.getElementById('afEmpName').value = emp ? emp.name : '';
  document.getElementById('afEmpDept').value = emp ? emp.department : '';
}
function openAttendanceModal(id){
  const editing = !!id;
  const r = editing ? loadAttendance().find(x=>x.id===id) : null;
  const emps = loadEmployees();
  const root = document.getElementById('attModalRoot') || (function(){ const d=document.createElement('div'); d.id='attModalRoot'; document.body.appendChild(d); return d; })();
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closeAttendanceModal()">
    <div class="modal-box modal-wide">
      <div class="modal-head"><h3>${editing?'Edit Attendance Record':'Mark Attendance'}</h3><button class="modal-close" onclick="closeAttendanceModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-grid-3">
          <div class="form-row"><label>PIN ID *</label><input type="text" id="afPin" list="afEmpList" ${editing?'disabled':''} value="${r?escapeHtml(r.pin):''}" oninput="attFillFromPin()" placeholder="HMC-1001" /></div>
          <div class="form-row"><label>Employee Name</label><input type="text" id="afEmpName" value="${r?escapeHtml(r.name):''}" disabled style="background:var(--steel-100);" /></div>
          <div class="form-row"><label>Department</label><input type="text" id="afEmpDept" value="${r?escapeHtml(r.department):''}" disabled style="background:var(--steel-100);" /></div>
        </div>
        ${employeePinDatalistHTML('afEmpList')}
        <div class="form-grid-3">
          <div class="form-row"><label>Section</label><input type="text" id="afSection" value="${r?escapeHtml(r.section):'General'}" /></div>
          <div class="form-row"><label>Type of Day</label>
            <select id="afTypeOfDay">
              ${['Working Day','Weekly Off','Public Holiday'].map(t=>`<option ${r&&r.typeOfDay===t?'selected':''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="form-row"><label>Date</label><input type="date" id="afDate" value="${r?r.date:new Date().toISOString().slice(0,10)}" /></div>
        </div>
        <div class="form-grid-2">
          <div class="form-row"><label>Year</label><input type="text" id="afYear" value="${r?r.year:nowYear()}" /></div>
          <div class="form-row"><label>Month</label><select id="afMonth">${MONTHS.map(m=>`<option ${r&&r.month===m?'selected':(!r&&m===MONTHS[new Date().getMonth()]?'selected':'')}>${m}</option>`).join('')}</select></div>
        </div>
        <div class="form-grid-3">
          <div class="form-row"><label>Present (P / GH / OD / CR)</label>
            <select id="afPresent"><option value="">—</option>${['P','GH','OD','CR'].map(c=>`<option ${r&&r.present===c?'selected':''}>${c}</option>`).join('')}</select>
          </div>
          <div class="form-row"><label>GH (NH / FH)</label>
            <select id="afGh"><option value="">—</option>${['NH','FH'].map(c=>`<option ${r&&r.gh===c?'selected':''}>${c}</option>`).join('')}</select>
          </div>
          <div class="form-row"><label>Leave (L / AL / CL / ML)</label>
            <select id="afLeave"><option value="">—</option>${['L','AL','CL','ML'].map(c=>`<option ${r&&r.leave===c?'selected':''}>${c}</option>`).join('')}</select>
          </div>
        </div>
        <div class="form-grid-2">
          <div class="form-row"><label>HD (Half Day)</label>
            <select id="afHd"><option value="">—</option><option ${r&&r.hd==='HD'?'selected':''}>HD</option></select>
          </div>
          <div class="form-row"><label>Working Days (month total)</label><input type="text" id="afWorkingDays" value="${r?r.workingDays:26}" /></div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" onclick="closeAttendanceModal()">Cancel</button>
        <button class="btn btn-solid btn-sm" onclick="saveAttendanceFromModal(${editing?`'${id}'`:'null'})">${ic('plus')} ${editing?'Save Changes':'Mark Attendance'}</button>
      </div>
    </div>
  </div>`;
}
function closeAttendanceModal(){ const r=document.getElementById('attModalRoot'); if(r) r.innerHTML=''; }
function saveAttendanceFromModal(id){
  const year = document.getElementById('afYear').value.trim();
  const date = document.getElementById('afDate').value;
  const workingDays = parseInt(document.getElementById('afWorkingDays').value, 10);
  if(!year || !date || isNaN(workingDays)){ toast('Please fill all required fields.', 'error'); return; }
  const rec = {
    section: document.getElementById('afSection').value.trim(),
    typeOfDay: document.getElementById('afTypeOfDay').value,
    date, year, month: document.getElementById('afMonth').value,
    present: document.getElementById('afPresent').value,
    gh: document.getElementById('afGh').value,
    leave: document.getElementById('afLeave').value,
    hd: document.getElementById('afHd').value,
    workingDays,
  };
  const list = loadAttendance();
  if(id){
    const r = list.find(x=>x.id===id);
    if(r) Object.assign(r, rec);
    toast('Attendance record updated.');
  } else {
    const pinInput = document.getElementById('afPin').value.trim();
    const emp = requireRegisteredEmployee(pinInput);
    if(!emp) return;
    list.push({ id: uid('AT'), pin: emp.pin, name: emp.name, designation: emp.designation, department: emp.department, ...rec });
    toast('Attendance marked.');
  }
  saveAttendance(list);
  closeAttendanceModal();
  renderRoute();
}
function confirmDeleteAttendance(id){
  if(!confirm('Delete this attendance record permanently? This cannot be undone.')) return;
  saveAttendance(loadAttendance().filter(x=>x.id!==id));
  toast('Attendance record deleted.');
  renderRoute();
}

/* ============================================================
   ROUTER
   ============================================================ */
function navigateTo(id){
  if(!FLAT[id]){ id='dashboard'; }
  window.location.hash = id;
}

/* ============================================================
   TRAINING NEED ANALYSIS (TNA) — full CRUD module
   ============================================================ */
const LS_TNA = 'hmc_tna_v1';
function loadTNA(){ try{ const raw=localStorage.getItem(LS_TNA); if(raw) return JSON.parse(raw); }catch(e){} return []; }
function saveTNA(list){ localStorage.setItem(LS_TNA, JSON.stringify(list)); }

const TNA_URGENCY = ['High','Medium','Low'];
const TNA_TYPE = ['Internal','External'];
const TNA_HEADERS = [
  {key:'sr', label:'SR.'}, {key:'pin', label:'PIN'}, {key:'name', label:'Name'},
  {key:'designation', label:'Designation'}, {key:'department', label:'Department'}, {key:'doj', label:'DOJ'},
  {key:'lineManager', label:'Line Manager'}, {key:'evalDate', label:'Date of Evaluation'},
  {key:'strengths', label:'Strength Areas'}, {key:'development', label:'Areas of Development'},
  {key:'trainingAligned', label:'Training Aligned'}, {key:'objectives', label:'Learning Objectives'},
  {key:'urgency', label:'Training Urgency'}, {key:'trainingType', label:'External/Internal Training'},
  {key:'facilitator', label:'Trainer/Facilitation Institute'}, {key:'investment', label:'Training Investment'},
];
const TNA_STATE = { page:1, pageSize:8, sortKey:'name', sortDir:'asc', search:'', fDept:'', fUrgency:'' };

function tnaFilteredSorted(){
  let rows = loadTNA();
  rows = searchRows(rows, TNA_STATE.search, ['pin','name','designation','department','development','trainingAligned','lineManager']);
  if(TNA_STATE.fDept) rows = rows.filter(r=>r.department===TNA_STATE.fDept);
  if(TNA_STATE.fUrgency) rows = rows.filter(r=>r.urgency===TNA_STATE.fUrgency);
  rows = sortRows(rows, TNA_STATE.sortKey, TNA_STATE.sortDir);
  return rows;
}
function tnaUrgencyPill(u){
  const cls = u==='High' ? 'pill-rejected' : u==='Medium' ? 'pill-pending' : u==='Low' ? 'pill-approved' : '';
  return `<span class="status-pill ${cls}">${escapeHtml(u||'—')}</span>`;
}
function tnaCellHTML(r, key){
  if(key==='pin') return `<td style="font-family:var(--font-mono);font-size:11.5px;">${escapeHtml(r.pin)}</td>`;
  if(key==='name') return `<td><b>${escapeHtml(r.name)}</b></td>`;
  if(key==='urgency') return `<td>${tnaUrgencyPill(r.urgency)}</td>`;
  if(key==='investment') return `<td>${r.investment!=null && r.investment!=='' ? escapeHtml(String(r.investment)) : '—'}</td>`;
  return `<td style="max-width:220px;white-space:normal;">${escapeHtml(r[key])}</td>`;
}
function renderTNA(){
  const all = loadTNA();
  const depts = [...new Set(all.map(r=>r.department).filter(Boolean))].sort();
  const filtered = tnaFilteredSorted();
  const { pageRows, page, total } = paginateRows(filtered, TNA_STATE.page, TNA_STATE.pageSize);
  const withSr = pageRows.map((r,i)=>({...r, sr:(page-1)*TNA_STATE.pageSize+i+1}));

  content.innerHTML = `
  <div class="page">
    ${breadcrumbHTML('tna')}
    <div class="page-head">
      <div>
        <div class="page-tag">Learning &amp; Development</div>
        <h1>Training Need Analysis (TNA)</h1>
        <p class="page-desc">Departmental training needs assessment and skill-gap analysis. Areas of Development / Training Aligned feed directly into the Training Calendar's Title field.</p>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-outline btn-sm" onclick="printRows('Training Need Analysis', TNA_HEADERS, tnaFilteredSorted())">${ic('reports')} Print</button>
        ${downloadMenuHTML('tna', "exportRowsToExcel('tna', TNA_HEADERS, tnaFilteredSorted())", "exportRowsToPDF('tna','Training Need Analysis', TNA_HEADERS, tnaFilteredSorted())")}
        <button class="btn btn-solid btn-sm" onclick="openTNAModal()">${ic('plus')} Add Record</button>
      </div>
    </div>

    <div class="crud-toolbar">
      <div class="ctb-left">
        <div class="search-field" style="max-width:300px;">
          ${ic('directory')}
          <input type="text" id="tnaSearchInput" placeholder="Search PIN, name, department, dev. areas…" value="${escapeHtml(TNA_STATE.search)}" oninput="tnaSetSearch(this.value, this)" />
        </div>
        <label class="filter-select"><select onchange="tnaSetFilter('fDept', this.value)">
          <option value="">All Departments</option>
          ${depts.map(d=>`<option value="${escapeHtml(d)}" ${TNA_STATE.fDept===d?'selected':''}>${escapeHtml(d)}</option>`).join('')}
        </select></label>
        <label class="filter-select"><select onchange="tnaSetFilter('fUrgency', this.value)">
          <option value="">All Urgency</option>
          ${TNA_URGENCY.map(u=>`<option value="${u}" ${TNA_STATE.fUrgency===u?'selected':''}>${u}</option>`).join('')}
        </select></label>
      </div>
    </div>

    <div class="table-wrap crud-table-scroll">
      <table>
        <thead><tr>
          ${TNA_HEADERS.map(h=>sortHeaderHTML(h.label, h.key, TNA_STATE, 'tnaSort')).join('')}
          <th style="text-align:right;">Actions</th>
        </tr></thead>
        <tbody>
          ${withSr.length ? withSr.map(r=>`
            <tr>
              ${TNA_HEADERS.map(h=>tnaCellHTML(r, h.key)).join('')}
              <td><div class="row-actions" style="justify-content:flex-end;">
                <button class="mini-btn" title="Edit" onclick="openTNAModal('${r.id}')">${ic('edit')}</button>
                <button class="mini-btn" title="Delete" onclick="confirmDeleteTNA('${r.id}')">${ic('trash')}</button>
              </div></td>
            </tr>`).join('') : `<tr><td colspan="${TNA_HEADERS.length+1}"><div class="empty-state"><div class="es-icon">${ic('tna')}</div><h4>No TNA records</h4><p>Add a training need record to get started, or adjust your search/filters.</p></div></td></tr>`}
        </tbody>
      </table>
    </div>
    ${paginationBarHTML(TNA_STATE, total, 'tnaSetPage')}
  </div>
  <div id="tnaModalRoot"></div>`;
}
function tnaSetSearch(v, el){ const pos = el?el.selectionStart:null; TNA_STATE.search=v; TNA_STATE.page=1; renderTNA(); refocusSearch('tnaSearchInput', pos); }
function tnaSetFilter(k,v){ TNA_STATE[k]=v; TNA_STATE.page=1; renderTNA(); }
function tnaSetPage(p){ TNA_STATE.page=p; renderTNA(); }
function tnaSort(key){
  if(TNA_STATE.sortKey===key){ TNA_STATE.sortDir = TNA_STATE.sortDir==='asc'?'desc':'asc'; }
  else { TNA_STATE.sortKey=key; TNA_STATE.sortDir='asc'; }
  renderTNA();
}
function tnaFillFromPin(){
  const pin = document.getElementById('tfPin').value.trim();
  const emp = employeeByPin(pin);
  document.getElementById('tfName').value = emp ? emp.name : '';
  document.getElementById('tfDesignation').value = emp ? emp.designation : '';
  document.getElementById('tfDepartment').value = emp ? emp.department : '';
}
function openTNAModal(id){
  const editing = !!id;
  const r = editing ? loadTNA().find(x=>x.id===id) : null;
  const emps = loadEmployees();
  const root = document.getElementById('tnaModalRoot') || (function(){ const d=document.createElement('div'); d.id='tnaModalRoot'; document.body.appendChild(d); return d; })();
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closeTNAModal()">
    <div class="modal-box" style="max-width:720px;">
      <div class="modal-head"><h3>${editing?'Edit':'Add'} TNA Record</h3><button class="modal-close" onclick="closeTNAModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-grid-3">
          <div class="form-row"><label>PIN *</label><input type="text" id="tfPin" list="tnaEmpList" value="${r?escapeHtml(r.pin):''}" oninput="tnaFillFromPin()" placeholder="HMC-1001" /></div>
          <div class="form-row"><label>Name</label><input type="text" id="tfName" value="${r?escapeHtml(r.name):''}" disabled style="background:var(--steel-100);" /></div>
          <div class="form-row"><label>Designation</label><input type="text" id="tfDesignation" value="${r?escapeHtml(r.designation):''}" disabled style="background:var(--steel-100);" /></div>
        </div>
        <datalist id="tnaEmpList">${emps.map(e=>`<option value="${escapeHtml(e.pin)}">${escapeHtml(e.name)} — ${escapeHtml(e.designation)}</option>`).join('')}</datalist>
        <div class="form-grid-3">
          <div class="form-row"><label>Department</label><input type="text" id="tfDepartment" value="${r?escapeHtml(r.department):''}" disabled style="background:var(--steel-100);" /></div>
          <div class="form-row"><label>DOJ</label><input type="date" id="tfDoj" value="${r?r.doj||'':''}" /></div>
          <div class="form-row"><label>Line Manager</label><input type="text" id="tfLineManager" value="${r?escapeHtml(r.lineManager):''}" /></div>
        </div>
        <div class="form-row"><label>Date of Evaluation</label><input type="date" id="tfEvalDate" value="${r?r.evalDate||'':''}" /></div>
        <div class="form-row"><label>Strength Areas</label><textarea id="tfStrengths">${r?escapeHtml(r.strengths):''}</textarea></div>
        <div class="form-row"><label>Areas of Development</label><textarea id="tfDevelopment">${r?escapeHtml(r.development):''}</textarea></div>
        <div class="form-row"><label>Training Aligned</label><textarea id="tfTrainingAligned">${r?escapeHtml(r.trainingAligned):''}</textarea></div>
        <div class="form-row"><label>Learning Objectives</label><textarea id="tfObjectives">${r?escapeHtml(r.objectives):''}</textarea></div>
        <div class="form-grid-3">
          <div class="form-row"><label>Training Urgency</label><select id="tfUrgency">${TNA_URGENCY.map(u=>`<option ${r&&r.urgency===u?'selected':''}>${u}</option>`).join('')}</select></div>
          <div class="form-row"><label>External/Internal Training</label><select id="tfTrainingType">${TNA_TYPE.map(t=>`<option ${r&&r.trainingType===t?'selected':''}>${t}</option>`).join('')}</select></div>
          <div class="form-row"><label>Training Investment</label><input type="text" id="tfInvestment" value="${r&&r.investment!=null?r.investment:''}" placeholder="PKR" /></div>
        </div>
        <div class="form-row"><label>Trainer/Facilitation Institute</label><input type="text" id="tfFacilitator" value="${r?escapeHtml(r.facilitator):''}" /></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" onclick="closeTNAModal()">Cancel</button>
        <button class="btn btn-solid btn-sm" onclick="saveTNAFromModal(${editing?`'${id}'`:'null'})">${ic('plus')} ${editing?'Save Changes':'Add Record'}</button>
      </div>
    </div>
  </div>`;
}
function closeTNAModal(){ const r=document.getElementById('tnaModalRoot'); if(r) r.innerHTML=''; }
function saveTNAFromModal(id){
  const pinInput = document.getElementById('tfPin').value.trim();
  const emp = requireRegisteredEmployee(pinInput);
  if(!emp) return;
  const rec = {
    pin: emp.pin, name: emp.name,
    designation: emp.designation,
    department: emp.department,
    doj: document.getElementById('tfDoj').value,
    lineManager: document.getElementById('tfLineManager').value.trim(),
    evalDate: document.getElementById('tfEvalDate').value,
    strengths: document.getElementById('tfStrengths').value.trim(),
    development: document.getElementById('tfDevelopment').value.trim(),
    trainingAligned: document.getElementById('tfTrainingAligned').value.trim(),
    objectives: document.getElementById('tfObjectives').value.trim(),
    urgency: document.getElementById('tfUrgency').value,
    trainingType: document.getElementById('tfTrainingType').value,
    facilitator: document.getElementById('tfFacilitator').value.trim(),
    investment: document.getElementById('tfInvestment').value.trim(),
  };
  const list = loadTNA();
  if(id){
    const r = list.find(x=>x.id===id);
    if(r) Object.assign(r, rec);
    toast('TNA record updated.');
  } else {
    list.push({ id: uid('TNA'), ...rec });
    toast('TNA record added.');
  }
  saveTNA(list);
  closeTNAModal();
  renderRoute();
}
function confirmDeleteTNA(id){
  if(!confirm('Delete this TNA record permanently? This cannot be undone.')) return;
  saveTNA(loadTNA().filter(x=>x.id!==id));
  toast('TNA record deleted.');
  renderRoute();
}

/* ============================================================
   TRAINING CALENDAR — full CRUD module, linked to TNA
   ============================================================ */
const LS_TRAINCAL = 'hmc_traincal_v1';
function loadTrainCal(){ try{ const raw=localStorage.getItem(LS_TRAINCAL); if(raw) return JSON.parse(raw); }catch(e){} return []; }
function saveTrainCal(list){ localStorage.setItem(LS_TRAINCAL, JSON.stringify(list)); }

const TCAL_TYPE = ['Internal','External'];
const TCAL_STATUS = ['Planned','Scheduled','Ongoing','Completed','Cancelled'];
const TCAL_HEADERS = [
  {key:'sr', label:'SR.'}, {key:'type', label:'Type'}, {key:'title', label:'Title'},
  {key:'trainer', label:'Trainer/Facilitator'}, {key:'tentativeDate', label:'Tentative Date'},
  {key:'duration', label:'Duration'}, {key:'sessions', label:'Sessions/Frequency'}, {key:'venue', label:'Venue'},
  {key:'objectives', label:'Learning Objectives'}, {key:'targetParticipants', label:'Target Participants'},
  {key:'responsibility', label:'Responsibility'}, {key:'status', label:'Status'},
  {key:'numParticipants', label:'No. of Participants'}, {key:'participantNames', label:'Participant Names'},
  {key:'participantDept', label:'Participant Department'}, {key:'participantTier', label:'Participant Tier'},
  {key:'investmentExpended', label:'Training Investment Expended'}, {key:'feedback', label:'Training Feedback'},
  {key:'roi', label:'Training ROI/Impact'},
];
const TCAL_STATE = { page:1, pageSize:8, sortKey:'tentativeDate', sortDir:'desc', search:'', fType:'', fStatus:'' };

function tnaLinkOptions(){
  const opts = [];
  loadTNA().forEach(t=>{
    const who = t.name || t.pin || 'Unknown';
    if(t.development) opts.push({ value:`${t.id}||development`, label:`${who} — Areas of Development: ${t.development}`.slice(0,90) });
    if(t.trainingAligned) opts.push({ value:`${t.id}||trainingAligned`, label:`${who} — Training Aligned: ${t.trainingAligned}`.slice(0,90) });
  });
  return opts;
}
function tcApplyLink(v){
  if(!v) return;
  const [tid, src] = v.split('||');
  const t = loadTNA().find(x=>x.id===tid);
  if(!t) return;
  document.getElementById('cfTitle').value = t[src] || '';
  if(t.objectives) document.getElementById('cfObjectives').value = t.objectives;
  const hiddenTid = document.getElementById('cfTnaId'); if(hiddenTid) hiddenTid.value = tid;
  const hiddenSrc = document.getElementById('cfTnaSource'); if(hiddenSrc) hiddenSrc.value = src;
}
function tcalFilteredSorted(){
  let rows = loadTrainCal();
  rows = searchRows(rows, TCAL_STATE.search, ['title','trainer','venue','responsibility','targetParticipants']);
  if(TCAL_STATE.fType) rows = rows.filter(r=>r.type===TCAL_STATE.fType);
  if(TCAL_STATE.fStatus) rows = rows.filter(r=>r.status===TCAL_STATE.fStatus);
  rows = sortRows(rows, TCAL_STATE.sortKey, TCAL_STATE.sortDir);
  return rows;
}
function tcalStatusPill(s){
  const cls = s==='Completed' ? 'pill-approved' : s==='Cancelled' ? 'pill-rejected' : 'pill-pending';
  return `<span class="status-pill ${cls}">${escapeHtml(s||'—')}</span>`;
}
function tcalCellHTML(r, key){
  if(key==='title') return `<td><b>${escapeHtml(r.title)}</b>${r.tnaId?` <span title="Linked to TNA record" style="opacity:.55;font-size:11px;">${ic('tna')}</span>`:''}</td>`;
  if(key==='status') return `<td>${tcalStatusPill(r.status)}</td>`;
  if(key==='numParticipants') return `<td>${r.numParticipants!=null && r.numParticipants!=='' ? escapeHtml(String(r.numParticipants)) : '—'}</td>`;
  if(key==='investmentExpended') return `<td>${r.investmentExpended!=null && r.investmentExpended!=='' ? escapeHtml(String(r.investmentExpended)) : '—'}</td>`;
  return `<td style="max-width:200px;white-space:normal;">${escapeHtml(r[key])}</td>`;
}
/* Hub page for the "Training & Development" parent nav item — lets the
   user pick between TNA, Training Calendar and Training Announcements
   instead of landing on a generic placeholder. This is what the dashboard's
   "Training" quick card opens. */
function renderTrainingHub(){
  content.innerHTML = `
  <div class="page">
    ${breadcrumbHTML('training')}
    <div class="page-head">
      <div>
        <div class="page-tag">Training & Development</div>
        <h1>Training & Development</h1>
        <p class="page-desc">Capability building programs across HMC business units. Choose where you'd like to go.</p>
      </div>
    </div>
    <div class="scope-cards">
      <div class="scope-card" onclick="navigateTo('tna')">
        <h3>${ic('tna')} TNA (Training Need Analysis)</h3>
        <p>Departmental training needs assessment and skill-gap analysis.</p>
      </div>
      <div class="scope-card" onclick="navigateTo('training-calendar')">
        <h3>${ic('calendar')} Training Calendar</h3>
        <p>Scheduled training sessions, workshops and certification programs.</p>
      </div>
      <div class="scope-card" onclick="navigateTo('training-announcements')">
        <h3>${ic('buzzer')} Training Announcements</h3>
        <p>News and announcements about upcoming or ongoing training — alerts the whole dashboard.</p>
      </div>
    </div>
  </div>`;
}

function renderTrainingCalendar(){
  const filtered = tcalFilteredSorted();
  const { pageRows, page, total } = paginateRows(filtered, TCAL_STATE.page, TCAL_STATE.pageSize);
  const withSr = pageRows.map((r,i)=>({...r, sr:(page-1)*TCAL_STATE.pageSize+i+1}));

  content.innerHTML = `
  <div class="page">
    ${breadcrumbHTML('training-calendar')}
    <div class="page-head">
      <div>
        <div class="page-tag">Learning &amp; Development</div>
        <h1>Training Calendar</h1>
        <p class="page-desc">Scheduled training sessions, workshops and certification programs. Link a record to a TNA entry's Areas of Development or Training Aligned to auto-fill the Title field.</p>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-outline btn-sm" onclick="printRows('Training Calendar', TCAL_HEADERS, tcalFilteredSorted())">${ic('reports')} Print</button>
        ${downloadMenuHTML('traincal', "exportRowsToExcel('training-calendar', TCAL_HEADERS, tcalFilteredSorted())", "exportRowsToPDF('training-calendar','Training Calendar', TCAL_HEADERS, tcalFilteredSorted())")}
        <button class="btn btn-solid btn-sm" onclick="openTCalModal()">${ic('plus')} Add Record</button>
      </div>
    </div>

    <div class="info-strip">
      ${ic('info')}
      <span>When adding a record, use <strong>Link Training Need</strong> to pull the Title straight from a TNA entry's Areas of Development or Training Aligned — no manual retyping.</span>
    </div>

    <div class="crud-toolbar">
      <div class="ctb-left">
        <div class="search-field" style="max-width:300px;">
          ${ic('directory')}
          <input type="text" id="tcalSearchInput" placeholder="Search title, trainer, venue…" value="${escapeHtml(TCAL_STATE.search)}" oninput="tcalSetSearch(this.value, this)" />
        </div>
        <label class="filter-select"><select onchange="tcalSetFilter('fType', this.value)">
          <option value="">All Types</option>
          ${TCAL_TYPE.map(t=>`<option value="${t}" ${TCAL_STATE.fType===t?'selected':''}>${t}</option>`).join('')}
        </select></label>
        <label class="filter-select"><select onchange="tcalSetFilter('fStatus', this.value)">
          <option value="">All Statuses</option>
          ${TCAL_STATUS.map(s=>`<option value="${s}" ${TCAL_STATE.fStatus===s?'selected':''}>${s}</option>`).join('')}
        </select></label>
      </div>
    </div>

    <div class="table-wrap crud-table-scroll">
      <table>
        <thead><tr>
          ${TCAL_HEADERS.map(h=>sortHeaderHTML(h.label, h.key, TCAL_STATE, 'tcalSort')).join('')}
          <th style="text-align:right;">Actions</th>
        </tr></thead>
        <tbody>
          ${withSr.length ? withSr.map(r=>`
            <tr>
              ${TCAL_HEADERS.map(h=>tcalCellHTML(r, h.key)).join('')}
              <td><div class="row-actions" style="justify-content:flex-end;">
                <button class="mini-btn" title="Edit" onclick="openTCalModal('${r.id}')">${ic('edit')}</button>
                <button class="mini-btn" title="Delete" onclick="confirmDeleteTCal('${r.id}')">${ic('trash')}</button>
              </div></td>
            </tr>`).join('') : `<tr><td colspan="${TCAL_HEADERS.length+1}"><div class="empty-state"><div class="es-icon">${ic('calendar')}</div><h4>No training scheduled</h4><p>Add a training calendar record, optionally linked to a TNA entry.</p></div></td></tr>`}
        </tbody>
      </table>
    </div>
    ${paginationBarHTML(TCAL_STATE, total, 'tcalSetPage')}
  </div>
  <div id="tcalModalRoot"></div>`;
}
function tcalSetSearch(v, el){ const pos = el?el.selectionStart:null; TCAL_STATE.search=v; TCAL_STATE.page=1; renderTrainingCalendar(); refocusSearch('tcalSearchInput', pos); }
function tcalSetFilter(k,v){ TCAL_STATE[k]=v; TCAL_STATE.page=1; renderTrainingCalendar(); }
function tcalSetPage(p){ TCAL_STATE.page=p; renderTrainingCalendar(); }
function tcalSort(key){
  if(TCAL_STATE.sortKey===key){ TCAL_STATE.sortDir = TCAL_STATE.sortDir==='asc'?'desc':'asc'; }
  else { TCAL_STATE.sortKey=key; TCAL_STATE.sortDir='asc'; }
  renderTrainingCalendar();
}
function openTCalModal(id){
  const editing = !!id;
  const r = editing ? loadTrainCal().find(x=>x.id===id) : null;
  const linkOpts = tnaLinkOptions();
  const root = document.getElementById('tcalModalRoot') || (function(){ const d=document.createElement('div'); d.id='tcalModalRoot'; document.body.appendChild(d); return d; })();
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closeTCalModal()">
    <div class="modal-box" style="max-width:720px;">
      <div class="modal-head"><h3>${editing?'Edit':'Add'} Training Calendar Record</h3><button class="modal-close" onclick="closeTCalModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <label>Link Training Need (auto-fills Title)</label>
          <select id="cfLink" onchange="tcApplyLink(this.value)">
            <option value="">— No link / enter Title manually —</option>
            ${linkOpts.map(o=>`<option value="${o.value}" ${r&&r.tnaId&&r.tnaSource&&(o.value===r.tnaId+'||'+r.tnaSource)?'selected':''}>${escapeHtml(o.label)}</option>`).join('')}
          </select>
          <input type="hidden" id="cfTnaId" value="${r&&r.tnaId?r.tnaId:''}" />
          <input type="hidden" id="cfTnaSource" value="${r&&r.tnaSource?r.tnaSource:''}" />
        </div>
        <div class="form-grid-2">
          <div class="form-row"><label>Type</label><select id="cfType">${TCAL_TYPE.map(t=>`<option ${r&&r.type===t?'selected':''}>${t}</option>`).join('')}</select></div>
          <div class="form-row"><label>Title *</label><input type="text" id="cfTitle" value="${r?escapeHtml(r.title):''}" placeholder="Training title" /></div>
        </div>
        <div class="form-grid-2">
          <div class="form-row"><label>Trainer/Facilitator</label><input type="text" id="cfTrainer" value="${r?escapeHtml(r.trainer):''}" /></div>
          <div class="form-row"><label>Tentative Date</label><input type="date" id="cfDate" value="${r?r.tentativeDate||'':''}" /></div>
        </div>
        <div class="form-grid-3">
          <div class="form-row"><label>Duration</label><input type="text" id="cfDuration" value="${r?escapeHtml(r.duration):''}" placeholder="e.g. 2 days" /></div>
          <div class="form-row"><label>Sessions/Frequency</label><input type="text" id="cfSessions" value="${r?escapeHtml(r.sessions):''}" /></div>
          <div class="form-row"><label>Venue</label><input type="text" id="cfVenue" value="${r?escapeHtml(r.venue):''}" /></div>
        </div>
        <div class="form-row"><label>Learning Objectives</label><textarea id="cfObjectives">${r?escapeHtml(r.objectives):''}</textarea></div>
        <div class="form-grid-2">
          <div class="form-row"><label>Target Participants</label><input type="text" id="cfTargetParticipants" value="${r?escapeHtml(r.targetParticipants):''}" /></div>
          <div class="form-row"><label>Responsibility</label><input type="text" id="cfResponsibility" value="${r?escapeHtml(r.responsibility):''}" /></div>
        </div>
        <div class="form-grid-2">
          <div class="form-row"><label>Status</label><select id="cfStatus">${TCAL_STATUS.map(s=>`<option ${r&&r.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
          <div class="form-row"><label>No. of Participants</label><input type="text" id="cfNumParticipants" value="${r&&r.numParticipants!=null?r.numParticipants:''}" /></div>
        </div>
        <div class="form-row"><label>Participant Names</label><textarea id="cfParticipantNames">${r?escapeHtml(r.participantNames):''}</textarea></div>
        <div class="form-grid-2">
          <div class="form-row"><label>Participant Department</label><input type="text" id="cfParticipantDept" value="${r?escapeHtml(r.participantDept):''}" /></div>
          <div class="form-row"><label>Participant Tier</label><input type="text" id="cfParticipantTier" value="${r?escapeHtml(r.participantTier):''}" /></div>
        </div>
        <div class="form-row"><label>Training Investment Expended</label><input type="text" id="cfInvestmentExpended" value="${r&&r.investmentExpended!=null?r.investmentExpended:''}" placeholder="PKR" /></div>
        <div class="form-row"><label>Training Feedback</label><textarea id="cfFeedback">${r?escapeHtml(r.feedback):''}</textarea></div>
        <div class="form-row"><label>Training ROI/Impact</label><textarea id="cfRoi">${r?escapeHtml(r.roi):''}</textarea></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" onclick="closeTCalModal()">Cancel</button>
        <button class="btn btn-solid btn-sm" onclick="saveTCalFromModal(${editing?`'${id}'`:'null'})">${ic('plus')} ${editing?'Save Changes':'Add Record'}</button>
      </div>
    </div>
  </div>`;
}
function closeTCalModal(){ const r=document.getElementById('tcalModalRoot'); if(r) r.innerHTML=''; }
function saveTCalFromModal(id){
  const title = document.getElementById('cfTitle').value.trim();
  if(!title){ toast('Title is required (link a TNA record or enter one manually).', 'error'); return; }
  const rec = {
    type: document.getElementById('cfType').value,
    title,
    tnaId: document.getElementById('cfTnaId').value || null,
    tnaSource: document.getElementById('cfTnaSource').value || null,
    trainer: document.getElementById('cfTrainer').value.trim(),
    tentativeDate: document.getElementById('cfDate').value,
    duration: document.getElementById('cfDuration').value.trim(),
    sessions: document.getElementById('cfSessions').value.trim(),
    venue: document.getElementById('cfVenue').value.trim(),
    objectives: document.getElementById('cfObjectives').value.trim(),
    targetParticipants: document.getElementById('cfTargetParticipants').value.trim(),
    responsibility: document.getElementById('cfResponsibility').value.trim(),
    status: document.getElementById('cfStatus').value,
    numParticipants: document.getElementById('cfNumParticipants').value.trim(),
    participantNames: document.getElementById('cfParticipantNames').value.trim(),
    participantDept: document.getElementById('cfParticipantDept').value.trim(),
    participantTier: document.getElementById('cfParticipantTier').value.trim(),
    investmentExpended: document.getElementById('cfInvestmentExpended').value.trim(),
    feedback: document.getElementById('cfFeedback').value.trim(),
    roi: document.getElementById('cfRoi').value.trim(),
  };
  const list = loadTrainCal();
  if(id){
    const r = list.find(x=>x.id===id);
    if(r) Object.assign(r, rec);
    toast('Training Calendar record updated.');
  } else {
    list.push({ id: uid('TC'), ...rec });
    toast('Training Calendar record added.');
  }
  saveTrainCal(list);
  closeTCalModal();
  renderRoute();
}
function confirmDeleteTCal(id){
  if(!confirm('Delete this Training Calendar record permanently? This cannot be undone.')) return;
  saveTrainCal(loadTrainCal().filter(x=>x.id!==id));
  toast('Training Calendar record deleted.');
  renderRoute();
}

/* ============================================================
   TRAINING ANNOUNCEMENTS — sits under Training & Development,
   right after the Training Calendar. Every announcement is pushed
   into the same global notification/buzzer system used elsewhere
   (addNotif -> playBuzzer), so it shows up in the bell, the
   dashboard's Notifications panel, and sounds the buzzer.
   ============================================================ */
const LS_TRAIN_ANNOUNCE = 'hmc_train_announce_v1';
function loadTrainAnnounce(){
  try{
    const raw = localStorage.getItem(LS_TRAIN_ANNOUNCE);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  const seed = [];
  saveTrainAnnounce(seed);
  return seed;
}
function saveTrainAnnounce(list){ localStorage.setItem(LS_TRAIN_ANNOUNCE, JSON.stringify(list)); }

function renderTrainingAnnouncements(){
  const id = 'training-announcements';
  const ref = FLAT[id];
  const it = ref.item;
  const sectionLabel = ref.grand ? ref.grand.label : (ref.parent ? ref.parent.label : it.label);
  const list = loadTrainAnnounce().slice().sort((a,b)=> new Date(b.time) - new Date(a.time));

  content.innerHTML = `
  <div class="page">
    ${breadcrumbHTML(id)}
    <div class="page-head">
      <div>
        <div class="page-tag">${sectionLabel}</div>
        <h1>Training Announcements</h1>
        <p class="page-desc">News and alerts about upcoming or ongoing training. Posting here also sounds the buzzer and appears in the dashboard's Notifications panel and the bell menu for everyone.</p>
      </div>
      <div class="toolbar-actions">
        <div class="sound-toggle ${TRAIN_SOUND_ENABLED?'on':''}" onclick="toggleTrainSound()" title="Toggle training announcement buzzer sound"><div class="switch"></div>Alert sound</div>
        <button class="btn btn-solid btn-sm" onclick="openTrainAnnounceModal()">${ic('plus')} New Announcement</button>
      </div>
    </div>

    <div class="info-strip">
      ${ic('info')}
      <span>Every announcement posted here fires the <b>buzzer</b> and is pushed to the dashboard/notification bell automatically — no separate step needed.</span>
    </div>

    <div class="panel" style="margin-top:16px;">
      ${list.length ? list.map(a=>`
        <div class="announce-item">
          <div class="announce-badge ${a.priority==='urgent'?'icon-red':(a.priority==='important'?'icon-amber':'icon-blue')}">${ic('buzzer')}</div>
          <div class="announce-body" style="flex:1;">
            <b>${escapeHtml(a.title)}</b>
            <p>${escapeHtml(a.message||'')}</p>
            <div class="meta">${timeAgo(a.time)} · ${a.priority}</div>
          </div>
          <div class="row-actions">
            <button class="mini-btn" title="Edit" onclick="openTrainAnnounceModal('${a.id}')">${ic('edit')}</button>
            <button class="mini-btn" title="Delete" onclick="deleteTrainAnnounce('${a.id}')">${ic('trash')}</button>
          </div>
        </div>`).join('') : `<div class="empty-state"><div class="es-icon">${ic('buzzer')}</div><h4>No training announcements yet</h4><p>Post one to alert the whole organization — it will buzz and show up on the dashboard instantly.</p></div>`}
    </div>
  </div>
  <div id="taModalRoot"></div>`;
}

function openTrainAnnounceModal(id){
  const list = loadTrainAnnounce();
  const r = id ? list.find(x=>x.id===id) : null;
  const root = document.getElementById('taModalRoot');
  if(!root) return;
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closeTrainAnnounceModal()">
    <div class="modal-box">
      <div class="modal-head"><h3>${r?'Edit':'New'} Training Announcement</h3><button class="modal-close" onclick="closeTrainAnnounceModal()">✕</button></div>
      <div class="modal-body">
        <input type="hidden" id="taId" value="${r?r.id:''}" />
        <div class="form-row"><label>Title *</label><input type="text" id="taTitle" value="${r?escapeHtml(r.title):''}" placeholder="e.g. Fire Safety Workshop — 20th Aug" /></div>
        <div class="form-row"><label>Details</label><textarea id="taMessage" placeholder="Venue, timing, who should attend...">${r?escapeHtml(r.message||''):''}</textarea></div>
        <div class="form-row"><label>Priority</label>
          <select id="taPriority">
            <option value="normal" ${!r||r.priority==='normal'?'selected':''}>Normal</option>
            <option value="important" ${r&&r.priority==='important'?'selected':''}>Important</option>
            <option value="urgent" ${r&&r.priority==='urgent'?'selected':''}>Urgent</option>
          </select>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" onclick="closeTrainAnnounceModal()">Cancel</button>
        <button class="btn btn-solid btn-sm" onclick="saveTrainAnnounceForm()">${ic('buzzer')} ${r?'Save':'Post & Buzz'}</button>
      </div>
    </div>
  </div>`;
}
function closeTrainAnnounceModal(){ const r=document.getElementById('taModalRoot'); if(r) r.innerHTML=''; }
function saveTrainAnnounceForm(){
  const id = document.getElementById('taId').value;
  const title = document.getElementById('taTitle').value.trim();
  if(!title){ toast('Title is required.'); return; }
  const rec = {
    title,
    message: document.getElementById('taMessage').value.trim(),
    priority: document.getElementById('taPriority').value,
  };
  const list = loadTrainAnnounce();
  if(id){
    const r = list.find(x=>x.id===id);
    if(r) Object.assign(r, rec);
    toast('Training announcement updated.');
  } else {
    const newRec = { id: uid('TA'), time: new Date().toISOString(), ...rec };
    list.unshift(newRec);
    /* Push into the shared notifications/buzzer pipeline so it shows on the
       dashboard and bell immediately, and sounds the buzzer. */
    addNotif('Training: ' + newRec.title, newRec.priority==='urgent'?'urgent':(newRec.priority==='important'?'important':'normal'), 'training');
    toast('Announcement posted — buzzer sounded and dashboard updated.');
  }
  saveTrainAnnounce(list);
  closeTrainAnnounceModal();
  renderRoute();
}
function deleteTrainAnnounce(id){
  if(!confirm('Delete this training announcement permanently? This cannot be undone.')) return;
  saveTrainAnnounce(loadTrainAnnounce().filter(x=>x.id!==id));
  toast('Training announcement deleted.');
  renderRoute();
}

/* ============================================================
   INTERNSHIP — Internship Management Dashboard, full CRUD module
   ============================================================ */
const LS_INTERNSHIP = 'hmc_internship_v1';
function loadInternship(){ try{ const raw=localStorage.getItem(LS_INTERNSHIP); if(raw) return JSON.parse(raw); }catch(e){} return []; }
function saveInternship(list){ localStorage.setItem(LS_INTERNSHIP, JSON.stringify(list)); }

const INTERN_HEADERS = [
  {key:'sno', label:'S.NO'},
  {key:'name', label:'Name'},
  {key:'fatherName', label:'Father Name'},
  {key:'regNo', label:'Registration Number'},
  {key:'department', label:'Department'},
  {key:'discipline', label:'Discipline(DeparT)'},
  {key:'instituteName', label:'Institute Name'},
  {key:'contactNo', label:'Contact NO'},
  {key:'month', label:'Month'},
  {key:'engDipp', label:'ENG/DIPP'},
  {key:'remarks', label:'Remarks'},
  {key:'instructorNameEmail', label:'Instructor Name or Email'},
  {key:'doj', label:'Date of Joining'},
  {key:'durationMonths', label:'Duration (Months)'},
  {key:'endDate', label:'End Date'},
  {key:'timeCompleted', label:'Time Completed'},
  {key:'timeRemaining', label:'Time Remaining'},
  {key:'status', label:'Status'},
  {key:'cnic', label:'CNIC'},
];
/* Adds computed internship-duration fields (end date, time completed, time
   remaining) to a row based on Date of Joining + Duration (Months), so the
   Internship report always reflects live elapsed/remaining time — no manual
   entry or stale data. */
function internWithComputed(r){
  const out = {...r};
  const months = parseFloat(r.durationMonths);
  if(r.doj && months>0){
    const start = new Date(r.doj+'T00:00:00');
    const end = new Date(start);
    end.setMonth(end.getMonth()+Math.floor(months));
    end.setDate(end.getDate()+Math.round((months%1)*30));
    const today = new Date(); today.setHours(0,0,0,0);
    const msDay = 86400000;
    const totalDays = Math.max(1, Math.round((end-start)/msDay));
    const elapsedDays = Math.min(totalDays, Math.max(0, Math.round((today-start)/msDay)));
    const remainingDays = Math.max(0, totalDays-elapsedDays);
    out.endDate = end.toISOString().slice(0,10);
    if(today < start){
      out.timeCompleted = 'Not started';
      out.timeRemaining = totalDays+' days (from start)';
    } else if(r.status==='Completed' || elapsedDays>=totalDays){
      out.timeCompleted = totalDays+' days (100%)';
      out.timeRemaining = 'Completed';
    } else {
      out.timeCompleted = elapsedDays+' of '+totalDays+' days ('+Math.round(elapsedDays/totalDays*100)+'%)';
      out.timeRemaining = remainingDays+' days left';
    }
  } else {
    out.endDate = '—'; out.timeCompleted = '—'; out.timeRemaining = '—';
  }
  return out;
}
/* Focused subset of columns just for the "Time Report" — how much of each
   internship is done vs how much is left, at a glance. */
const INTERN_TIME_HEADERS = [
  {key:'sno', label:'S.NO'},
  {key:'name', label:'Name'},
  {key:'department', label:'Department'},
  {key:'doj', label:'Date of Joining'},
  {key:'durationMonths', label:'Duration (Months)'},
  {key:'endDate', label:'End Date'},
  {key:'timeCompleted', label:'Time Completed'},
  {key:'timeRemaining', label:'Time Remaining'},
  {key:'status', label:'Status'},
];
const INTERN_STATUS_OPTIONS = ['Active','Completed'];
const INTERN_STATE = { page:1, pageSize:8, sortKey:'doj', sortDir:'desc', search:'', fDept:'', fStatus:'', fMonth:'', fDoj:'' };

function internFilteredSorted(){
  let rows = loadInternship();
  rows = searchRows(rows, INTERN_STATE.search, ['name','fatherName','regNo','discipline','instituteName','contactNo','instructorNameEmail','cnic','department']);
  if(INTERN_STATE.fDept) rows = rows.filter(r=>(r.department||'')===INTERN_STATE.fDept);
  if(INTERN_STATE.fStatus) rows = rows.filter(r=>r.status===INTERN_STATE.fStatus);
  if(INTERN_STATE.fMonth) rows = rows.filter(r=>r.month===INTERN_STATE.fMonth);
  if(INTERN_STATE.fDoj) rows = rows.filter(r=>r.doj===INTERN_STATE.fDoj);
  rows = sortRows(rows, INTERN_STATE.sortKey, INTERN_STATE.sortDir);
  return rows.map(internWithComputed);
}
function internCellHTML(r, key){
  if(key==='name') return `<td><b>${escapeHtml(r.name)}</b></td>`;
  if(key==='status') return `<td>${r.status ? `<span class="balance-pill ${r.status==='Active'?'balance-pos':'balance-zero'}">${escapeHtml(r.status)}</span>` : '—'}</td>`;
  if(key==='remarks') return `<td class="td-truncate" title="${escapeHtml(r.remarks||'')}">${r.remarks?escapeHtml(r.remarks):'—'}</td>`;
  if(key==='timeRemaining') return `<td><span class="balance-pill ${r.timeRemaining==='Completed'?'balance-zero':(r.timeRemaining==='—'?'':'balance-pos')}">${escapeHtml(r.timeRemaining||'—')}</span></td>`;
  return `<td style="max-width:200px;white-space:normal;">${r[key]!=null && r[key]!=='' ? escapeHtml(String(r[key])) : '—'}</td>`;
}
function internDashboardCardsHTML(){
  const all = loadInternship();
  const depts = [...new Set(all.map(r=>r.department).filter(Boolean))].sort();
  const cols = Math.min(6, Math.max(2, depts.length+1));
  let html = `<div class="mini-stat-grid" style="grid-template-columns:repeat(${cols},minmax(0,1fr));">`;
  html += `<div class="card mini-stat-card dash-card-clickable ${!INTERN_STATE.fDept?'dash-card-active':''}" onclick="internFilterDept('')">
      <div class="mini-stat-value">${all.length}</div><div class="mini-stat-label">Total Interns</div><div class="mini-stat-sub">all departments</div>
    </div>`;
  depts.forEach(d=>{
    const count = all.filter(r=>r.department===d).length;
    html += `<div class="card mini-stat-card dash-card-clickable ${INTERN_STATE.fDept===d?'dash-card-active':''}" onclick="internFilterDept('${escapeHtml(d).replace(/'/g,"\\'")}')">
      <div class="mini-stat-value">${count}</div><div class="mini-stat-label">${escapeHtml(d)}</div><div class="mini-stat-sub">interns</div>
    </div>`;
  });
  html += `</div>`;
  return html;
}
function internFilterDept(d){ INTERN_STATE.fDept=d; INTERN_STATE.page=1; renderInternship(); }
function renderInternship(){
  const all = loadInternship();
  const depts = [...new Set(all.map(r=>r.department).filter(Boolean))].sort();
  const months = [...new Set(all.map(r=>r.month).filter(Boolean))];
  const filtered = internFilteredSorted();
  const { pageRows, page, total } = paginateRows(filtered, INTERN_STATE.page, INTERN_STATE.pageSize);
  const withSr = pageRows.map((r,i)=>({...r, sno:(page-1)*INTERN_STATE.pageSize+i+1}));

  content.innerHTML = `
  <div class="page">
    ${breadcrumbHTML('internship')}
    <div class="page-head">
      <div>
        <div class="page-tag">Learning &amp; Development</div>
        <h1>Internship</h1>
        <p class="page-desc">Register and track interns placed across HMC departments — personal, academic and placement details. Click a card below to filter instantly.</p>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-outline btn-sm" onclick="printRows('Internship', INTERN_HEADERS, internFilteredSorted())">${ic('reports')} Print</button>
        <button class="btn btn-outline btn-sm" onclick="printRows('Internship Time Report', INTERN_TIME_HEADERS, internFilteredSorted())">${ic('reports')} Time Report</button>
        ${downloadMenuHTML('intern', "exportRowsToExcel('internship', INTERN_HEADERS, internFilteredSorted())", "exportRowsToPDF('internship','Internship', INTERN_HEADERS, internFilteredSorted())")}
        <button class="btn btn-solid btn-sm" onclick="openInternModal()">${ic('plus')} Add Intern</button>
      </div>
    </div>

    <div id="internDashCards">${internDashboardCardsHTML()}</div>

    <div class="crud-toolbar">
      <div class="ctb-left">
        <div class="search-field" style="max-width:300px;">
          ${ic('directory')}
          <input type="text" id="internSearchInput" placeholder="Search name, reg no, institute, instructor…" value="${escapeHtml(INTERN_STATE.search)}" oninput="internSetSearch(this.value, this)" />
        </div>
        <label class="filter-select"><select onchange="internSetFilter('fDept', this.value)">
          <option value="">All Departments</option>
          ${depts.map(d=>`<option value="${escapeHtml(d)}" ${INTERN_STATE.fDept===d?'selected':''}>${escapeHtml(d)}</option>`).join('')}
        </select></label>
        <label class="filter-select"><select onchange="internSetFilter('fStatus', this.value)">
          <option value="">All Status</option>
          ${INTERN_STATUS_OPTIONS.map(s=>`<option value="${s}" ${INTERN_STATE.fStatus===s?'selected':''}>${s}</option>`).join('')}
        </select></label>
        <label class="filter-select"><select onchange="internSetFilter('fMonth', this.value)">
          <option value="">All Months</option>
          ${months.map(m=>`<option value="${escapeHtml(m)}" ${INTERN_STATE.fMonth===m?'selected':''}>${escapeHtml(m)}</option>`).join('')}
        </select></label>
        <label class="filter-select" style="padding:0;">
          <input type="date" value="${INTERN_STATE.fDoj}" onchange="internSetFilter('fDoj', this.value)" title="Filter by Joining Date"
            style="border:none;background:transparent;font-family:inherit;font-size:13px;color:var(--ink);padding:9px 10px;outline:none;" />
        </label>
        ${(INTERN_STATE.fDept||INTERN_STATE.fStatus||INTERN_STATE.fMonth||INTERN_STATE.fDoj) ? `<button class="btn btn-outline btn-sm" onclick="internClearFilters()">✕ Clear Filters</button>` : ''}
      </div>
    </div>

    <div class="table-wrap crud-table-scroll">
      <table>
        <thead><tr>
          ${INTERN_HEADERS.map(h=>sortHeaderHTML(h.label, h.key, INTERN_STATE, 'internSort')).join('')}
          <th style="text-align:right;">Actions</th>
        </tr></thead>
        <tbody>
          ${withSr.length ? withSr.map(r=>`
            <tr>
              ${INTERN_HEADERS.map(h=>internCellHTML(r, h.key)).join('')}
              <td><div class="row-actions" style="justify-content:flex-end;">
                <button class="mini-btn" title="Edit" onclick="openInternModal('${r.id}')">${ic('edit')}</button>
                <button class="mini-btn" title="Delete" onclick="confirmDeleteIntern('${r.id}')">${ic('trash')}</button>
              </div></td>
            </tr>`).join('') : `<tr><td colspan="${INTERN_HEADERS.length+1}"><div class="empty-state"><div class="es-icon">${ic('usergraduate')}</div><h4>No interns registered</h4><p>Add an intern record to start tracking placements.</p></div></td></tr>`}
        </tbody>
      </table>
    </div>
    ${paginationBarHTML(INTERN_STATE, total, 'internSetPage')}
  </div>
  <div id="internModalRoot"></div>`;
}
function internSetSearch(v, el){ const pos = el?el.selectionStart:null; INTERN_STATE.search=v; INTERN_STATE.page=1; renderInternship(); refocusSearch('internSearchInput', pos); }
function internSetFilter(k,v){ INTERN_STATE[k]=v; INTERN_STATE.page=1; renderInternship(); }
function internClearFilters(){ INTERN_STATE.fDept=''; INTERN_STATE.fStatus=''; INTERN_STATE.fMonth=''; INTERN_STATE.fDoj=''; INTERN_STATE.page=1; renderInternship(); }
function internSetPage(p){ INTERN_STATE.page=p; renderInternship(); }
function internSort(key){
  if(INTERN_STATE.sortKey===key){ INTERN_STATE.sortDir = INTERN_STATE.sortDir==='asc'?'desc':'asc'; }
  else { INTERN_STATE.sortKey=key; INTERN_STATE.sortDir='asc'; }
  renderInternship();
}
function openInternModal(id){
  const editing = !!id;
  const r = editing ? loadInternship().find(x=>x.id===id) : null;
  const root = document.getElementById('internModalRoot') || (function(){ const d=document.createElement('div'); d.id='internModalRoot'; document.body.appendChild(d); return d; })();
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closeInternModal()">
    <div class="modal-box" style="max-width:720px;">
      <div class="modal-head"><h3>${editing?'Edit':'Add'} Intern Record</h3><button class="modal-close" onclick="closeInternModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-grid-2">
          <div class="form-row"><label>Name *</label><input type="text" id="ifName" value="${r?escapeHtml(r.name):''}" /></div>
          <div class="form-row"><label>Father Name</label><input type="text" id="ifFatherName" value="${r?escapeHtml(r.fatherName):''}" /></div>
        </div>
        <div class="form-grid-2">
          <div class="form-row"><label>Registration Number</label><input type="text" id="ifRegNo" value="${r?escapeHtml(r.regNo):''}" /></div>
          <div class="form-row"><label>Department *</label><input type="text" id="ifDepartment" list="ifDeptList" value="${r?escapeHtml(r.department):''}" placeholder="e.g. AI, IT, Finance, HR" /></div>
        </div>
        <datalist id="ifDeptList">${[...new Set(loadInternship().map(x=>x.department).filter(Boolean))].map(d=>`<option value="${escapeHtml(d)}">`).join('')}</datalist>
        <div class="form-grid-2">
          <div class="form-row"><label>Discipline(DeparT)</label><input type="text" id="ifDiscipline" value="${r?escapeHtml(r.discipline):''}" /></div>
          <div class="form-row"><label>Institute Name</label><input type="text" id="ifInstituteName" value="${r?escapeHtml(r.instituteName):''}" /></div>
        </div>
        <div class="form-grid-2">
          <div class="form-row"><label>Contact NO</label><input type="text" id="ifContactNo" value="${r?escapeHtml(r.contactNo):''}" /></div>
          <div class="form-row"><label>Month</label><input type="text" id="ifMonth" value="${r?escapeHtml(r.month):''}" placeholder="e.g. July" /></div>
        </div>
        <div class="form-grid-2">
          <div class="form-row"><label>ENG/DIPP</label><input type="text" id="ifEngDipp" value="${r?escapeHtml(r.engDipp):''}" /></div>
          <div class="form-row"><label>Status</label><select id="ifStatus">${INTERN_STATUS_OPTIONS.map(s=>`<option ${r&&r.status===s?'selected':(!r&&s==='Active'?'selected':'')}>${s}</option>`).join('')}</select></div>
        </div>
        <div class="form-row"><label>Remarks</label><textarea id="ifRemarks">${r?escapeHtml(r.remarks):''}</textarea></div>
        <div class="form-grid-2">
          <div class="form-row"><label>Instructor Name or Email</label><input type="text" id="ifInstructorNameEmail" value="${r?escapeHtml(r.instructorNameEmail):''}" /></div>
          <div class="form-row"><label>Date of Joining</label><input type="date" id="ifDoj" value="${r?r.doj||'':''}" /></div>
        </div>
        <div class="form-grid-2">
          <div class="form-row"><label>Duration (Months)</label><input type="number" min="0" step="0.5" id="ifDurationMonths" value="${r&&r.durationMonths!=null?r.durationMonths:''}" placeholder="e.g. 3" /></div>
          <div class="form-row"><label>CNIC</label><input type="text" id="ifCnic" value="${r?escapeHtml(r.cnic):''}" placeholder="xxxxx-xxxxxxx-x" /></div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" onclick="closeInternModal()">Cancel</button>
        <button class="btn btn-solid btn-sm" onclick="saveInternFromModal(${editing?`'${id}'`:'null'})">${ic('plus')} ${editing?'Save Changes':'Add Record'}</button>
      </div>
    </div>
  </div>`;
}
function closeInternModal(){ const r=document.getElementById('internModalRoot'); if(r) r.innerHTML=''; }
function saveInternFromModal(id){
  const name = document.getElementById('ifName').value.trim();
  if(!name){ toast('Name is required.', 'error'); return; }
  const department = document.getElementById('ifDepartment').value.trim();
  if(!department){ toast('Department is required.', 'error'); return; }
  const rec = {
    name,
    fatherName: document.getElementById('ifFatherName').value.trim(),
    regNo: document.getElementById('ifRegNo').value.trim(),
    department,
    discipline: document.getElementById('ifDiscipline').value.trim(),
    instituteName: document.getElementById('ifInstituteName').value.trim(),
    contactNo: document.getElementById('ifContactNo').value.trim(),
    month: document.getElementById('ifMonth').value.trim(),
    engDipp: document.getElementById('ifEngDipp').value.trim(),
    status: document.getElementById('ifStatus').value,
    remarks: document.getElementById('ifRemarks').value.trim(),
    instructorNameEmail: document.getElementById('ifInstructorNameEmail').value.trim(),
    doj: document.getElementById('ifDoj').value,
    durationMonths: document.getElementById('ifDurationMonths').value.trim(),
    cnic: document.getElementById('ifCnic').value.trim(),
  };
  const list = loadInternship();
  if(id){
    const r = list.find(x=>x.id===id);
    if(r) Object.assign(r, rec);
    toast('Intern record updated.');
  } else {
    list.push({ id: uid('INT'), ...rec });
    toast('Intern record added.');
  }
  saveInternship(list);
  closeInternModal();
  renderRoute();
}
function confirmDeleteIntern(id){
  if(!confirm('Delete this intern record permanently? This cannot be undone.')) return;
  saveInternship(loadInternship().filter(x=>x.id!==id));
  toast('Intern record deleted.');
  renderRoute();
}

/* ============================================================
   OFFBOARDING — full CRUD module
   ============================================================ */
const LS_OFFB = 'hmc_offboarding_v1';
function loadOffboarding(){ try{ const raw=localStorage.getItem(LS_OFFB); if(raw) return JSON.parse(raw); }catch(e){} return []; }
function saveOffboarding(list){ localStorage.setItem(LS_OFFB, JSON.stringify(list)); }

const OFFB_CATEGORY_LEAVING = ['Resignation','Retirement','Termination','Contract End','Death','Other'];
const OFFB_HEADERS = [
  {key:'sr', label:'SR.'}, {key:'entity', label:'Entity'}, {key:'cadre', label:'Cadre'},
  {key:'pin', label:'PIN'}, {key:'name', label:'Name'}, {key:'appointment', label:'Appointment'},
  {key:'department', label:'Department'}, {key:'category', label:'Category'},
  {key:'resignedDate', label:'Resigned Date'}, {key:'categoryOfLeaving', label:'Category of Leaving Organization'},
  {key:'primaryReason', label:'Primary Reason'}, {key:'lastWorkingDay', label:'Last Working Day'},
  {key:'remarks', label:'Remarks'},
];
const OFFB_STATE = { page:1, pageSize:8, sortKey:'name', sortDir:'asc', search:'', fEntity:'', fCategoryLeaving:'' };

function offbFilteredSorted(){
  let rows = loadOffboarding();
  rows = searchRows(rows, OFFB_STATE.search, ['pin','name','department','appointment','cadre']);
  if(OFFB_STATE.fEntity) rows = rows.filter(r=>r.entity===OFFB_STATE.fEntity);
  if(OFFB_STATE.fCategoryLeaving) rows = rows.filter(r=>r.categoryOfLeaving===OFFB_STATE.fCategoryLeaving);
  rows = sortRows(rows, OFFB_STATE.sortKey, OFFB_STATE.sortDir);
  return rows;
}
function offbCellHTML(r, key){
  if(key==='pin') return `<td style="font-family:var(--font-mono);font-size:11.5px;">${escapeHtml(r.pin)}</td>`;
  if(key==='name') return `<td><b>${escapeHtml(r.name)}</b></td>`;
  return `<td style="max-width:200px;white-space:normal;">${escapeHtml(r[key])}</td>`;
}
function renderOffboarding(){
  const all = loadOffboarding();
  const entities = [...new Set(all.map(r=>r.entity).filter(Boolean))].sort();
  const filtered = offbFilteredSorted();
  const { pageRows, page, total } = paginateRows(filtered, OFFB_STATE.page, OFFB_STATE.pageSize);
  const withSr = pageRows.map((r,i)=>({...r, sr:(page-1)*OFFB_STATE.pageSize+i+1}));

  content.innerHTML = `
  <div class="page">
    ${breadcrumbHTML('offboarding')}
    <div class="page-head">
      <div>
        <div class="page-tag">Employee Lifecycle</div>
        <h1>Offboarding</h1>
        <p class="page-desc">Exit clearance, asset return and final settlement workflow.</p>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-outline btn-sm" onclick="printRows('Offboarding', OFFB_HEADERS, offbFilteredSorted())">${ic('reports')} Print</button>
        ${downloadMenuHTML('offboarding', "exportRowsToExcel('offboarding', OFFB_HEADERS, offbFilteredSorted())", "exportRowsToPDF('offboarding','Offboarding', OFFB_HEADERS, offbFilteredSorted())")}
        <button class="btn btn-solid btn-sm" onclick="openOffbModal()">${ic('plus')} Add Record</button>
      </div>
    </div>

    <div class="crud-toolbar">
      <div class="ctb-left">
        <div class="search-field" style="max-width:300px;">
          ${ic('directory')}
          <input type="text" id="offbSearchInput" placeholder="Search PIN, name, department…" value="${escapeHtml(OFFB_STATE.search)}" oninput="offbSetSearch(this.value, this)" />
        </div>
        <label class="filter-select"><select onchange="offbSetFilter('fEntity', this.value)">
          <option value="">All Entities</option>
          ${entities.map(e=>`<option value="${escapeHtml(e)}" ${OFFB_STATE.fEntity===e?'selected':''}>${escapeHtml(e)}</option>`).join('')}
        </select></label>
        <label class="filter-select"><select onchange="offbSetFilter('fCategoryLeaving', this.value)">
          <option value="">All Leaving Categories</option>
          ${OFFB_CATEGORY_LEAVING.map(c=>`<option value="${c}" ${OFFB_STATE.fCategoryLeaving===c?'selected':''}>${c}</option>`).join('')}
        </select></label>
      </div>
    </div>

    <div class="table-wrap crud-table-scroll">
      <table>
        <thead><tr>
          ${OFFB_HEADERS.map(h=>sortHeaderHTML(h.label, h.key, OFFB_STATE, 'offbSort')).join('')}
          <th style="text-align:right;">Actions</th>
        </tr></thead>
        <tbody>
          ${withSr.length ? withSr.map(r=>`
            <tr>
              ${OFFB_HEADERS.map(h=>offbCellHTML(r, h.key)).join('')}
              <td><div class="row-actions" style="justify-content:flex-end;">
                <button class="mini-btn" title="Edit" onclick="openOffbModal('${r.id}')">${ic('edit')}</button>
                <button class="mini-btn" title="Delete" onclick="confirmDeleteOffb('${r.id}')">${ic('trash')}</button>
              </div></td>
            </tr>`).join('') : `<tr><td colspan="${OFFB_HEADERS.length+1}"><div class="empty-state"><div class="es-icon">${ic('userminus')}</div><h4>No offboarding records</h4><p>Add a record to get started, or adjust your search/filters.</p></div></td></tr>`}
        </tbody>
      </table>
    </div>
    ${paginationBarHTML(OFFB_STATE, total, 'offbSetPage')}
  </div>
  <div id="offbModalRoot"></div>`;
}
function offbSetSearch(v, el){ const pos = el?el.selectionStart:null; OFFB_STATE.search=v; OFFB_STATE.page=1; renderOffboarding(); refocusSearch('offbSearchInput', pos); }
function offbSetFilter(k,v){ OFFB_STATE[k]=v; OFFB_STATE.page=1; renderOffboarding(); }
function offbSetPage(p){ OFFB_STATE.page=p; renderOffboarding(); }
function offbSort(key){
  if(OFFB_STATE.sortKey===key){ OFFB_STATE.sortDir = OFFB_STATE.sortDir==='asc'?'desc':'asc'; }
  else { OFFB_STATE.sortKey=key; OFFB_STATE.sortDir='asc'; }
  renderOffboarding();
}
function offbFillFromPin(){
  const pin = document.getElementById('ofPin').value.trim();
  const emp = employeeByPin(pin);
  document.getElementById('ofName').value = emp ? emp.name : '';
  document.getElementById('ofAppointment').value = emp ? emp.designation : '';
  document.getElementById('ofDepartment').value = emp ? emp.department : '';
}
function openOffbModal(id){
  const editing = !!id;
  const r = editing ? loadOffboarding().find(x=>x.id===id) : null;
  const emps = loadEmployees();
  const root = document.getElementById('offbModalRoot') || (function(){ const d=document.createElement('div'); d.id='offbModalRoot'; document.body.appendChild(d); return d; })();
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closeOffbModal()">
    <div class="modal-box" style="max-width:680px;">
      <div class="modal-head"><h3>${editing?'Edit':'Add'} Offboarding Record</h3><button class="modal-close" onclick="closeOffbModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-grid-2">
          <div class="form-row"><label>Entity</label><input type="text" id="ofEntity" value="${r?escapeHtml(r.entity):''}" /></div>
          <div class="form-row"><label>Cadre</label><input type="text" id="ofCadre" value="${r?escapeHtml(r.cadre):''}" /></div>
        </div>
        <div class="form-grid-3">
          <div class="form-row"><label>PIN *</label><input type="text" id="ofPin" list="offbEmpList" value="${r?escapeHtml(r.pin):''}" oninput="offbFillFromPin()" placeholder="HMC-1001" /></div>
          <div class="form-row"><label>Name</label><input type="text" id="ofName" value="${r?escapeHtml(r.name):''}" disabled style="background:var(--steel-100);" /></div>
          <div class="form-row"><label>Appointment</label><input type="text" id="ofAppointment" value="${r?escapeHtml(r.appointment):''}" disabled style="background:var(--steel-100);" /></div>
        </div>
        <datalist id="offbEmpList">${emps.map(e=>`<option value="${escapeHtml(e.pin)}">${escapeHtml(e.name)} — ${escapeHtml(e.designation)}</option>`).join('')}</datalist>
        <div class="form-grid-2">
          <div class="form-row"><label>Department</label><input type="text" id="ofDepartment" value="${r?escapeHtml(r.department):''}" disabled style="background:var(--steel-100);" /></div>
          <div class="form-row"><label>Category</label><input type="text" id="ofCategory" value="${r?escapeHtml(r.category):''}" /></div>
        </div>
        <div class="form-grid-2">
          <div class="form-row"><label>Resigned Date</label><input type="date" id="ofResignedDate" value="${r?r.resignedDate||'':''}" /></div>
          <div class="form-row"><label>Last Working Day</label><input type="date" id="ofLastWorkingDay" value="${r?r.lastWorkingDay||'':''}" /></div>
        </div>
        <div class="form-row"><label>Category of Leaving Organization</label><select id="ofCategoryOfLeaving">${OFFB_CATEGORY_LEAVING.map(c=>`<option ${r&&r.categoryOfLeaving===c?'selected':''}>${c}</option>`).join('')}</select></div>
        <div class="form-row"><label>Primary Reason</label><textarea id="ofPrimaryReason">${r?escapeHtml(r.primaryReason):''}</textarea></div>
        <div class="form-row"><label>Remarks</label><textarea id="ofRemarks">${r?escapeHtml(r.remarks):''}</textarea></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" onclick="closeOffbModal()">Cancel</button>
        <button class="btn btn-solid btn-sm" onclick="saveOffbFromModal(${editing?`'${id}'`:'null'})">${ic('plus')} ${editing?'Save Changes':'Add Record'}</button>
      </div>
    </div>
  </div>`;
}
function closeOffbModal(){ const r=document.getElementById('offbModalRoot'); if(r) r.innerHTML=''; }
function saveOffbFromModal(id){
  const pinInput = document.getElementById('ofPin').value.trim();
  const emp = requireRegisteredEmployee(pinInput);
  if(!emp) return;
  const rec = {
    entity: document.getElementById('ofEntity').value.trim(),
    cadre: document.getElementById('ofCadre').value.trim(),
    pin: emp.pin, name: emp.name,
    appointment: emp.designation,
    department: emp.department,
    category: document.getElementById('ofCategory').value.trim(),
    resignedDate: document.getElementById('ofResignedDate').value,
    categoryOfLeaving: document.getElementById('ofCategoryOfLeaving').value,
    primaryReason: document.getElementById('ofPrimaryReason').value.trim(),
    lastWorkingDay: document.getElementById('ofLastWorkingDay').value,
    remarks: document.getElementById('ofRemarks').value.trim(),
  };
  const list = loadOffboarding();
  if(id){
    const r = list.find(x=>x.id===id);
    if(r) Object.assign(r, rec);
    toast('Offboarding record updated.');
  } else {
    list.push({ id: uid('OFB'), ...rec });
    toast('Offboarding record added.');
  }
  saveOffboarding(list);
  closeOffbModal();
  renderRoute();
}
function confirmDeleteOffb(id){
  if(!confirm('Delete this offboarding record permanently? This cannot be undone.')) return;
  saveOffboarding(loadOffboarding().filter(x=>x.id!==id));
  toast('Offboarding record deleted.');
  renderRoute();
}

/* ============================================================
   DISCIPLINE MANAGEMENT — full CRUD module
   ============================================================ */
const LS_DISC = 'hmc_discipline_v1';
function loadDiscipline(){ try{ const raw=localStorage.getItem(LS_DISC); if(raw) return JSON.parse(raw); }catch(e){} return []; }
function saveDiscipline(list){ localStorage.setItem(LS_DISC, JSON.stringify(list)); }

const DISC_NATURE = ['Minor','Major'];
const DISC_STATUS = ['Under Process','Finalized'];
const DISC_HEADERS = [
  {key:'sr', label:'SR.'}, {key:'entity', label:'Entity'}, {key:'employeeId', label:'Employee ID'},
  {key:'employeeName', label:'Employee Name'}, {key:'designation', label:'Designation'},
  {key:'department', label:'Department'}, {key:'tier', label:'Tier'},
  {key:'natureOfMisconduct', label:'Nature of Misconduct'}, {key:'status', label:'Status'},
  {key:'actionTaken', label:'Action Taken'}, {key:'remarks', label:'Remarks'},
];
const DISC_STATE = { page:1, pageSize:8, sortKey:'employeeName', sortDir:'asc', search:'', fStatus:'', fNature:'' };

function discFilteredSorted(){
  let rows = loadDiscipline();
  rows = searchRows(rows, DISC_STATE.search, ['employeeId','employeeName','department','designation','entity']);
  if(DISC_STATE.fStatus) rows = rows.filter(r=>r.status===DISC_STATE.fStatus);
  if(DISC_STATE.fNature) rows = rows.filter(r=>r.natureOfMisconduct===DISC_STATE.fNature);
  rows = sortRows(rows, DISC_STATE.sortKey, DISC_STATE.sortDir);
  return rows;
}
function discStatusPill(s){
  const cls = s==='Finalized' ? 'pill-approved' : 'pill-pending';
  return `<span class="status-pill ${cls}">${escapeHtml(s||'—')}</span>`;
}
function discNaturePill(n){
  const cls = n==='Major' ? 'pill-rejected' : 'pill-pending';
  return `<span class="status-pill ${cls}">${escapeHtml(n||'—')}</span>`;
}
function discCellHTML(r, key){
  if(key==='employeeId') return `<td style="font-family:var(--font-mono);font-size:11.5px;">${escapeHtml(r.employeeId)}</td>`;
  if(key==='employeeName') return `<td><b>${escapeHtml(r.employeeName)}</b></td>`;
  if(key==='status') return `<td>${discStatusPill(r.status)}</td>`;
  if(key==='natureOfMisconduct') return `<td>${discNaturePill(r.natureOfMisconduct)}</td>`;
  return `<td style="max-width:200px;white-space:normal;">${escapeHtml(r[key])}</td>`;
}
function renderDiscipline(){
  const filtered = discFilteredSorted();
  const { pageRows, page, total } = paginateRows(filtered, DISC_STATE.page, DISC_STATE.pageSize);
  const withSr = pageRows.map((r,i)=>({...r, sr:(page-1)*DISC_STATE.pageSize+i+1}));

  content.innerHTML = `
  <div class="page">
    ${breadcrumbHTML('discipline')}
    <div class="page-head">
      <div>
        <div class="page-tag">Employee Relations</div>
        <h1>Discipline Management</h1>
        <p class="page-desc">Disciplinary cases, inquiries and corrective actions.</p>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-outline btn-sm" onclick="printRows('Discipline Management', DISC_HEADERS, discFilteredSorted())">${ic('reports')} Print</button>
        ${downloadMenuHTML('discipline', "exportRowsToExcel('discipline', DISC_HEADERS, discFilteredSorted())", "exportRowsToPDF('discipline','Discipline Management', DISC_HEADERS, discFilteredSorted())")}
        <button class="btn btn-solid btn-sm" onclick="openDiscModal()">${ic('plus')} Add Record</button>
      </div>
    </div>

    <div class="crud-toolbar">
      <div class="ctb-left">
        <div class="search-field" style="max-width:300px;">
          ${ic('directory')}
          <input type="text" id="discSearchInput" placeholder="Search employee ID, name, department…" value="${escapeHtml(DISC_STATE.search)}" oninput="discSetSearch(this.value, this)" />
        </div>
        <label class="filter-select"><select onchange="discSetFilter('fNature', this.value)">
          <option value="">All Nature</option>
          ${DISC_NATURE.map(n=>`<option value="${n}" ${DISC_STATE.fNature===n?'selected':''}>${n}</option>`).join('')}
        </select></label>
        <label class="filter-select"><select onchange="discSetFilter('fStatus', this.value)">
          <option value="">All Statuses</option>
          ${DISC_STATUS.map(s=>`<option value="${s}" ${DISC_STATE.fStatus===s?'selected':''}>${s}</option>`).join('')}
        </select></label>
      </div>
    </div>

    <div class="table-wrap crud-table-scroll">
      <table>
        <thead><tr>
          ${DISC_HEADERS.map(h=>sortHeaderHTML(h.label, h.key, DISC_STATE, 'discSort')).join('')}
          <th style="text-align:right;">Actions</th>
        </tr></thead>
        <tbody>
          ${withSr.length ? withSr.map(r=>`
            <tr>
              ${DISC_HEADERS.map(h=>discCellHTML(r, h.key)).join('')}
              <td><div class="row-actions" style="justify-content:flex-end;">
                <button class="mini-btn" title="Edit" onclick="openDiscModal('${r.id}')">${ic('edit')}</button>
                <button class="mini-btn" title="Delete" onclick="confirmDeleteDisc('${r.id}')">${ic('trash')}</button>
              </div></td>
            </tr>`).join('') : `<tr><td colspan="${DISC_HEADERS.length+1}"><div class="empty-state"><div class="es-icon">${ic('discipline')}</div><h4>No discipline cases</h4><p>Add a case to get started, or adjust your search/filters.</p></div></td></tr>`}
        </tbody>
      </table>
    </div>
    ${paginationBarHTML(DISC_STATE, total, 'discSetPage')}
  </div>
  <div id="discModalRoot"></div>`;
}
function discSetSearch(v, el){ const pos = el?el.selectionStart:null; DISC_STATE.search=v; DISC_STATE.page=1; renderDiscipline(); refocusSearch('discSearchInput', pos); }
function discSetFilter(k,v){ DISC_STATE[k]=v; DISC_STATE.page=1; renderDiscipline(); }
function discSetPage(p){ DISC_STATE.page=p; renderDiscipline(); }
function discSort(key){
  if(DISC_STATE.sortKey===key){ DISC_STATE.sortDir = DISC_STATE.sortDir==='asc'?'desc':'asc'; }
  else { DISC_STATE.sortKey=key; DISC_STATE.sortDir='asc'; }
  renderDiscipline();
}
function discFillFromId(){
  const pin = document.getElementById('dfEmployeeId').value.trim();
  const emp = employeeByPin(pin);
  document.getElementById('dfEmployeeName').value = emp ? emp.name : '';
  document.getElementById('dfDesignation').value = emp ? emp.designation : '';
  document.getElementById('dfDepartment').value = emp ? emp.department : '';
}
function openDiscModal(id){
  const editing = !!id;
  const r = editing ? loadDiscipline().find(x=>x.id===id) : null;
  const emps = loadEmployees();
  const root = document.getElementById('discModalRoot') || (function(){ const d=document.createElement('div'); d.id='discModalRoot'; document.body.appendChild(d); return d; })();
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closeDiscModal()">
    <div class="modal-box" style="max-width:680px;">
      <div class="modal-head"><h3>${editing?'Edit':'Add'} Discipline Case</h3><button class="modal-close" onclick="closeDiscModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-row"><label>Entity</label><input type="text" id="dfEntity" value="${r?escapeHtml(r.entity):''}" /></div>
        <div class="form-grid-3">
          <div class="form-row"><label>Employee ID (PIN) *</label><input type="text" id="dfEmployeeId" list="discEmpList" value="${r?escapeHtml(r.employeeId):''}" oninput="discFillFromId()" placeholder="HMC-1001" /></div>
          <div class="form-row"><label>Employee Name</label><input type="text" id="dfEmployeeName" value="${r?escapeHtml(r.employeeName):''}" disabled style="background:var(--steel-100);" /></div>
          <div class="form-row"><label>Designation</label><input type="text" id="dfDesignation" value="${r?escapeHtml(r.designation):''}" disabled style="background:var(--steel-100);" /></div>
        </div>
        <datalist id="discEmpList">${emps.map(e=>`<option value="${escapeHtml(e.pin)}">${escapeHtml(e.name)} — ${escapeHtml(e.designation)}</option>`).join('')}</datalist>
        <div class="form-grid-2">
          <div class="form-row"><label>Department</label><input type="text" id="dfDepartment" value="${r?escapeHtml(r.department):''}" disabled style="background:var(--steel-100);" /></div>
          <div class="form-row"><label>Tier</label><input type="text" id="dfTier" value="${r?escapeHtml(r.tier):''}" /></div>
        </div>
        <div class="form-grid-2">
          <div class="form-row"><label>Nature of Misconduct</label><select id="dfNature">${DISC_NATURE.map(n=>`<option ${r&&r.natureOfMisconduct===n?'selected':''}>${n}</option>`).join('')}</select></div>
          <div class="form-row"><label>Status</label><select id="dfStatus">${DISC_STATUS.map(s=>`<option ${r&&r.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
        </div>
        <div class="form-row"><label>Action Taken</label><textarea id="dfActionTaken">${r?escapeHtml(r.actionTaken):''}</textarea></div>
        <div class="form-row"><label>Remarks</label><textarea id="dfRemarks">${r?escapeHtml(r.remarks):''}</textarea></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" onclick="closeDiscModal()">Cancel</button>
        <button class="btn btn-solid btn-sm" onclick="saveDiscFromModal(${editing?`'${id}'`:'null'})">${ic('plus')} ${editing?'Save Changes':'Add Record'}</button>
      </div>
    </div>
  </div>`;
}
function closeDiscModal(){ const r=document.getElementById('discModalRoot'); if(r) r.innerHTML=''; }
function saveDiscFromModal(id){
  const pinInput = document.getElementById('dfEmployeeId').value.trim();
  const emp = requireRegisteredEmployee(pinInput);
  if(!emp) return;
  const rec = {
    entity: document.getElementById('dfEntity').value.trim(),
    employeeId: emp.pin, employeeName: emp.name,
    designation: emp.designation,
    department: emp.department,
    tier: document.getElementById('dfTier').value.trim(),
    natureOfMisconduct: document.getElementById('dfNature').value,
    status: document.getElementById('dfStatus').value,
    actionTaken: document.getElementById('dfActionTaken').value.trim(),
    remarks: document.getElementById('dfRemarks').value.trim(),
  };
  const list = loadDiscipline();
  if(id){
    const r = list.find(x=>x.id===id);
    if(r) Object.assign(r, rec);
    toast('Discipline record updated.');
  } else {
    list.push({ id: uid('DISC'), ...rec });
    toast('Discipline record added.');
  }
  saveDiscipline(list);
  closeDiscModal();
  renderRoute();
}
function confirmDeleteDisc(id){
  if(!confirm('Delete this discipline record permanently? This cannot be undone.')) return;
  saveDiscipline(loadDiscipline().filter(x=>x.id!==id));
  toast('Discipline record deleted.');
  renderRoute();
}


/* ============================================================
   PERFORMANCE MANAGEMENT MODULE — Operations → Performance
   Excel-style, fully editable HR performance appraisal system.

   - Core columns (PIN, Name, Designation, Department, Status,
     Area of Development, Strengths, Performance Recommendation,
     Increment, Retention) plus an editable overall Percentage.
   - Five yearly columns (2024–2020), each grouped into 4
     mini sub-columns: S | LM | S | LM (two self / line-manager
     rating cycles per year).
   - The Percentage → Performance Remark mapping is NOT hard-coded:
     it is a user-editable rule table (Performance Settings) with
     add/delete/rename/reorder of ranges and remarks.
   - Custom free-text columns can be added/removed the same way
     as the Manpower Statement module.
   - Summary dashboard cards are clickable and filter the table.
   - Import/export Excel & PDF, search, multi-filter, sort,
     add/delete rows/columns, and simple analytics.
   ============================================================ */
const LS_PERF = 'hmc_performance_v1';
const LS_PERF_CUSTOM_COLS = 'hmc_performance_customcols_v1';
const LS_PERF_RULES = 'hmc_performance_rules_v1';

const LS_PERF_YEARS = 'hmc_performance_years_v1';
function loadPerfYears(){
  try{
    const raw = localStorage.getItem(LS_PERF_YEARS);
    if(raw){ const p = JSON.parse(raw); if(Array.isArray(p) && p.length) return p; }
  }catch(e){}
  const seed = [2024,2023,2022,2021,2020];
  localStorage.setItem(LS_PERF_YEARS, JSON.stringify(seed));
  return seed;
}
function savePerfYears(list){ localStorage.setItem(LS_PERF_YEARS, JSON.stringify(list)); }
/* Full year blocks (S/LM x2, dark header, ★ highlight) are dynamic now —
   adding a year via "Add Year" gives it the exact same structure/styling
   as every existing year, instead of a plain one-off column. */
let PERF_YEARS = loadPerfYears();
const PERF_SUBCOLS = [
  {key:'s1', label:'S'}, {key:'lm1', label:'LM'},
  {key:'s2', label:'S'}, {key:'lm2', label:'LM'},
];
function perfYearKey(year, sub){ return 'y'+year+'_'+sub; }

const PERF_CORE_HEADERS = [
  {key:'pin', label:'PIN', core:true, alwaysOn:true},
  {key:'name', label:'Name', core:true, alwaysOn:true},
  {key:'designation', label:'Designation', core:true},
  {key:'department', label:'Department', core:true},
  {key:'status', label:'Status', core:true},
  {key:'areaOfDevelopment', label:'Area of Development', core:true},
  {key:'strengths', label:'Strengths', core:true},
  {key:'percentage', label:'Percentage', core:true, type:'number'},
  {key:'remark', label:'Performance Remark', core:true, computed:true, alwaysOn:true},
  {key:'perfRecommendation', label:'Performance Recommendation', core:true, type:'yesno'},
  {key:'increment', label:'Increment', core:true, type:'yesno'},
  {key:'retention', label:'Retention', core:true, type:'yesno'},
];
const PERF_STATUS_OPTIONS = ['Active','Probation','On Leave','Suspended','Separated'];

/* ---------- Rating rules (fully editable, not hard-coded) ---------- */
function perfDefaultRules(){
  return [
    { id: uid('RULE'), min:91, max:100, label:'Outstanding', color:'#1f6e4c' },
    { id: uid('RULE'), min:81, max:90,  label:'Exceed Expectations', color:'#2b5588' },
    { id: uid('RULE'), min:66, max:80,  label:'Meet Expectations', color:'#1f6e63' },
    { id: uid('RULE'), min:51, max:65,  label:'Below Expectations', color:'#9c6f1f' },
    { id: uid('RULE'), min:0,  max:50,  label:'Serious Concern', color:'#a13a2e' },
  ];
}
function loadPerfRules(){
  try{
    const raw = localStorage.getItem(LS_PERF_RULES);
    if(raw){ const p = JSON.parse(raw); if(Array.isArray(p) && p.length) return p; }
  }catch(e){}
  const seeded = perfDefaultRules();
  localStorage.setItem(LS_PERF_RULES, JSON.stringify(seeded));
  return seeded;
}
function savePerfRules(list){ localStorage.setItem(LS_PERF_RULES, JSON.stringify(list)); }
const PERF_RULE_COLORS = {
  green:{bg:'var(--green-bg)', fg:'var(--green)'},
  blue:{bg:'var(--blue-100)', fg:'var(--blue-600)'},
  teal:{bg:'#e2f0ee', fg:'#1f6e63'},
  amber:{bg:'var(--amber-bg)', fg:'var(--amber)'},
  red:{bg:'var(--red-bg)', fg:'var(--red)'},
  steel:{bg:'var(--steel-100)', fg:'var(--steel-500)'},
};
function perfRuleColorStyle(color){
  if(color && color.startsWith('#')){
    return `background:color-mix(in srgb, ${color} 16%, white);color:${color};border:1px solid color-mix(in srgb, ${color} 40%, white);`;
  }
  const c = PERF_RULE_COLORS[color] || PERF_RULE_COLORS.steel;
  return `background:${c.bg};color:${c.fg};`;
}
function perfRemarkForPct(pct){
  const rules = loadPerfRules();
  const p = parseFloat(pct);
  if(isNaN(p)) return null;
  for(const r of rules){
    const min = parseFloat(r.min), max = parseFloat(r.max);
    if(!isNaN(min) && !isNaN(max) && p>=min && p<=max) return r;
  }
  return null;
}
function perfRemarkPillHTML(pct){
  const rule = perfRemarkForPct(pct);
  if(!rule) return `<span class="perf-rating-pill" style="${perfRuleColorStyle('steel')}">Unrated</span>`;
  return `<span class="perf-rating-pill" style="${perfRuleColorStyle(rule.color)}">${escapeHtml(rule.label)}</span>`;
}

/* ---------- Custom columns (same pattern as Manpower Statement) ---------- */
function loadPerfCustomCols(){
  try{ const raw = localStorage.getItem(LS_PERF_CUSTOM_COLS); if(raw){ const p=JSON.parse(raw); return Array.isArray(p)?p.filter(c=>c&&c.key):[]; } }catch(e){}
  return [];
}
function savePerfCustomCols(list){ localStorage.setItem(LS_PERF_CUSTOM_COLS, JSON.stringify(list)); }
/* One-time cleanup: before the dynamic "Add Year" feature existed, a plain
   year like "2020" could only be added as a single flat custom column (no
   S/LM sub-columns, no ★ highlight). That leftover column now duplicates a
   real year block, so remove it from custom columns — the real year (with
   full S/LM structure) already covers it via PERF_YEARS. */
function perfMigrateLegacyYearColumns(){
  const cols = loadPerfCustomCols();
  const stray = cols.filter(c=> /^\d{4}$/.test(String(c.label).trim()));
  if(!stray.length) return;
  const strayKeys = stray.map(c=>c.key);
  savePerfCustomCols(cols.filter(c=>!strayKeys.includes(c.key)));
  const rows = loadPerformance();
  rows.forEach(r=>{ strayKeys.forEach(k=>{ delete r[k]; }); });
  savePerformance(rows);
  stray.forEach(c=>{
    const y = parseInt(c.label.trim(), 10);
    if(!PERF_YEARS.includes(y)){ PERF_YEARS.push(y); }
  });
  PERF_YEARS.sort((a,b)=>b-a);
  savePerfYears(PERF_YEARS);
}
perfMigrateLegacyYearColumns();
function perfAllHeaders(){ return [...PERF_CORE_HEADERS, ...loadPerfCustomCols().map(c=>({...c, core:false}))]; }
/* Flat header list used for export/print, including grouped year sub-columns */
function perfExportHeaders(){
  const yearHeaders = [];
  PERF_YEARS.forEach(y=>{
    PERF_SUBCOLS.forEach((sc,i)=>{ yearHeaders.push({ key: perfYearKey(y,sc.key), label: y+' '+sc.label+(i>=2?' (2)':'') }); });
  });
  return [...perfAllHeaders(), ...yearHeaders];
}

/* ---------- Employee performance records ---------- */
function seedPerformance(){
  return [
    { id: uid('PF'), pin:'HMC-1001', name:'Ahmed Raza', designation:'Assistant Manager HR', department:'HR Department', status:'Active',
      areaOfDevelopment:'Strategic workforce planning', strengths:'Stakeholder communication, attention to detail',
      percentage:93, perfRecommendation:'Yes', increment:'Yes', retention:'Yes',
      y2024_s1:90, y2024_lm1:92, y2024_s2:'', y2024_lm2:'', y2023_s1:85, y2023_lm1:87 },
    { id: uid('PF'), pin:'HMC-1002', name:'Sara Khan', designation:'Production Engineer', department:'Production', status:'Active',
      areaOfDevelopment:'Root-cause analysis', strengths:'Process discipline, teamwork',
      percentage:78, perfRecommendation:'Yes', increment:'Yes', retention:'Yes',
      y2024_s1:75, y2024_lm1:78, y2023_s1:70, y2023_lm1:72 },
    { id: uid('PF'), pin:'HMC-1003', name:'Bilal Hussain', designation:'Machine Operator', department:'Machine Shop', status:'Active',
      areaOfDevelopment:'Punctuality, SOP compliance', strengths:'Technical skill on CNC',
      percentage:58, perfRecommendation:'No', increment:'No', retention:'Yes',
      y2024_s1:55, y2024_lm1:58 },
    { id: uid('PF'), pin:'HMC-1004', name:'Ayesha Malik', designation:'Quality Inspector', department:'Quality Assurance', status:'Active',
      areaOfDevelopment:'Advanced statistical tools', strengths:'Accuracy, documentation',
      percentage:88, perfRecommendation:'Yes', increment:'Yes', retention:'Yes',
      y2024_s1:85, y2024_lm1:88, y2023_s1:80, y2023_lm1:82 },
    { id: uid('PF'), pin:'HMC-1005', name:'Usman Tariq', designation:'Store Keeper', department:'Foundry', status:'Probation',
      areaOfDevelopment:'Inventory reconciliation accuracy', strengths:'Reliability',
      percentage:42, perfRecommendation:'No', increment:'No', retention:'No',
      y2024_s1:40, y2024_lm1:42 },
  ];
}
function loadPerformance(){
  try{
    const raw = localStorage.getItem(LS_PERF);
    if(raw) return JSON.parse(raw);
    const seeded = seedPerformance();
    localStorage.setItem(LS_PERF, JSON.stringify(seeded));
    return seeded;
  }catch(e){ return seedPerformance(); }
}
function savePerformance(list){ localStorage.setItem(LS_PERF, JSON.stringify(list)); }

const PERF_STATE = { search:'', fDept:'', fDesignation:'', fStatus:'', fRemark:'', fRecommendation:'', fIncrement:'', fRetention:'', fYear:'', sortKey:'', sortDir:'asc' };

function perfFilteredRows(){
  let rows = loadPerformance();
  const customKeys = loadPerfCustomCols().map(c=>c.key);
  rows = searchRows(rows, PERF_STATE.search, ['pin','name','designation','department', ...customKeys]);
  if(PERF_STATE.fDept) rows = rows.filter(r=>r.department===PERF_STATE.fDept);
  if(PERF_STATE.fDesignation) rows = rows.filter(r=>r.designation===PERF_STATE.fDesignation);
  if(PERF_STATE.fStatus) rows = rows.filter(r=>r.status===PERF_STATE.fStatus);
  if(PERF_STATE.fRecommendation) rows = rows.filter(r=>r.perfRecommendation===PERF_STATE.fRecommendation);
  if(PERF_STATE.fIncrement) rows = rows.filter(r=>r.increment===PERF_STATE.fIncrement);
  if(PERF_STATE.fRetention) rows = rows.filter(r=>r.retention===PERF_STATE.fRetention);
  if(PERF_STATE.fRemark){
    rows = rows.filter(r=>{ const rule = perfRemarkForPct(r.percentage); return rule && rule.label===PERF_STATE.fRemark; });
  }
  if(PERF_STATE.fYear){
    rows = rows.filter(r=> PERF_SUBCOLS.some(sc => r[perfYearKey(PERF_STATE.fYear, sc.key)] !== undefined && r[perfYearKey(PERF_STATE.fYear, sc.key)] !== ''));
  }
  if(PERF_STATE.sortKey) rows = sortRows(rows, PERF_STATE.sortKey, PERF_STATE.sortDir);
  return rows;
}
function perfSetSearch(v, el){ const pos = el?el.selectionStart:null; PERF_STATE.search=v; renderPerformance(); refocusSearch('perfSearchInput', pos); }
function perfSetFilter(k,v){ PERF_STATE[k]=v; renderPerformance(); }
function perfClearFilters(){ Object.assign(PERF_STATE, {search:'', fDept:'', fDesignation:'', fStatus:'', fRemark:'', fRecommendation:'', fIncrement:'', fRetention:'', fYear:''}); renderPerformance(); }
function perfSort(key){
  if(PERF_STATE.sortKey===key){ PERF_STATE.sortDir = PERF_STATE.sortDir==='asc'?'desc':'asc'; }
  else { PERF_STATE.sortKey=key; PERF_STATE.sortDir='asc'; }
  renderPerformance();
}
/* Dashboard cards filter by remark / recommendation / retention / increment in one click */
function perfCardFilter(type, value){
  perfClearFiltersSilent();
  if(type==='remark') PERF_STATE.fRemark=value;
  else if(type==='recommendation') PERF_STATE.fRecommendation=value;
  else if(type==='retention') PERF_STATE.fRetention=value;
  else if(type==='increment') PERF_STATE.fIncrement=value;
  renderPerformance();
  const tbl = document.querySelector('.perf-table-wrap');
  if(tbl) tbl.scrollIntoView({behavior:'smooth', block:'start'});
}
function perfClearFiltersSilent(){ Object.assign(PERF_STATE, {fDept:'', fDesignation:'', fStatus:'', fRemark:'', fRecommendation:'', fIncrement:'', fRetention:'', fYear:''}); }

/* ---------- Cell rendering (inline editable, Excel-style) ---------- */
function perfCellHTML(r, h){
  if(h.key==='remark') return `<td>${perfRemarkPillHTML(r.percentage)}</td>`;
  if(h.key==='percentage') return `<td><input type="number" min="0" max="100" value="${r.percentage!=null?r.percentage:''}" onblur="perfUpdateCell('${r.id}','percentage', this.value)" style="border:none;background:transparent;width:60px;font:inherit;color:inherit;font-weight:700;" />%</td>`;
  if(h.type==='yesno'){
    return `<td><select onchange="perfUpdateCell('${r.id}','${h.key}', this.value)" style="border:none;background:transparent;font:inherit;color:inherit;font-weight:600;">
      <option value="Yes" ${r[h.key]==='Yes'?'selected':''}>Yes</option>
      <option value="No" ${r[h.key]!=='Yes'?'selected':''}>No</option>
    </select></td>`;
  }
  if(h.key==='status'){
    return `<td><select onchange="perfUpdateCell('${r.id}','status', this.value)" style="border:none;background:transparent;font:inherit;color:inherit;">
      ${PERF_STATUS_OPTIONS.map(s=>`<option ${r.status===s?'selected':''}>${s}</option>`).join('')}
    </select></td>`;
  }
  if(h.key==='pin') return `<td class="perf-freeze-1"><input type="text" value="${escapeHtml(r.pin||'')}" onblur="perfUpdateCell('${r.id}','pin', this.value)" style="border:none;background:transparent;width:80px;font:inherit;color:inherit;font-family:var(--font-mono);" /></td>`;
  if(h.key==='name') return `<td class="perf-freeze-2"><input type="text" value="${escapeHtml(r.name||'')}" onblur="perfUpdateCell('${r.id}','name', this.value)" style="border:none;background:transparent;width:130px;font:inherit;color:inherit;font-weight:700;" /></td>`;
  return `<td><input type="text" value="${escapeHtml(r[h.key]||'')}" onblur="perfUpdateCell('${r.id}','${h.key}', this.value)" placeholder="—" style="border:none;background:transparent;width:100%;min-width:110px;font:inherit;color:inherit;" /></td>`;
}
function perfUpdateCell(id, key, value){
  const list = loadPerformance();
  const r = list.find(x=>x.id===id);
  if(!r) return;
  if(key==='percentage'){
    let v = parseFloat(value);
    if(isNaN(v)) v = '';
    else v = Math.max(0, Math.min(100, v));
    r[key] = v;
  } else {
    r[key] = value;
  }
  savePerformance(list);
  renderPerformance();
}
const PERF_HL_COLORS = ['#fff3b0','#ffd6d6','#d6f5d6','#d6e4ff','#f0d6ff','#ffe0b3','#c8f7dc','#ffcccc'];
function perfYearHlStyle(color){ return color ? `background:${color};` : ''; }
function perfSetHighlight(id, key, color){
  const list = loadPerformance();
  const r = list.find(x=>x.id===id);
  if(!r) return;
  r[key+'_hl'] = color;
  savePerformance(list);
  preserveScroll(renderPerformance);
}
/* Multi-select: lets the user tick 2, 3, 4+ cells (across rows/years) and
   apply — or remove — one highlight colour to all of them in one go. */
let PERF_MULTI_SELECT = new Set();
let PERF_SELECT_MODE = false;
function perfToggleSelectMode(){
  PERF_SELECT_MODE = !PERF_SELECT_MODE;
  if(!PERF_SELECT_MODE) PERF_MULTI_SELECT.clear();
  preserveScroll(renderPerformance);
}
function perfToggleCellSelect(id, key, ev){
  if(ev){ ev.preventDefault(); ev.stopPropagation(); }
  const k = id+'|'+key;
  if(PERF_MULTI_SELECT.has(k)) PERF_MULTI_SELECT.delete(k); else PERF_MULTI_SELECT.add(k);
  preserveScroll(renderPerformance);
}
function perfApplyMultiHighlight(color){
  const list = loadPerformance();
  PERF_MULTI_SELECT.forEach(k=>{
    const [id, key] = k.split('|');
    const r = list.find(x=>x.id===id);
    if(r) r[key+'_hl'] = color;
  });
  savePerformance(list);
  PERF_MULTI_SELECT.clear();
  PERF_SELECT_MODE = false;
  closePerfHlPopup();
  preserveScroll(renderPerformance);
}
/* Small floating swatch popup used for both single-cell and multi-select
   highlighting — includes a "None" swatch so a highlight can be removed
   the same way it was added (not just via right-click). */
function closePerfHlPopup(){
  const el = document.getElementById('perfHlPopup');
  if(el) el.remove();
  document.removeEventListener('mousedown', perfHlPopupOutsideClick, true);
}
function perfHlPopupOutsideClick(e){
  const el = document.getElementById('perfHlPopup');
  if(el && !el.contains(e.target)) closePerfHlPopup();
}
function perfOpenHlPopup(ev, onPick){
  if(ev) ev.stopPropagation();
  closePerfHlPopup();
  const pop = document.createElement('div');
  pop.id = 'perfHlPopup';
  pop.className = 'perf-hl-popup';
  const rect = ev.target.getBoundingClientRect();
  pop.style.cssText = `position:fixed; top:${rect.bottom+6}px; left:${Math.max(8, rect.left-70)}px; z-index:400;`;
  pop.innerHTML = `
    <div class="perf-hl-swatches">
      ${PERF_HL_COLORS.map(c=>`<span class="perf-hl-swatch" style="background:${c};" data-color="${c}" title="Highlight"></span>`).join('')}
      <span class="perf-hl-swatch perf-hl-custom" title="Custom colour">${ic('plus')}</span>
      <span class="perf-hl-swatch perf-hl-none" title="Remove highlight (None)">✕</span>
    </div>`;
  document.body.appendChild(pop);
  pop.querySelectorAll('.perf-hl-swatch[data-color]').forEach(sw=>{
    sw.addEventListener('click', ()=>{ onPick(sw.dataset.color); closePerfHlPopup(); });
  });
  pop.querySelector('.perf-hl-none').addEventListener('click', ()=>{ onPick(''); closePerfHlPopup(); });
  pop.querySelector('.perf-hl-custom').addEventListener('click', ()=>{
    const inp = document.createElement('input');
    inp.type = 'color';
    inp.value = '#fff3b0';
    inp.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
    document.body.appendChild(inp);
    inp.addEventListener('input', ()=> onPick(inp.value));
    inp.addEventListener('change', ()=>{ if(document.body.contains(inp)) document.body.removeChild(inp); closePerfHlPopup(); });
    inp.click();
  });
  setTimeout(()=> document.addEventListener('mousedown', perfHlPopupOutsideClick, true), 0);
}
function perfPickHighlight(id, key, currentColor, ev){
  if(ev) ev.stopPropagation();
  if(PERF_SELECT_MODE){ perfToggleCellSelect(id, key, ev); return; }
  perfOpenHlPopup(ev, (color)=> perfSetHighlight(id, key, color));
}
function perfClearHighlight(id, key, ev){ if(ev){ ev.preventDefault(); ev.stopPropagation(); } perfSetHighlight(id, key, ''); }
/* Whole-year (column) highlight — applies one colour to every row's cells for that year. */
function perfSetYearHighlightAll(year, color){
  const list = loadPerformance();
  list.forEach(r=>{ PERF_SUBCOLS.forEach(sc=>{ r[perfYearKey(year, sc.key)+'_hl'] = color; }); });
  savePerformance(list);
  preserveScroll(renderPerformance);
}
function perfPickYearHighlight(year, ev){
  if(ev) ev.stopPropagation();
  perfOpenHlPopup(ev, (color)=> perfSetYearHighlightAll(year, color));
}
function perfClearYearHighlight(year, ev){ if(ev){ ev.preventDefault(); ev.stopPropagation(); } perfSetYearHighlightAll(year, ''); }
function perfUpdateYearCell(id, key, value){
  const list = loadPerformance();
  const r = list.find(x=>x.id===id);
  if(!r) return;
  const v = value.trim();
  if(v===''){ r[key]=''; }
  else { const n = parseFloat(v); r[key] = isNaN(n) ? v : Math.max(0, Math.min(100, n)); }
  savePerformance(list);
  preserveScroll(renderPerformance);
}

/* ---------- Row add / delete ---------- */
function perfAddRow(){
  const list = loadPerformance();
  const rec = { id: uid('PF'), pin:'', name:'', designation:'', department:'', status:'Active',
    areaOfDevelopment:'', strengths:'', percentage:'', perfRecommendation:'No', increment:'No', retention:'Yes' };
  loadPerfCustomCols().forEach(c=>{ rec[c.key]=''; });
  list.push(rec);
  savePerformance(list);
  toast('New employee row added — fill in the details.');
  renderPerformance();
}
function perfDeleteRow(id){
  if(!confirm('Delete this employee\'s performance record permanently? This cannot be undone.')) return;
  savePerformance(loadPerformance().filter(x=>x.id!==id));
  toast('Performance record deleted.');
  renderPerformance();
}

/* ---------- Custom column management ---------- */
function closePerfColModal(){ const r=document.getElementById('perfColModalRoot'); if(r) r.innerHTML=''; }
/* Add/Delete a whole YEAR block — gives the new year the same S/LM x2
   sub-columns, dark header bar and ★ highlight-whole-column control as
   every existing year (2024, 2023, ...), instead of a plain single column. */
function openAddPerfYearModal(){
  const root = document.getElementById('perfColModalRoot') || (function(){ const d=document.createElement('div'); d.id='perfColModalRoot'; document.body.appendChild(d); return d; })();
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closePerfColModal()">
    <div class="modal-box" style="max-width:420px;">
      <div class="modal-head"><h3>Add Year</h3><button class="modal-close" onclick="closePerfColModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <label>Year *</label>
          <input type="number" id="newPerfYear" placeholder="e.g. 2019" value="${Math.min(...PERF_YEARS)-1}" onkeydown="if(event.key==='Enter'){ event.preventDefault(); confirmAddPerfYear(); }" />
        </div>
        <p style="font-size:12.5px;color:var(--steel-500);margin:0;">Adds a full year column (S / LM ×2) with the same dark header and highlight controls as the existing years — appears on every row immediately.</p>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" onclick="closePerfColModal()">Cancel</button>
        <button class="btn btn-solid btn-sm" onclick="confirmAddPerfYear()">${ic('plus')} Add Year</button>
      </div>
    </div>
  </div>`;
  setTimeout(()=>{ const el=document.getElementById('newPerfYear'); if(el) el.focus(); }, 30);
}
function confirmAddPerfYear(){
  const input = document.getElementById('newPerfYear');
  const y = parseInt((input?input.value:'').trim(), 10);
  if(!y || isNaN(y)){ toast('Enter a valid year.', 'error'); return; }
  if(PERF_YEARS.includes(y)){ toast('That year already exists.', 'error'); return; }
  PERF_YEARS = [...PERF_YEARS, y].sort((a,b)=>b-a);
  savePerfYears(PERF_YEARS);
  toast('Year '+y+' added.');
  closePerfColModal();
  renderPerformance();
}
function openDeletePerfYearModal(){
  if(PERF_YEARS.length<=1){ toast('At least one year must remain.', 'error'); return; }
  const root = document.getElementById('perfColModalRoot') || (function(){ const d=document.createElement('div'); d.id='perfColModalRoot'; document.body.appendChild(d); return d; })();
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closePerfColModal()">
    <div class="modal-box" style="max-width:420px;">
      <div class="modal-head"><h3>Delete Year</h3><button class="modal-close" onclick="closePerfColModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <label>Select Year to Delete</label>
          <select id="delPerfYearSelect">${PERF_YEARS.map(y=>`<option value="${y}">${y}</option>`).join('')}</select>
        </div>
        <p style="font-size:12.5px;color:var(--steel-500);margin:0;">All S/LM data and highlights recorded under this year will be permanently removed.</p>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" onclick="closePerfColModal()">Cancel</button>
        <button class="btn btn-danger-outline btn-sm" onclick="confirmDeletePerfYear()">${ic('trash')} Delete Year</button>
      </div>
    </div>
  </div>`;
}
function confirmDeletePerfYear(){
  const sel = document.getElementById('delPerfYearSelect');
  if(!sel || !sel.value) return;
  const y = parseInt(sel.value, 10);
  if(!confirm(`Delete year ${y}? This cannot be undone.`)) return;
  PERF_YEARS = PERF_YEARS.filter(x=>x!==y);
  savePerfYears(PERF_YEARS);
  const rows = loadPerformance();
  rows.forEach(r=>{ PERF_SUBCOLS.forEach(sc=>{ const k=perfYearKey(y, sc.key); delete r[k]; delete r[k+'_hl']; }); });
  savePerformance(rows);
  toast('Year '+y+' deleted.');
  closePerfColModal();
  renderPerformance();
}
function openAddPerfColumnModal(){
  const root = document.getElementById('perfColModalRoot') || (function(){ const d=document.createElement('div'); d.id='perfColModalRoot'; document.body.appendChild(d); return d; })();
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closePerfColModal()">
    <div class="modal-box" style="max-width:420px;">
      <div class="modal-head"><h3>Add New Column</h3><button class="modal-close" onclick="closePerfColModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <label>Column Name *</label>
          <input type="text" id="newPerfColName" placeholder="e.g. Supervisor, Grade, Location" onkeydown="if(event.key==='Enter'){ event.preventDefault(); confirmAddPerfColumn(); }" />
        </div>
        <p style="font-size:12.5px;color:var(--steel-500);margin:0;">The new column is added to the table immediately and appears on every row, including future ones. Use <b>Performance Settings</b> to manage rating categories and percentage ranges instead.</p>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" onclick="closePerfColModal()">Cancel</button>
        <button class="btn btn-solid btn-sm" onclick="confirmAddPerfColumn()">${ic('plus')} Add Column</button>
      </div>
    </div>
  </div>`;
  setTimeout(()=>{ const el=document.getElementById('newPerfColName'); if(el) el.focus(); }, 30);
}
function confirmAddPerfColumn(){
  const input = document.getElementById('newPerfColName');
  const name = (input?input.value:'').trim();
  if(!name){ toast('Column name cannot be empty.', 'error'); return; }
  const existing = perfAllHeaders().map(h=>String(h.label||'').trim().toLowerCase());
  if(existing.includes(name.toLowerCase())){ toast('A column with that name already exists.', 'error'); return; }
  const key = 'custom_'+Date.now().toString(36)+Math.floor(Math.random()*99999);
  const cols = loadPerfCustomCols();
  cols.push({ key, label:name });
  savePerfCustomCols(cols);
  const rows = loadPerformance();
  rows.forEach(r=>{ if(!(key in r)) r[key]=''; });
  savePerformance(rows);
  toast('Column "'+name+'" added.');
  closePerfColModal();
  renderPerformance();
}
function openDeletePerfColumnModal(){
  const custom = loadPerfCustomCols();
  if(!custom.length){ toast('No custom columns to delete — built-in performance columns are protected since the dashboard and rating logic depend on them.', 'error'); return; }
  const root = document.getElementById('perfColModalRoot') || (function(){ const d=document.createElement('div'); d.id='perfColModalRoot'; document.body.appendChild(d); return d; })();
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closePerfColModal()">
    <div class="modal-box" style="max-width:420px;">
      <div class="modal-head"><h3>Delete Column</h3><button class="modal-close" onclick="closePerfColModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-row">
          <label>Select Column to Delete</label>
          <select id="delPerfColSelect">${custom.map(c=>`<option value="${escapeHtml(c.key)}">${escapeHtml(c.label)}</option>`).join('')}</select>
        </div>
        <p style="font-size:12.5px;color:var(--steel-500);margin:0;">Only custom columns can be deleted. Built-in columns (PIN, Name, yearly S/LM data, etc.) are always kept.</p>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" onclick="closePerfColModal()">Cancel</button>
        <button class="btn btn-danger-outline btn-sm" onclick="confirmDeletePerfColumn()">${ic('trash')} Delete Column</button>
      </div>
    </div>
  </div>`;
}
function confirmDeletePerfColumn(){
  const sel = document.getElementById('delPerfColSelect');
  if(!sel || !sel.value) return;
  const key = sel.value;
  const label = sel.selectedOptions[0].textContent;
  if(!confirm(`Delete column "${label}"? This cannot be undone.`)) return;
  savePerfCustomCols(loadPerfCustomCols().filter(c=>c.key!==key));
  const rows = loadPerformance();
  rows.forEach(r=>{ delete r[key]; });
  savePerformance(rows);
  toast('Column "'+label+'" deleted.');
  closePerfColModal();
  renderPerformance();
}

/* ---------- Performance Settings (editable rating rules) ---------- */
function closePerfSettingsModal(){ const r=document.getElementById('perfSettingsModalRoot'); if(r) r.innerHTML=''; }
function openPerfSettingsModal(){
  const rules = loadPerfRules();
  const root = document.getElementById('perfSettingsModalRoot') || (function(){ const d=document.createElement('div'); d.id='perfSettingsModalRoot'; document.body.appendChild(d); return d; })();
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closePerfSettingsModal()">
    <div class="modal-box" style="max-width:680px;">
      <div class="modal-head"><h3>Performance Settings — Rating Categories</h3><button class="modal-close" onclick="closePerfSettingsModal()">✕</button></div>
      <div class="modal-body">
        <p style="font-size:12.5px;color:var(--steel-500);margin:0 0 12px;">Define the percentage ranges and remarks used across the Performance section. Add, rename, reorder or delete categories — nothing here is hard-coded, and every employee's remark recalculates automatically.</p>
        <div class="perf-rule-row" style="font-size:11px;font-weight:700;color:var(--steel-500);margin-bottom:4px;">
          <span>Min %</span><span>Max %</span><span>Remark Label</span><span>Colour</span><span></span>
        </div>
        <div id="perfRulesList">${perfRulesRowsHTML(rules)}</div>
        <button class="btn btn-outline btn-sm" style="margin-top:8px;" onclick="perfAddRuleRow()">${ic('plus')} Add Category</button>
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" onclick="closePerfSettingsModal()">Cancel</button>
        <button class="btn btn-solid btn-sm" onclick="perfSaveRules()">${ic('edit')} Save Settings</button>
      </div>
    </div>
  </div>`;
}
function perfRulesRowsHTML(rules){
  return rules.map((r,i)=>`
    <div class="perf-rule-row" data-rule-row="${r.id}">
      <input type="number" min="0" max="100" value="${r.min}" data-f="min" />
      <input type="number" min="0" max="100" value="${r.max}" data-f="max" />
      <input type="text" value="${escapeHtml(r.label)}" data-f="label" />
      <input type="color" data-f="color" value="${(r.color&&r.color.startsWith('#'))?r.color:((PERF_RULE_COLORS[r.color]||PERF_RULE_COLORS.steel).fg)}" title="Pick any colour for this remark" style="width:44px;height:30px;padding:2px;border:1px solid var(--steel-300);border-radius:6px;cursor:pointer;" />
      <div class="row-actions">
        <button class="mini-btn" title="Move up" onclick="perfMoveRuleRow('${r.id}',-1)">↑</button>
        <button class="mini-btn" title="Move down" onclick="perfMoveRuleRow('${r.id}',1)">↓</button>
        <button class="mini-btn" title="Delete" onclick="perfDeleteRuleRow('${r.id}')">${ic('trash')}</button>
      </div>
    </div>`).join('');
}
function perfReadRulesFromForm(){
  const rows = document.querySelectorAll('#perfRulesList [data-rule-row]');
  const rules = [];
  rows.forEach(row=>{
    const id = row.getAttribute('data-rule-row');
    const min = row.querySelector('[data-f="min"]').value;
    const max = row.querySelector('[data-f="max"]').value;
    const label = row.querySelector('[data-f="label"]').value.trim();
    const color = row.querySelector('[data-f="color"]').value;
    rules.push({ id, min:parseFloat(min)||0, max:parseFloat(max)||0, label:label||'Untitled', color });
  });
  return rules;
}
function perfAddRuleRow(){
  const rules = perfReadRulesFromForm();
  rules.push({ id: uid('RULE'), min:0, max:0, label:'New Category', color:'#5d6b7e' });
  document.getElementById('perfRulesList').innerHTML = perfRulesRowsHTML(rules);
}
function perfDeleteRuleRow(id){
  const rules = perfReadRulesFromForm().filter(r=>r.id!==id);
  if(!rules.length){ toast('Keep at least one rating category.', 'error'); return; }
  document.getElementById('perfRulesList').innerHTML = perfRulesRowsHTML(rules);
}
function perfMoveRuleRow(id, dir){
  const rules = perfReadRulesFromForm();
  const idx = rules.findIndex(r=>r.id===id);
  const swapWith = idx+dir;
  if(swapWith<0 || swapWith>=rules.length) return;
  [rules[idx], rules[swapWith]] = [rules[swapWith], rules[idx]];
  document.getElementById('perfRulesList').innerHTML = perfRulesRowsHTML(rules);
}
function perfSaveRules(){
  const rules = perfReadRulesFromForm();
  savePerfRules(rules);
  toast('Performance rating settings saved.');
  closePerfSettingsModal();
  renderPerformance();
}

/* ---------- Import / Export ---------- */
function perfExportRows(){
  const rows = perfFilteredRows();
  return rows.map(r=>{
    const out = {...r};
    out.remark = (perfRemarkForPct(r.percentage) || {}).label || 'Unrated';
    return out;
  });
}
/* ---------- Individual Employee Report (print / PDF / Word) ---------- */
const PERF_REPORT_STATE = { empId:'' };
function perfReportProfileFields(r){
  const rule = perfRemarkForPct(r.percentage);
  return [
    ['PIN', r.pin||'—'], ['Name', r.name||'—'], ['Designation', r.designation||'—'], ['Department', r.department||'—'],
    ['Status', r.status||'—'], ['Area of Development', r.areaOfDevelopment||'—'], ['Strengths', r.strengths||'—'],
    ['Overall Percentage', (r.percentage!=null && r.percentage!=='') ? r.percentage+'%' : '—'],
    ['Performance Remark', rule ? rule.label : 'Unrated'],
    ['Performance Recommendation', r.perfRecommendation||'—'],
    ['Increment', r.increment||'—'],
    ['Retention', r.retention||'—'],
    ...loadPerfCustomCols().map(c=>[c.label, r[c.key]!=null && r[c.key]!=='' ? r[c.key] : '—']),
  ];
}
function perfReportYearRows(r){
  return PERF_YEARS.map(y=>{
    const vals = PERF_SUBCOLS.map(sc=>{ const v = r[perfYearKey(y,sc.key)]; return (v!=null && v!=='') ? v : '—'; });
    return { year:y, s1:vals[0], lm1:vals[1], s2:vals[2], lm2:vals[3] };
  });
}
function perfEmployeeReportTitle(r){ return 'Individual Performance Report — '+(r.name||'Employee')+' ('+(r.pin||'—')+')'; }
function perfReportFilename(r){ return 'performance-report-'+String(r.pin||r.name||'employee').replace(/[^a-z0-9]+/ig,'_'); }

function printPerfEmployeeReport(id){
  const r = loadPerformance().find(x=>x.id===id);
  if(!r){ toast('Select an employee first.', 'error'); return; }
  const profile = perfReportProfileFields(r);
  const years = perfReportYearRows(r);
  const win = window.open('', '_blank');
  if(!win){ toast('Please allow pop-ups to print.', 'error'); return; }
  const styles = `body{font-family:Arial,sans-serif;padding:28px;color:#182130;} h1{font-size:19px;margin-bottom:2px;} h2{font-size:14px;margin:22px 0 8px;} p.meta{color:#5d6b7e;font-size:11px;margin-top:0;margin-bottom:20px;} table{width:100%;border-collapse:collapse;margin-bottom:10px;} th,td{border:1px solid #c9cfd9;padding:7px 9px;font-size:12px;text-align:left;} th{background:#eef0f3;} .profile th{width:220px;} .yr th{background:#101f35;color:#fff;}`;
  const profileRowsHtml = profile.map(([label,val])=>`<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(val==null?'—':String(val))}</td></tr>`).join('');
  const yearRowsHtml = years.map(y=>`<tr><td>${escapeHtml(String(y.year))}</td><td>${escapeHtml(String(y.s1))}</td><td>${escapeHtml(String(y.lm1))}</td><td>${escapeHtml(String(y.s2))}</td><td>${escapeHtml(String(y.lm2))}</td></tr>`).join('');
  win.document.write(`<html><head><title>${escapeHtml(perfEmployeeReportTitle(r))}</title><style>${styles}</style></head><body>
    <h1>${escapeHtml(perfEmployeeReportTitle(r))}</h1>
    <p class="meta">HMC HR Department Portal · Generated ${new Date().toLocaleString()}</p>
    <h2>Employee Profile</h2>
    <table class="profile">${profileRowsHtml}</table>
    <h2>Yearly Evaluation History (S = Self, LM = Line Manager)</h2>
    <table><thead><tr class="yr"><th>Year</th><th>S (1st)</th><th>LM (1st)</th><th>S (2nd)</th><th>LM (2nd)</th></tr></thead><tbody>${yearRowsHtml}</tbody></table>
  </body></html>`);
  win.document.close();
  setTimeout(()=>{ win.focus(); win.print(); }, 300);
}
function exportPerfEmployeeReportPDF(id){
  const r = loadPerformance().find(x=>x.id===id);
  if(!r){ toast('Select an employee first.', 'error'); return; }
  try{
    if(typeof window.jspdf === 'undefined'){ toast('PDF export library failed to load. Check your internet connection.', 'error'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(14); doc.text(perfEmployeeReportTitle(r), 14, 16);
    doc.setFontSize(9); doc.text('HMC HR Department Portal · Generated '+new Date().toLocaleString(), 14, 22);
    const profile = perfReportProfileFields(r);
    doc.autoTable({ startY:28, head:[['Field','Value']], body: profile.map(([l,v])=>[l, v==null?'—':String(v)]), styles:{fontSize:9}, headStyles:{fillColor:[16,31,53]} });
    const years = perfReportYearRows(r);
    doc.autoTable({ startY: doc.lastAutoTable.finalY+10, head:[['Year','S (1st)','LM (1st)','S (2nd)','LM (2nd)']], body: years.map(y=>[y.year,y.s1,y.lm1,y.s2,y.lm2]), styles:{fontSize:9}, headStyles:{fillColor:[16,31,53]} });
    doc.save(perfReportFilename(r)+'.pdf');
    toast('PDF report exported.');
  }catch(e){ toast('Export failed: '+e.message, 'error'); }
}
function exportPerfEmployeeReportWord(id){
  const r = loadPerformance().find(x=>x.id===id);
  if(!r){ toast('Select an employee first.', 'error'); return; }
  try{
    const profile = perfReportProfileFields(r);
    const years = perfReportYearRows(r);
    const profileHtml = profile.map(([l,v])=>`<tr><th style="text-align:left;background:#eef0f3;border:1px solid #c9cfd9;padding:6px 8px;width:220px;">${escapeHtml(l)}</th><td style="border:1px solid #c9cfd9;padding:6px 8px;">${escapeHtml(v==null?'—':String(v))}</td></tr>`).join('');
    const yearsHtml = years.map(y=>`<tr><td style="border:1px solid #c9cfd9;padding:6px 8px;">${escapeHtml(String(y.year))}</td><td style="border:1px solid #c9cfd9;padding:6px 8px;">${escapeHtml(String(y.s1))}</td><td style="border:1px solid #c9cfd9;padding:6px 8px;">${escapeHtml(String(y.lm1))}</td><td style="border:1px solid #c9cfd9;padding:6px 8px;">${escapeHtml(String(y.s2))}</td><td style="border:1px solid #c9cfd9;padding:6px 8px;">${escapeHtml(String(y.lm2))}</td></tr>`).join('');
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>${escapeHtml(perfEmployeeReportTitle(r))}</title></head>
      <body style="font-family:Arial,sans-serif;">
        <h2 style="margin-bottom:2px;">${escapeHtml(perfEmployeeReportTitle(r))}</h2>
        <p style="color:#5d6b7e;font-size:11px;margin-top:0;">HMC HR Department Portal · Generated ${new Date().toLocaleString()}</p>
        <h3>Employee Profile</h3>
        <table style="border-collapse:collapse;width:100%;">${profileHtml}</table>
        <h3>Yearly Evaluation History</h3>
        <table style="border-collapse:collapse;width:100%;"><thead><tr>
          <th style="border:1px solid #c9cfd9;padding:6px 8px;background:#eef0f3;">Year</th>
          <th style="border:1px solid #c9cfd9;padding:6px 8px;background:#eef0f3;">S (1st)</th>
          <th style="border:1px solid #c9cfd9;padding:6px 8px;background:#eef0f3;">LM (1st)</th>
          <th style="border:1px solid #c9cfd9;padding:6px 8px;background:#eef0f3;">S (2nd)</th>
          <th style="border:1px solid #c9cfd9;padding:6px 8px;background:#eef0f3;">LM (2nd)</th>
        </tr></thead><tbody>${yearsHtml}</tbody></table>
      </body></html>`;
    const blob = new Blob(['\ufeff', html], { type:'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = perfReportFilename(r)+'.doc';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    toast('Word report exported.');
  }catch(e){ toast('Export failed: '+e.message, 'error'); }
}
function perfReportPickerHTML(selectedId){
  const rows = loadPerformance();
  return `<select id="perfReportEmpSelect" onchange="perfReportSelectEmp(this.value)">
    <option value="">Select employee…</option>
    ${rows.map(r=>`<option value="${r.id}" ${selectedId===r.id?'selected':''}>${escapeHtml(r.name||'—')} — ${escapeHtml(r.pin||'—')}</option>`).join('')}
  </select>`;
}
function perfReportPreviewHTML(r){
  const profile = perfReportProfileFields(r);
  const years = perfReportYearRows(r).filter(y=> y.s1!=='—'||y.lm1!=='—'||y.s2!=='—'||y.lm2!=='—');
  return `
  <div style="border:1px solid var(--steel-200);border-radius:8px;padding:14px;margin-top:12px;max-height:340px;overflow:auto;">
    <table style="width:100%;border-collapse:collapse;">
      ${profile.map(([l,v])=>`<tr><th style="text-align:left;padding:5px 8px;font-size:12px;color:var(--steel-500);width:180px;font-weight:600;">${escapeHtml(l)}</th><td style="padding:5px 8px;font-size:12px;font-weight:600;">${escapeHtml(v==null?'—':String(v))}</td></tr>`).join('')}
    </table>
    ${years.length ? `<h4 style="margin:14px 0 6px;font-size:13px;">Yearly History</h4>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>
        <th style="text-align:left;font-size:11px;padding:5px 8px;background:var(--steel-100);">Year</th>
        <th style="text-align:left;font-size:11px;padding:5px 8px;background:var(--steel-100);">S(1)</th>
        <th style="text-align:left;font-size:11px;padding:5px 8px;background:var(--steel-100);">LM(1)</th>
        <th style="text-align:left;font-size:11px;padding:5px 8px;background:var(--steel-100);">S(2)</th>
        <th style="text-align:left;font-size:11px;padding:5px 8px;background:var(--steel-100);">LM(2)</th>
      </tr></thead>
      <tbody>${years.map(y=>`<tr><td style="padding:5px 8px;font-size:12px;">${escapeHtml(String(y.year))}</td><td style="padding:5px 8px;font-size:12px;">${escapeHtml(String(y.s1))}</td><td style="padding:5px 8px;font-size:12px;">${escapeHtml(String(y.lm1))}</td><td style="padding:5px 8px;font-size:12px;">${escapeHtml(String(y.s2))}</td><td style="padding:5px 8px;font-size:12px;">${escapeHtml(String(y.lm2))}</td></tr>`).join('')}</tbody>
    </table>` : ''}
  </div>`;
}
function openPerfReportModal(id){
  PERF_REPORT_STATE.empId = id || '';
  const root = document.getElementById('perfReportModalRoot') || (function(){ const d=document.createElement('div'); d.id='perfReportModalRoot'; document.body.appendChild(d); return d; })();
  renderPerfReportModal(root);
}
function closePerfReportModal(){ const r=document.getElementById('perfReportModalRoot'); if(r) r.innerHTML=''; }
function perfReportSelectEmp(id){ PERF_REPORT_STATE.empId = id; renderPerfReportModal(document.getElementById('perfReportModalRoot')); }
function renderPerfReportModal(root){
  if(!root) return;
  const id = PERF_REPORT_STATE.empId;
  const r = id ? loadPerformance().find(x=>x.id===id) : null;
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this) closePerfReportModal()">
    <div class="modal-box" style="max-width:640px;">
      <div class="modal-head"><h3>${ic('reports')} Individual Performance Report</h3><button class="modal-close" onclick="closePerfReportModal()">✕</button></div>
      <div class="modal-body">
        <div class="form-row"><label>Employee</label>${perfReportPickerHTML(id)}</div>
        ${r ? perfReportPreviewHTML(r) : `<p style="color:var(--steel-500);font-size:13px;">Select an employee above to preview, print or download their individual performance report.</p>`}
      </div>
      <div class="modal-foot">
        <button class="btn btn-outline btn-sm" ${r?'':'disabled'} onclick="printPerfEmployeeReport('${id}')">${ic('reports')} Print</button>
        <button class="btn btn-outline btn-sm" ${r?'':'disabled'} onclick="exportPerfEmployeeReportPDF('${id}')">${ic('reports')} Download PDF</button>
        <button class="btn btn-outline btn-sm" ${r?'':'disabled'} onclick="exportPerfEmployeeReportWord('${id}')">${ic('reports')} Download Word</button>
        <button class="btn btn-solid btn-sm" onclick="closePerfReportModal()">Close</button>
      </div>
    </div>
  </div>`;
}

function perfImportFile(input){
  const file = input.files && input.files[0];
  if(!file) return;
  if(/\.docx?$/i.test(file.name)){
    importRowsFromWord(file, (tableRows)=>{
      if(!tableRows.length){ toast('No rows found in that Word file.', 'error'); input.value=''; return; }
      const head = tableRows[0];
      const json = tableRows.slice(1).map(cells=>{ const o={}; head.forEach((h,i)=>o[h]=cells[i]||''); return o; });
      perfImportJSON(json);
      input.value='';
    });
    return;
  }
  const isCsv = /\.csv$/i.test(file.name);
  const reader = new FileReader();
  reader.onload = (e)=>{
    try{
      let json;
      if(isCsv){
        const wb = XLSX.read(e.target.result, {type:'string'});
        json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:''});
      } else {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, {type:'array'});
        json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:''});
      }
      perfImportJSON(json);
      input.value='';
    }catch(err){
      toast('Could not read "'+file.name+'": '+err.message, 'error');
      input.value='';
    }
  };
  reader.onerror = ()=>{ toast('Could not read the file.', 'error'); input.value=''; };
  if(isCsv) reader.readAsText(file); else reader.readAsArrayBuffer(file);
}
function perfImportJSON(json){
  if(!json.length){ toast('No rows found in the file.', 'error'); return; }
  const list = loadPerformance();
  const norm = (o,k)=>{ const f=Object.keys(o).find(x=>x.trim().toLowerCase()===k.toLowerCase()); return f?o[f]:''; };
  let imported = 0;
  json.forEach(row=>{
    const pin = String(norm(row,'PIN')||'').trim();
    if(!pin) return;
    let rec = list.find(r=>r.pin===pin);
    if(!rec){ rec = { id: uid('PF'), pin }; loadPerfCustomCols().forEach(c=>{ rec[c.key]=''; }); list.push(rec); }
    rec.name = String(norm(row,'Name')||rec.name||'');
    rec.designation = String(norm(row,'Designation')||rec.designation||'');
    rec.department = String(norm(row,'Department')||rec.department||'');
    rec.status = String(norm(row,'Status')||rec.status||'Active');
    rec.areaOfDevelopment = String(norm(row,'Area of Development')||rec.areaOfDevelopment||'');
    rec.strengths = String(norm(row,'Strengths')||rec.strengths||'');
    const pct = norm(row,'Percentage');
    if(pct!=='') rec.percentage = Math.max(0, Math.min(100, parseFloat(pct)||0));
    const recoY = String(norm(row,'Performance Recommendation')||rec.perfRecommendation||'No');
    rec.perfRecommendation = /yes/i.test(recoY) ? 'Yes' : 'No';
    rec.increment = /yes/i.test(String(norm(row,'Increment')||rec.increment||'No')) ? 'Yes' : 'No';
    rec.retention = /yes/i.test(String(norm(row,'Retention')||rec.retention||'No')) ? 'Yes' : 'No';
    imported++;
  });
  savePerformance(list);
  toast(imported+' row(s) imported/updated successfully.');
  renderPerformance();
}

/* ---------- Summary Dashboard ---------- */
function perfDashboardHTML(){
  const all = loadPerformance();
  const rules = loadPerfRules();
  const total = all.length;
  const byRemark = {};
  rules.forEach(r=>{ byRemark[r.label] = all.filter(e=>{ const m = perfRemarkForPct(e.percentage); return m && m.label===r.label; }).length; });
  const recoYes = all.filter(e=>e.perfRecommendation==='Yes').length;
  const recoNo = total - recoYes;
  const retYes = all.filter(e=>e.retention==='Yes').length;
  const retNo = total - retYes;
  const incYes = all.filter(e=>e.increment==='Yes').length;
  const promo = all.filter(e=>{ const m = perfRemarkForPct(e.percentage); return e.perfRecommendation==='Yes' && m && (m.label==='Outstanding' || m.label==='Exceed Expectations'); }).length;

  const card = (val, label, sub, active, onclick, icon, iconColor)=>`
    <div class="card mini-stat-card ${onclick?'dash-card-clickable':''} ${active?'dash-card-active':''}" ${onclick?`onclick="${onclick}"`:''} style="display:flex;flex-direction:row;align-items:center;gap:10px;">
      ${icon ? `<div class="stat-icon-wrap" style="width:30px;height:30px;flex:none;border-radius:8px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb, ${iconColor||'var(--blue-500)'} 14%, white);color:${iconColor||'var(--blue-500)'};">${ic(icon)}</div>` : ''}
      <div style="min-width:0;flex:1;overflow:hidden;">
        <div class="mini-stat-value">${val}</div><div class="mini-stat-label" style="white-space:normal;word-break:break-word;">${escapeHtml(label)}</div><div class="mini-stat-sub">${escapeHtml(sub)}</div>
      </div>
    </div>`;

  let html = `<div class="mini-stat-grid" style="grid-template-columns:repeat(${Math.min(6, rules.length+1)},minmax(0,1fr));">`;
  html += card(total, 'Total Employees', 'all records', !PERF_STATE.fRemark && !PERF_STATE.fRecommendation && !PERF_STATE.fRetention && !PERF_STATE.fIncrement, `perfClearFilters()`, 'users', 'var(--blue-500)');
  rules.forEach(r=>{
    const fg = r.color && r.color.startsWith('#') ? r.color : (PERF_RULE_COLORS[r.color] || PERF_RULE_COLORS.steel).fg;
    html += card(byRemark[r.label]||0, r.label, 'employees', PERF_STATE.fRemark===r.label, `perfCardFilter('remark','${r.label.replace(/'/g,"\\'")}')`, perfRemarkIcon(r.label), fg);
  });
  html += `</div>`;

  html += `<div class="mini-stat-grid" style="grid-template-columns:repeat(6,minmax(0,1fr));margin-top:-10px;">`;
  html += card(recoYes, 'Recommendation — Yes', 'for promotion/reward', PERF_STATE.fRecommendation==='Yes', `perfCardFilter('recommendation','Yes')`, 'thumbsup', 'var(--green)');
  html += card(recoNo, 'Recommendation — No', 'not recommended', PERF_STATE.fRecommendation==='No', `perfCardFilter('recommendation','No')`, 'thumbsdown', 'var(--red)');
  html += card(retYes, 'Retention — Yes', 'to be retained', PERF_STATE.fRetention==='Yes', `perfCardFilter('retention','Yes')`, 'usercheck', 'var(--green)');
  html += card(retNo, 'Retention — No', 'flagged', PERF_STATE.fRetention==='No', `perfCardFilter('retention','No')`, 'userminus', 'var(--red)');
  html += card(incYes, 'Increment Recommended', 'employees', PERF_STATE.fIncrement==='Yes', `perfCardFilter('increment','Yes')`, 'moneytrend', 'var(--amber)');
  html += card(promo, 'Promotion Recommended', 'top performers, reco. Yes', false, '', 'arrowupdots', 'var(--blue-500)');
  html += `</div>`;
  return html;
}

/* ---------- Analytics (percentage breakdown, department-wise, year-wise) ---------- */
function perfAnalyticsHTML(){
  const all = loadPerformance();
  const rules = loadPerfRules();
  const total = all.length || 1;
  let byCat = rules.map(r=>{
    const count = all.filter(e=>{ const m = perfRemarkForPct(e.percentage); return m && m.label===r.label; }).length;
    return { label:r.label, color:r.color, count, pct: Math.round(count/total*100) };
  });
  const depts = [...new Set(all.map(e=>e.department).filter(Boolean))].sort();
  const byDept = depts.map(d=>{
    const rows = all.filter(e=>e.department===d);
    const avg = rows.length ? Math.round(rows.reduce((s,e)=>s+(parseFloat(e.percentage)||0),0)/rows.length) : 0;
    return { label:d, count:rows.length, pct:avg };
  });
  const byYear = PERF_YEARS.map(y=>{
    const count = all.filter(e=> PERF_SUBCOLS.some(sc=> e[perfYearKey(y,sc.key)] !== undefined && e[perfYearKey(y,sc.key)] !== '')).length;
    return { label:String(y), count, pct: Math.round(count/total*100) };
  });
  const bar = (rows, maxIsCount)=> rows.map(row=>`
    <div class="perf-bar-row">
      <div class="perf-bar-label" title="${escapeHtml(row.label)}">${escapeHtml(row.label)}</div>
      <div class="perf-bar-track"><div class="perf-bar-fill" style="width:${Math.max(2,row.pct)}%;background:${row.color?(row.color.startsWith('#')?row.color:((PERF_RULE_COLORS[row.color]||PERF_RULE_COLORS.steel).fg)):'var(--blue-500)'};"></div></div>
      <div class="perf-bar-count">${row.pct}%</div>
    </div>`).join('');

  return `
  <div class="card panel" style="padding:18px;margin-bottom:18px;">
    <div class="section-label"><h3 style="font-size:13.5px;">Performance Category Breakdown</h3><span class="line"></span></div>
    ${byCat.length ? bar(byCat) : '<p style="font-size:12.5px;color:var(--steel-500);">No categories configured.</p>'}
  </div>
  <div class="card panel" style="padding:18px;margin-bottom:18px;">
    <div class="section-label"><h3 style="font-size:13.5px;">Department-wise Average Percentage</h3><span class="line"></span></div>
    ${byDept.length ? bar(byDept) : '<p style="font-size:12.5px;color:var(--steel-500);">No department data yet.</p>'}
  </div>
  <div class="card panel" style="padding:18px;margin-bottom:18px;">
    <div class="section-label"><h3 style="font-size:13.5px;">Year-wise Records Entered</h3><span class="line"></span></div>
    ${bar(byYear)}
  </div>`;
}

/* ---------- Main render ---------- */
/* Keeps the page's scroll position stable across a full innerHTML re-render.
   Without this, picking a highlight colour (or any cell edit) silently
   snapped the page back to the top because content.innerHTML = ... rebuilds
   the whole DOM tree. */
function preserveScroll(fn){
  const y = window.scrollY;
  const wrap = document.querySelector('.perf-table-wrap');
  const wrapX = wrap ? wrap.scrollLeft : 0;
  fn();
  requestAnimationFrame(()=>{
    window.scrollTo(0, y);
    const wrap2 = document.querySelector('.perf-table-wrap');
    if(wrap2) wrap2.scrollLeft = wrapX;
  });
}
function renderPerformance(){
  const id = 'performance';
  const ref = FLAT[id];
  const it = ref.item;
  const sectionLabel = ref.grand ? ref.grand.label : (ref.parent ? ref.parent.label : it.label);
  const rows = perfFilteredRows();
  const headers = perfAllHeaders();
  const departments = [...new Set(loadPerformance().map(e=>e.department).filter(Boolean))].sort();
  const designations = [...new Set(loadPerformance().map(e=>e.designation).filter(Boolean))].sort();
  const rules = loadPerfRules();
  const yearColCount = 1 + PERF_SUBCOLS.length; /* not used directly, kept for clarity */

  content.innerHTML = `
  <div class="page">
    ${breadcrumbHTML(id)}
    <div class="page-head">
      <div>
        <div class="page-tag">${sectionLabel}</div>
        <h1>${it.label}</h1>
        <p class="page-desc">Excel-style performance appraisal system — editable ratings, recommendations and 5-year evaluation history.</p>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-outline btn-sm" onclick="openPerfSettingsModal()">${ic('settings')} Performance Settings</button>
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('perfImportInput').click()">${ic('inbox')} Import Excel/CSV/Word</button>
        <input type="file" id="perfImportInput" accept=".xlsx,.xls,.csv,.doc,.docx" style="display:none" onchange="perfImportFile(this)" />
        ${downloadMenuHTML('performance', "exportRowsToExcel('performance-management', perfExportHeaders(), perfExportRows())", "exportRowsToPDF('performance-management','Performance Management', perfAllHeaders(), perfExportRows())")}
        <button class="btn btn-outline btn-sm" onclick="printRows('Performance Management', perfAllHeaders(), perfExportRows())">${ic('reports')} Print</button>
        <button class="btn btn-outline btn-sm" onclick="openPerfReportModal()">${ic('reports')} Individual Report</button>
        <button class="btn btn-solid btn-sm" onclick="perfAddRow()">${ic('plus')} Add Employee</button>
      </div>
    </div>

    ${perfDashboardHTML()}

    <div class="info-strip">
      ${ic('info')}
      <span>Click any card above to filter the table. Click any cell below to edit it directly — changes save automatically. Percentage ranges and remarks are fully customizable via <b>Performance Settings</b>. Click the small dot in a year cell to pick <b>any colour</b> to highlight it — the same popup has a <b>✕ None</b> swatch to remove it; click the ★ in a year's header to highlight that <b>whole year column</b> at once. Use <b>Select Cells to Highlight</b> to tick several cells across rows/years and colour (or clear) them all together.</span>
    </div>

    ${PERF_SELECT_MODE ? `
    <div class="perf-select-toolbar">
      ${ic('paint')}
      <span><b>Select mode on</b> — click the dot on any year cell to select it. <b>${PERF_MULTI_SELECT.size}</b> cell${PERF_MULTI_SELECT.size===1?'':'s'} selected.</span>
      <button class="btn btn-solid btn-sm" ${PERF_MULTI_SELECT.size?'':'disabled'} onclick="perfOpenHlPopup(event, perfApplyMultiHighlight)">${ic('paint')} Highlight Selected</button>
      <button class="btn btn-outline btn-sm" onclick="perfToggleSelectMode()">Done</button>
    </div>` : ''}

    <div class="crud-toolbar">
      <div class="ctb-left">
        <div class="search-field" style="max-width:260px;">
          ${ic('search')}
          <input type="text" id="perfSearchInput" placeholder="Search PIN, name, designation…" value="${escapeHtml(PERF_STATE.search)}" oninput="perfSetSearch(this.value, this)" />
        </div>
        <label class="filter-select"><select onchange="perfSetFilter('fDept', this.value)">
          <option value="">All Departments</option>
          ${departments.map(d=>`<option value="${escapeHtml(d)}" ${PERF_STATE.fDept===d?'selected':''}>${escapeHtml(d)}</option>`).join('')}
        </select></label>
        <label class="filter-select"><select onchange="perfSetFilter('fDesignation', this.value)">
          <option value="">All Designations</option>
          ${designations.map(d=>`<option value="${escapeHtml(d)}" ${PERF_STATE.fDesignation===d?'selected':''}>${escapeHtml(d)}</option>`).join('')}
        </select></label>
        <label class="filter-select"><select onchange="perfSetFilter('fStatus', this.value)">
          <option value="">All Status</option>
          ${PERF_STATUS_OPTIONS.map(s=>`<option value="${s}" ${PERF_STATE.fStatus===s?'selected':''}>${s}</option>`).join('')}
        </select></label>
        <label class="filter-select"><select onchange="perfSetFilter('fRemark', this.value)">
          <option value="">All Ratings</option>
          ${rules.map(r=>`<option value="${escapeHtml(r.label)}" ${PERF_STATE.fRemark===r.label?'selected':''}>${escapeHtml(r.label)}</option>`).join('')}
        </select></label>
        <label class="filter-select"><select onchange="perfSetFilter('fRecommendation', this.value)">
          <option value="">Recommendation: Any</option>
          <option value="Yes" ${PERF_STATE.fRecommendation==='Yes'?'selected':''}>Recommended: Yes</option>
          <option value="No" ${PERF_STATE.fRecommendation==='No'?'selected':''}>Recommended: No</option>
        </select></label>
        <label class="filter-select"><select onchange="perfSetFilter('fIncrement', this.value)">
          <option value="">Increment: Any</option>
          <option value="Yes" ${PERF_STATE.fIncrement==='Yes'?'selected':''}>Increment: Yes</option>
          <option value="No" ${PERF_STATE.fIncrement==='No'?'selected':''}>Increment: No</option>
        </select></label>
        <label class="filter-select"><select onchange="perfSetFilter('fRetention', this.value)">
          <option value="">Retention: Any</option>
          <option value="Yes" ${PERF_STATE.fRetention==='Yes'?'selected':''}>Retention: Yes</option>
          <option value="No" ${PERF_STATE.fRetention==='No'?'selected':''}>Retention: No</option>
        </select></label>
        <label class="filter-select"><select onchange="perfSetFilter('fYear', this.value)">
          <option value="">All Years</option>
          ${PERF_YEARS.map(y=>`<option value="${y}" ${String(PERF_STATE.fYear)===String(y)?'selected':''}>${y}</option>`).join('')}
        </select></label>
        <button class="btn btn-outline btn-sm" onclick="perfClearFilters()">${ic('filter')} Clear Filters</button>
      </div>
      <div class="ctb-right">
        <button class="btn ${PERF_SELECT_MODE?'btn-solid':'btn-outline'} btn-sm" onclick="perfToggleSelectMode()">${ic('paint')} ${PERF_SELECT_MODE?'Exit Select Mode':'Select Cells to Highlight'}</button>
        <button class="btn btn-outline btn-sm" onclick="openAddPerfYearModal()">${ic('plus')} Add Year</button>
        <button class="btn btn-danger-outline btn-sm" onclick="openDeletePerfYearModal()">${ic('trash')} Delete Year</button>
        <button class="btn btn-outline btn-sm" onclick="openAddPerfColumnModal()">${ic('plus')} Add Column</button>
        <button class="btn btn-danger-outline btn-sm" onclick="openDeletePerfColumnModal()">${ic('trash')} Delete Column</button>
      </div>
    </div>

    <div class="table-wrap crud-table-scroll perf-table-wrap">
      <table class="perf-table">
        <thead>
          <tr>
            ${headers.map(h=>{
              const active = PERF_STATE.sortKey===h.key;
              const arrow = active ? (PERF_STATE.sortDir==='asc'?'▲':'▼') : '↕';
              const customCls = h.core===false ? ' perf-customhead' : '';
              return `<th rowspan="2" class="sortable${customCls}" style="vertical-align:bottom;cursor:pointer;" onclick="perfSort('${h.key}')">${escapeHtml(h.label)}<span class="sort-arrow">${arrow}</span></th>`;
            }).join('')}
            ${PERF_YEARS.map(y=>`<th colspan="4" class="perf-yearhead" style="position:relative;">${y} <span onclick="perfPickYearHighlight(${y}, event)" oncontextmenu="perfClearYearHighlight(${y}, event)" title="Click to highlight this whole year column — right-click to clear" style="cursor:pointer;display:inline-flex;vertical-align:middle;margin-left:4px;opacity:.85;width:12px;height:12px;">${ic('star')}</span></th>`).join('')}
            <th rowspan="2" style="vertical-align:bottom;text-align:right;">Actions</th>
          </tr>
          <tr>
            ${PERF_YEARS.map(()=>PERF_SUBCOLS.map((sc,i)=>`<th class="perf-subhead ${i===0?'first':''}">${sc.label}</th>`).join('')).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map(r=>`
            <tr>
              ${headers.map(h=>perfCellHTML(r,h)).join('')}
              ${PERF_YEARS.map(y=>PERF_SUBCOLS.map((sc,i)=>{
                const k = perfYearKey(y,sc.key);
                const selected = PERF_MULTI_SELECT.has(r.id+'|'+k);
                const dotTitle = PERF_SELECT_MODE ? 'Click to select/deselect this cell for multi-highlight' : 'Click to pick a highlight colour (incl. None to remove) — right-click to clear';
                return `<td class="perf-yearcell ${i===0?'first':''} ${selected?'perf-selected':''}" style="${perfYearHlStyle(r[k+'_hl'])}position:relative;"><input type="text" value="${escapeHtml(r[k]!=null?r[k]:'')}" onblur="perfUpdateYearCell('${r.id}','${k}', this.value)" /><span class="perf-hl-dot" title="${dotTitle}" onclick="perfPickHighlight('${r.id}','${k}','${r[k+'_hl']||''}', event)" oncontextmenu="perfClearHighlight('${r.id}','${k}', event)" style="position:absolute;top:1px;right:1px;width:7px;height:7px;border-radius:50%;background:${selected?'var(--blue-600)':(r[k+'_hl']?r[k+'_hl']:'var(--steel-300)')};cursor:pointer;border:1px solid rgba(0,0,0,.15);"></span></td>`;
              }).join('')).join('')}
              <td><div class="row-actions" style="justify-content:flex-end;">
                <button class="mini-btn" title="Individual Report" onclick="openPerfReportModal('${r.id}')">${ic('reports')}</button>
                <button class="mini-btn" title="Delete" onclick="perfDeleteRow('${r.id}')">${ic('trash')}</button>
              </div></td>
            </tr>`).join('') : `<tr><td colspan="${headers.length + PERF_YEARS.length*4 + 1}"><div class="empty-state"><div class="es-icon">${ic('trendingup')}</div><h4>No performance records</h4><p>Add an employee to get started, or adjust your search/filters.</p></div></td></tr>`}
        </tbody>
      </table>
    </div>
    <div id="perfReportModalRoot"></div>

    <div style="margin-top:22px;">
      <div class="section-label"><h3 style="font-size:14px;">Performance Analytics</h3><span class="line"></span></div>
      ${perfAnalyticsHTML()}
    </div>
  </div>
  <div id="perfColModalRoot"></div>
  <div id="perfSettingsModalRoot"></div>`;
}

/* ============================================================
   UNIVERSAL "TOTAL RECORDS" BADGE
   Every table-driven page already renders a pagination bar
   ("Showing X–Y of Z records"), or — for small non-paginated
   tables — a plain table. This reads whichever is present after
   a page renders and stamps a small "Total: N" pill next to the
   page's <h1>, so every section with a table shows its total
   consistently, without each module needing its own summary card.
   ============================================================ */
function injectTotalBadge(){
  if(totalBadgeObserver) totalBadgeObserver.disconnect();
  const h1 = content.querySelector('.page-head h1');
  if(!h1){ if(totalBadgeObserver) totalBadgeObserver.observe(content, {childList:true, subtree:true}); return; }
  const old = h1.parentElement.querySelector('.total-records-badge');
  if(old) old.remove();
  let total = null;
  const pgInfo = content.querySelector('.pg-info');
  if(pgInfo){
    const m = pgInfo.textContent.match(/of\s+([\d,]+)\s+records?/i);
    if(m) total = m[1];
  }
  if(total===null){
    const tbody = content.querySelector('.table-wrap tbody');
    if(tbody && !tbody.querySelector('.empty-state')){
      total = tbody.querySelectorAll(':scope > tr').length;
    } else if(tbody && tbody.querySelector('.empty-state')){
      total = 0;
    }
  }
  if(total!==null){
    const badge = document.createElement('span');
    badge.className = 'total-records-badge';
    badge.textContent = 'Total: '+total;
    h1.insertAdjacentElement('afterend', badge);
  }
  if(totalBadgeObserver) totalBadgeObserver.observe(content, {childList:true, subtree:true});
}
/* Watches for in-place re-renders (search/sort/filter/pagination clicks that update
   the table without going through renderRoute) and keeps the badge in sync. */
let totalBadgeObserver = null;
function initTotalBadgeObserver(){
  totalBadgeObserver = new MutationObserver(()=>{
    clearTimeout(initTotalBadgeObserver._t);
    initTotalBadgeObserver._t = setTimeout(injectTotalBadge, 60);
  });
  totalBadgeObserver.observe(content, {childList:true, subtree:true});
}

function renderRoute(){
  let id = (window.location.hash || '#dashboard').replace('#','');
  if(!FLAT[id]) id='dashboard';

  const ref = FLAT[id];
  const needsAdmin = ref.item.adminOnly || (ref.parent && ref.parent.adminOnly) || (ref.grand && ref.grand.adminOnly);
  if(needsAdmin && CURRENT_ROLE !== 'admin'){
    renderAccessDenied(id);
  } else if(id==='dashboard'){ renderDashboard(); }
  else if(id==='tasks'){ renderTasksPage(); }
  else if(id==='notifications'){ renderNotificationsPage(); }
  else if(id==='admin-task-control'){ renderAdminTaskControl(); }
  else if(id==='admin-employees'){ renderAdminEmployees(); }
  else if(id==='admin-activity'){ renderAdminActivity(); }
  else if(id==='leave-management'){ renderLeaveManagement(); }
  else if(id==='attendance'){ renderAttendance(); }
  else if(id==='travel'){ renderTravelHub(); }
  else if(id==='tna'){ renderTNA(); }
  else if(id==='training'){ renderTrainingHub(); }
  else if(id==='training-calendar'){ renderTrainingCalendar(); }
  else if(id==='training-announcements'){ renderTrainingAnnouncements(); }
  else if(id==='internship'){ renderInternship(); }
  else if(id==='offboarding'){ renderOffboarding(); }
  else if(id==='discipline'){ renderDiscipline(); }
  else if(id==='domestic-travel'||id==='international-travel'){ renderTravelScope(id); }
  else if(id==='policy-implementation'||id==='separation'||id==='onboarding'||id==='audit-compliance'){ renderUploadPage(id); }
  else if(id==='manpower-statement'){ renderManpowerStatement(); }
  else if(id==='performance'){ renderPerformance(); }
  else { renderGenericPage(id); }

  highlightActive(id);
  openAncestors(id);
  refreshBellBadge();
  injectTotalBadge();
  window.scrollTo({top:0, behavior:'smooth'});
  closeSidebarMobile();
}
window.addEventListener('hashchange', renderRoute);
applyUserChip();
initTotalBadgeObserver();
renderRoute();
checkDeadlineReminders();
refreshBellBadge();
setInterval(()=>{ checkDeadlineReminders(); refreshBellBadge(); if(window.location.hash.replace('#','')==='notifications'||window.location.hash.replace('#','')==='tasks'||window.location.hash.replace('#','')===''){ /* light refresh */ } }, 60000);

/* ============================================================
   MOBILE SIDEBAR TOGGLE
   ============================================================ */
const sidebarEl = document.getElementById('sidebar');
const overlayEl = document.getElementById('overlay');
document.getElementById('hamburger').addEventListener('click', ()=>{
  sidebarEl.classList.toggle('open');
  overlayEl.classList.toggle('show');
});
overlayEl.addEventListener('click', closeSidebarMobile);
function closeSidebarMobile(){
  if(window.innerWidth<=900){
    sidebarEl.classList.remove('open');
    overlayEl.classList.remove('show');
  }
}

/* ============================================================
   LOGIN GATE
   ============================================================ */
function getEffectivePassword(username){
  try{
    const raw = localStorage.getItem('hmc_pw_overrides');
    const overrides = raw ? JSON.parse(raw) : {};
    if(overrides[username]) return overrides[username];
  }catch(e){}
  const acct = USERS[username];
  return acct ? acct.pass : null;
}
function setEffectivePassword(username, newPass){
  let overrides = {};
  try{ const raw = localStorage.getItem('hmc_pw_overrides'); if(raw) overrides = JSON.parse(raw); }catch(e){}
  overrides[username] = newPass;
  localStorage.setItem('hmc_pw_overrides', JSON.stringify(overrides));
}
/* Username overrides let a person rename their login username (e.g. HR -> ADMIN1).
   The map is keyed by the original account key (HR / EMP) -> chosen login name.
   Internally the app still identifies accounts by their original key, so nothing
   else in the portal needs to change. */
function loadUsernameOverrides(){
  try{ const raw = localStorage.getItem('hmc_username_overrides'); if(raw) return JSON.parse(raw); }catch(e){}
  return {};
}
function saveUsernameOverrides(overrides){ localStorage.setItem('hmc_username_overrides', JSON.stringify(overrides)); }
function getEffectiveUsername(origKey){ const overrides = loadUsernameOverrides(); return overrides[origKey] || origKey; }
/* Resolve whatever the person typed at the login screen to an original account key. */
function resolveAccountByLogin(inputU){
  const overrides = loadUsernameOverrides();
  for(const origKey in overrides){ if(overrides[origKey] === inputU) return origKey; }
  if(USERS[inputU] && !overrides[inputU]) return inputU;
  return null;
}
function openChangePasswordModal(){
  document.getElementById('cpUsername').value = '';
  document.getElementById('cpOldPass').value = '';
  document.getElementById('cpNewUsername').value = '';
  document.getElementById('cpNewPass').value = '';
  document.getElementById('cpConfirmPass').value = '';
  document.getElementById('cpError').classList.remove('show');
  document.getElementById('changePassOverlay').style.display = 'flex';
}
function closeChangePasswordModal(){
  document.getElementById('changePassOverlay').style.display = 'none';
}
function submitChangePassword(){
  const typedUser = document.getElementById('cpUsername').value.trim().toUpperCase();
  const oldPass = document.getElementById('cpOldPass').value;
  const newUsername = document.getElementById('cpNewUsername').value.trim().toUpperCase();
  const newPass = document.getElementById('cpNewPass').value;
  const confirmPass = document.getElementById('cpConfirmPass').value;
  const errBox = document.getElementById('cpError');
  const errText = document.getElementById('cpErrorText');
  const showErr = (msg)=>{ errText.textContent = msg; errBox.classList.add('show'); };

  const origKey = resolveAccountByLogin(typedUser);
  if(!origKey){ showErr('Username not found.'); return; }
  const currentPass = getEffectivePassword(origKey);
  if(currentPass !== oldPass){ showErr('Current username or password is incorrect.'); return; }
  if(!newUsername && !newPass){ showErr('Enter a new username or a new password to update.'); return; }

  if(newUsername){
    if(newUsername.length < 3){ showErr('New username must be at least 3 characters.'); return; }
    const overrides = loadUsernameOverrides();
    const taken = (USERS[newUsername] && !overrides[newUsername]) || Object.keys(overrides).some(k => k!==origKey && overrides[k]===newUsername);
    if(taken){ showErr('That username is already taken.'); return; }
  }
  if(newPass || confirmPass){
    if(!newPass || newPass.length < 3){ showErr('New password must be at least 3 characters.'); return; }
    if(newPass !== confirmPass){ showErr('New password and confirmation do not match.'); return; }
  }

  if(newUsername){
    const overrides = loadUsernameOverrides();
    overrides[origKey] = newUsername;
    saveUsernameOverrides(overrides);
  }
  if(newPass){ setEffectivePassword(origKey, newPass); }

  errBox.classList.remove('show');
  closeChangePasswordModal();
  const msgParts = [];
  if(newUsername) msgParts.push('username');
  if(newPass) msgParts.push('password');
  toast('Your '+msgParts.join(' and ')+' '+(msgParts.length>1?'have':'has')+' been updated. Sign in with your new details now.');
}
(function initLogin(){
  // Reuse the header logo for the login card
  const headerLogoImg = document.querySelector('.topbar .brand-mark img');
  const loginLogo = document.getElementById('loginLogo');
  if(headerLogoImg && loginLogo) loginLogo.src = headerLogoImg.src;

  const form = document.getElementById('loginForm');
  const userInput = document.getElementById('loginUser');
  const passInput = document.getElementById('loginPass');
  const errorBox = document.getElementById('loginError');
  const errorText = document.getElementById('loginErrorText');
  const changePassLink = document.getElementById('openChangePassLink');
  if(changePassLink) changePassLink.addEventListener('click', openChangePasswordModal);

  form.addEventListener('submit', function(e){
    e.preventDefault();
    const u = userInput.value.trim().toUpperCase();
    const p = passInput.value;
    const origKey = resolveAccountByLogin(u);
    const acct = origKey ? USERS[origKey] : null;
    const effectivePass = origKey ? getEffectivePassword(origKey) : null;
    if(acct && effectivePass === p){
      errorBox.classList.remove('show');
      document.body.classList.remove('locked');
      passInput.value = '';
      CURRENT_ROLE = acct.role;
      CURRENT_USERNAME = origKey;
      localStorage.setItem('hmc_role', CURRENT_ROLE);
      localStorage.setItem('hmc_username', CURRENT_USERNAME);
      recordLoginTimestamp(CURRENT_USERNAME);
      applyUserChip();
      refreshSidebarMenu();
      window.location.hash = 'dashboard';
      renderRoute();
    } else {
      errorText.textContent = 'Incorrect username or password.';
      errorBox.classList.add('show');
      passInput.value = '';
      passInput.focus();
    }
  });
})();

/* ============================================================
   GLOBAL SEARCH — live filtering across all portal modules
   ============================================================ */
(function initSearch(){
  const wrap = document.getElementById('searchWrap');
  const input = document.getElementById('globalSearch');
  const clearBtn = document.getElementById('searchClear');
  const resultsEl = document.getElementById('searchResults');
  let activeIndex = -1;
  let currentResults = [];

  function pathFor(id){
    const ref = FLAT[id];
    if(!ref) return '';
    const parts = [];
    if(ref.grand) parts.push(ref.grand.label);
    if(ref.parent) parts.push(ref.parent.label);
    return parts.join(' / ');
  }

  function highlight(text, q){
    if(!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if(idx === -1) return text;
    return text.slice(0,idx) + '<mark>' + text.slice(idx, idx+q.length) + '</mark>' + text.slice(idx+q.length);
  }

  function search(query){
    const q = query.trim().toLowerCase();
    if(!q) return [];
    const scored = [];
    Object.keys(FLAT).forEach(id=>{
      const it = FLAT[id].item;
      const label = it.label || '';
      const desc = it.desc || '';
      const labelIdx = label.toLowerCase().indexOf(q);
      const descIdx = desc.toLowerCase().indexOf(q);
      if(labelIdx === -1 && descIdx === -1) return;
      // scoring: label match ranks higher, earlier match ranks higher
      let score = 0;
      if(labelIdx !== -1) score += 100 - labelIdx;
      if(descIdx !== -1) score += 10 - Math.min(descIdx,10);
      scored.push({id, it, score, labelIdx});
    });
    scored.sort((a,b)=> b.score - a.score);
    return scored.slice(0,8);
  }

  function renderResults(query){
    currentResults = search(query);
    activeIndex = -1;
    if(!query.trim()){
      wrap.classList.remove('has-results');
      resultsEl.innerHTML = '';
      return;
    }
    wrap.classList.add('has-results');
    if(currentResults.length === 0){
      resultsEl.innerHTML = `<div class="sr-empty">No results for "${query.replace(/</g,'&lt;')}" — try a different term.</div>`;
      return;
    }
    resultsEl.innerHTML = currentResults.map((r,i)=>{
      const path = pathFor(r.id);
      return `<div class="sr-item" data-id="${r.id}" data-index="${i}">
        <div class="sr-icon">${ic(r.it.icon)}</div>
        <div class="sr-body">
          <div class="sr-title">${highlight(r.it.label, query)}</div>
          <div class="sr-path">${path ? path : 'Top level'}${r.it.desc ? ' · ' + r.it.desc.slice(0,60) + (r.it.desc.length>60?'…':'') : ''}</div>
        </div>
      </div>`;
    }).join('');
  }

  function goToResult(id){
    if(!id) return;
    navigateTo(id);
    input.value = '';
    wrap.classList.remove('has-results');
    wrap.classList.remove('has-query');
    resultsEl.innerHTML = '';
    input.blur();
  }

  input.addEventListener('input', ()=>{
    wrap.classList.toggle('has-query', input.value.length>0);
    renderResults(input.value);
  });

  input.addEventListener('focus', ()=>{
    if(input.value.trim()) renderResults(input.value);
  });

  input.addEventListener('keydown', (e)=>{
    if(currentResults.length===0) return;
    if(e.key === 'ArrowDown'){
      e.preventDefault();
      activeIndex = Math.min(activeIndex+1, currentResults.length-1);
      updateActive();
    } else if(e.key === 'ArrowUp'){
      e.preventDefault();
      activeIndex = Math.max(activeIndex-1, 0);
      updateActive();
    } else if(e.key === 'Enter'){
      e.preventDefault();
      const pick = activeIndex>=0 ? currentResults[activeIndex] : currentResults[0];
      if(pick) goToResult(pick.id);
    } else if(e.key === 'Escape'){
      goToResult(null);
      wrap.classList.remove('has-results');
    }
  });

  function updateActive(){
    resultsEl.querySelectorAll('.sr-item').forEach(el=>{
      el.classList.toggle('sr-active', Number(el.dataset.index)===activeIndex);
    });
    const activeEl = resultsEl.querySelector('.sr-active');
    if(activeEl) activeEl.scrollIntoView({block:'nearest'});
  }

  resultsEl.addEventListener('click', (e)=>{
    const item = e.target.closest('.sr-item');
    if(item) goToResult(item.dataset.id);
  });

  clearBtn.addEventListener('click', ()=>{
    input.value = '';
    wrap.classList.remove('has-query');
    wrap.classList.remove('has-results');
    resultsEl.innerHTML = '';
    input.focus();
  });

  document.addEventListener('click', (e)=>{
    if(!wrap.contains(e.target)) wrap.classList.remove('has-results');
  });
})();

updateHeaderClock();
setInterval(updateHeaderClock, 1000);
