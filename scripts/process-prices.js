const fs = require('fs');
const path = require('path');

// 野菜名マッピング
const vegetableNames = {
  'Kyabetsu': 'キャベツ',
  'Daikon': '大根',
  'Ninjin': 'にんじん',
  'Tamanegi': '玉ねぎ',
  'Hakusai': '白菜',
  'Retasu': 'レタス',
  'Tomato': 'トマト',
  'Kyuuri': 'きゅうり',
  'Negi': 'ネギ',
  'Bareisyo': 'じゃがいも'
};

// 生データを読み込み
const rawDataPath = path.join(__dirname, '../data/prices_raw.json');
const rawData = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'));

// 処理済みデータの構造
const processedData = {
  lastUpdate: new Date().toISOString(),
  source: '食品価格動向調査（野菜） - cultivationdata.net',
  originalSource: '農林水産省',
  data: {},
  statistics: {}
};

// 日付ごとのデータを整形
for (const [date, prices] of Object.entries(rawData)) {
  processedData.data[date] = {};
  
  for (const [vegKey, price] of Object.entries(prices)) {
    // "-"をnullに変換
    processedData.data[date][vegKey] = (price === '-' || price === null) ? null : parseInt(price);
  }
}

// 統計情報を計算
for (const vegKey of Object.keys(vegetableNames)) {
  const prices = [];
  
  // 各日付から価格を収集
  for (const dateData of Object.values(processedData.data)) {
    if (dateData[vegKey] !== null && dateData[vegKey] !== undefined) {
      prices.push(dateData[vegKey]);
    }
  }
  
  if (prices.length > 0) {
    // ソート
    prices.sort((a, b) => a - b);
    
    // 統計計算
    const sum = prices.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / prices.length);
    const median = prices[Math.floor(prices.length / 2)];
    const min = prices[0];
    const max = prices[prices.length - 1];
    
    // 最近30日の平均（トレンド用）
    const recentPrices = [];
    const dates = Object.keys(processedData.data).sort().slice(-30);
    for (const date of dates) {
      const price = processedData.data[date][vegKey];
      if (price !== null) {
        recentPrices.push(price);
      }
    }
    const recentAvg = recentPrices.length > 0 
      ? Math.round(recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length)
      : avg;
    
    processedData.statistics[vegKey] = {
      name: vegetableNames[vegKey],
      avg: avg,
      median: median,
      min: min,
      max: max,
      count: prices.length,
      recentAvg: recentAvg,
      trend: recentAvg > avg ? 'up' : (recentAvg < avg ? 'down' : 'stable')
    };
  }
}

// ファイルに保存
const outputPath = path.join(__dirname, '../data/prices.json');
fs.writeFileSync(outputPath, JSON.stringify(processedData, null, 2), 'utf8');

console.log('✅ Price data processed successfully!');
console.log(`📊 Total dates: ${Object.keys(processedData.data).length}`);
console.log(`🥬 Vegetables: ${Object.keys(processedData.statistics).length}`);
console.log(`📅 Last update: ${processedData.lastUpdate}`);
