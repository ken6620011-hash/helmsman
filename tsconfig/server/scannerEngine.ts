type ScannerItem = {
  rank: number
  symbol: string
  sector: string
  radarScore: number
  cycle: number
  deviation: number
  signal: string
}

function calculateSignal(cycle:number,deviation:number){
  if(cycle >=18 && deviation >=40 && deviation <=70){
    return "21 Setup"
  }

  if(cycle >=15 && deviation <=40){
    return "Early Momentum"
  }

  return "Watch"
}

export function getScannerResults():ScannerItem[]{

  const universe = [
    {symbol:"NVDA",sector:"AI Infrastructure",radar:82,cycle:18,deviation:48},
    {symbol:"TSM",sector:"Semiconductor",radar:76,cycle:17,deviation:55},
    {symbol:"AVGO",sector:"Semiconductor",radar:74,cycle:16,deviation:62},
    {symbol:"MSFT",sector:"AI Platform",radar:71,cycle:15,deviation:58},
    {symbol:"ASML",sector:"Semiconductor",radar:69,cycle:14,deviation:63}
  ]

  const ranked = universe
  .map((s)=>({

      rank:0,
      symbol:s.symbol,
      sector:s.sector,
      radarScore:s.radar,
      cycle:s.cycle,
      deviation:s.deviation,
      signal:calculateSignal(s.cycle,s.deviation)

  }))
  .sort((a,b)=>b.radarScore-a.radarScore)

  ranked.forEach((item,index)=>{
    item.rank=index+1
  })

  return ranked
}
