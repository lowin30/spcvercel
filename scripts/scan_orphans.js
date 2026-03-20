/**
 * Script de Conciliación de Gastos vPlatinum 1.0
 * Procesa URLs de Cloudinary contra la API local de análisis.
 */
const IMAGES = [
  "https://res.cloudinary.com/dkqtmodyi/image/upload/v1774015156/spc/gastos_analysis_gold/u5xiqzuz67fbhoukkwzk.jpg",
  "https://res.cloudinary.com/dkqtmodyi/image/upload/v1774015141/spc/gastos_analysis_gold/almssdsnp5o4hcup029t.jpg",
  "https://res.cloudinary.com/dkqtmodyi/image/upload/v1774015131/spc/gastos_analysis_gold/gx4hzjclojpryid5ktv5.jpg",
  "https://res.cloudinary.com/dkqtmodyi/image/upload/v1774015119/spc/gastos_analysis_gold/pypr66o6zm9qknsajv7v.jpg",
  "https://res.cloudinary.com/dkqtmodyi/image/upload/v1774015104/spc/gastos_analysis_gold/kcdypdsfyi1pkrl4w31c.jpg",
  "https://res.cloudinary.com/dkqtmodyi/image/upload/v1774014641/spc/gastos_analysis_gold/xkftvao6ajmjcfd9hnuf.jpg",
  "https://res.cloudinary.com/dkqtmodyi/image/upload/v1774014600/spc/gastos_analysis_gold/w00uy9tqk2pgikj78zot.jpg",
  "https://res.cloudinary.com/dkqtmodyi/image/upload/v1774014581/spc/gastos_analysis_gold/rhgmguhhqwjzyfzspcqa.jpg",
  "https://res.cloudinary.com/dkqtmodyi/image/upload/v1774014552/spc/gastos_analysis_gold/j7matvawup8le7v8zxdm.jpg",
  "https://res.cloudinary.com/dkqtmodyi/image/upload/v1774014477/spc/gastos_analysis_gold/nuvnolwu8s2fbir8iqgw.jpg"
];

async function run() {
  const results = [];
  for (const url of IMAGES) {
    console.log(`[audit] procesando ${url.split('/').pop()}...`);
    try {
      const response = await fetch("http://localhost:3000/api/analizar-gasto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagenUrl: url })
      });
      const data = await response.json();
      results.push({ url, ...data });
    } catch (e) {
      results.push({ url, error: e.message });
    }
  }
  console.log(JSON.stringify(results, null, 2));
}

run();
