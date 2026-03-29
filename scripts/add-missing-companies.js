require('dotenv').config();
const {google} = require('googleapis');

async function getSheets() {
  const pk = Buffer.from(process.env.GOOGLE_PRIVATE_KEY,'base64').toString('utf8');
  const auth = new google.auth.GoogleAuth({
    credentials:{client_email:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,private_key:pk},
    scopes:['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({version:'v4',auth});
}

// 96 active companies to add (excluding exits, shutdowns, unknowns, and duplicates)
const companies = [
  // Batch 1 - Active companies
  {name:'ケミカン',nameEn:'Chemikan',sector:'Chemical SaaS',summary:'製品含有化学物質の調査・管理業務をデータ化するSaaSプラットフォーム',founded:'2014',ceo:'清水俊博',country:'Japan',website:'https://chemikan.com',market:'B2B',segment:'Enterprise',round:'Series A',keywords:'化学物質,chemSHERPA,SaaS,製造業'},
  {name:'Homedy',nameEn:'Homedy',sector:'Real Estate',summary:'ベトナムにおける不動産売買・賃貸ポータルプラットフォーム',founded:'2015',ceo:'Duc Nguyen Ba',country:'Vietnam',website:'https://homedy.com',market:'B2C',segment:'Consumer',round:'Series A',keywords:'不動産,ベトナム,ポータル'},
  {name:'NiCOLA',nameEn:'NiCOLA',sector:'FoodTech',summary:'テクノロジーを活用して飲食店と顧客の関係を豊かにするサービスを提供',founded:'2017',ceo:'',country:'Japan',website:'https://nicola-inc.co.jp',market:'B2B2C',segment:'SMB',round:'Seed',keywords:'飲食,テック,店舗'},
  {name:'BizteX',nameEn:'BizteX',sector:'RPA/Automation',summary:'クラウドRPA「BizteX cobit」やiPaaS「BizteX Connect」等の業務自動化ソリューションを提供',founded:'2015',ceo:'嶋田光敏',country:'Japan',website:'https://www.biztex.co.jp',market:'B2B',segment:'Enterprise',round:'Series A',keywords:'RPA,自動化,iPaaS,クラウド'},
  {name:'Non Brokers',nameEn:'HOUSE REVO',sector:'Real Estate Tech',summary:'不動産売買プラットフォーム「いえうり」「チョク買い」等を運営',founded:'',ceo:'',country:'Japan',website:'https://www.non-brokers.com',market:'B2B2C',segment:'Consumer',round:'Series A',keywords:'不動産,売買,マッチング'},
  {name:'Mosh',nameEn:'MOSH',sector:'Creator Economy',summary:'個人がネットでサービス販売できるプラットフォーム「MOSH」を運営、登録クリエイター8万人超',founded:'2017',ceo:'籔和弥',country:'Japan',website:'https://mosh.jp',market:'B2C',segment:'Consumer',round:'Series C',keywords:'クリエイター,サービス販売,個人事業主'},
  {name:'Yourniture',nameEn:'Yourniture',sector:'D2C/Furniture',summary:'1cm単位でカスタマイズ可能なオンラインパーソナライズ家具D2Cブランド',founded:'2014',ceo:'',country:'Japan',website:'',market:'B2C',segment:'Consumer',round:'Seed',keywords:'家具,カスタマイズ,D2C'},
  {name:'REGALI',nameEn:'Brewtope',sector:'FoodTech/D2C',summary:'クラフトビールのサブスクリプションサービス「Otomoni」を運営、400以上の醸造所と提携',founded:'2014',ceo:'金澤俊昌',country:'Japan',website:'https://brewtope.jp',market:'B2C',segment:'Consumer',round:'Seed',keywords:'クラフトビール,サブスク,D2C'},
  {name:'ロジクラ',nameEn:'Logikura',sector:'Logistics SaaS',summary:'入荷・在庫管理・出荷までの物流オペレーションを一元管理するクラウド在庫管理システム',founded:'',ceo:'',country:'Japan',website:'https://logikura.jp',market:'B2B',segment:'SMB',round:'Series A',keywords:'在庫管理,物流,クラウド,EC'},
  {name:'Linc',nameEn:'Linc',sector:'HR Tech/EdTech',summary:'外国人材向けオンライン学習・就職支援サービスを提供',founded:'',ceo:'仲思遥',country:'Japan',website:'https://linc-info.com',market:'B2B',segment:'SMB',round:'Seed',keywords:'外国人材,就職支援,学習'},
  {name:'バベル',nameEn:'Babel',sector:'Digital Agency/AdTech',summary:'日中の動画メディア・広告展開を行うデジタルエージェンシー',founded:'',ceo:'',country:'Japan',website:'',market:'B2B',segment:'Enterprise',round:'Series A',keywords:'動画,広告,日中,メディア'},
  {name:'PSYGIG',nameEn:'PSYGIG',sector:'IoT/Robotics',summary:'ドローン・自律走行車・ロボット向けモビリティIoTプラットフォームを提供',founded:'2017',ceo:'Gary Lo',country:'Japan',website:'https://psygig.com',market:'B2B',segment:'Enterprise',round:'Seed',keywords:'IoT,ドローン,ロボット,自律走行'},
  {name:'空き家活用',nameEn:'Akikatsu',sector:'Real Estate Tech',summary:'空き家の総合プロデュース企業、自治体向け空き家管理・利活用サービス「アキカツ」を展開',founded:'2014',ceo:'和田貴充',country:'Japan',website:'https://aki-katsu.co.jp',market:'B2B2C',segment:'SMB',round:'Seed',keywords:'空き家,不動産,自治体,地方創生'},
  {name:'Mobilkamu',nameEn:'Mobilkamu',sector:'Automotive',summary:'インドネシアにおけるオンライン新車購入プラットフォーム',founded:'2015',ceo:'Wilton Halim',country:'Indonesia',website:'https://mobilkamu.com',market:'B2C',segment:'Consumer',round:'Series A',keywords:'自動車,インドネシア,EC'},
  {name:'amplified.ai',nameEn:'amplified.ai',sector:'AI/IP Tech',summary:'AI駆動の知的財産データ検索・分析プラットフォームを提供',founded:'2017',ceo:'Sam Davis',country:'US',website:'https://amplified.ai',market:'B2B',segment:'Enterprise',round:'Seed',keywords:'AI,知財,特許,分析'},
  {name:'ライフクエスト',nameEn:'Life Quest',sector:'HealthTech',summary:'MCI・ギャンブル依存症等を対象としたデジタル創薬・治療用アプリの研究開発',founded:'',ceo:'',country:'Japan',website:'https://www.life-q.jp',market:'B2B',segment:'Enterprise',round:'Seed',keywords:'デジタル治療,創薬,アプリ'},
  {name:'CO-NECT',nameEn:'CO-NECT',sector:'SaaS/BtoB Commerce',summary:'BtoB受発注システム「CO-NECT」を提供、39,000社が導入',founded:'2015',ceo:'田口雄介',country:'Japan',website:'https://conct.co.jp',market:'B2B',segment:'SMB',round:'Series A',keywords:'受発注,BtoB,SaaS,EC'},
  {name:'アットハース',nameEn:'AtHearth',sector:'Real Estate Tech',summary:'外国人向け多言語賃貸仲介プラットフォーム「AtHearth」を運営',founded:'2015',ceo:'',country:'Japan',website:'https://www.athearth.com',market:'B2B2C',segment:'Consumer',round:'Seed',keywords:'外国人,賃貸,多言語'},
  {name:'Opsigo',nameEn:'Opsigo',sector:'Travel Tech/SaaS',summary:'インドネシアの企業向け出張管理・旅行予約プラットフォーム「Opsicorp」を運営',founded:'2014',ceo:'Edward Nelson Jusuf',country:'Indonesia',website:'https://www.opsigo.com',market:'B2B',segment:'Enterprise',round:'Series A',keywords:'出張管理,旅行,インドネシア'},
  {name:'Sozi',nameEn:'Sozi',sector:'Creator Economy',summary:'クリエイター向けファンレターサービス「OFUSE」やイラストアプリ「pib」を運営',founded:'2017',ceo:'宮村帝明',country:'Japan',website:'',market:'B2C',segment:'Consumer',round:'Seed',keywords:'クリエイター,ファンレター,イラスト'},
  {name:'Aerial Partners',nameEn:'Aerial Partners',sector:'FinTech/Crypto',summary:'暗号資産の損益計算ツール「Gtax」やWeb3事業者向け経理サポートツールを提供',founded:'2017',ceo:'沼澤健人',country:'Japan',website:'https://www.aerial-p.com',market:'B2B',segment:'SMB',round:'Series B',keywords:'暗号資産,税務,Web3,経理'},
  {name:'ジャングルX',nameEn:'Jungle X',sector:'Sports/Betting',summary:'英国賭博ライセンスを取得したスポーツベッティングプラットフォーム「JUNGLE Bet」を運営',founded:'2016',ceo:'直江文忠',country:'Japan',website:'https://jp.jungle.xyz',market:'B2C',segment:'Consumer',round:'Seed',keywords:'スポーツ,ベッティング,エンタメ'},
  {name:'Airsalon',nameEn:'Airsalon',sector:'Beauty Tech',summary:'フリーランス美容師と面貸し美容室のマッチングプラットフォームを運営',founded:'2015',ceo:'阿部竜作',country:'Japan',website:'https://airsalon.net',market:'B2B2C',segment:'SMB',round:'Seed',keywords:'美容師,フリーランス,マッチング'},
  {name:'Crezit',nameEn:'Crezit',sector:'FinTech',summary:'与信プラットフォーム「Credit as a Service (ZEN)」を提供し、企業の金融サービス立ち上げを支援',founded:'2019',ceo:'矢部寿明',country:'Japan',website:'',market:'B2B',segment:'Enterprise',round:'Pre-Series A',keywords:'与信,金融,CaaS'},
  {name:'Skillnote',nameEn:'Skillnote',sector:'Manufacturing SaaS',summary:'製造業特化のスキル管理・人材育成システム「SKILL NOTE」を提供、250社以上が導入',founded:'2016',ceo:'山川隆史',country:'Japan',website:'https://skillnote.jp',market:'B2B',segment:'Enterprise',round:'Series C',keywords:'製造業,スキル管理,人材育成'},
  // Batch 2 - Active companies
  {name:'プランティオ',nameEn:'Plantio',sector:'AgriTech',summary:'IoTプランターやシェア型コミュニティ農園を通じた都市農プラットフォーム「grow」を運営',founded:'2015',ceo:'芹澤孝悦',country:'Japan',website:'https://plantio.co.jp',market:'B2B2C',segment:'Consumer',round:'Pre-Series A',keywords:'農業,IoT,都市農,コミュニティ'},
  {name:'Logisly',nameEn:'Logisly',sector:'Logistics',summary:'インドネシア最大のB2Bデジタルトラッキングプラットフォーム、荷主と運送会社をつなぐ',founded:'2019',ceo:'Roolin Njotosetiadi',country:'Indonesia',website:'https://logisly.com',market:'B2B',segment:'Enterprise',round:'Series A',keywords:'物流,インドネシア,トラック,マッチング'},
  {name:'Pergi Kuliner',nameEn:'Pergi Kuliner',sector:'FoodTech/Media',summary:'インドネシアNo.1のレストランディレクトリ・レビューアプリ',founded:'2014',ceo:'Oswin Liandow',country:'Indonesia',website:'https://pergikuliner.com',market:'B2C',segment:'Consumer',round:'Seed',keywords:'レストラン,レビュー,インドネシア'},
  {name:'WISE EGG',nameEn:'WISE EGG',sector:'FinTech',summary:'東南アジアで金融商品マッチングプラットフォーム「MoneyDuck」を運営',founded:'2019',ceo:'松浦崇',country:'Singapore',website:'https://www.moneyduck.com',market:'B2B2C',segment:'Consumer',round:'Pre-Series A',keywords:'金融,東南アジア,保険,マッチング'},
  {name:'リース',nameEn:'Rease',sector:'FinTech/PropTech',summary:'フリーランス向け家賃保証付きお部屋探しアプリ「smeta」および家賃保証クラウドを運営',founded:'2018',ceo:'中道康徳',country:'Japan',website:'https://rease.co.jp',market:'B2B2C',segment:'Consumer',round:'Pre-Series A',keywords:'家賃保証,フリーランス,不動産'},
  {name:'dreamstock',nameEn:'dreamstock',sector:'Sports Tech',summary:'サッカー専用スカウティングアプリ「DSFootball」を運営、FIFAエージェントライセンス取得',founded:'2016',ceo:'松永マルセロハルオ',country:'Japan',website:'https://www.dreamstock.co.jp',market:'B2C',segment:'Consumer',round:'Seed',keywords:'サッカー,スカウティング,スポーツ'},
  {name:'eDoctor',nameEn:'eDoctor',sector:'HealthTech',summary:'ベトナムにおける遠隔医療相談モバイルアプリおよび健康スクリーニングサービスを提供',founded:'2014',ceo:'Vu Thanh Long',country:'Vietnam',website:'https://edoctor.io',market:'B2C',segment:'Consumer',round:'Seed',keywords:'遠隔医療,ベトナム,ヘルスケア'},
  {name:'Napps Technologies',nameEn:'Napps Technologies',sector:'SaaS/NoCode',summary:'ノーコードでアプリ作成・配信ができるプラットフォーム「NappyTown」を運営',founded:'2017',ceo:'榎本友幸',country:'Japan',website:'https://nappytown.com',market:'B2B',segment:'SMB',round:'Seed',keywords:'ノーコード,アプリ開発,プラットフォーム'},
  {name:'コノセル',nameEn:'Conocer',sector:'EdTech',summary:'テクノロジー×リアルのハイブリッド学習塾「個別指導コノ塾」を全国111校展開',founded:'2019',ceo:'田辺理',country:'Japan',website:'https://conocer.co',market:'B2C',segment:'Consumer',round:'Series B',keywords:'学習塾,教育,個別指導,テック'},
  {name:'クラウドローン',nameEn:'CrowdLoan',sector:'FinTech',summary:'個人向け融資マッチングプラットフォーム「クラウドローン」を運営、30行以上の金融機関と提携',founded:'2018',ceo:'村田大輔',country:'Japan',website:'https://crowdloan.jp',market:'B2B2C',segment:'Consumer',round:'Pre-Series A',keywords:'融資,ローン,金融機関,マッチング'},
  {name:'Connect Afya',nameEn:'Connect Afya',sector:'HealthTech',summary:'ケニアで医療診断・ラボテストサービスを提供',founded:'2018',ceo:'島田陽一',country:'Kenya',website:'https://connectafya.com',market:'B2B2C',segment:'Consumer',round:'Seed',keywords:'医療,ケニア,アフリカ,診断'},
  {name:'Activaid',nameEn:'SmarTrial',sector:'HealthTech/SaaS',summary:'IBD患者向けソーシャルデータプラットフォームおよび臨床試験プロジェクト管理サービス「SmarTrial」を運営',founded:'2018',ceo:'長谷部靖明',country:'Japan',website:'https://lp.smartrial.jp',market:'B2B',segment:'Enterprise',round:'Seed',keywords:'臨床試験,ヘルスケア,SaaS'},
  {name:'FUNEE',nameEn:'digdig',sector:'Fashion/C2C',summary:'ファッション特化型フリマプラットフォーム「digdig」を運営',founded:'2019',ceo:'楊承峻',country:'Japan',website:'https://funee.jp',market:'B2C',segment:'Consumer',round:'Seed',keywords:'ファッション,フリマ,C2C'},
  {name:'Vietcetera',nameEn:'Vietcetera',sector:'Media',summary:'ベトナムを代表するデジタルメディアプラットフォーム、ポッドキャストやビジネスメディアを展開',founded:'2016',ceo:'Hao Tran',country:'Vietnam',website:'https://vietcetera.com',market:'B2B2C',segment:'Consumer',round:'Series A',keywords:'メディア,ベトナム,ポッドキャスト'},
  {name:'エナーバンク',nameEn:'Enabank',sector:'EnergyTech',summary:'日本最大級の電力オークション「エネオク」および脱炭素支援サービスを運営',founded:'2018',ceo:'村中健一',country:'Japan',website:'https://www.enerbank.co.jp',market:'B2B',segment:'Enterprise',round:'Series B',keywords:'電力,エネルギー,オークション,脱炭素'},
  {name:'FOODCODE',nameEn:'FOODCODE',sector:'FoodTech',summary:'カスタマイズカレー「TOKYO MIX CURRY」をアプリ注文で展開、飲食×テクノロジーの一気通貫モデル',founded:'2018',ceo:'西海和久',country:'Japan',website:'https://foodcode.jp',market:'B2C',segment:'Consumer',round:'Series A',keywords:'飲食,カレー,アプリ,テック'},
  {name:'Nectico',nameEn:'Nectico',sector:'SaaS',summary:'インドネシアの協同組合向けERP・B2Bマーケットプレイスを提供',founded:'2019',ceo:'Amry Fitra Amanah',country:'Indonesia',website:'https://www.nectico.com',market:'B2B',segment:'SMB',round:'Seed',keywords:'ERP,協同組合,インドネシア'},
  {name:'miive',nameEn:'miive',sector:'HR Tech/FinTech',summary:'Visaプリペイドカード型の福利厚生プラットフォーム「miive」を運営',founded:'2020',ceo:'栗田廉',country:'Japan',website:'https://miive.jp',market:'B2B',segment:'SMB',round:'Series B',keywords:'福利厚生,プリペイドカード,HR'},
  {name:'エムボックス',nameEn:'mbox',sector:'HealthTech',summary:'AGA（男性型脱毛症）セルフケアブランド「HIX」および便秘チェックサービス「Bebo」を展開',founded:'2018',ceo:'',country:'Japan',website:'https://mbox-inc.jp',market:'B2C',segment:'Consumer',round:'Seed',keywords:'AGA,ヘルスケア,セルフケア'},
  {name:'Vitalogue Health',nameEn:'Vitalogue Health',sector:'FemTech/HealthTech',summary:'自宅で郵送ホルモン検査ができる「canvas」および漢方相談サービスを運営',founded:'2020',ceo:'長谷川彩子',country:'Japan',website:'https://get-canvas.com',market:'B2C',segment:'Consumer',round:'Seed',keywords:'ホルモン検査,漢方,フェムテック'},
  {name:'Finantier',nameEn:'Finantier',sector:'FinTech',summary:'東南アジアのオープンファイナンスAPIプラットフォーム、Y Combinator卒',founded:'2020',ceo:'Diego Rojas',country:'Indonesia',website:'https://finantier.co',market:'B2B',segment:'Enterprise',round:'Seed',keywords:'オープンファイナンス,API,東南アジア'},
  {name:'AmoebaX',nameEn:'AmoebaX',sector:'AgriTech',summary:'ケニア・ナイロビで野菜卸売プラットフォーム「YasaFi」を運営',founded:'2018',ceo:'河野邦彦',country:'Kenya',website:'https://www.amoebaxjapan.com',market:'B2B',segment:'SMB',round:'Seed',keywords:'農業,ケニア,アフリカ,野菜'},
  {name:'ナッジ',nameEn:'Nudge',sector:'FinTech',summary:'次世代型スマホ連動Visaクレジットカード「Nudge」を提供',founded:'2020',ceo:'沖田貴史',country:'Japan',website:'https://nudge.works',market:'B2C',segment:'Consumer',round:'Series A',keywords:'クレジットカード,フィンテック,Z世代'},
  {name:'エイトス',nameEn:'Eitoss',sector:'SaaS/EHS',summary:'デスクレスワーカー向け改善提案クラウド「Cayzen」を運営、EHS×現場DX',founded:'2019',ceo:'嶋田亘',country:'Japan',website:'https://eitoss.com',market:'B2B',segment:'Enterprise',round:'Seed',keywords:'現場DX,改善提案,EHS,製造業'},
  {name:'メンテモ',nameEn:'Mentemo',sector:'Mobility',summary:'自動車整備・鈑金工場をネット検索・予約できるマーケットプレイス「メンテモ」を運営',founded:'2017',ceo:'若月佑樹',country:'Japan',website:'https://mentemo.com',market:'B2B2C',segment:'Consumer',round:'Seed',keywords:'自動車,整備,マーケットプレイス'},
  {name:'PRES',nameEn:'PRES',sector:'SaaS/Academia',summary:'研究活動DXプラットフォーム「Wizdom」と産学連携マッチング「Radstar」を運営',founded:'2018',ceo:'大滝翔士',country:'Japan',website:'https://pres.world',market:'B2B',segment:'Enterprise',round:'Seed',keywords:'研究,産学連携,大学,DX'},
  {name:'amptalk',nameEn:'amptalk',sector:'SaaS/SalesTech',summary:'商談の自動書き起こし・解析ツール「amptalk」およびAIロープレ「amptalk coach」を提供',founded:'2020',ceo:'猪瀬竜馬',country:'Japan',website:'https://amptalk.co.jp',market:'B2B',segment:'Enterprise',round:'Series A',keywords:'商談,書き起こし,AI,セールス'},
  {name:'Fundiin',nameEn:'Fundiin',sector:'FinTech/BNPL',summary:'ベトナム最大級のBNPL（後払い決済）プラットフォーム、2,000以上の加盟店と提携',founded:'2019',ceo:'Nguyen Anh Cuong',country:'Vietnam',website:'https://fundiin.vn',market:'B2B2C',segment:'Consumer',round:'Series A',keywords:'BNPL,後払い,ベトナム,決済'},
  {name:'Teatis',nameEn:'Teatis',sector:'FoodTech/HealthTech',summary:'米国で糖尿病患者向け代替食・スーパーフード粉末飲料「Teatis」を提供',founded:'2021',ceo:'高頭博志',country:'US',website:'https://teatis.com',market:'B2C',segment:'Consumer',round:'Seed',keywords:'糖尿病,食品,ヘルスケア,米国'},
  {name:'イークラウド',nameEn:'eCrowd',sector:'FinTech',summary:'株式投資型クラウドファンディングプラットフォームを運営',founded:'2018',ceo:'波多江直彦',country:'Japan',website:'https://ecrowd.co.jp',market:'B2B2C',segment:'Consumer',round:'Series A',keywords:'クラウドファンディング,投資,株式'},
  {name:'Airboxr',nameEn:'Airboxr',sector:'SaaS/E-commerce',summary:'ECブランド向けデータ自動化プラットフォーム、Shopify等と連携',founded:'2020',ceo:'Saptarshi Nath',country:'Singapore',website:'https://www.airboxr.com',market:'B2B',segment:'SMB',round:'Seed',keywords:'EC,データ分析,Shopify'},
  {name:'TiERRAS',nameEn:'TiERRAS',sector:'D2C/Beauty',summary:'ヘルスケア発想のD2Cエイジングケアブランド「SKINFONIA」を日本と中国で展開',founded:'2020',ceo:'吉田',country:'Hong Kong',website:'https://tierrasinc.com',market:'B2C',segment:'Consumer',round:'Seed',keywords:'スキンケア,D2C,エイジングケア'},
  {name:'DXER',nameEn:'DXER',sector:'SaaS/IT',summary:'企業の情報システム部向けAI×BPOサービス「シスクル」を提供',founded:'2020',ceo:'向井拓真',country:'Japan',website:'https://dxer.co.jp',market:'B2B',segment:'Enterprise',round:'Seed',keywords:'情シス,IT,BPO,AI'},
  {name:'Selly',nameEn:'Selly',sector:'E-commerce',summary:'ベトナムのソーシャルコマースプラットフォーム「Selly」およびキャッシュバックアプリ「Cashbag」を運営',founded:'2021',ceo:'Tuan Thong',country:'Vietnam',website:'https://selly.vn',market:'B2C',segment:'Consumer',round:'Pre-Series A',keywords:'ソーシャルコマース,ベトナム,EC'},
  {name:'BeepBeep',nameEn:'BeepBeep',sector:'QuickCommerce',summary:'東南アジアで15分即配グロサリーサービスを展開',founded:'2021',ceo:'Gaetano Seminario',country:'Singapore',website:'https://beepbeep.asia',market:'B2C',segment:'Consumer',round:'Seed',keywords:'即配,グロサリー,東南アジア'},
  // Batch 3 - Active companies
  {name:'シャトル',nameEn:'Shuttle',sector:'FinTech',summary:'親がアプリから送金し子供がプリペイドカードで利用できる子供向けプリペイドカードサービス「ShuttlePay」を提供',founded:'2019',ceo:'建原史朗',country:'Japan',website:'https://shuttlepay.jp',market:'B2C',segment:'Consumer',round:'Seed',keywords:'子供,プリペイドカード,送金,フィンテック'},
  {name:'Rey Assurance',nameEn:'Rey Assurance',sector:'InsurTech',summary:'インドネシアで健康・生命保険をサブスクリプション型で提供するデジタル保険プラットフォーム',founded:'2021',ceo:'Evan Tanotogono',country:'Indonesia',website:'https://rey.id',market:'B2C',segment:'Consumer',round:'Seed',keywords:'保険,インドネシア,サブスク'},
  {name:'ElevationSpace',nameEn:'ElevationSpace',sector:'SpaceTech',summary:'東北大学発の宇宙スタートアップ、再突入衛星や宇宙環境利用・回収プラットフォームを開発',founded:'2021',ceo:'小林稜平',country:'Japan',website:'https://elevation-space.com',market:'B2B',segment:'Enterprise',round:'Pre-Series B',keywords:'宇宙,衛星,ディープテック'},
  {name:'Payn',nameEn:'Payn',sector:'SaaS/Hospitality',summary:'キャンセル料の請求・回収業務を自動化するツール「Payn」を提供',founded:'2022',ceo:'山下恭平',country:'Japan',website:'https://payn.io',market:'B2B',segment:'SMB',round:'Pre-Series A',keywords:'キャンセル料,自動化,ホテル'},
  {name:'MVillage',nameEn:'MVillage',sector:'Hospitality',summary:'ベトナムで若者向けのコリビング・コワーキングスペースを展開',founded:'2020',ceo:'Nguyen Hai Ninh',country:'Vietnam',website:'',market:'B2C',segment:'Consumer',round:'Series B',keywords:'コリビング,コワーキング,ベトナム'},
  {name:'movus technologies',nameEn:'movus technologies',sector:'Mobility/FinTech',summary:'インドネシアでモビリティ×金融インフラを構築し、IoT活用のカーサブスクリプションサービスを提供',founded:'2021',ceo:'酒井丈虎',country:'Japan',website:'',market:'B2B2C',segment:'Consumer',round:'Seed',keywords:'モビリティ,カーサブスク,インドネシア,IoT'},
  {name:'Progummy',nameEn:'Progummy',sector:'EdTech',summary:'世界初のリアルタイム共同編集機能を備えたビジュアルプログラミングアプリを提供',founded:'2020',ceo:'石橋康大',country:'Japan',website:'https://www.progummy.com',market:'B2C',segment:'Consumer',round:'Seed',keywords:'プログラミング教育,子供,アプリ'},
  {name:'InsightX',nameEn:'InsightX',sector:'SaaS/AI',summary:'BtoC企業向けのCX変革AIプラットフォーム「InsightX」を提供',founded:'2021',ceo:'中澤弘樹',country:'Japan',website:'https://insightx.tech',market:'B2B',segment:'Enterprise',round:'Series A',keywords:'CX,AI,パーソナライズ'},
  {name:'AC Biode',nameEn:'AC Biode',sector:'CleanTech',summary:'交流電池、廃プラスチック解重合触媒等を開発する化学テックスタートアップ',founded:'2019',ceo:'Naoji Kubo',country:'Japan',website:'https://acbiode.com',market:'B2B',segment:'Enterprise',round:'Seed',keywords:'電池,クリーンテック,化学,環境'},
  {name:'Mined',nameEn:'Mined',sector:'EdTech',summary:'子供がロールモデルから直接学べるプラットフォーム「スコラボ」を運営',founded:'2020',ceo:'前田智大',country:'Japan',website:'',market:'B2C',segment:'Consumer',round:'Pre-Series A',keywords:'教育,ロールモデル,子供'},
  {name:'TAIAN',nameEn:'TAIAN',sector:'SaaS/Bridal',summary:'ブライダル・バンケット業界に特化したクラウドSaaS「Oiwaii」等を提供、全国400以上の事業者が利用',founded:'2020',ceo:'村田真理子',country:'Japan',website:'',market:'B2B',segment:'SMB',round:'Series A',keywords:'ブライダル,SaaS,ウェディング'},
  {name:'Flucle',nameEn:'HRbase',sector:'SaaS/HR',summary:'社労士・企業向け労務相談プラットフォーム「HRbase PRO」を提供',founded:'2015',ceo:'三田弘道',country:'Japan',website:'https://hrbase.co.jp',market:'B2B',segment:'SMB',round:'Pre-Series A',keywords:'労務,社労士,HR,SaaS'},
  {name:'Conoris',nameEn:'Conoris',sector:'SaaS/Security',summary:'クラウドサービスのセキュリティチェック・委託先リスク管理を効率化するSaaSプロダクト群を提供',founded:'2020',ceo:'',country:'Japan',website:'',market:'B2B',segment:'Enterprise',round:'Pre-Series A',keywords:'セキュリティ,リスク管理,SaaS'},
  {name:'アルバトロス・テクノロジー',nameEn:'Albatross Technology',sector:'CleanTech/Wind',summary:'浮体式洋上風車「浮遊軸型風車(FAWT)」を開発',founded:'2022',ceo:'秋元博路',country:'Japan',website:'https://www.albatross-technology.com',market:'B2B',segment:'Enterprise',round:'Series A',keywords:'洋上風力,再エネ,クリーンテック'},
  {name:'Runchise',nameEn:'Runchise',sector:'SaaS/F&B',summary:'インドネシアの飲食業界向けPOS・アウトレット管理プラットフォームをE2Eで提供',founded:'2022',ceo:'Daniel Witono',country:'Indonesia',website:'',market:'B2B',segment:'SMB',round:'Seed',keywords:'POS,飲食,インドネシア,SaaS'},
  {name:'Rootopia',nameEn:'Rootopia',sector:'FinTech/EdTech',summary:'ベトナムで教育向けP2Pレンディングプラットフォームを運営',founded:'2021',ceo:'Nguyen Xuan Truong',country:'Vietnam',website:'',market:'B2B2C',segment:'Consumer',round:'Pre-Seed',keywords:'教育ローン,P2P,ベトナム'},
  {name:'Mierba',nameEn:'Mierba',sector:'SaaS/HR',summary:'中途採用向け職種別スキルチェックテストを提供するタレントアセスメントSaaS',founded:'',ceo:'丸山樹',country:'Japan',website:'https://mierba.com',market:'B2B',segment:'SMB',round:'Seed',keywords:'採用,スキルテスト,アセスメント'},
  {name:'Wareflex',nameEn:'Wareflex',sector:'Logistics',summary:'ベトナム初のオンデマンド倉庫プラットフォーム、100以上の倉庫ネットワークを展開',founded:'2022',ceo:'',country:'Vietnam',website:'',market:'B2B',segment:'Enterprise',round:'Pre-Seed',keywords:'倉庫,物流,ベトナム,オンデマンド'},
  {name:'コングラント',nameEn:'Congrant',sector:'SaaS/Social',summary:'NPO・企業向けの寄付DXシステム「congrant」を提供、2,800以上の団体が利用',founded:'2020',ceo:'佐藤正隆',country:'Japan',website:'https://congrant.com',market:'B2B',segment:'SMB',round:'Series A',keywords:'寄付,NPO,ソーシャル,DX'},
  {name:'Khariis',nameEn:'Khariis',sector:'Food/Sake',summary:'世界中の消費者・ソムリエ・酒蔵をつなぐ日本酒プラットフォーム「Sakeist」を運営',founded:'2019',ceo:'秋月杏奈',country:'Japan',website:'https://www.khariis.com',market:'B2B2C',segment:'Consumer',round:'Seed',keywords:'日本酒,プラットフォーム,グローバル'},
  {name:'Sales Navi',nameEn:'Sales Navi',sector:'SaaS/SalesTech',summary:'AIコーチが営業活動を指導・標準化する営業標準化システム「Sales Navi」を提供',founded:'2021',ceo:'田中大貴',country:'Japan',website:'https://www.salesnavi.co.jp',market:'B2B',segment:'SMB',round:'Seed',keywords:'営業,AI,コーチング,標準化'},
  {name:'Logpose Technologies',nameEn:'Logpose Technologies',sector:'SaaS/Logistics',summary:'AI・データサイエンス技術で配車管理・配送計画を自動化する「AI配車アシスタント LOG」を提供',founded:'2018',ceo:'羽室行光',country:'Japan',website:'https://logpose.co.jp',market:'B2B',segment:'Enterprise',round:'Pre-Series A',keywords:'配車,物流,AI,自動化'},
  {name:'トドケール',nameEn:'Todoker',sector:'SaaS/Office',summary:'オフィス向け郵便物・配達物のクラウド管理ツール及びミニBPOサービス「クラウドメール室」を提供',founded:'2018',ceo:'野島剛',country:'Japan',website:'https://www.todoker.com',market:'B2B',segment:'SMB',round:'Series A',keywords:'郵便物,オフィス管理,SaaS'},
  {name:'CARESPACE',nameEn:'CARESPACE',sector:'HealthTech/Care',summary:'ケアマネジャーと介護事業所をICTでつなぐプラットフォーム「CareSpace」を運営',founded:'2020',ceo:'三浦亮',country:'Japan',website:'https://care-space.jp',market:'B2B',segment:'SMB',round:'Seed',keywords:'介護,ケアマネ,ICT,DX'},
  {name:'Artefact Collective',nameEn:'Kasagi Labo',sector:'Entertainment/Anime',summary:'シンガポール拠点のアニメベンチャースタジオ、日本の正統派アニメをグローバルに展開',founded:'2023',ceo:'',country:'Singapore',website:'https://en.kasagilabo.com',market:'B2B2C',segment:'Consumer',round:'Pre-Series A',keywords:'アニメ,エンタメ,グローバル'},
  {name:'M&A Lead',nameEn:'M&A Lead',sector:'SaaS/M&A',summary:'売り手ファーストのM&A仲介事業、M&Aアドバイザーマッチングサイト等を提供',founded:'2022',ceo:'坂本',country:'Japan',website:'https://malead.co.jp',market:'B2B',segment:'SMB',round:'Seed',keywords:'M&A,仲介,マッチング'},
  {name:'StepChange',nameEn:'StepChange',sector:'SaaS/ESG',summary:'企業のESG指標管理・気候リスク対応・排出量削減を支援するサステナビリティSaaS',founded:'2022',ceo:'Ankit Jain',country:'India',website:'',market:'B2B',segment:'Enterprise',round:'Seed',keywords:'ESG,サステナビリティ,気候変動'},
  {name:'フレンドマイクローブ',nameEn:'Friend Microbe',sector:'BioTech/Environment',summary:'名古屋大学発、微生物を活用した排水処理・油脂分解・環境衛生技術を開発・提供',founded:'2017',ceo:'蟹江純一',country:'Japan',website:'https://friendmicrobe.co.jp',market:'B2B',segment:'Enterprise',round:'Seed',keywords:'微生物,排水処理,環境,バイオ'},
  {name:'Haul',nameEn:'Haul',sector:'SaaS/HR',summary:'採用イネーブルメントSaaS「RekMA」を提供し、AIを活用した次世代型の採用支援を行う',founded:'2018',ceo:'平田拓嗣',country:'Japan',website:'https://haulinc.jp',market:'B2B',segment:'SMB',round:'Pre-Series A',keywords:'採用,AI,SaaS,HR'},
  {name:'24hMoney',nameEn:'24hMoney',sector:'FinTech/Media',summary:'ベトナムの金融・株式・不動産情報ソーシャルプラットフォーム',founded:'2019',ceo:'Phan Minh Tam',country:'Vietnam',website:'https://24hmoney.vn',market:'B2C',segment:'Consumer',round:'Seed',keywords:'金融,株式,ベトナム,メディア'},
  {name:'OIKOS MUSIC',nameEn:'OIKOS MUSIC',sector:'Entertainment/Music',summary:'音楽の原盤権マーケットプレイス「ORF」を運営、アーティストとファンが権利を共同保有',founded:'2022',ceo:'市村昭宏',country:'Japan',website:'https://www.oikosmusic.tokyo',market:'B2B2C',segment:'Consumer',round:'Seed',keywords:'音楽,原盤権,マーケットプレイス'},
  {name:'VCA COFFEE',nameEn:'VCA COFFEE',sector:'Agriculture/F&B',summary:'ベトナムのコーヒー豆サプライチェーンプラットフォーム',founded:'',ceo:'',country:'Vietnam',website:'',market:'B2B',segment:'SMB',round:'Seed',keywords:'コーヒー,ベトナム,農業,サプライチェーン'},
  {name:'メタセンシング',nameEn:'Meta Sensing',sector:'DeepTech',summary:'スマホに取り付け可能な超小型ラマン分光器「Raman EYE」とAI解析エージェントを開発',founded:'',ceo:'',country:'Japan',website:'',market:'B2B',segment:'Enterprise',round:'Series A',keywords:'分光器,計測,AI,ディープテック'},
  {name:'SaaSPay',nameEn:'SaaSPay',sector:'FinTech/BNPL',summary:'SaaS・クラウドサブスクリプション向けBNPL(後払い)ソリューションを提供',founded:'2022',ceo:'Prabhat Sahu',country:'India',website:'',market:'B2B',segment:'SMB',round:'Seed',keywords:'BNPL,SaaS,インド'},
  {name:'リチェルカ',nameEn:'Recerqa',sector:'SaaS/SCM',summary:'仕入・在庫・販売管理のSCM SaaS「RECERQA SCM」とAI-OCRサービスを提供',founded:'',ceo:'',country:'Japan',website:'',market:'B2B',segment:'SMB',round:'Seed',keywords:'SCM,在庫管理,AI-OCR'},
  {name:'楽々',nameEn:'LaLa Corporation',sector:'BioTech/Agriculture',summary:'脱炭素型・有機きのこ菌床製造装置を開発し、IoT技術で循環型きのこ農業を実現',founded:'2019',ceo:'駒場裕美',country:'Japan',website:'https://www.lala-corporation.co.jp',market:'B2B',segment:'SMB',round:'Seed',keywords:'きのこ,農業,バイオ,循環型'},
  {name:'ミーバイオ',nameEn:'miibio',sector:'BioTech',summary:'東京大学発、光スイッチタンパク質技術でバイオものづくりの物質生産スケールアップを支援',founded:'2019',ceo:'早水建祥',country:'Japan',website:'https://www.mii-bio.com',market:'B2B',segment:'Enterprise',round:'Seed',keywords:'バイオ,タンパク質,東大発'},
];

async function addCompanies() {
  const sheets = await getSheets();
  const sheetId = process.env.PORTFOLIO_SHEET_ID;

  // Get current last row
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Portfolio_DB!A4:A200'
  });
  const existingIds = (existing.data.values || []).map(r => r[0]).filter(Boolean);
  const lastRow = existingIds.length + 4; // data starts at row 4
  let nextId = 68; // GV-068

  console.log(`Current: ${existingIds.length} companies, last row: ${lastRow}`);
  console.log(`Adding ${companies.length} companies starting from GV-0${nextId}`);

  // Prepare rows (columns A through AW = 49 columns)
  const rows = companies.map(c => {
    const id = `GV-${String(nextId++).padStart(3,'0')}`;
    const row = new Array(49).fill('');
    row[0]  = id;                    // A: company_id
    row[1]  = c.name;               // B: company_name_ja
    row[2]  = c.nameEn;             // C: company_name_en
    row[3]  = c.website;            // D: website
    row[4]  = c.founded;            // E: founded_year
    row[5]  = c.country;            // F: hq_country
    row[7]  = c.summary;            // H: business_summary_ja
    row[9]  = c.summary;            // J: one_liner (same as summary for now)
    row[14] = c.sector;             // O: sector_primary
    row[20] = c.keywords;           // U: keywords_ja
    row[22] = c.round;              // W: investment_stage
    row[27] = c.round;              // AB: latest_round
    row[30] = 'Active';             // AE: status
    row[33] = c.ceo;                // AH: ceo_name
    row[36] = '全ポジション';        // AK: hiring_needs
    row[46] = '';                    // AU: recruiting_url (to be filled)
    row[47] = c.market;             // AV: target_market
    row[48] = c.segment;            // AW: target_segment
    return row;
  });

  // Write to sheet
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `Portfolio_DB!A${lastRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows }
  });

  console.log(`\n✅ ${rows.length} companies added (GV-068 ~ GV-${String(nextId-1).padStart(3,'0')})`);
  console.log('\nFirst 5:');
  rows.slice(0,5).forEach(r => console.log(`  ${r[0]} ${r[1]} (${r[2]}) - ${r[14]}`));
  console.log('\nLast 5:');
  rows.slice(-5).forEach(r => console.log(`  ${r[0]} ${r[1]} (${r[2]}) - ${r[14]}`));
}

addCompanies().catch(e => console.error('Error:', e.message));
