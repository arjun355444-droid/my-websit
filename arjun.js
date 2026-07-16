/* =========================================================
   Auzaar — 100+ Tools
   Sab kuch client-side JS mein. Do bade hisse:
   1) Helpers
   2) Tool definitions (TOOLS array)
   3) Rendering / drawer / search engine
   ========================================================= */

/* ---------------- 1) HELPERS ---------------- */

function escapeHtml(str){
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function formatNum(n, maxDecimals = 6){
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  if (Math.abs(n) >= 1e12 || (Math.abs(n) < 1e-9 && n !== 0)) return n.toExponential(4);
  let s = n.toFixed(maxDecimals);
  s = s.replace(/(\.\d*?)0+$/,'$1').replace(/\.$/,'');
  return s;
}

function pad(n, len=2){ return String(n).padStart(len,'0'); }

function randInt(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; }

function pickRandom(arr){ return arr[randInt(0, arr.length-1)]; }

function shuffle(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function outBig(value, label){
  return `<div class="big">${escapeHtml(value)}</div>${label ? `<div class="muted">${escapeHtml(label)}</div>` : ''}`;
}

function outTable(rows){
  return `<table>${rows.map(r => `<tr><td>${escapeHtml(r[0])}</td><td><b>${escapeHtml(r[1])}</b></td></tr>`).join('')}</table>`;
}

function safeMathEval(expr){
  if (!/^[0-9+\-*/().\s%^]*$/.test(expr)) throw new Error('Sirf number aur + - * / ( ) % ^ allowed hain');
  const jsExpr = expr.replace(/\^/g, '**');
  // eslint-disable-next-line no-new-func
  const val = Function(`"use strict"; return (${jsExpr || '0'});`)();
  if (typeof val !== 'number' || !isFinite(val)) throw new Error('Result number nahi bana — expression check karein');
  return val;
}

function gcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){ [a,b]=[b, a%b]; } return a; }
function lcm(a,b){ return Math.abs(a*b) / (gcd(a,b) || 1); }

function hexToRgb(hex){
  hex = hex.replace('#','').trim();
  if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) throw new Error('Sahi HEX color dein, jaise #E3A857');
  const num = parseInt(hex,16);
  return { r:(num>>16)&255, g:(num>>8)&255, b:num&255 };
}
function rgbToHex(r,g,b){
  return '#' + [r,g,b].map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}
function rgbToHsl(r,g,b){
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h,s,l=(max+min)/2;
  if(max===min){ h=s=0; }
  else{
    const d=max-min;
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h=(g-b)/d+(g<b?6:0); break;
      case g: h=(b-r)/d+2; break;
      default: h=(r-g)/d+4;
    }
    h/=6;
  }
  return { h: Math.round(h*360), s: Math.round(s*100), l: Math.round(l*100) };
}
function hslToRgb(h,s,l){
  h/=360; s/=100; l/=100;
  let r,g,b;
  if(s===0){ r=g=b=l; }
  else{
    const hue2rgb=(p,q,t)=>{
      if(t<0) t+=1; if(t>1) t-=1;
      if(t<1/6) return p+(q-p)*6*t;
      if(t<1/2) return q;
      if(t<2/3) return p+(q-p)*(2/3-t)*6;
      return p;
    };
    const q = l<0.5 ? l*(1+s) : l+s-l*s;
    const p = 2*l-q;
    r=hue2rgb(p,q,h+1/3); g=hue2rgb(p,q,h); b=hue2rgb(p,q,h-1/3);
  }
  return { r:Math.round(r*255), g:Math.round(g*255), b:Math.round(b*255) };
}

function formatBytes(bytes){
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1)+' KB';
  return (bytes/1024/1024).toFixed(2)+' MB';
}

function readFileAsDataURL(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('File padhne mein dikkat aayi'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load nahi ho paayi'));
    img.src = src;
  });
}

async function imagesToPdf(fileList){
  if (!fileList || !fileList.length) throw new Error('Pehle kam se kam ek image select karein');
  if (!window.jspdf) throw new Error('PDF library load nahi ho paayi — internet connection check karein');
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:'mm', format:'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  for (let i=0; i<fileList.length; i++){
    const file = fileList[i];
    const dataUrl = await readFileAsDataURL(file);
    const img = await loadImage(dataUrl);
    const maxW = pageW - margin*2, maxH = pageH - margin*2;
    const ratio = Math.min(maxW/img.width, maxH/img.height, 1) || Math.min(maxW/img.width, maxH/img.height);
    const w = img.width*ratio, h = img.height*ratio;
    const x = (pageW-w)/2, y = (pageH-h)/2;
    if (i>0) doc.addPage();
    const format = (file.type||'').includes('png') ? 'PNG' : 'JPEG';
    doc.addImage(dataUrl, format, x, y, w, h);
  }
  doc.save('converted-images.pdf');
  return fileList.length;
}

/* ---------------- 2) TOOL DEFINITIONS ---------------- */

const TOOLS = [];
function addTool(t){ TOOLS.push(t); }

/* ===== CATEGORY: Text ===== */

addTool({ id:'text-analyzer', name:'Word & Character Counter', cat:'Text', icon:'📝',
  desc:'Words, characters, sentences, paragraphs ginta hai',
  fields:[{id:'txt', type:'textarea', label:'Text', placeholder:'Yahan apna text paste karein...'}],
  compute:(v)=>{
    const txt = v.txt || '';
    const words = txt.trim() ? txt.trim().split(/\s+/).length : 0;
    const chars = txt.length;
    const charsNoSpace = txt.replace(/\s/g,'').length;
    const sentences = (txt.match(/[.!?]+/g) || []).length;
    const paragraphs = txt.split(/\n\s*\n/).filter(p=>p.trim()).length;
    return outTable([['Words', words],['Characters', chars],['Characters (no space)', charsNoSpace],['Sentences', sentences],['Paragraphs', paragraphs || (txt.trim()?1:0)]]);
  }});

addTool({ id:'case-converter', name:'Case Converter', cat:'Text', icon:'🔠',
  desc:'UPPER, lower, Title, Sentence case mein badlein',
  fields:[
    {id:'txt', type:'textarea', label:'Text'},
    {id:'mode', type:'select', label:'Case', options:['UPPERCASE','lowercase','Title Case','Sentence case','tOGGLE cASE']}
  ],
  compute:(v)=>{
    const t = v.txt || '';
    let out = t;
    if (v.mode === 'UPPERCASE') out = t.toUpperCase();
    else if (v.mode === 'lowercase') out = t.toLowerCase();
    else if (v.mode === 'Title Case') out = t.replace(/\w\S*/g, w => w[0].toUpperCase()+w.slice(1).toLowerCase());
    else if (v.mode === 'Sentence case') out = t.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase());
    else if (v.mode === 'tOGGLE cASE') out = [...t].map(c => c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()).join('');
    return `<div>${escapeHtml(out)}</div>`;
  }});

addTool({ id:'reverse-text', name:'Reverse Text', cat:'Text', icon:'🔁', desc:'Text ko ulta karein',
  fields:[{id:'txt', type:'textarea', label:'Text'}],
  compute:(v)=> `<div>${escapeHtml([...(v.txt||'')].reverse().join(''))}</div>` });

addTool({ id:'remove-extra-spaces', name:'Remove Extra Spaces', cat:'Text', icon:'🧹', desc:'Extra spaces/tabs hata dein',
  fields:[{id:'txt', type:'textarea', label:'Text'}],
  compute:(v)=> `<div>${escapeHtml((v.txt||'').replace(/[ \t]+/g,' ').split('\n').map(l=>l.trim()).join('\n').trim())}</div>` });

addTool({ id:'remove-line-breaks', name:'Remove Line Breaks', cat:'Text', icon:'➖', desc:'Line breaks hata kar ek line banayein',
  fields:[{id:'txt', type:'textarea', label:'Text'}],
  compute:(v)=> `<div>${escapeHtml((v.txt||'').replace(/\r?\n+/g,' ').trim())}</div>` });

addTool({ id:'find-replace', name:'Find & Replace', cat:'Text', icon:'🔍', desc:'Text mein find karke replace karein',
  fields:[
    {id:'txt', type:'textarea', label:'Text'},
    {id:'find', type:'text', label:'Dhoondein (find)'},
    {id:'replace', type:'text', label:'Badlein (replace)'}
  ],
  compute:(v)=>{
    if (!v.find) return `<div>${escapeHtml(v.txt||'')}</div>`;
    const out = (v.txt||'').split(v.find).join(v.replace||'');
    return `<div>${escapeHtml(out)}</div>`;
  }});

addTool({ id:'text-to-slug', name:'Text to Slug', cat:'Text', icon:'🔗', desc:'URL-friendly slug banayein',
  fields:[{id:'txt', type:'text', label:'Text'}],
  compute:(v)=>{
    const slug = (v.txt||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
    return `<div>${escapeHtml(slug)}</div>`;
  }});

addTool({ id:'remove-duplicate-lines', name:'Duplicate Line Remover', cat:'Text', icon:'📋', desc:'Repeat hui lines hata dein',
  fields:[{id:'txt', type:'textarea', label:'Text (har line alag)'}],
  compute:(v)=>{
    const lines = (v.txt||'').split('\n');
    const seen = new Set(); const out = [];
    lines.forEach(l => { if(!seen.has(l)){ seen.add(l); out.push(l); } });
    return `<div>${escapeHtml(out.join('\n'))}</div>`;
  }});

addTool({ id:'sort-lines', name:'Sort Lines', cat:'Text', icon:'🔡', desc:'Lines ko alphabetically sort karein',
  fields:[
    {id:'txt', type:'textarea', label:'Text (har line alag)'},
    {id:'order', type:'select', label:'Order', options:['A → Z','Z → A']}
  ],
  compute:(v)=>{
    let lines = (v.txt||'').split('\n').filter(l=>l.length);
    lines.sort((a,b)=> a.localeCompare(b));
    if (v.order === 'Z → A') lines.reverse();
    return `<div>${escapeHtml(lines.join('\n'))}</div>`;
  }});

addTool({ id:'palindrome-checker', name:'Palindrome Checker', cat:'Text', icon:'🔄', desc:'Check karein text palindrome hai ya nahi',
  fields:[{id:'txt', type:'text', label:'Text'}],
  compute:(v)=>{
    const clean = (v.txt||'').toLowerCase().replace(/[^a-z0-9]/g,'');
    const isPal = clean.length>0 && clean === [...clean].reverse().join('');
    return outBig(isPal ? 'Haan, palindrome hai ✅' : 'Nahi, palindrome nahi hai ❌');
  }});

addTool({ id:'text-to-binary', name:'Text to Binary', cat:'Text', icon:'0️⃣', desc:'Text ko binary code mein badlein',
  fields:[{id:'txt', type:'text', label:'Text'}],
  compute:(v)=> `<div>${escapeHtml([...(v.txt||'')].map(c=>c.charCodeAt(0).toString(2).padStart(8,'0')).join(' '))}</div>` });

addTool({ id:'binary-to-text', name:'Binary to Text', cat:'Text', icon:'1️⃣', desc:'Binary code ko text mein badlein',
  fields:[{id:'bin', type:'textarea', label:'Binary (space se alag, jaise 01001000)'}],
  compute:(v)=>{
    const parts = (v.bin||'').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    const out = parts.map(p=>{
      if(!/^[01]+$/.test(p)) throw new Error('Sirf 0 aur 1 allowed hain, space se alag karke');
      return String.fromCharCode(parseInt(p,2));
    }).join('');
    return `<div>${escapeHtml(out)}</div>`;
  }});

const MORSE_MAP = {A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..','0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....','6':'-....','7':'--...','8':'---..','9':'----.'};
const MORSE_REV = Object.fromEntries(Object.entries(MORSE_MAP).map(([k,v])=>[v,k]));

addTool({ id:'text-to-morse', name:'Text to Morse Code', cat:'Text', icon:'📡', desc:'Text ko morse code mein badlein',
  fields:[{id:'txt', type:'text', label:'Text'}],
  compute:(v)=>{
    const out = (v.txt||'').toUpperCase().split('').map(c => c===' ' ? '/' : (MORSE_MAP[c] || '')).filter(Boolean).join(' ');
    return `<div>${escapeHtml(out)}</div>`;
  }});

addTool({ id:'morse-to-text', name:'Morse Code to Text', cat:'Text', icon:'📶', desc:'Morse code ko text mein badlein',
  fields:[{id:'morse', type:'text', label:'Morse code (jaise .... .. -- .- -.--)'}],
  compute:(v)=>{
    const out = (v.morse||'').trim().split(' ').map(c => c==='/' ? ' ' : (MORSE_REV[c] || '')).join('');
    return `<div>${escapeHtml(out)}</div>`;
  }});

/* ===== CATEGORY: Numbers ===== */

addTool({ id:'base-converter', name:'Number Base Converter', cat:'Numbers', icon:'🔢', desc:'Binary, Octal, Decimal, Hex mein convert karein',
  fields:[
    {id:'value', type:'text', label:'Value'},
    {id:'fromBase', type:'select', label:'From base', options:['2 (Binary)','8 (Octal)','10 (Decimal)','16 (Hex)']},
    {id:'toBase', type:'select', label:'To base', options:['2 (Binary)','8 (Octal)','10 (Decimal)','16 (Hex)']}
  ],
  compute:(v)=>{
    const getBase = s => parseInt(s);
    const from = getBase(v.fromBase), to = getBase(v.toBase);
    const n = parseInt((v.value||'0').trim(), from);
    if (isNaN(n)) throw new Error('Value is base ke hisaab se sahi nahi hai');
    return outBig(n.toString(to).toUpperCase(), `Base ${from} → Base ${to}`);
  }});

addTool({ id:'ascii-converter', name:'Text ⇄ ASCII Codes', cat:'Numbers', icon:'🔤', desc:'Text ko ASCII code mein ya wapas badlein',
  fields:[
    {id:'txt', type:'text', label:'Input'},
    {id:'direction', type:'select', label:'Direction', options:['Text → ASCII','ASCII → Text']}
  ],
  compute:(v)=>{
    if (v.direction === 'Text → ASCII'){
      return `<div>${escapeHtml([...(v.txt||'')].map(c=>c.charCodeAt(0)).join(' '))}</div>`;
    }
    const codes = (v.txt||'').trim().split(/\s+/).filter(Boolean).map(Number);
    return `<div>${escapeHtml(codes.map(c=>String.fromCharCode(c)).join(''))}</div>`;
  }});

addTool({ id:'roman-numeral', name:'Roman Numeral Converter', cat:'Numbers', icon:'🏛️', desc:'Number ⇄ Roman numeral',
  fields:[
    {id:'value', type:'text', label:'Value'},
    {id:'direction', type:'select', label:'Direction', options:['Number → Roman','Roman → Number']}
  ],
  compute:(v)=>{
    const table = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
    if (v.direction === 'Number → Roman'){
      let n = parseInt(v.value);
      if (!n || n<=0 || n>3999) throw new Error('1 se 3999 ke beech number dein');
      let out='';
      for (const [val,sym] of table){ while(n>=val){ out+=sym; n-=val; } }
      return outBig(out);
    } else {
      const s = (v.value||'').toUpperCase().trim();
      if (!/^[MDCLXVI]+$/.test(s)) throw new Error('Sahi Roman numeral dein');
      let i=0, n=0;
      for (const [val,sym] of table){
        while (s.startsWith(sym, i)){ n+=val; i+=sym.length; }
      }
      if (i !== s.length) throw new Error('Roman numeral padh nahi paya');
      return outBig(n);
    }
  }});

addTool({ id:'number-to-words', name:'Number to Words', cat:'Numbers', icon:'🔠', desc:'Number ko English shabdon mein likhein',
  fields:[{id:'num', type:'number', label:'Number'}],
  compute:(v)=>{
    const num = Math.trunc(v.num);
    if (isNaN(num)) throw new Error('Sahi number dein');
    if (num === 0) return outBig('Zero');
    const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    function chunk(n){
      let s='';
      if (n>=100){ s+= ones[Math.floor(n/100)]+' Hundred '; n%=100; }
      if (n>=20){ s+= tens[Math.floor(n/10)]+' '; n%=10; }
      if (n>0) s+= ones[n]+' ';
      return s.trim();
    }
    let n = Math.abs(num);
    const groups = [[1e9,'Billion'],[1e6,'Million'],[1e3,'Thousand'],[1,'']];
    let words = '';
    for (const [val,label] of groups){
      if (n >= val){
        const g = Math.floor(n/val);
        words += chunk(g) + (label?' '+label:'') + ' ';
        n %= val;
      }
    }
    return outBig((num<0?'Minus ':'') + words.trim());
  }});

/* ===== CATEGORY: Converters ===== */

function makeConverter(id, name, icon, desc, units){
  addTool({ id, name, cat:'Converters', icon, desc,
    fields:[
      {id:'value', type:'number', label:'Value', default:1},
      {id:'fromUnit', type:'select', label:'Se (from)', options:Object.keys(units)},
      {id:'toUnit', type:'select', label:'Mein (to)', options:Object.keys(units)}
    ],
    compute:(v)=>{
      const val = v.value;
      if (isNaN(val)) throw new Error('Sahi number dein');
      const base = val * units[v.fromUnit];
      const result = base / units[v.toUnit];
      return outBig(formatNum(result), `${v.value} ${v.fromUnit} = ${formatNum(result)} ${v.toUnit}`);
    }});
}

makeConverter('length-converter','Length Converter','📏','Meter, km, mile, inch, waghera', {
  'Meter':1,'Kilometer':1000,'Centimeter':0.01,'Millimeter':0.001,'Mile':1609.344,'Yard':0.9144,'Foot':0.3048,'Inch':0.0254
});
makeConverter('weight-converter','Weight Converter','⚖️','Kg, gram, pound, ounce', {
  'Kilogram':1,'Gram':0.001,'Milligram':0.000001,'Pound':0.45359237,'Ounce':0.0283495231,'Tonne':1000
});
makeConverter('speed-converter','Speed Converter','🚀','m/s, km/h, mph, knot', {
  'Meter/sec':1,'Km/hour':0.277778,'Miles/hour':0.44704,'Knot':0.514444
});
makeConverter('area-converter','Area Converter','🗺️','Sq meter, acre, hectare, waghera', {
  'Sq Meter':1,'Sq Kilometer':1e6,'Sq Mile':2.59e6,'Acre':4046.8564224,'Hectare':10000,'Sq Foot':0.09290304
});
makeConverter('volume-converter','Volume Converter','🧪','Liter, ml, gallon, cup', {
  'Liter':1,'Milliliter':0.001,'Gallon (US)':3.785411784,'Cup':0.2365882365,'Cubic Meter':1000
});
makeConverter('time-converter','Time Converter','⏱️','Second, minute, hour, din, saal', {
  'Second':1,'Millisecond':0.001,'Minute':60,'Hour':3600,'Day':86400,'Week':604800,'Year':31536000
});
makeConverter('data-converter','Data Storage Converter','💾','Bit, byte, KB, MB, GB, TB', {
  'Bit':0.125,'Byte':1,'Kilobyte':1024,'Megabyte':1048576,'Gigabyte':1073741824,'Terabyte':1099511627776
});
makeConverter('pressure-converter','Pressure Converter','🌡️','Pascal, bar, atm, psi', {
  'Pascal':1,'Bar':100000,'Atmosphere':101325,'PSI':6894.75729,'Torr':133.322
});
makeConverter('energy-converter','Energy Converter','⚡','Joule, calorie, kWh', {
  'Joule':1,'Calorie':4.184,'Kilojoule':1000,'Kilowatt-hour':3600000
});

addTool({ id:'temperature-converter', name:'Temperature Converter', cat:'Converters', icon:'🌡️', desc:'Celsius, Fahrenheit, Kelvin',
  fields:[
    {id:'value', type:'number', label:'Value', default:0},
    {id:'fromUnit', type:'select', label:'Se (from)', options:['Celsius','Fahrenheit','Kelvin']},
    {id:'toUnit', type:'select', label:'Mein (to)', options:['Celsius','Fahrenheit','Kelvin']}
  ],
  compute:(v)=>{
    let c;
    if (v.fromUnit==='Celsius') c = v.value;
    else if (v.fromUnit==='Fahrenheit') c = (v.value-32) * 5/9;
    else c = v.value - 273.15;
    let out;
    if (v.toUnit==='Celsius') out = c;
    else if (v.toUnit==='Fahrenheit') out = c*9/5+32;
    else out = c + 273.15;
    return outBig(formatNum(out) + '°' + v.toUnit[0], `${v.value}° ${v.fromUnit} = ${formatNum(out)}° ${v.toUnit}`);
  }});

/* ===== CATEGORY: Calculators ===== */

addTool({ id:'basic-calculator', name:'Basic Calculator', cat:'Calculators', icon:'🧮', desc:'+ - * / ( ) % ^ ke saath calculate karein',
  fields:[{id:'expr', type:'text', label:'Expression', placeholder:'jaise: (12+8)*3/2'}],
  compute:(v)=> outBig(formatNum(safeMathEval(v.expr||'0'))) });

addTool({ id:'bmi-calculator', name:'BMI Calculator', cat:'Calculators', icon:'⚕️', desc:'Body Mass Index nikalein',
  fields:[
    {id:'weight', type:'number', label:'Weight (kg)', default:60},
    {id:'height', type:'number', label:'Height (cm)', default:170}
  ],
  compute:(v)=>{
    const h = v.height/100;
    const bmi = v.weight / (h*h);
    let cat = 'Normal';
    if (bmi<18.5) cat='Underweight';
    else if (bmi>=25 && bmi<30) cat='Overweight';
    else if (bmi>=30) cat='Obese';
    return outBig(formatNum(bmi,1), 'BMI Category: ' + cat);
  }});

addTool({ id:'bmr-calculator', name:'BMR / TDEE Calculator', cat:'Calculators', icon:'🔥', desc:'Roz ki calorie zaroorat nikalein',
  fields:[
    {id:'gender', type:'select', label:'Gender', options:['Male','Female']},
    {id:'weight', type:'number', label:'Weight (kg)', default:60},
    {id:'height', type:'number', label:'Height (cm)', default:170},
    {id:'age', type:'number', label:'Age', default:25},
    {id:'activity', type:'select', label:'Activity level', options:['Baithe rehna (Sedentary)','Halka active (Light)','Medium active (Moderate)','Bahut active (Active)','Athlete level']}
  ],
  compute:(v)=>{
    let bmr = 10*v.weight + 6.25*v.height - 5*v.age + (v.gender==='Male' ? 5 : -161);
    const mult = {'Baithe rehna (Sedentary)':1.2,'Halka active (Light)':1.375,'Medium active (Moderate)':1.55,'Bahut active (Active)':1.725,'Athlete level':1.9}[v.activity];
    return outTable([['BMR (aaram mein)', Math.round(bmr) + ' kcal/din'],['TDEE (activity ke saath)', Math.round(bmr*mult) + ' kcal/din']]);
  }});

addTool({ id:'age-calculator', name:'Age Calculator', cat:'Calculators', icon:'🎂', desc:'Janam tareekh se exact age nikalein',
  fields:[{id:'dob', type:'date', label:'Janam tareekh (DOB)'}],
  compute:(v)=>{
    if(!v.dob) throw new Error('Date choose karein');
    const dob = new Date(v.dob), today = new Date();
    if (dob > today) throw new Error('Yeh to future date hai');
    let years = today.getFullYear()-dob.getFullYear();
    let months = today.getMonth()-dob.getMonth();
    let days = today.getDate()-dob.getDate();
    if (days<0){ months--; days += new Date(today.getFullYear(), today.getMonth(), 0).getDate(); }
    if (months<0){ years--; months+=12; }
    return outBig(`${years} saal, ${months} mahine, ${days} din`);
  }});

addTool({ id:'percentage-calculator', name:'Percentage Calculator', cat:'Calculators', icon:'💯', desc:'X ka Y% kitna hota hai',
  fields:[{id:'percent', type:'number', label:'Percent (%)', default:10},{id:'value', type:'number', label:'Of value', default:100}],
  compute:(v)=> outBig(formatNum(v.percent/100*v.value), `${v.percent}% of ${v.value}`) });

addTool({ id:'percentage-change', name:'Percentage Change Calculator', cat:'Calculators', icon:'📈', desc:'Do values ke beech % badlaav',
  fields:[{id:'oldVal', type:'number', label:'Purani value', default:100},{id:'newVal', type:'number', label:'Nayi value', default:120}],
  compute:(v)=>{
    if (v.oldVal===0) throw new Error('Purani value zero nahi ho sakti');
    const change = (v.newVal-v.oldVal)/Math.abs(v.oldVal)*100;
    return outBig((change>=0?'+':'')+formatNum(change,2)+'%', change>=0 ? 'Badha hai' : 'Ghata hai');
  }});

addTool({ id:'simple-interest', name:'Simple Interest Calculator', cat:'Calculators', icon:'🏦', desc:'SI aur total amount nikalein',
  fields:[{id:'principal', type:'number', label:'Principal (₹)', default:10000},{id:'rate', type:'number', label:'Rate (% per saal)', default:8},{id:'time', type:'number', label:'Time (saal)', default:2}],
  compute:(v)=>{
    const si = (v.principal*v.rate*v.time)/100;
    return outTable([['Simple Interest', '₹'+formatNum(si,2)],['Total Amount', '₹'+formatNum(v.principal+si,2)]]);
  }});

addTool({ id:'compound-interest', name:'Compound Interest Calculator', cat:'Calculators', icon:'📊', desc:'CI aur total amount nikalein',
  fields:[
    {id:'principal', type:'number', label:'Principal (₹)', default:10000},
    {id:'rate', type:'number', label:'Rate (% per saal)', default:8},
    {id:'time', type:'number', label:'Time (saal)', default:2},
    {id:'freq', type:'select', label:'Compounding', options:['Saalana (Yearly)','Chhamahi (Half-yearly)','Trimahi (Quarterly)','Mahina (Monthly)']}
  ],
  compute:(v)=>{
    const n = {'Saalana (Yearly)':1,'Chhamahi (Half-yearly)':2,'Trimahi (Quarterly)':4,'Mahina (Monthly)':12}[v.freq];
    const amount = v.principal * Math.pow(1 + (v.rate/100)/n, n*v.time);
    return outTable([['Total Amount', '₹'+formatNum(amount,2)],['Compound Interest', '₹'+formatNum(amount-v.principal,2)]]);
  }});

addTool({ id:'discount-calculator', name:'Discount Calculator', cat:'Calculators', icon:'🏷️', desc:'Discount ke baad final price',
  fields:[{id:'price', type:'number', label:'Original Price (₹)', default:1000},{id:'discount', type:'number', label:'Discount (%)', default:20}],
  compute:(v)=>{
    const saved = v.price*v.discount/100;
    return outTable([['Bache paise', '₹'+formatNum(saved,2)],['Final Price', '₹'+formatNum(v.price-saved,2)]]);
  }});

addTool({ id:'tip-calculator', name:'Tip Calculator', cat:'Calculators', icon:'🍽️', desc:'Bill split aur tip nikalein',
  fields:[
    {id:'bill', type:'number', label:'Bill Amount (₹)', default:1000},
    {id:'tip', type:'number', label:'Tip (%)', default:10},
    {id:'people', type:'number', label:'Kitne log', default:1}
  ],
  compute:(v)=>{
    const tipAmt = v.bill*v.tip/100;
    const total = v.bill+tipAmt;
    return outTable([['Tip Amount', '₹'+formatNum(tipAmt,2)],['Total Bill', '₹'+formatNum(total,2)],['Per Person', '₹'+formatNum(total/Math.max(1,v.people),2)]]);
  }});

addTool({ id:'gst-calculator', name:'GST / Tax Calculator', cat:'Calculators', icon:'🧾', desc:'GST jodein ya nikalein',
  fields:[
    {id:'amount', type:'number', label:'Amount (₹)', default:1000},
    {id:'gst', type:'number', label:'GST (%)', default:18},
    {id:'mode', type:'select', label:'Mode', options:['GST Add karein (amount GST-exclusive hai)','GST Nikalein (amount GST-inclusive hai)']}
  ],
  compute:(v)=>{
    if (v.mode.startsWith('GST Add')){
      const gstAmt = v.amount*v.gst/100;
      return outTable([['GST Amount', '₹'+formatNum(gstAmt,2)],['Total (with GST)', '₹'+formatNum(v.amount+gstAmt,2)]]);
    } else {
      const base = v.amount/(1+v.gst/100);
      return outTable([['Base Amount', '₹'+formatNum(base,2)],['GST Amount', '₹'+formatNum(v.amount-base,2)]]);
    }
  }});

addTool({ id:'loan-emi', name:'Loan EMI Calculator', cat:'Calculators', icon:'🏠', desc:'Monthly EMI nikalein',
  fields:[
    {id:'principal', type:'number', label:'Loan Amount (₹)', default:500000},
    {id:'rate', type:'number', label:'Annual Interest Rate (%)', default:9},
    {id:'months', type:'number', label:'Tenure (mahine)', default:60}
  ],
  compute:(v)=>{
    const r = v.rate/12/100;
    const emi = r===0 ? v.principal/v.months : v.principal*r*Math.pow(1+r,v.months)/(Math.pow(1+r,v.months)-1);
    const total = emi*v.months;
    return outTable([['Monthly EMI', '₹'+formatNum(emi,2)],['Total Payment', '₹'+formatNum(total,2)],['Total Interest', '₹'+formatNum(total-v.principal,2)]]);
  }});

addTool({ id:'average-calculator', name:'Average (Mean) Calculator', cat:'Calculators', icon:'➗', desc:'Numbers ka average, sum, count',
  fields:[{id:'nums', type:'textarea', label:'Numbers (comma ya space se alag)', placeholder:'jaise: 4, 8, 15, 16, 23, 42'}],
  compute:(v)=>{
    const nums = (v.nums||'').split(/[,\s]+/).filter(Boolean).map(Number);
    if (!nums.length || nums.some(isNaN)) throw new Error('Sahi numbers dein, comma/space se alag');
    const sum = nums.reduce((a,b)=>a+b,0);
    return outTable([['Count', nums.length],['Sum', formatNum(sum)],['Average', formatNum(sum/nums.length)],['Min', formatNum(Math.min(...nums))],['Max', formatNum(Math.max(...nums))]]);
  }});

addTool({ id:'median-calculator', name:'Median & Mode Calculator', cat:'Calculators', icon:'📐', desc:'Numbers ka median aur mode',
  fields:[{id:'nums', type:'textarea', label:'Numbers (comma ya space se alag)'}],
  compute:(v)=>{
    const nums = (v.nums||'').split(/[,\s]+/).filter(Boolean).map(Number);
    if (!nums.length || nums.some(isNaN)) throw new Error('Sahi numbers dein');
    const sorted = [...nums].sort((a,b)=>a-b);
    const mid = Math.floor(sorted.length/2);
    const median = sorted.length%2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
    const freq = {}; nums.forEach(n=>freq[n]=(freq[n]||0)+1);
    const maxFreq = Math.max(...Object.values(freq));
    const modes = Object.keys(freq).filter(k=>freq[k]===maxFreq).map(Number);
    return outTable([['Median', formatNum(median)],['Mode', maxFreq>1 ? modes.join(', ') : 'Koi repeat nahi']]);
  }});

addTool({ id:'gcd-calculator', name:'GCD Calculator', cat:'Calculators', icon:'🔗', desc:'HCF/GCD nikalein',
  fields:[{id:'a', type:'number', label:'Number A', default:12},{id:'b', type:'number', label:'Number B', default:18}],
  compute:(v)=> outBig(gcd(Math.trunc(v.a), Math.trunc(v.b))) });

addTool({ id:'lcm-calculator', name:'LCM Calculator', cat:'Calculators', icon:'🔀', desc:'LCM nikalein',
  fields:[{id:'a', type:'number', label:'Number A', default:4},{id:'b', type:'number', label:'Number B', default:6}],
  compute:(v)=> outBig(lcm(Math.trunc(v.a), Math.trunc(v.b))) });

addTool({ id:'factorial-calculator', name:'Factorial Calculator', cat:'Calculators', icon:'❗', desc:'n! nikalein (bade numbers ke liye bhi)',
  fields:[{id:'n', type:'number', label:'n', default:10}],
  compute:(v)=>{
    let n = Math.trunc(v.n);
    if (n<0 || n>1000) throw new Error('0 se 1000 ke beech number dein');
    let result = BigInt(1);
    for (let i=2;i<=n;i++) result *= BigInt(i);
    return outBig(result.toString());
  }});

addTool({ id:'prime-checker', name:'Prime Number Checker', cat:'Calculators', icon:'🔎', desc:'Number prime hai ya nahi check karein',
  fields:[{id:'n', type:'number', label:'Number', default:17}],
  compute:(v)=>{
    let n = Math.trunc(v.n);
    if (n<2) return outBig('Prime nahi hai ❌');
    for (let i=2;i*i<=n;i++){ if(n%i===0) return outBig('Prime nahi hai ❌', `Divisible by ${i}`); }
    return outBig('Prime hai ✅');
  }});

addTool({ id:'fibonacci-generator', name:'Fibonacci Generator', cat:'Calculators', icon:'🐚', desc:'Fibonacci series banayein',
  fields:[{id:'count', type:'number', label:'Kitne terms', default:15}],
  compute:(v)=>{
    let count = Math.min(1000, Math.max(1, Math.trunc(v.count)));
    let a=0n,b=1n, out=[];
    for (let i=0;i<count;i++){ out.push(a.toString()); [a,b]=[b,a+b]; }
    return `<div>${out.join(', ')}</div>`;
  }});

addTool({ id:'sqrt-calculator', name:'Square/Nth Root Calculator', cat:'Calculators', icon:'√', desc:'Kisi bhi number ka nth root',
  fields:[{id:'n', type:'number', label:'Number', default:144},{id:'root', type:'number', label:'Root (default 2 = square root)', default:2}],
  compute:(v)=> outBig(formatNum(Math.pow(v.n, 1/v.root))) });

addTool({ id:'quadratic-solver', name:'Quadratic Equation Solver', cat:'Calculators', icon:'📉', desc:'ax² + bx + c = 0 ka hal',
  fields:[{id:'a', type:'number', label:'a', default:1},{id:'b', type:'number', label:'b', default:-3},{id:'c', type:'number', label:'c', default:2}],
  compute:(v)=>{
    if (v.a===0) throw new Error('a zero nahi ho sakta (yeh linear equation ban jayega)');
    const disc = v.b*v.b - 4*v.a*v.c;
    if (disc>0){
      const x1 = (-v.b+Math.sqrt(disc))/(2*v.a), x2 = (-v.b-Math.sqrt(disc))/(2*v.a);
      return outTable([['x1', formatNum(x1)],['x2', formatNum(x2)]]);
    } else if (disc===0){
      return outBig(formatNum(-v.b/(2*v.a)), 'Ek hi real root hai');
    } else {
      const re = formatNum(-v.b/(2*v.a)), im = formatNum(Math.sqrt(-disc)/(2*v.a));
      return outTable([['x1', `${re} + ${im}i`],['x2', `${re} - ${im}i`]]);
    }
  }});

/* ===== CATEGORY: Geometry ===== */

addTool({ id:'circle-calc', name:'Circle Calculator', cat:'Geometry', icon:'⭕', desc:'Area, circumference, diameter',
  fields:[{id:'r', type:'number', label:'Radius', default:5}],
  compute:(v)=> outTable([['Area', formatNum(Math.PI*v.r*v.r)],['Circumference', formatNum(2*Math.PI*v.r)],['Diameter', formatNum(2*v.r)]]) });

addTool({ id:'square-calc', name:'Square Calculator', cat:'Geometry', icon:'⬛', desc:'Area, perimeter, diagonal',
  fields:[{id:'side', type:'number', label:'Side', default:4}],
  compute:(v)=> outTable([['Area', formatNum(v.side*v.side)],['Perimeter', formatNum(4*v.side)],['Diagonal', formatNum(v.side*Math.SQRT2)]]) });

addTool({ id:'rectangle-calc', name:'Rectangle Calculator', cat:'Geometry', icon:'▭', desc:'Area, perimeter, diagonal',
  fields:[{id:'l', type:'number', label:'Length', default:6},{id:'w', type:'number', label:'Width', default:4}],
  compute:(v)=> outTable([['Area', formatNum(v.l*v.w)],['Perimeter', formatNum(2*(v.l+v.w))],['Diagonal', formatNum(Math.sqrt(v.l*v.l+v.w*v.w))]]) });

addTool({ id:'triangle-bh', name:'Triangle Area (Base × Height)', cat:'Geometry', icon:'🔺', desc:'Base aur height se area',
  fields:[{id:'base', type:'number', label:'Base', default:6},{id:'height', type:'number', label:'Height', default:4}],
  compute:(v)=> outBig(formatNum(0.5*v.base*v.height)) });

addTool({ id:'triangle-heron', name:"Triangle Area (Heron's Formula)", cat:'Geometry', icon:'📐', desc:'Teeno sides se area',
  fields:[{id:'a', type:'number', label:'Side a', default:3},{id:'b', type:'number', label:'Side b', default:4},{id:'c', type:'number', label:'Side c', default:5}],
  compute:(v)=>{
    const {a,b,c} = v;
    if (a+b<=c || b+c<=a || a+c<=b) throw new Error('Yeh triangle valid nahi hai');
    const s = (a+b+c)/2;
    return outTable([['Area', formatNum(Math.sqrt(s*(s-a)*(s-b)*(s-c)))],['Perimeter', formatNum(a+b+c)]]);
  }});

addTool({ id:'sphere-calc', name:'Sphere Calculator', cat:'Geometry', icon:'🌐', desc:'Volume aur surface area',
  fields:[{id:'r', type:'number', label:'Radius', default:5}],
  compute:(v)=> outTable([['Volume', formatNum((4/3)*Math.PI*v.r**3)],['Surface Area', formatNum(4*Math.PI*v.r*v.r)]]) });

addTool({ id:'cube-calc', name:'Cube Calculator', cat:'Geometry', icon:'🧊', desc:'Volume, surface area, diagonal',
  fields:[{id:'side', type:'number', label:'Side', default:3}],
  compute:(v)=> outTable([['Volume', formatNum(v.side**3)],['Surface Area', formatNum(6*v.side*v.side)],['Diagonal', formatNum(v.side*Math.sqrt(3))]]) });

addTool({ id:'cylinder-calc', name:'Cylinder Calculator', cat:'Geometry', icon:'🥫', desc:'Volume aur surface area',
  fields:[{id:'r', type:'number', label:'Radius', default:3},{id:'h', type:'number', label:'Height', default:8}],
  compute:(v)=> outTable([['Volume', formatNum(Math.PI*v.r*v.r*v.h)],['Surface Area', formatNum(2*Math.PI*v.r*(v.r+v.h))]]) });

addTool({ id:'cone-calc', name:'Cone Calculator', cat:'Geometry', icon:'🍦', desc:'Volume, slant height, surface area',
  fields:[{id:'r', type:'number', label:'Radius', default:3},{id:'h', type:'number', label:'Height', default:6}],
  compute:(v)=>{
    const slant = Math.sqrt(v.r*v.r+v.h*v.h);
    return outTable([['Volume', formatNum((1/3)*Math.PI*v.r*v.r*v.h)],['Slant Height', formatNum(slant)],['Surface Area', formatNum(Math.PI*v.r*(v.r+slant))]]);
  }});

addTool({ id:'pythagoras-calc', name:'Pythagoras Theorem Calculator', cat:'Geometry', icon:'📏', desc:'Do legs se hypotenuse nikalein',
  fields:[{id:'a', type:'number', label:'Leg a', default:3},{id:'b', type:'number', label:'Leg b', default:4}],
  compute:(v)=> outBig(formatNum(Math.sqrt(v.a*v.a+v.b*v.b)), 'Hypotenuse (c)') });

/* ===== CATEGORY: Date & Time ===== */

addTool({ id:'date-difference', name:'Date Difference Calculator', cat:'Date & Time', icon:'📅', desc:'Do dates ke beech farak',
  fields:[{id:'date1', type:'date', label:'Pehli Date'},{id:'date2', type:'date', label:'Dusri Date'}],
  compute:(v)=>{
    if(!v.date1||!v.date2) throw new Error('Dono dates choose karein');
    const d1=new Date(v.date1), d2=new Date(v.date2);
    const diffDays = Math.round(Math.abs(d2-d1)/86400000);
    return outTable([['Din (Days)', diffDays],['Hafte (Weeks)', formatNum(diffDays/7,1)],['Mahine (approx)', formatNum(diffDays/30.44,1)],['Saal (approx)', formatNum(diffDays/365.25,2)]]);
  }});

addTool({ id:'day-of-week', name:'Day of the Week Finder', cat:'Date & Time', icon:'📆', desc:'Kisi date ka din pata karein',
  fields:[{id:'date', type:'date', label:'Date'}],
  compute:(v)=>{
    if(!v.date) throw new Error('Date choose karein');
    const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    return outBig(days[new Date(v.date).getUTCDay()]);
  }});

addTool({ id:'add-subtract-days', name:'Add/Subtract Days from Date', cat:'Date & Time', icon:'➕', desc:'Date mein din jodein ya ghatayein',
  fields:[
    {id:'date', type:'date', label:'Date'},
    {id:'days', type:'number', label:'Kitne din', default:30},
    {id:'op', type:'select', label:'Operation', options:['Jodein (Add)','Ghatayein (Subtract)']}
  ],
  compute:(v)=>{
    if(!v.date) throw new Error('Date choose karein');
    const d = new Date(v.date);
    d.setUTCDate(d.getUTCDate() + (v.op.startsWith('Jodein') ? v.days : -v.days));
    return outBig(d.toLocaleDateString('en-IN', {year:'numeric', month:'long', day:'numeric', timeZone:'UTC'}));
  }});

addTool({ id:'unix-timestamp', name:'Unix Timestamp Converter', cat:'Date & Time', icon:'⏲️', desc:'Date ⇄ Unix timestamp',
  fields:[
    {id:'direction', type:'select', label:'Direction', options:['Date → Unix','Unix → Date']},
    {id:'datetime', type:'text', label:'Date/Time (YYYY-MM-DD HH:MM:SS) ya Unix seconds', placeholder:'jaise: 2026-07-15 12:00:00 ya 1752571200'}
  ],
  compute:(v)=>{
    if (v.direction==='Date → Unix'){
      const t = new Date(v.datetime.replace(' ','T'));
      if (isNaN(t)) throw new Error('Date format sahi nahi hai');
      return outBig(Math.floor(t.getTime()/1000), 'Unix seconds');
    } else {
      const n = parseInt(v.datetime);
      if (isNaN(n)) throw new Error('Sahi unix number dein');
      return outBig(new Date(n*1000).toISOString().replace('T',' ').replace('Z',' UTC'));
    }
  }});

addTool({ id:'leap-year-checker', name:'Leap Year Checker', cat:'Date & Time', icon:'🐸', desc:'Saal leap year hai ya nahi',
  fields:[{id:'year', type:'number', label:'Year', default:2028}],
  compute:(v)=>{
    const y = Math.trunc(v.year);
    const isLeap = (y%4===0 && y%100!==0) || y%400===0;
    return outBig(isLeap ? 'Haan, Leap Year hai ✅' : 'Nahi, Leap Year nahi hai ❌');
  }});

addTool({ id:'days-in-month', name:'Days in Month Finder', cat:'Date & Time', icon:'🗓️', desc:'Mahine mein kitne din hain',
  fields:[
    {id:'month', type:'select', label:'Month', options:['January','February','March','April','May','June','July','August','September','October','November','December']},
    {id:'year', type:'number', label:'Year', default:2026}
  ],
  compute:(v)=>{
    const idx = ['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(v.month);
    const days = new Date(v.year, idx+1, 0).getDate();
    return outBig(days + ' din');
  }});

addTool({ id:'age-in-units', name:'Age in Days/Hours/Minutes', cat:'Date & Time', icon:'⏳', desc:'Aap ab tak kitne din/ghante jee chuke hain',
  fields:[{id:'dob', type:'date', label:'Janam tareekh'}],
  compute:(v)=>{
    if(!v.dob) throw new Error('Date choose karein');
    const ms = Date.now() - new Date(v.dob).getTime();
    if (ms<0) throw new Error('Yeh to future date hai');
    return outTable([
      ['Din (Days)', Math.floor(ms/86400000).toLocaleString('en-IN')],
      ['Ghante (Hours)', Math.floor(ms/3600000).toLocaleString('en-IN')],
      ['Minute', Math.floor(ms/60000).toLocaleString('en-IN')],
      ['Second', Math.floor(ms/1000).toLocaleString('en-IN')]
    ]);
  }});

addTool({ id:'countdown-timer', name:'Countdown Timer', cat:'Date & Time', icon:'⏳', desc:'Kisi target date/time tak countdown', custom:true,
  render:(el)=>{
    el.innerHTML = `
      <div class="field"><label>Target Date & Time</label><input type="datetime-local" id="cd-target"></div>
      <div class="output" id="cd-out"></div>
      <div class="btn-row"><button class="btn" id="cd-start">Start</button><button class="btn secondary" id="cd-stop">Stop</button></div>`;
    let timer = null;
    const out = el.querySelector('#cd-out');
    const tick = () => {
      const target = new Date(el.querySelector('#cd-target').value);
      const diff = target - new Date();
      if (isNaN(target) ) { out.innerHTML = 'Pehle target date/time choose karein'; return; }
      if (diff<=0){ out.innerHTML = outBig('Time ho gaya! 🎉'); clearInterval(timer); return; }
      const d = Math.floor(diff/86400000), h = Math.floor(diff/3600000)%24, m = Math.floor(diff/60000)%60, s = Math.floor(diff/1000)%60;
      out.innerHTML = `<div class="stopwatch-display">${d}d ${pad(h)}:${pad(m)}:${pad(s)}</div>`;
    };
    el.querySelector('#cd-start').onclick = () => { clearInterval(timer); tick(); timer = setInterval(tick,1000); };
    el.querySelector('#cd-stop').onclick = () => clearInterval(timer);
    el._cleanup = () => clearInterval(timer);
  }, cleanup:(el)=>{ if (el._cleanup) el._cleanup(); }});

addTool({ id:'stopwatch', name:'Stopwatch', cat:'Date & Time', icon:'⏱️', desc:'Start, pause, reset stopwatch', custom:true,
  render:(el)=>{
    el.innerHTML = `
      <div class="stopwatch-display" id="sw-display">00:00:00.0</div>
      <div class="btn-row">
        <button class="btn" id="sw-start">Start</button>
        <button class="btn secondary" id="sw-pause">Pause</button>
        <button class="btn secondary" id="sw-reset">Reset</button>
      </div>`;
    let elapsed = 0, startTime = null, timer = null;
    const disp = el.querySelector('#sw-display');
    const render = () => {
      const total = elapsed + (startTime ? Date.now()-startTime : 0);
      const h = Math.floor(total/3600000), m = Math.floor(total/60000)%60, s = Math.floor(total/1000)%60, ds = Math.floor(total/100)%10;
      disp.textContent = `${pad(h)}:${pad(m)}:${pad(s)}.${ds}`;
    };
    el.querySelector('#sw-start').onclick = () => { if(!startTime){ startTime = Date.now(); timer = setInterval(render,100); } };
    el.querySelector('#sw-pause').onclick = () => { if(startTime){ elapsed += Date.now()-startTime; startTime=null; clearInterval(timer); } };
    el.querySelector('#sw-reset').onclick = () => { elapsed=0; startTime=null; clearInterval(timer); render(); };
    el._cleanup = () => clearInterval(timer);
  }, cleanup:(el)=>{ if (el._cleanup) el._cleanup(); }});

addTool({ id:'timer', name:'Timer', cat:'Date & Time', icon:'⏰', desc:'Minute/second set karke countdown timer', custom:true,
  render:(el)=>{
    el.innerHTML = `
      <div class="field-row">
        <div class="field"><label>Minutes</label><input type="number" id="tm-min" value="5" min="0"></div>
        <div class="field"><label>Seconds</label><input type="number" id="tm-sec" value="0" min="0" max="59"></div>
      </div>
      <div class="stopwatch-display" id="tm-display">05:00</div>
      <div class="btn-row"><button class="btn" id="tm-start">Start</button><button class="btn secondary" id="tm-stop">Stop</button></div>`;
    let remaining = 0, timer = null;
    const disp = el.querySelector('#tm-display');
    const render = () => { const m=Math.floor(remaining/60), s=remaining%60; disp.textContent = `${pad(m)}:${pad(s)}`; };
    el.querySelector('#tm-start').onclick = () => {
      clearInterval(timer);
      remaining = (parseInt(el.querySelector('#tm-min').value)||0)*60 + (parseInt(el.querySelector('#tm-sec').value)||0);
      render();
      timer = setInterval(() => {
        remaining--;
        if (remaining<=0){ disp.textContent = "Time's up! ⏰"; clearInterval(timer); return; }
        render();
      }, 1000);
    };
    el.querySelector('#tm-stop').onclick = () => clearInterval(timer);
    el._cleanup = () => clearInterval(timer);
  }, cleanup:(el)=>{ if (el._cleanup) el._cleanup(); }});

/* ===== CATEGORY: Color ===== */

addTool({ id:'hex-rgb-converter', name:'HEX ⇄ RGB Converter', cat:'Color', icon:'🎨', desc:'HEX color ko RGB mein badlein ya wapas',
  fields:[
    {id:'mode', type:'select', label:'Direction', options:['HEX → RGB','RGB → HEX']},
    {id:'value', type:'text', label:'Value', placeholder:'#E3A857 ya 227,168,87'}
  ],
  compute:(v)=>{
    if (v.mode==='HEX → RGB'){
      const {r,g,b} = hexToRgb(v.value);
      return `<div class="swatch" style="background:${v.value}"></div>` + outBig(`rgb(${r}, ${g}, ${b})`);
    } else {
      const parts = v.value.split(',').map(n=>parseInt(n.trim()));
      if (parts.length!==3 || parts.some(isNaN)) throw new Error('RGB jaise likhein: 227,168,87');
      const hex = rgbToHex(...parts);
      return `<div class="swatch" style="background:${hex}"></div>` + outBig(hex);
    }
  }});

addTool({ id:'rgb-hsl-converter', name:'RGB ⇄ HSL Converter', cat:'Color', icon:'🌈', desc:'RGB ko HSL mein badlein ya wapas',
  fields:[
    {id:'mode', type:'select', label:'Direction', options:['RGB → HSL','HSL → RGB']},
    {id:'value', type:'text', label:'Value', placeholder:'227,168,87 ya 38,73%,62%'}
  ],
  compute:(v)=>{
    const parts = v.value.split(',').map(s=>parseFloat(s));
    if (parts.length!==3 || parts.some(isNaN)) throw new Error('3 numbers comma se alag dein');
    if (v.mode==='RGB → HSL'){
      const {h,s,l} = rgbToHsl(...parts);
      return outBig(`hsl(${h}, ${s}%, ${l}%)`);
    } else {
      const {r,g,b} = hslToRgb(...parts);
      return `<div class="swatch" style="background:rgb(${r},${g},${b})"></div>` + outBig(`rgb(${r}, ${g}, ${b})`);
    }
  }});

addTool({ id:'random-color-generator', name:'Random Color Generator', cat:'Color', icon:'🎲', desc:'Random HEX color banayein',
  fields:[],
  compute:()=>{
    const hex = '#' + Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0');
    return `<div class="swatch" style="background:${hex}"></div>` + outBig(hex);
  }});

addTool({ id:'color-palette-generator', name:'Color Palette Generator', cat:'Color', icon:'🖌️', desc:'Ek color se 5-color palette banayein',
  fields:[{id:'base', type:'color', label:'Base Color', default:'#4fb6a6'}],
  compute:(v)=>{
    const {r,g,b} = hexToRgb(v.base);
    const {h,s,l} = rgbToHsl(r,g,b);
    const angles = [0,30,60,180,210];
    const swatches = angles.map(a => {
      const {r:rr,g:gg,b:bb} = hslToRgb((h+a)%360, s, l);
      return rgbToHex(rr,gg,bb);
    });
    return `<div class="swatch-row">${swatches.map(c=>`<div class="swatch-col"><div class="swatch" style="background:${c}"></div>${c}</div>`).join('')}</div>`;
  }});

addTool({ id:'color-shades-generator', name:'Color Shades Generator', cat:'Color', icon:'🎚️', desc:'Ek color ke tints & shades',
  fields:[{id:'base', type:'color', label:'Base Color', default:'#e3a857'}],
  compute:(v)=>{
    const {r,g,b} = hexToRgb(v.base);
    const {h,s} = rgbToHsl(r,g,b);
    const lights = [90,80,70,60,50,40,30,20,10];
    const swatches = lights.map(l => { const c = hslToRgb(h,s,l); return rgbToHex(c.r,c.g,c.b); });
    return `<div class="swatch-row">${swatches.map(c=>`<div class="swatch-col"><div class="swatch" style="background:${c}"></div>${c}</div>`).join('')}</div>`;
  }});

addTool({ id:'color-contrast-checker', name:'Color Contrast Checker', cat:'Color', icon:'👁️', desc:'WCAG contrast ratio check karein',
  fields:[{id:'fg', type:'color', label:'Text Color', default:'#eae6dc'},{id:'bg', type:'color', label:'Background Color', default:'#101a20'}],
  compute:(v)=>{
    const lum = (hex) => {
      const {r,g,b} = hexToRgb(hex);
      const [rs,gs,bs] = [r,g,b].map(c => { c/=255; return c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4); });
      return 0.2126*rs + 0.7152*gs + 0.0722*bs;
    };
    const L1 = lum(v.fg), L2 = lum(v.bg);
    const ratio = (Math.max(L1,L2)+0.05) / (Math.min(L1,L2)+0.05);
    return outTable([
      ['Contrast Ratio', formatNum(ratio,2)+':1'],
      ['AA Normal Text (4.5:1)', ratio>=4.5 ? 'Pass ✅' : 'Fail ❌'],
      ['AA Large Text (3:1)', ratio>=3 ? 'Pass ✅' : 'Fail ❌'],
      ['AAA Normal Text (7:1)', ratio>=7 ? 'Pass ✅' : 'Fail ❌']
    ]);
  }});

addTool({ id:'gradient-generator', name:'CSS Gradient Generator', cat:'Color', icon:'🌅', desc:'2-color CSS gradient banayein',
  fields:[{id:'c1', type:'color', label:'Color 1', default:'#4fb6a6'},{id:'c2', type:'color', label:'Color 2', default:'#e3a857'},{id:'angle', type:'number', label:'Angle', default:135}],
  compute:(v)=>{
    const css = `linear-gradient(${v.angle}deg, ${v.c1}, ${v.c2})`;
    return `<div class="swatch" style="height:70px;background:${css}"></div><div class="output" style="margin-top:8px">background: ${escapeHtml(css)};</div>`;
  }});

addTool({ id:'color-picker', name:'Color Picker', cat:'Color', icon:'🖍️', desc:'Color choose karke HEX/RGB/HSL dekhein',
  fields:[{id:'color', type:'color', label:'Color', default:'#e3a857'}],
  compute:(v)=>{
    const {r,g,b} = hexToRgb(v.color);
    const {h,s,l} = rgbToHsl(r,g,b);
    return `<div class="swatch" style="background:${v.color}"></div>` + outTable([['HEX', v.color],['RGB', `rgb(${r}, ${g}, ${b})`],['HSL', `hsl(${h}, ${s}%, ${l}%)`]]);
  }});

/* ===== CATEGORY: Generators ===== */

addTool({ id:'password-generator', name:'Password Generator', cat:'Generators', icon:'🔐', desc:'Strong random password banayein',
  fields:[
    {id:'length', type:'number', label:'Length', default:14},
    {id:'upper', type:'checkbox', label:'Uppercase (A-Z)', default:true},
    {id:'lower', type:'checkbox', label:'Lowercase (a-z)', default:true},
    {id:'numbers', type:'checkbox', label:'Numbers (0-9)', default:true},
    {id:'symbols', type:'checkbox', label:'Symbols (!@#$)', default:true}
  ],
  compute:(v)=>{
    let chars = '';
    if (v.upper) chars += 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    if (v.lower) chars += 'abcdefghijkmnpqrstuvwxyz';
    if (v.numbers) chars += '23456789';
    if (v.symbols) chars += '!@#$%^&*()_+-=[]{}';
    if (!chars) throw new Error('Kam se kam ek character type select karein');
    const len = Math.min(128, Math.max(4, Math.trunc(v.length)));
    let out = '';
    for (let i=0;i<len;i++) out += chars[randInt(0,chars.length-1)];
    return outBig(out);
  }});

addTool({ id:'random-number-generator', name:'Random Number Generator', cat:'Generators', icon:'🎯', desc:'Min aur max ke beech random number',
  fields:[{id:'min', type:'number', label:'Minimum', default:1},{id:'max', type:'number', label:'Maximum', default:100}],
  compute:(v)=>{
    if (v.min>v.max) throw new Error('Minimum, maximum se chhota hona chahiye');
    return outBig(randInt(Math.trunc(v.min), Math.trunc(v.max)));
  }});

addTool({ id:'uuid-generator', name:'UUID Generator', cat:'Generators', icon:'🆔', desc:'Random UUID v4 banayein',
  fields:[],
  compute:()=>{
    const uuid = (crypto.randomUUID) ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16);
    });
    return outBig(uuid);
  }});

const LOREM_WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat'.split(' ');
addTool({ id:'lorem-ipsum-generator', name:'Lorem Ipsum Generator', cat:'Generators', icon:'📄', desc:'Dummy placeholder text banayein',
  fields:[{id:'paragraphs', type:'number', label:'Paragraphs', default:3}],
  compute:(v)=>{
    const count = Math.min(20, Math.max(1, Math.trunc(v.paragraphs)));
    const paras = [];
    for (let p=0;p<count;p++){
      let words = [];
      for (let i=0;i<randInt(40,70);i++) words.push(pickRandom(LOREM_WORDS));
      let sentence = words.join(' ');
      sentence = sentence[0].toUpperCase()+sentence.slice(1)+'.';
      paras.push(sentence);
    }
    return `<div>${paras.map(p=>escapeHtml(p)).join('<br><br>')}</div>`;
  }});

const QUOTES = [
  'Chhoti shuruaat karo, lekin shuru zaroor karo.',
  'Mehnat kabhi bekaar nahi jaati.',
  'Har din ek naya mauka hai seekhne ka.',
  'Jo aaj mumkin nahi, wo kal aadat ban sakta hai.',
  'Dhairya rakho, natija zaroor milega.',
  'Sapne wahi poore hote hain jinke liye kaam kiya jaaye.',
  'Galtiyon se seekhna hi asli taraqqi hai.',
  'Khud par bharosa sabse bada auzaar hai.'
];
addTool({ id:'random-quote-generator', name:'Random Quote Generator', cat:'Generators', icon:'💬', desc:'Motivational quote generate karein',
  fields:[], compute:()=> outBig(pickRandom(QUOTES)) });

addTool({ id:'coin-flip', name:'Coin Flip', cat:'Generators', icon:'🪙', desc:'Sikka uchalein — Heads ya Tails',
  fields:[], compute:()=> `<div class="big-emoji">${Math.random()<0.5?'🙂':'🦅'}</div>` + outBig(Math.random()<0.5 ? 'Heads' : 'Tails') });

addTool({ id:'dice-roller', name:'Dice Roller', cat:'Generators', icon:'🎲', desc:'Ek ya zyada dice roll karein',
  fields:[{id:'count', type:'number', label:'Kitne dice', default:2},{id:'sides', type:'select', label:'Sides', options:['4','6','8','10','12','20']}],
  compute:(v)=>{
    const n = Math.min(20, Math.max(1, Math.trunc(v.count)));
    const sides = parseInt(v.sides);
    const rolls = Array.from({length:n}, () => randInt(1,sides));
    return outBig(rolls.join(' + '), 'Total: ' + rolls.reduce((a,b)=>a+b,0));
  }});

addTool({ id:'random-name-picker', name:'Random Name Picker', cat:'Generators', icon:'🙋', desc:'List se ek random naam chunein',
  fields:[{id:'names', type:'textarea', label:'Naam (har line mein ek)', placeholder:'Riya\nAman\nZara\nKabir'}],
  compute:(v)=>{
    const names = (v.names||'').split('\n').map(n=>n.trim()).filter(Boolean);
    if (!names.length) throw new Error('Kam se kam ek naam dein');
    return outBig(pickRandom(names));
  }});

addTool({ id:'username-generator', name:'Username Generator', cat:'Generators', icon:'👤', desc:'Keyword se username ideas banayein',
  fields:[{id:'keyword', type:'text', label:'Keyword', default:'coder'}],
  compute:(v)=>{
    const k = (v.keyword||'user').replace(/\s+/g,'').toLowerCase();
    const ideas = [`${k}${randInt(10,999)}`,`the_${k}`,`${k}_official`,`real${k}${randInt(1,99)}`,`${k}.hq`];
    return `<div>${ideas.map(escapeHtml).join('<br>')}</div>`;
  }});

addTool({ id:'password-strength-checker', name:'Password Strength Checker', cat:'Generators', icon:'🛡️', desc:'Password kitna strong hai check karein',
  fields:[{id:'pw', type:'text', label:'Password'}],
  compute:(v)=>{
    const pw = v.pw || '';
    let score = 0;
    if (pw.length>=8) score++;
    if (pw.length>=12) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const labels = ['Bahut Kamzor 🔴','Kamzor 🟠','Theek-Thaak 🟡','Achha 🟢','Strong 💪','Bahut Strong 🛡️'];
    return outBig(labels[score], `Length: ${pw.length} characters`);
  }});

addTool({ id:'qr-code-generator', name:'QR Code Generator', cat:'Generators', icon:'🔲', desc:'Text/link ka QR code banayein',
  fields:[{id:'text', type:'text', label:'Text ya URL', placeholder:'https://example.com'}],
  compute:(v)=>{
    if (!v.text) return '';
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(v.text)}`;
    return `<div style="text-align:center"><img src="${url}" alt="QR code" style="border-radius:8px;background:#fff;padding:8px"></div><p class="hint" style="text-align:center">Yeh image ek external API (api.qrserver.com) se load hoti hai — internet chahiye.</p>`;
  }});

addTool({ id:'pin-generator', name:'Random PIN Generator', cat:'Generators', icon:'🔢', desc:'Random numeric PIN banayein',
  fields:[{id:'digits', type:'number', label:'Digits', default:4}],
  compute:(v)=>{
    const len = Math.min(20, Math.max(1, Math.trunc(v.digits)));
    let out = '';
    for (let i=0;i<len;i++) out += randInt(0,9);
    return outBig(out);
  }});

addTool({ id:'acronym-generator', name:'Acronym Generator', cat:'Generators', icon:'🔡', desc:'Phrase se acronym banayein',
  fields:[{id:'phrase', type:'text', label:'Phrase', placeholder:'jaise: As Soon As Possible'}],
  compute:(v)=> outBig((v.phrase||'').split(/\s+/).filter(Boolean).map(w=>w[0].toUpperCase()).join('')) });

const EMOJIS = ['😀','🚀','🎉','🌟','🔥','🎨','🐱','🍕','⚡','🌈','🎲','🧩','🎯','🏆','🌸','🍀','🦄','🎈','🧠','☕'];
addTool({ id:'emoji-picker', name:'Random Emoji Picker', cat:'Generators', icon:'😄', desc:'Random emoji chunein',
  fields:[], compute:()=> `<div class="big-emoji">${pickRandom(EMOJIS)}</div>` });

/* ===== CATEGORY: Web & Code ===== */

addTool({ id:'json-formatter', name:'JSON Formatter & Validator', cat:'Web & Code', icon:'{}', desc:'JSON ko sundar tarah se format karein',
  fields:[{id:'json', type:'textarea', label:'JSON'},{id:'indent', type:'select', label:'Indent', options:['2 spaces','4 spaces','Tab']}],
  compute:(v)=>{
    const parsed = JSON.parse(v.json||'{}');
    const indent = v.indent==='Tab' ? '\t' : (v.indent==='4 spaces' ? 4 : 2);
    return `<pre style="margin:0">${escapeHtml(JSON.stringify(parsed, null, indent))}</pre>`;
  }});

addTool({ id:'json-minifier', name:'JSON Minifier', cat:'Web & Code', icon:'📦', desc:'JSON ko ek line mein compress karein',
  fields:[{id:'json', type:'textarea', label:'JSON'}],
  compute:(v)=> `<div>${escapeHtml(JSON.stringify(JSON.parse(v.json||'{}')))}</div>` });

addTool({ id:'base64-encode', name:'Base64 Encoder', cat:'Web & Code', icon:'🔒', desc:'Text ko Base64 mein encode karein',
  fields:[{id:'txt', type:'textarea', label:'Text'}],
  compute:(v)=> `<div>${escapeHtml(btoa(unescape(encodeURIComponent(v.txt||''))))}</div>` });

addTool({ id:'base64-decode', name:'Base64 Decoder', cat:'Web & Code', icon:'🔓', desc:'Base64 ko text mein decode karein',
  fields:[{id:'txt', type:'textarea', label:'Base64 Text'}],
  compute:(v)=>{
    try{ return `<div>${escapeHtml(decodeURIComponent(escape(atob((v.txt||'').trim()))))}</div>`; }
    catch(e){ throw new Error('Yeh valid Base64 nahi hai'); }
  }});

addTool({ id:'url-encode', name:'URL Encoder', cat:'Web & Code', icon:'🔗', desc:'Text ko URL-safe banayein',
  fields:[{id:'txt', type:'textarea', label:'Text'}],
  compute:(v)=> `<div>${escapeHtml(encodeURIComponent(v.txt||''))}</div>` });

addTool({ id:'url-decode', name:'URL Decoder', cat:'Web & Code', icon:'🔓', desc:'URL-encoded text wapas decode karein',
  fields:[{id:'txt', type:'textarea', label:'Encoded Text'}],
  compute:(v)=>{
    try{ return `<div>${escapeHtml(decodeURIComponent(v.txt||''))}</div>`; }
    catch(e){ throw new Error('Decode nahi ho paaya — text check karein'); }
  }});

addTool({ id:'html-entity-encode', name:'HTML Entity Encoder', cat:'Web & Code', icon:'🏷️', desc:'HTML special characters encode karein',
  fields:[{id:'txt', type:'textarea', label:'Text'}],
  compute:(v)=> `<div>${escapeHtml(v.txt||'').replace(/./g,'')}${escapeHtml(escapeHtml(v.txt||''))}</div>` });

addTool({ id:'html-entity-decode', name:'HTML Entity Decoder', cat:'Web & Code', icon:'🏷️', desc:'HTML entities wapas text mein badlein',
  fields:[{id:'txt', type:'textarea', label:'HTML Entities'}],
  compute:(v)=>{
    const ta = document.createElement('textarea');
    ta.innerHTML = v.txt||'';
    return `<div>${escapeHtml(ta.value)}</div>`;
  }});

addTool({ id:'css-minifier', name:'CSS Minifier', cat:'Web & Code', icon:'🎨', desc:'CSS se comments/extra space hatayein',
  fields:[{id:'css', type:'textarea', label:'CSS'}],
  compute:(v)=>{
    const out = (v.css||'')
      .replace(/\/\*[\s\S]*?\*\//g,'')
      .replace(/\s+/g,' ')
      .replace(/\s*([{}:;,])\s*/g,'$1')
      .replace(/;}/g,'}')
      .trim();
    return `<div>${escapeHtml(out)}</div>`;
  }});

function mdToHtml(md){
  let s = escapeHtml(md);
  s = s.replace(/^### (.*)$/gm,'<h3>$1</h3>')
       .replace(/^## (.*)$/gm,'<h2>$1</h2>')
       .replace(/^# (.*)$/gm,'<h1>$1</h1>')
       .replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')
       .replace(/\*(.+?)\*/g,'<i>$1</i>')
       .replace(/\[(.+?)\]\((.+?)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')
       .replace(/^- (.*)$/gm,'<li>$1</li>')
       .replace(/\n{2,}/g,'</p><p>')
       .replace(/\n/g,'<br>');
  return `<p>${s}</p>`;
}
addTool({ id:'markdown-preview', name:'Markdown Previewer', cat:'Web & Code', icon:'📝', desc:'Markdown ko live HTML preview karein',
  fields:[{id:'md', type:'textarea', label:'Markdown', placeholder:'# Title\n**Bold** aur *italic* text'}],
  compute:(v)=> mdToHtml(v.md||'') });

addTool({ id:'meta-tag-generator', name:'Meta Tag Generator', cat:'Web & Code', icon:'🏷️', desc:'SEO meta tags generate karein',
  fields:[{id:'title', type:'text', label:'Page Title'},{id:'description', type:'text', label:'Description'},{id:'keywords', type:'text', label:'Keywords (comma se alag)'}],
  compute:(v)=>{
    const tags = `<title>${v.title||''}</title>\n<meta name="description" content="${v.description||''}">\n<meta name="keywords" content="${v.keywords||''}">\n<meta property="og:title" content="${v.title||''}">\n<meta property="og:description" content="${v.description||''}">`;
    return `<pre style="margin:0">${escapeHtml(tags)}</pre>`;
  }});

addTool({ id:'hash-generator', name:'Hash Generator (SHA)', cat:'Web & Code', icon:'#️⃣', desc:'Text ka SHA hash nikalein', async:true,
  fields:[{id:'txt', type:'textarea', label:'Text'},{id:'algo', type:'select', label:'Algorithm', options:['SHA-1','SHA-256','SHA-384','SHA-512']}],
  compute: async (v)=>{
    const enc = new TextEncoder().encode(v.txt||'');
    const buf = await crypto.subtle.digest(v.algo, enc);
    const hex = [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
    return `<div style="word-break:break-all">${hex}</div>`;
  }});

addTool({ id:'csv-to-json', name:'CSV to JSON Converter', cat:'Web & Code', icon:'📊', desc:'CSV ko JSON array mein badlein',
  fields:[{id:'csv', type:'textarea', label:'CSV (pehli line headers)', placeholder:'name,age\nRiya,23\nAman,25'}],
  compute:(v)=>{
    const lines = (v.csv||'').trim().split('\n').filter(Boolean);
    if (lines.length<2) throw new Error('Kam se kam header + 1 row chahiye');
    const headers = lines[0].split(',').map(h=>h.trim());
    const rows = lines.slice(1).map(line => {
      const cells = line.split(',').map(c=>c.trim());
      const obj = {};
      headers.forEach((h,i)=> obj[h]=cells[i]);
      return obj;
    });
    return `<pre style="margin:0">${escapeHtml(JSON.stringify(rows,null,2))}</pre>`;
  }});

addTool({ id:'json-to-csv', name:'JSON to CSV Converter', cat:'Web & Code', icon:'📋', desc:'JSON array ko CSV mein badlein',
  fields:[{id:'json', type:'textarea', label:'JSON Array', placeholder:'[{"name":"Riya","age":23}]'}],
  compute:(v)=>{
    const data = JSON.parse(v.json||'[]');
    if (!Array.isArray(data) || !data.length) throw new Error('Ek JSON array of objects dein');
    const headers = Object.keys(data[0]);
    const rows = [headers.join(',')].concat(data.map(o => headers.map(h => o[h]).join(',')));
    return `<pre style="margin:0">${escapeHtml(rows.join('\n'))}</pre>`;
  }});

addTool({ id:'text-diff-checker', name:'Text Diff Checker', cat:'Web & Code', icon:'🔀', desc:'Do texts ke beech line farak dekhein',
  fields:[{id:'a', type:'textarea', label:'Text A'},{id:'b', type:'textarea', label:'Text B'}],
  compute:(v)=>{
    const linesA = (v.a||'').split('\n'), linesB = (v.b||'').split('\n');
    const setA = new Set(linesA), setB = new Set(linesB);
    const onlyA = linesA.filter(l=>!setB.has(l));
    const onlyB = linesB.filter(l=>!setA.has(l));
    let out = '';
    if (!onlyA.length && !onlyB.length) return outBig('Dono texts ki lines match karti hain ✅');
    onlyA.forEach(l => out += `<div style="color:#e07856">- ${escapeHtml(l)}</div>`);
    onlyB.forEach(l => out += `<div style="color:#4fb6a6">+ ${escapeHtml(l)}</div>`);
    return out;
  }});

/* ===== CATEGORY: Files & Images ===== */

addTool({ id:'image-to-pdf', name:'Image to PDF Converter', cat:'Files & Images', icon:'🖼️', desc:'Ek ya zyada images ko PDF banayein', custom:true,
  render:(el)=>{
    el.innerHTML = `
      <div class="field"><label>Images choose karein (multiple bhi select kar sakte hain)</label><input type="file" id="itp-files" accept="image/*" multiple></div>
      <button class="btn" id="itp-run">PDF Banayein aur Download Karein</button>
      <div class="output" id="itp-out"></div>
      <p class="hint">Sab images ek hi PDF mein, ek-ek page par, A4 size mein fit ho jaayengi.</p>`;
    el.querySelector('#itp-run').onclick = async () => {
      const out = el.querySelector('#itp-out');
      const files = el.querySelector('#itp-files').files;
      out.innerHTML = 'Process ho raha hai...';
      try{
        const count = await imagesToPdf(files);
        out.innerHTML = `✅ ${count} image(s) se PDF ban kar download ho gayi.`;
      } catch(err){
        out.innerHTML = `<span style="color:var(--red)">⚠️ ${escapeHtml(err.message||String(err))}</span>`;
      }
    };
  }});

addTool({ id:'png-to-pdf', name:'PNG to PDF Converter', cat:'Files & Images', icon:'📄', desc:'PNG images ko PDF mein badlein', custom:true,
  render:(el)=>{
    el.innerHTML = `
      <div class="field"><label>PNG file(s) choose karein</label><input type="file" id="ptp-files" accept="image/png" multiple></div>
      <button class="btn" id="ptp-run">PDF Banayein aur Download Karein</button>
      <div class="output" id="ptp-out"></div>`;
    el.querySelector('#ptp-run').onclick = async () => {
      const out = el.querySelector('#ptp-out');
      const files = el.querySelector('#ptp-files').files;
      out.innerHTML = 'Process ho raha hai...';
      try{
        const count = await imagesToPdf(files);
        out.innerHTML = `✅ ${count} PNG file(s) se PDF ban kar download ho gayi.`;
      } catch(err){
        out.innerHTML = `<span style="color:var(--red)">⚠️ ${escapeHtml(err.message||String(err))}</span>`;
      }
    };
  }});

addTool({ id:'image-compressor', name:'Image Size Compressor', cat:'Files & Images', icon:'🗜️', desc:'Image ka file size kam karein (quality ke saath)', custom:true,
  render:(el)=>{
    el.innerHTML = `
      <div class="field"><label>Image choose karein</label><input type="file" id="ic-file" accept="image/*"></div>
      <div class="field"><label>Quality: <span id="ic-qval">70</span>%</label><input type="range" id="ic-quality" min="10" max="95" value="70"></div>
      <button class="btn" id="ic-run">Compress Karein</button>
      <div class="output" id="ic-out"></div>`;
    const qEl = el.querySelector('#ic-quality'), qVal = el.querySelector('#ic-qval');
    qEl.oninput = () => qVal.textContent = qEl.value;
    el.querySelector('#ic-run').onclick = async () => {
      const out = el.querySelector('#ic-out');
      const file = el.querySelector('#ic-file').files[0];
      if (!file){ out.innerHTML = '<span style="color:var(--red)">Pehle image choose karein</span>'; return; }
      out.innerHTML = 'Compress ho raha hai...';
      try{
        const dataUrl = await readFileAsDataURL(file);
        const img = await loadImage(dataUrl);
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        canvas.getContext('2d').drawImage(img,0,0);
        canvas.toBlob((blob) => {
          if(!blob){ out.innerHTML='<span style="color:var(--red)">Compress nahi ho paayi</span>'; return; }
          const url = URL.createObjectURL(blob);
          const savedPct = Math.max(0, Math.round((1 - blob.size/file.size)*100));
          out.innerHTML = `
            <img src="${url}" style="max-width:100%;border-radius:8px;margin-bottom:10px">
            ${outTable([['Original Size', formatBytes(file.size)],['Compressed Size', formatBytes(blob.size)],['Kam hua', savedPct+'%']])}
            <div class="btn-row" style="margin-top:10px"><a class="btn" href="${url}" download="compressed.jpg">Download Karein</a></div>`;
        }, 'image/jpeg', qEl.value/100);
      } catch(err){
        out.innerHTML = `<span style="color:var(--red)">⚠️ ${escapeHtml(err.message||String(err))}</span>`;
      }
    };
  }});

addTool({ id:'image-resizer', name:'Image Size Reducer (Resize)', cat:'Files & Images', icon:'📉', desc:'Image ki width/height chhoti karke size kam karein', custom:true,
  render:(el)=>{
    el.innerHTML = `
      <div class="field"><label>Image choose karein</label><input type="file" id="ir-file" accept="image/*"></div>
      <div class="field"><label>Max Width (px)</label><input type="number" id="ir-width" value="800"></div>
      <button class="btn" id="ir-run">Resize Karein</button>
      <div class="output" id="ir-out"></div>
      <p class="hint">Height apne aap aspect ratio ke hisaab se adjust ho jaayegi.</p>`;
    el.querySelector('#ir-run').onclick = async () => {
      const out = el.querySelector('#ir-out');
      const file = el.querySelector('#ir-file').files[0];
      const maxW = parseInt(el.querySelector('#ir-width').value) || 800;
      if (!file){ out.innerHTML = '<span style="color:var(--red)">Pehle image choose karein</span>'; return; }
      out.innerHTML = 'Resize ho raha hai...';
      try{
        const dataUrl = await readFileAsDataURL(file);
        const img = await loadImage(dataUrl);
        const scale = Math.min(1, maxW/img.width);
        const newW = Math.round(img.width*scale), newH = Math.round(img.height*scale);
        const canvas = document.createElement('canvas');
        canvas.width = newW; canvas.height = newH;
        canvas.getContext('2d').drawImage(img,0,0,newW,newH);
        const mime = file.type || 'image/png';
        canvas.toBlob((blob)=>{
          if(!blob){ out.innerHTML='<span style="color:var(--red)">Resize nahi ho paayi</span>'; return; }
          const url = URL.createObjectURL(blob);
          const ext = mime.includes('png') ? 'png' : 'jpg';
          out.innerHTML = `
            <img src="${url}" style="max-width:100%;border-radius:8px;margin-bottom:10px">
            ${outTable([['Original', img.width+' × '+img.height+' — '+formatBytes(file.size)],['Resized', newW+' × '+newH+' — '+formatBytes(blob.size)]])}
            <div class="btn-row" style="margin-top:10px"><a class="btn" href="${url}" download="resized.${ext}">Download Karein</a></div>`;
        }, mime);
      } catch(err){
        out.innerHTML = `<span style="color:var(--red)">⚠️ ${escapeHtml(err.message||String(err))}</span>`;
      }
    };
  }});

/* ===== CATEGORY: Misc ===== */

addTool({ id:'text-to-speech', name:'Text to Speech', cat:'Misc', icon:'🔊', desc:'Text ko awaaz mein sunein', custom:true,
  render:(el)=>{
    el.innerHTML = `
      <div class="field"><label>Text</label><textarea id="tts-txt" placeholder="Yahan text likhein...">Namaste! Yeh text-to-speech tool hai.</textarea></div>
      <div class="btn-row"><button class="btn" id="tts-play">▶ Bolo</button><button class="btn secondary" id="tts-stop">⏹ Roko</button></div>
      <p class="hint">Awaaz aapke browser/device ki built-in voices par depend karti hai.</p>`;
    el.querySelector('#tts-play').onclick = () => {
      const txt = el.querySelector('#tts-txt').value;
      if (!txt) return;
      speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(txt);
      speechSynthesis.speak(utter);
    };
    el.querySelector('#tts-stop').onclick = () => speechSynthesis.cancel();
    el._cleanup = () => speechSynthesis.cancel();
  }, cleanup:(el)=>{ if (el._cleanup) el._cleanup(); }});

addTool({ id:'typing-speed-test', name:'Typing Speed Test', cat:'Misc', icon:'⌨️', desc:'Apni typing speed (WPM) test karein', custom:true,
  render:(el)=>{
    const sample = 'Mehnat kabhi bekaar nahi jaati, bas dhairya aur lagan ke saath kaam karte raho.';
    el.innerHTML = `
      <div class="output">${escapeHtml(sample)}</div>
      <div class="field"><label>Yahan type karein</label><textarea id="tt-input" placeholder="Typing yahan shuru karein..."></textarea></div>
      <div class="btn-row"><button class="btn" id="tt-finish">Result Dekhein</button><button class="btn secondary" id="tt-reset">Reset</button></div>
      <div class="output" id="tt-out"></div>`;
    let startTime = null;
    const input = el.querySelector('#tt-input');
    input.addEventListener('input', () => { if (!startTime) startTime = Date.now(); });
    el.querySelector('#tt-finish').onclick = () => {
      const typed = input.value;
      const minutes = Math.max(0.001, (Date.now()-(startTime||Date.now()))/60000);
      const words = typed.trim() ? typed.trim().split(/\s+/).length : 0;
      const wpm = Math.round(words/minutes);
      let correctChars = 0;
      for (let i=0;i<typed.length;i++) if (typed[i]===sample[i]) correctChars++;
      const accuracy = typed.length ? Math.round(correctChars/Math.max(typed.length, sample.length)*100) : 0;
      el.querySelector('#tt-out').innerHTML = outTable([['WPM (Words/min)', wpm],['Accuracy', accuracy+'%']]);
    };
    el.querySelector('#tt-reset').onclick = () => { startTime=null; input.value=''; el.querySelector('#tt-out').innerHTML=''; };
  }});

addTool({ id:'word-frequency', name:'Word Frequency Counter', cat:'Misc', icon:'📊', desc:'Text mein sabse zyada use hue words',
  fields:[{id:'txt', type:'textarea', label:'Text'}],
  compute:(v)=>{
    const words = (v.txt||'').toLowerCase().match(/[a-z0-9']+/g) || [];
    const freq = {};
    words.forEach(w => freq[w]=(freq[w]||0)+1);
    const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,15);
    if (!top.length) return '';
    return outTable(top);
  }});

addTool({ id:'char-frequency', name:'Character Frequency Counter', cat:'Misc', icon:'🔠', desc:'Text mein har letter kitni baar aaya',
  fields:[{id:'txt', type:'text', label:'Text'}],
  compute:(v)=>{
    const chars = (v.txt||'').toLowerCase().replace(/[^a-z0-9]/g,'').split('');
    const freq = {};
    chars.forEach(c => freq[c]=(freq[c]||0)+1);
    const rows = Object.entries(freq).sort((a,b)=>b[1]-a[1]);
    if (!rows.length) return '';
    return outTable(rows);
  }});

addTool({ id:'random-team-generator', name:'Random Team Generator', cat:'Misc', icon:'👥', desc:'Naamon ko random teams mein baantein',
  fields:[{id:'names', type:'textarea', label:'Naam (har line mein ek)'},{id:'teams', type:'number', label:'Kitni teams', default:2}],
  compute:(v)=>{
    const names = shuffle((v.names||'').split('\n').map(n=>n.trim()).filter(Boolean));
    const teamCount = Math.max(2, Math.min(names.length||2, Math.trunc(v.teams)));
    if (!names.length) throw new Error('Kam se kam kuch naam dein');
    const teams = Array.from({length:teamCount}, ()=>[]);
    names.forEach((n,i) => teams[i%teamCount].push(n));
    return teams.map((t,i) => `<div><b>Team ${i+1}:</b> ${t.map(escapeHtml).join(', ')}</div>`).join('');
  }});

/* ---------------- 3) RENDERING ENGINE ---------------- */

const CATEGORY_ORDER = [
  ['Text','📝'], ['Numbers','🔢'], ['Converters','📐'], ['Calculators','🧮'],
  ['Geometry','📏'], ['Date & Time','🕒'], ['Color','🎨'], ['Generators','🎲'],
  ['Web & Code','💻'], ['Files & Images','📁'], ['Misc','✨']
];

const sidebar = document.getElementById('sidebar');
const toolGrid = document.getElementById('toolGrid');
const searchInput = document.getElementById('searchInput');
const searchCount = document.getElementById('searchCount');
document.getElementById('toolTotalNum').textContent = TOOLS.length;

function buildSidebar(){
  sidebar.innerHTML = '<button class="cat-btn active" data-cat="__all__">Sab Tools <span class="cat-count">' + TOOLS.length + '</span></button>' +
    CATEGORY_ORDER.map(([cat,icon]) => {
      const count = TOOLS.filter(t=>t.cat===cat).length;
      return `<button class="cat-btn" data-cat="${cat}">${icon} ${cat} <span class="cat-count">${count}</span></button>`;
    }).join('');
  sidebar.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sidebar.querySelectorAll('.cat-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      searchInput.value = '';
      renderGrid(btn.dataset.cat, '');
    });
  });
}

function renderGrid(catFilter, query){
  const q = (query||'').toLowerCase().trim();
  let cats = catFilter === '__all__' ? CATEGORY_ORDER : CATEGORY_ORDER.filter(([c])=>c===catFilter);
  let totalShown = 0;
  let html = '';
  cats.forEach(([cat, icon]) => {
    const items = TOOLS.filter(t => t.cat===cat && (!q || t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q)));
    if (!items.length) return;
    totalShown += items.length;
    html += `<h3 class="category-title"><span class="cat-icon">${icon}</span> ${cat}</h3><div class="tool-grid">`;
    items.forEach(t => {
      html += `<button class="tool-card" data-id="${t.id}">
        <span class="t-icon">${t.icon}</span>
        <span class="t-name">${escapeHtml(t.name)}</span>
        <span class="t-desc">${escapeHtml(t.desc)}</span>
      </button>`;
    });
    html += `</div>`;
  });
  toolGrid.innerHTML = html || '<p class="no-results">Koi tool nahi mila. Kuch aur try karein.</p>';
  toolGrid.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('click', () => openDrawer(TOOLS.find(t=>t.id===card.dataset.id)));
  });
  searchCount.textContent = q ? `${totalShown} mile` : '';
}

/* ---- Drawer / tool workspace ---- */

const overlay = document.getElementById('drawerOverlay');
const drawer = document.getElementById('drawer');
const drawerBody = document.getElementById('drawerBody');
let currentTool = null;

function fieldHTML(f){
  const id = 'f_' + f.id;
  const label = `<label for="${id}">${escapeHtml(f.label)}</label>`;
  if (f.type === 'textarea'){
    return `<div class="field">${label}<textarea id="${id}" placeholder="${escapeHtml(f.placeholder||'')}">${escapeHtml(f.default||'')}</textarea></div>`;
  }
  if (f.type === 'select'){
    const opts = f.options.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
    return `<div class="field">${label}<select id="${id}">${opts}</select></div>`;
  }
  if (f.type === 'checkbox'){
    return `<div class="field" style="flex-direction:row;align-items:center;gap:8px">
      <input type="checkbox" id="${id}" ${f.default ? 'checked' : ''} style="width:auto">
      <label for="${id}" style="margin:0">${escapeHtml(f.label)}</label></div>`;
  }
  if (f.type === 'color'){
    return `<div class="field">${label}<input type="color" id="${id}" value="${f.default||'#e3a857'}"></div>`;
  }
  // text / number / date
  const val = f.default !== undefined ? f.default : '';
  return `<div class="field">${label}<input type="${f.type}" id="${id}" value="${escapeHtml(val)}" placeholder="${escapeHtml(f.placeholder||'')}"></div>`;
}

function collectValues(fields){
  const values = {};
  fields.forEach(f => {
    const el = document.getElementById('f_' + f.id);
    if (!el) return;
    if (f.type === 'number') values[f.id] = parseFloat(el.value);
    else if (f.type === 'checkbox') values[f.id] = el.checked;
    else values[f.id] = el.value;
  });
  return values;
}

async function runGeneric(tool, outEl){
  try{
    const values = collectValues(tool.fields);
    let result = tool.compute(values);
    if (result instanceof Promise) result = await result;
    outEl.innerHTML = result || '';
  } catch(err){
    outEl.innerHTML = `<span style="color:var(--red)">⚠️ ${escapeHtml(err.message || String(err))}</span>`;
  }
}

function openDrawer(tool){
  currentTool = tool;
  document.getElementById('drawerIcon').textContent = tool.icon;
  document.getElementById('drawerTitle').textContent = tool.name;
  document.getElementById('drawerCat').textContent = tool.cat;
  drawerBody.innerHTML = '';

  if (tool.custom){
    tool.render(drawerBody);
  } else {
    const fieldsHtml = tool.fields.map(fieldHTML).join('');
    drawerBody.innerHTML = `
      ${fieldsHtml}
      <div class="btn-row">
        <button class="btn" id="runBtn">Chalao ▶</button>
        <button class="btn secondary" id="copyBtn">Result Copy Karein</button>
      </div>
      <div class="output" id="toolOutput"></div>`;
    const outEl = document.getElementById('toolOutput');
    tool.fields.forEach(f => {
      const el = document.getElementById('f_' + f.id);
      if (!el) return;
      el.addEventListener(f.type==='select' || f.type==='checkbox' || f.type==='color' ? 'change' : 'input', () => runGeneric(tool, outEl));
    });
    document.getElementById('runBtn').addEventListener('click', () => runGeneric(tool, outEl));
    document.getElementById('copyBtn').addEventListener('click', () => {
      navigator.clipboard?.writeText(outEl.innerText || '').then(()=>{
        const btn = document.getElementById('copyBtn');
        const old = btn.textContent; btn.textContent = 'Copy ho gaya ✓';
        setTimeout(()=>btn.textContent=old, 1200);
      });
    });
    runGeneric(tool, outEl);
  }

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDrawer(){
  if (currentTool && currentTool.cleanup) currentTool.cleanup(drawerBody);
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  currentTool = null;
}

document.getElementById('drawerClose').addEventListener('click', closeDrawer);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeDrawer(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

/* ---- Search ---- */
searchInput.addEventListener('input', () => {
  sidebar.querySelectorAll('.cat-btn').forEach(b=>b.classList.remove('active'));
  sidebar.querySelector('[data-cat="__all__"]').classList.add('active');
  renderGrid('__all__', searchInput.value);
});

/* ---- Init ---- */
buildSidebar();
renderGrid('__all__', '');
