import re
with open('src/matcher.js','r') as f: c=f.read()

# 1. Step 0.6を追加
STEP06="""
## Step 0.6: ターゲット市場適性分析
候補者の経歴から、最も活躍できる市場タイプを判定してください。
これはマッチング精度に直結する最重要ステップです。

### 判定基準
**B2C適性シグナル:** D2C/EC/消費財メーカー勤務、インフルエンサーマーケ/SNSマーケ/コミュニティ運営経験、コンシューマーアプリのグロース経験、広告代理店でのコンシューマー案件、PR/ブランディング中心のマーケ、toCサービスのPdM/PM
**B2B適性シグナル:** SaaS企業/法人営業/エンタープライズセールス、リード獲得→商談→クロージングの法人営業プロセス、ABM経験、カスタマーサクセス/オンボーディング、バーティカルSaaS経験、SIer/コンサル出身
**エンタープライズ vs SMB:** 大手企業(1000人以上)への営業・導入→エンタープライズ、中小向け大量アプローチ→SMB

### 出力（profileに含める）:
- primary_market: "B2B" or "B2C" or "B2B2C"
- secondary_market: "B2B" or "B2C" or null
- market_evidence: 判定根拠1-2文
- segment_fit: "Enterprise" or "SMB" or "Both"
- segment_evidence: 判定根拠1文

"""
c=c.replace("## Step 1: プロフィール構造化",STEP06+"## Step 1: プロフィール構造化")
print("1. Step 0.6 追加完了")

# 2. profileフィールドにmarket系追加
old_pos='position_category（"CxO/役員", "事業開発/BizDev", "営業", "エンジニア", "PM/PdM", "マーケ/PR", "CS/オペレーション", "その他"から1つ）'
new_pos=old_pos+'\nprimary_market, secondary_market, market_evidence, segment_fit, segment_evidence'
c=c.replace(old_pos,new_pos)
print("2. profileフィールド追加完了")

# 3. マッチング判断基準強化
MKT="""【最重要：ターゲット市場の整合性チェック】
1. 候補者のprimary_marketと企業のtarget_marketが一致するか確認
2. 一致→加点(+10), 部分一致(B2B2C企業にB2B/B2C人材)→中立, 不一致→大幅減点(-20)
3. 不一致でTOP5に入れる場合は最大2社まで。理由を必ず明記
4. 残り3社以上はtarget_market一致企業から選ぶこと

"""
c=c.replace("【重要な判断基準】",MKT+"【重要な判断基準】")
print("3. マッチング判断基準追加完了")

# 4. ポートフォリオデータにtarget_market含める
c=c.replace(
    '{id:c.id,name:c.name,sector:c.sector,stage:c.stage,teamSize:c.teamSize,summary:c.summary,hiringNeeds:c.hiringNeeds,growthChallenges:c.growthChallenges,keywords:c.keywords,',
    '{id:c.id,name:c.name,sector:c.sector,stage:c.stage,target_market:c.target_market||"unknown",target_segment:c.target_segment||"unknown",teamSize:c.teamSize,summary:c.summary,hiringNeeds:c.hiringNeeds,growthChallenges:c.growthChallenges,keywords:c.keywords,'
)
print("4. ポートフォリオデータ修正完了")

# 5. 出力フォーマット修正
c=c.replace('"position_category":""}','"position_category":"","primary_market":"","secondary_market":null,"market_evidence":"","segment_fit":"","segment_evidence":""}')
c=c.replace('"salary_gap":""}]}','"salary_gap":"","market_fit":""}]}')
print("5. 出力フォーマット修正完了")

with open('src/matcher.js','w') as f: f.write(c)
print("Done!")
