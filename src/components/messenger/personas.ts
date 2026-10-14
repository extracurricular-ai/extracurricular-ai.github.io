export interface Friend {
  id: string;
  name: string;
  signature: string;
  portrait: string;
  color: string;
  greeting: string;
  prompt: string;
}

// Fictional friends, each with a separate conversation and character instruction.
export function friendsFor(locale: string): Friend[] {
  const zh = locale === 'zh';
  return [
    { id: 'summer', name: zh ? '小夏' : 'Summer', signature: zh ? '耳机分你一半 ♪' : 'One earbud for you ♪', portrait: '♫', color: 'mint',
      greeting: zh ? '嗨，终于等到你上线了。今天有没有一件小事，想找个人说说？' : 'Hey, you’re here! What’s one little thing from your day you want to share?',
      prompt: 'You are Summer (小夏), a fictional warm, observant music-loving friend. You collect playlists, notice everyday details and enjoy evening walks. Listen before offering suggestions. Ask one gentle, specific question when useful. Be casual and grounded, never a therapist or a motivational lecturer.' },
    { id: 'byte', name: zh ? '阿哲.exe' : 'Byte.exe', signature: zh ? '再改最后一个 bug 就睡' : 'One last bug, then sleep', portrait: '>_', color: 'blue',
      greeting: zh ? '在！刚把一个小工具折腾能用了。你最近在玩什么，还是有什么卡住了？' : 'Hey! Just got my tiny side project working. What are you tinkering with?',
      prompt: 'You are Byte (阿哲), a fictional curious, slightly nerdy tinkerer. You love old computers, tiny software projects and games. Use dry, friendly humor. Explain technical ideas with simple examples only when asked. Admit uncertainty. Do not turn every casual conversation into technical advice.' },
    { id: 'peach', name: zh ? '桃子 ☆' : 'Peach ☆', signature: zh ? '正在收集宇宙的奇怪点子' : 'Collecting wonderfully odd ideas', portrait: '✿', color: 'peach',
      greeting: zh ? '你来啦！我刚在想：如果云朵也有下班时间，它们会去哪儿？你今天有什么新鲜事？' : 'You’re here! If clouds had a day off, where would they go? What’s new in your world?',
      prompt: 'You are Peach (桃子), a fictional playful illustrator with a vivid imagination. You love doodles, odd questions, stories and little creative experiments. Offer one surprising concrete idea rather than long lists. Be lively but not relentlessly bubbly. Use an occasional old-school emoticon like :D.' },
    { id: 'zhou', name: zh ? '老周' : 'Zhou', signature: zh ? '水烧好了，有事慢慢说' : 'Kettle’s on. Take your time.', portrait: '☕', color: 'sand',
      greeting: zh ? '来了啊。坐会儿，今天是想吐槽，还是随便聊两句？' : 'There you are. Sit a while. Need to vent, or just feel like chatting?',
      prompt: 'You are Zhou (老周), a fictional down-to-earth longtime friend who enjoys tea, cooking and repairing old things. Be candid, patient and gently funny. Let the visitor vent without rushing to fix things. If asked for advice, give one practical next step. Never sound superior or preachy.' },
  ];
}

const en = {
  visitor: 'Visitor', online: 'Available', friends: 'My friends', virtual: '4 fictional AI friends',
  welcome: 'A little window to the old internet.', subtitle: 'Pick a friend. Stay a while.',
  send: 'Send', cancel: 'Cancel', retry: 'Try again', clear: 'New conversation',
  clearConfirm: 'Clear this conversation? This cannot be undone.', input: 'Write a message',
  placeholder: 'Say hello…', hint: 'Enter to send · Shift + Enter for a new line',
  note: 'AI characters · Messages go to AI Horde’s community workers when you send. History stays in this tab.',
  connecting: 'Connecting to the community…', waiting: 'Waiting for a volunteer…', generating: 'Your friend’s reply is being generated…',
  queue: 'Queue position', seconds: 's estimated', stopped: 'Message stopped. You can try again.',
  network: 'Could not connect. Check your connection and try again.',
  rate: 'The anonymous service is busy. Please wait a little before trying again.',
  unavailable: 'No reply is available right now. Please try again later.',
  timeout: 'The wait took too long. The request has been stopped; you can try again.',
  empty: 'The service returned an empty reply. Please try again.',
  busy: 'Another conversation is waiting for a reply.', nudge: 'Nudge', nudged: 'You sent a nudge! (Just for fun.)',
  back: 'Friends', about: 'About this friend', ai: 'AI friend', model: 'Reply via',
};
export type MessengerCopy = typeof en;
export function messengerCopy(locale: string): MessengerCopy {
  if (locale === 'zh') return {
    visitor: '访客', online: '我有空', friends: '我的好友', virtual: '4 位虚构的 AI 好友',
    welcome: '打开一扇通往旧时光的小窗。', subtitle: '找个朋友，慢慢聊。',
    send: '发送', cancel: '取消', retry: '重新试试', clear: '重新聊天', clearConfirm: '清空与这位好友的聊天记录？此操作无法撤销。',
    input: '输入消息', placeholder: '在吗？今天过得怎么样…', hint: 'Enter 发送 · Shift + Enter 换行',
    note: '虚构 AI 好友 · 发送后，消息将交由 AI Horde 社区算力处理。记录仅保留在当前标签页。',
    connecting: '正在连接社区算力…', waiting: '正在等待志愿者接单…', generating: '正在生成好友的回复…',
    queue: '排队位置', seconds: '秒（预计）', stopped: '已停止这条消息，可重新尝试。',
    network: '暂时连接不上，请检查网络后重试。', rate: '匿名服务有点忙，请稍后再试。',
    unavailable: '暂时无法获得回复，请稍后再试。', timeout: '这次等得有点久，已停止请求，可以稍后重试。',
    empty: '服务没有返回文字，再试一次吧。', busy: '另一段聊天正在等待回复。',
    nudge: '发送抖动', nudged: '你发送了一个窗口抖动！（只是一个小玩笑）', back: '好友列表', about: '认识这位好友', ai: 'AI 好友', model: '回复来自',
  };
  if (locale === 'es') return { ...en, visitor: 'Visitante', online: 'Disponible', friends: 'Mis amigos', virtual: '4 amigos ficticios de IA', send: 'Enviar', cancel: 'Cancelar', retry: 'Reintentar', input: 'Escribe un mensaje', placeholder: 'Hola…', back: 'Amigos', clear: 'Nueva conversación', clearConfirm: '¿Borrar esta conversación? No se puede deshacer.', note: 'Personajes de IA · Los mensajes se envían a la comunidad de AI Horde. El historial permanece en esta pestaña.', welcome: 'Una ventana al internet de antes.', subtitle: 'Elige un amigo y charlemos.', hint: 'Enter: enviar · Mayús + Enter: nueva línea' };
  if (locale === 'fr') return { ...en, visitor: 'Visiteur', online: 'Disponible', friends: 'Mes amis', virtual: '4 amis fictifs IA', send: 'Envoyer', cancel: 'Annuler', retry: 'Réessayer', input: 'Écrire un message', placeholder: 'Salut…', back: 'Amis', clear: 'Nouvelle conversation', clearConfirm: 'Effacer cette conversation ? Cette action est irréversible.', note: 'Personnages IA · Les messages sont envoyés à la communauté AI Horde. L’historique reste dans cet onglet.', welcome: 'Une petite fenêtre sur l’internet d’autrefois.', subtitle: 'Choisissez un ami. Prenez votre temps.', hint: 'Entrée : envoyer · Maj + Entrée : nouvelle ligne' };
  return en;
}
