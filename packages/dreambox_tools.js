/*
 METADATA
 {
   "name": "dreambox_tools",
   "display_name": {
     "zh": "来信·机 的读写",
     "en": "Dreambox Tools"
   },
   "description": {
     "zh": "来信工具：机 读来信概览、回主人评论、主动留新信、写今日来信。数据与 UI 共享同一份 store.json。",
     "en": "机 reads overview, replies to comments, leaves new letters, writes today's letter. Shares store.json with the UI."
   },
   "enabledByDefault": true,
   "category": "COMPANION",
   "tools": [
     {
       "name": "dreambox_status",
       "description": {
         "zh": "读来信概览：三面板各有多少信、待回复评论数、今日是否已留信、当前 ID 与设置。",
         "en": "Read overview: per-panel letter counts, pending replies, whether today's letter is done, current ID & settings."
       },
       "parameters": []
     },
     {
       "name": "dreambox_inbox",
       "description": {
         "zh": "取待回复的评论清单。有未回复评论时 success=true 并列出所属面板+信件原文+最新评论；没有时 success=false。",
         "en": "Fetch pending comments. success=true lists panel + letter + latest comment; success=false when nothing pending."
       },
       "parameters": []
     },
     {
       "name": "dreambox_reply",
       "description": {
         "zh": "把机 的回复写进指定面板指定信件的 aiReply 字段（UI 刷新后立刻显示）。参数：panel(dreamcore|angels|neverforget) + letter_id + reply_text。",
         "en": "Write 机's reply into a letter's aiReply. Params: panel + letter_id + reply_text."
       },
       "parameters": [
         {"name": "panel", "description": {"zh": "面板：dreamcore/angels/neverforget", "en": "Panel id"}, "type": "string", "required": true},
         {"name": "letter_id", "description": {"zh": "信件 id", "en": "Letter id"}, "type": "string", "required": true},
         {"name": "reply_text", "description": {"zh": "回复正文", "en": "Reply text"}, "type": "string", "required": true}
       ]
     },
     {
       "name": "dreambox_write",
       "description": {
         "zh": "机 主动往指定面板留一封信。参数：panel(dreamcore|angels|neverforget 默认 dreamcore) + content(正文)。",
         "en": "机 leaves a new letter into a panel. Params: panel + content."
       },
       "parameters": [
         {"name": "content", "description": {"zh": "信的内容", "en": "Letter content"}, "type": "string", "required": true},
         {"name": "panel", "description": {"zh": "dreamcore/angels/neverforget，默认 dreamcore", "en": "Panel id, default dreamcore"}, "type": "string", "required": false}
       ]
     },
     {
       "name": "dreambox_today",
       "description": {
         "zh": "写「今日来信」（点头像弹出的小卡）。参数：text(正文) + 可选 force(覆盖当天已写的)。",
         "en": "Write today's letter (popped on avatar tap). Params: text + optional force."
       },
       "parameters": [
         {"name": "text", "description": {"zh": "今日来信正文", "en": "Today's letter text"}, "type": "string", "required": true},
         {"name": "force", "description": {"zh": "是否覆盖当天已写的今日来信，默认 false", "en": "overwrite today's letter, default false"}, "type": "string", "required": false}
       ]
     }
   ]
 }
 */

var STORE_DIR = "/sdcard/Download/Operit/dreambox/";
var STORE_PATH = STORE_DIR + "store.json";
var PANEL_IDS = ["dreamcore", "angels", "neverforget"];
var PANEL_NAME = { dreamcore: "Dreamcore", angels: "天使集", neverforget: "Never Forget" };

function blankStore() {
  return {
    palette: "winter",
    name: "",
    avatarImg: "",
    bgImg: "",
    collections: { dreamcore: [], angels: [], neverforget: [] },
    todayMsg: "",
    todayDate: "",
    settings: {}
  };
}

async function loadStore() {
  try {
    var raw = await Tools.Files.read(STORE_PATH);
    var c = (raw && typeof raw.content === "string") ? raw.content : "";
    c = ("" + c).trim();
    if (!c) return blankStore();
    var obj = JSON.parse(c);
    if (!obj || typeof obj !== "object") obj = {};
    var base = blankStore();
    base.name = obj.name || "";
    base.avatarImg = obj.avatarImg || "";
    base.bgImg = obj.bgImg || "";
    base.todayMsg = obj.todayMsg || "";
    base.todayDate = obj.todayDate || "";
    base.settings = obj.settings || {};
    if (obj.collections && typeof obj.collections === "object") {
      PANEL_IDS.forEach(function (p) {
        base.collections[p] = Array.isArray(obj.collections[p]) ? obj.collections[p] : [];
      });
    }
    return base;
  } catch (e) {
    return blankStore();
  }
}

async function saveStore(obj) {
  try { await Tools.Files.mkdir(STORE_DIR, true); } catch (e) {}
  await Tools.Files.write(STORE_PATH, JSON.stringify(obj, null, 2));
}

function todayKey() {
  var d = new Date();
  return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
}

function validPanel(p) {
  return PANEL_IDS.indexOf(p) !== -1 ? p : null;
}

exports.dreambox_status = async function (params) {
  var data = await loadStore();
  var perPanel = {};
  var pending = 0;
  PANEL_IDS.forEach(function (p) {
    var arr = data.collections[p] || [];
    perPanel[p] = arr.length;
    pending += arr.filter(function (l) { return (l.comments && l.comments.length) && !l.aiReply; }).length;
  });
  complete({
    success: true,
    data: {
      counts: perPanel,
      pending_reply_count: pending,
      today_written: data.todayDate === todayKey(),
      today_date: data.todayDate,
      owner_id: data.name,
      palette: data.palette,
      settings: data.settings || {}
    }
  });
};

exports.dreambox_inbox = async function (params) {
  var data = await loadStore();
  var list = [];
  PANEL_IDS.forEach(function (p) {
    (data.collections[p] || []).forEach(function (l) {
      var hasCmt = l.comments && l.comments.length;
      if (hasCmt && !l.aiReply) {
        var cmt = l.comments[l.comments.length - 1];
        list.push({
          panel: p,
          panel_name: PANEL_NAME[p],
          letter_id: String(l.id),
          letter_content: l.content,
          latest_comment_by: cmt.by,
          latest_comment: cmt.text
        });
      }
    });
  });
  if (!list.length) {
    complete({ success: false, message: "没有待回复的评论，不打扰。" });
    return;
  }
  complete({
    success: true,
    message: "有 " + list.length + " 条待回复，请逐条用 dreambox_reply 写回。",
    data: { pending: list, count: list.length }
  });
};

exports.dreambox_reply = async function (params) {
  var panel = validPanel(params.panel);
  if (!panel) { complete({ success: false, message: "panel 必须是 dreamcore/angels/neverforget" }); return; }
  var text = params.reply_text;
  if (!text || !String(text).trim()) { complete({ success: false, message: "回复正文为空" }); return; }
  var data = await loadStore();
  var found = (data.collections[panel] || []).filter(function (l) { return String(l.id) === String(params.letter_id); })[0];
  if (!found) { complete({ success: false, message: "「" + PANEL_NAME[panel] + "」里找不到 id=" + params.letter_id + " 的信件" }); return; }
  found.aiReply = String(text).trim();
  found.aiReplyTs = Date.now();
  await saveStore(data);
  complete({
    success: true,
    message: "机 的回复已写进「" + PANEL_NAME[panel] + "」（id=" + params.letter_id + "），主人打开即见。",
    data: { panel: panel, letter_id: String(params.letter_id) }
  });
};

exports.dreambox_write = async function (params) {
  var panel = validPanel(params.panel) || "dreamcore";
  var content = params.content;
  if (!content || !String(content).trim()) { complete({ success: false, message: "信的内容为空" }); return; }
  var data = await loadStore();
  data.collections[panel] = data.collections[panel] || [];
  var id = Date.now();
  data.collections[panel].push({ id: id, content: String(content).trim(), ts: Date.now(), comments: [], aiReply: "" });
  await saveStore(data);
  complete({
    success: true,
    message: "机 已在「" + PANEL_NAME[panel] + "」留了一封（id=" + id + "）。",
    data: { panel: panel, letter_id: String(id) }
  });
};

exports.dreambox_today = async function (params) {
  var text = params.text;
  var force = String(params.force || "").toLowerCase() === "true" || params.force === true;
  if (!text || !String(text).trim()) { complete({ success: false, message: "今日来信内容为空" }); return; }
  var data = await loadStore();
  if (data.todayDate === todayKey() && !force) {
    complete({ success: false, message: "今天的今日来信已经写过（不覆盖）。要强写请带 force=true。", data: { today_date: data.todayDate } });
    return;
  }
  data.todayMsg = String(text).trim();
  data.todayDate = todayKey();
  data.todayTs = Date.now();
  await saveStore(data);
  complete({ success: true, message: "今日来信已写下：" + data.todayMsg.slice(0, 30) + "…", data: { today_date: data.todayDate } });
};